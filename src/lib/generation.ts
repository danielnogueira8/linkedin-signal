import { db, campaigns, segments, variants, workspaces } from "@/db";
import { eq } from "drizzle-orm";
import { structured, SMART_MODEL } from "./llm";
import { setProgress } from "./jobs";

const HOOK_STYLES = ["contrarian", "story", "data-led", "direct-value"] as const;

type VariantOutput = {
  variants: { hookStyle: string; text: string }[];
};

export async function generateVariants(jobId: number, campaignId: number) {
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!campaign) throw new Error("Campaign not found");
  const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, campaign.workspaceId) });
  const segs = await db.query.segments.findMany({
    where: eq(segments.workspaceId, campaign.workspaceId),
  });
  if (segs.length === 0) throw new Error("No segments yet — run Audience Map first.");

  // Fresh generation replaces previous variants
  await db.delete(variants).where(eq(variants.campaignId, campaignId));

  let done = 0;
  for (const seg of segs) {
    await setProgress(jobId, `Writing variants for ${seg.emoji} ${seg.name} (${++done}/${segs.length})…`);

    const out = await structured<VariantOutput>({
      model: SMART_MODEL,
      maxTokens: 4096,
      schemaName: "post_variants",
      system: `You are an elite LinkedIn ghostwriter. You write posts that feel human and specific, never generic. LinkedIn formatting rules: short lines, generous whitespace, no markdown syntax (no **, no #), hooks must survive the "...see more" fold (first ~210 chars decide everything). Never use hashtag spam; at most 0-3 relevant hashtags at the end, often none.`,
      prompt: `The creator${ws?.name ? ` (${ws.name} — ${ws.headline ?? ""})` : ""} is launching:

Product: ${campaign.productName}
Brief: ${campaign.brief}
Goal: ${campaign.goal}

Write ${HOOK_STYLES.length} LinkedIn post variants announcing this, each targeted specifically at this audience niche:

Niche: ${seg.emoji} ${seg.name} — ${seg.description}
Seniority: ${seg.traits?.seniority}
Industries: ${seg.traits?.industries?.join(", ")}
How they consume content: ${seg.traits?.contentPreferences}
Tone guidance: ${seg.traits?.toneGuidance}

One variant per hook style: ${HOOK_STYLES.join(", ")}.
- "contrarian": open by challenging a belief this niche holds
- "story": open with a specific first-person moment
- "data-led": open with a concrete number/result
- "direct-value": open by naming the niche's pain and the payoff

Each post: 80-180 words, written entirely for THIS niche, ending with a clear next step (comment keyword, link in comments, or DM).`,
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
        segmentId: seg.id,
        hookStyle: v.hookStyle,
        text: v.text,
      })),
    );
  }

  await db.update(campaigns).set({ status: "generated" }).where(eq(campaigns.id, campaignId));
  return { campaignId, segments: segs.length, variants: segs.length * HOOK_STYLES.length };
}
