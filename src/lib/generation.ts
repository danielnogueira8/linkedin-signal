import { db, campaigns, segments, variants, workspaces } from "@/db";
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

  const goal = goalFor(campaign.goal);
  const composition = (audience.traits?.composition ?? [])
    .map((c) => `${c.emoji} ${c.label} ${c.percent}%`)
    .join(" · ");

  await setProgress(jobId, `Writing ${HOOK_STYLES.length} takes for your audience…`);

  const out = await structured<VariantOutput>({
    model: SMART_MODEL,
    maxTokens: 6144,
    schemaName: "post_variants",
    system: `You are an elite LinkedIn ghostwriter. You write posts that feel human and specific, never generic. LinkedIn formatting rules: short lines, generous whitespace, no markdown syntax (no **, no #), hooks must survive the "...see more" fold (first ~210 chars decide everything). Never use hashtag spam; at most 0-3 relevant hashtags at the end, often none.`,
    prompt: `The creator${ws?.name ? ` (${ws.name} — ${ws.headline ?? ""})` : ""} wants to post about:

Topic: ${campaign.productName}
Brief: ${campaign.brief}

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

Write ${HOOK_STYLES.length} variants of this post, one per hook style: ${HOOK_STYLES.join(", ")}.
- "contrarian": open by challenging a belief this audience holds
- "story": open with a specific first-person moment
- "data-led": open with a concrete number/result
- "direct-value": open by naming the audience's pain and the payoff
- "question": open with a question this audience genuinely argues about

Each post: 80-180 words, aimed at the goal above, ending with the CTA style that goal calls for.`,
    schema: {
      type: "object",
      properties: {
        variants: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hookStyle: { type: "string", enum: [...HOOK_STYLES] },
              text: { type: "string" },
            },
            required: ["hookStyle", "text"],
          },
        },
      },
      required: ["variants"],
    },
  });

  await db.insert(variants).values(
    out.variants.map((v) => ({
      campaignId,
      segmentId: audience.id,
      hookStyle: v.hookStyle,
      text: v.text,
    })),
  );

  await db.update(campaigns).set({ status: "generated" }).where(eq(campaigns.id, campaignId));
  return { campaignId, variants: out.variants.length };
}
