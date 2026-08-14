import { db, campaigns, segments, variants, workspaces, posts } from "@/db";
import { eq } from "drizzle-orm";
import { structured, SMART_MODEL } from "./llm";
import { setProgress } from "./jobs";
import { goalFor } from "./goals";

const HOOK_STYLES = ["contrarian", "story", "data-led", "direct-value", "question"] as const;

type VariantOutput = {
  variants: { hookStyle: string; text: string }[];
};

export async function generateVariants(jobId: number, campaignId: number) {
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!campaign) throw new Error("Campaign not found");
  const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, campaign.workspaceId) });
  const audience = await db.query.segments.findFirst({
    where: eq(segments.workspaceId, campaign.workspaceId),
  });
  if (!audience) throw new Error("No audience profile yet — build it on the Audience page first.");

  // Fresh generation replaces previous variants
  await db.delete(variants).where(eq(variants.campaignId, campaignId));

  // The creator's real posts are the voice reference — favor the ones their
  // audience actually engaged with.
  const ownPosts = await db.query.posts.findMany({
    where: eq(posts.workspaceId, campaign.workspaceId),
    orderBy: (p, { desc }) => [desc(p.reactionCount)],
    limit: 8,
  });
  const voiceSamples = ownPosts
    .filter((p) => (p.text ?? "").trim().length > 60)
    .slice(0, 6)
    .map((p, i) => `--- Post ${i + 1} (${p.reactionCount} reactions, ${p.commentCount} comments) ---\n${p.text!.slice(0, 900)}`)
    .join("\n\n");

  const goal = goalFor(campaign.goal);
  const composition = (audience.traits?.composition ?? [])
    .map((c) => `${c.emoji} ${c.label} ${c.percent}%`)
    .join(" · ");

  const isDraftMode = campaign.mode === "draft";
  const variationStyles = isDraftMode ? HOOK_STYLES.slice(0, 4) : HOOK_STYLES;

  await setProgress(
    jobId,
    isDraftMode
      ? `Writing ${variationStyles.length} variations of your draft…`
      : `Writing ${HOOK_STYLES.length} takes for your audience…`,
  );

  const task = isDraftMode
    ? `THE CREATOR'S OWN DRAFT — this is the post they wrote and want to improve:

---
${campaign.brief}
---

Write ${variationStyles.length} VARIATIONS of this draft, one per hook style: ${variationStyles.join(", ")}.
Rules for variations:
- Preserve the draft's core message, claims, and any specific facts/numbers — do not invent new claims.
- Change the hook, structure, and framing per the assigned style; tighten weak lines.
- Stay in the creator's voice (see samples above if provided) — the variations should read like the creator rewrote their own post, not like someone else did.`
    : `Write ${HOOK_STYLES.length} variants of this post, one per hook style: ${HOOK_STYLES.join(", ")}.`;

  const out = await structured<VariantOutput>({
    model: SMART_MODEL,
    maxTokens: 6144,
    schemaName: "post_variants",
    system: `You are an elite LinkedIn ghostwriter. Your defining skill is voice-matching: given samples of a creator's real posts, you write new posts indistinguishable from theirs — same cadence, line-break rhythm, sentence length, vocabulary, emoji and punctuation habits, and level of formality. You never impose a house style over the creator's own. LinkedIn formatting rules: short lines, generous whitespace, no markdown syntax (no **, no #), hooks must survive the "...see more" fold (first ~210 chars decide everything). Never use hashtag spam; at most 0-3 relevant hashtags at the end, often none.`,
    prompt: `The creator${ws?.name ? ` (${ws.name} — ${ws.headline ?? ""})` : ""} wants to post about:

Topic: ${campaign.productName}
${isDraftMode ? "" : `Brief: ${campaign.brief}`}
${
  voiceSamples
    ? `
THE CREATOR'S VOICE — these are their real recent posts. Study how they actually write: hook style, cadence, line breaks, sentence length, emoji/punctuation habits, how they open and close. Every variant must sound like THIS person wrote it, not a generic ghostwriter. Match their voice; never copy their content.

${voiceSamples}
`
    : ""
}

Post goal: ${goal.label} — ${goal.tagline}.
${goal.guidance}

Their audience (write for ALL of it — one post goes to everyone):
${audience.description}
Composition: ${composition}
Seniority: ${audience.traits?.seniority}
Industries: ${audience.traits?.industries?.join(", ")}
How they consume content: ${audience.traits?.contentPreferences}
What stops their scroll: ${audience.traits?.scrollStoppers}
Tone guidance: ${audience.traits?.toneGuidance}

${task}
- "contrarian": open by challenging a belief this audience holds
- "story": open with a specific first-person moment
- "data-led": open with a concrete number/result
- "direct-value": open by naming the audience's pain and the payoff${isDraftMode ? "" : `\n- "question": open with a question this audience genuinely argues about`}

Each post: 80-180 words (or the creator's typical length if their samples run consistently longer), aimed at the goal above, ending with the CTA style that goal calls for — phrased the way this creator phrases CTAs.`,
    schema: {
      type: "object",
      properties: {
        variants: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hookStyle: { type: "string", enum: [...variationStyles] },
              text: { type: "string" },
            },
            required: ["hookStyle", "text"],
          },
        },
      },
      required: ["variants"],
    },
  });

  // Draft mode: the creator's own post competes in the arena as-is
  const rows = [
    ...(isDraftMode
      ? [{ campaignId, segmentId: audience.id, hookStyle: "original", text: campaign.brief }]
      : []),
    ...out.variants.map((v) => ({
      campaignId,
      segmentId: audience.id,
      hookStyle: v.hookStyle,
      text: v.text,
    })),
  ];
  await db.insert(variants).values(rows);

  await db.update(campaigns).set({ status: "generated" }).where(eq(campaigns.id, campaignId));
  return { campaignId, variants: rows.length };
}
