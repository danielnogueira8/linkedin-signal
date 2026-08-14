import {
  db,
  campaigns,
  segments,
  segmentMembers,
  engagers,
  posts,
  variants,
  simulations,
  personaScores,
  type Persona,
  type PersonaScore,
  type VariantResult,
} from "@/db";
import { eq, inArray } from "drizzle-orm";
import { structured, SMART_MODEL, FAST_MODEL } from "./llm";
import { setProgress } from "./jobs";

const PERSONAS_PER_SEGMENT = 8;

type PersonaBatch = { personas: { name: string; headline: string; bio: string }[] };
type ScoreOutput = PersonaScore & { rationale: string };

export async function runArena(jobId: number, campaignId: number) {
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!campaign) throw new Error("Campaign not found");

  const allVariants = await db.query.variants.findMany({
    where: eq(variants.campaignId, campaignId),
  });
  if (allVariants.length === 0) throw new Error("No variants — generate content first.");

  const segIds = [...new Set(allVariants.map((v) => v.segmentId))];
  const segs = await db.query.segments.findMany({ where: inArray(segments.id, segIds) });

  const baseline = await historicalBaseline(campaign.workspaceId);

  const [sim] = await db
    .insert(simulations)
    .values({ campaignId, status: "running" })
    .returning();

  try {
    // 1) Synthesize personas per segment, grounded in real member data
    const personasBySegment = new Map<number, Persona[]>();
    for (const seg of segs) {
      await setProgress(jobId, `Synthesizing ${PERSONAS_PER_SEGMENT} audience agents…`);
      const memberRows = await db
        .select({ e: engagers })
        .from(segmentMembers)
        .innerJoin(engagers, eq(segmentMembers.engagerId, engagers.id))
        .where(eq(segmentMembers.segmentId, seg.id))
        .limit(30);

      const sample = memberRows
        .map(({ e }) => {
          const comment = e.engagements.find((ev) => ev.commentText)?.commentText;
          return `- ${e.name}: ${e.headline ?? "?"}${comment ? ` (commented: "${comment}")` : ""}`;
        })
        .join("\n");

      const batch = await structured<PersonaBatch>({
        model: SMART_MODEL,
        maxTokens: 3000,
        schemaName: "personas",
        system:
          "You create realistic synthetic LinkedIn user personas for content testing. Personas must be grounded in the real audience sample provided — same roles, seniority mix, and interests — but fictional individuals.",
        prompt: `Create ${PERSONAS_PER_SEGMENT} distinct personas representing this audience:

${seg.emoji} ${seg.name} — ${seg.description}
Traits: ${JSON.stringify(seg.traits)}

IMPORTANT: sample personas PROPORTIONALLY to the composition percentages in the traits — if a group is 40% of the audience, roughly 40% of personas belong to it. The panel must feel like the real mix, not one archetype repeated.

Real members (sample):
${sample}

Vary seniority, skepticism level, and scrolling behavior. bio: 2-3 sentences covering what makes them stop scrolling, what they ignore, and what makes them comment.`,
        schema: {
          type: "object",
          properties: {
            personas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  headline: { type: "string" },
                  bio: { type: "string" },
                },
                required: ["name", "headline", "bio"],
              },
            },
          },
          required: ["personas"],
        },
      });

      personasBySegment.set(
        seg.id,
        batch.personas.map((p) => ({ ...p, segmentId: seg.id })),
      );
    }

    // 2) Score every variant against its segment's personas (fast model, parallel)
    const results: VariantResult[] = [];
    let vDone = 0;
    for (const variant of allVariants) {
      const seg = segs.find((s) => s.id === variant.segmentId)!;
      const personas = personasBySegment.get(variant.segmentId) ?? [];
      await setProgress(
        jobId,
        `AI Arena: variant ${++vDone}/${allVariants.length} vs ${personas.length} audience agents…`,
      );

      const scores = await Promise.all(
        personas.map((persona) =>
          scorePersonaVariant(persona, variant.text).then(async (s) => {
            await db.insert(personaScores).values({
              simulationId: sim.id,
              variantId: variant.id,
              persona,
              scores: {
                scrollStop: s.scrollStop,
                readThrough: s.readThrough,
                react: s.react,
                comment: s.comment,
                repost: s.repost,
              },
              rationale: s.rationale,
            });
            return s;
          }),
        ),
      );

      results.push(aggregate(variant.id, seg.id, seg.size, scores));
    }

    // Calibrate absolute predictions to the creator's real post history: the
    // run-average take predicts ≈ their median post; better takes scale up.
    calibratePredictions(results, baseline);

    // 3) Winners: best engagementIndex per segment + overall
    for (const segId of segIds) {
      const inSeg = results.filter((r) => r.segmentId === segId);
      const best = inSeg.reduce((a, b) => (b.engagementIndex > a.engagementIndex ? b : a));
      best.isWinner = true;
    }
    // Overall winner weighs absolute predicted engagement, not just per-persona
    // quality — a tiny niche shouldn't beat a large one for the single best post.
    const impact = (r: VariantResult) =>
      r.predictedReactions + r.predictedComments * 3 + r.predictedReposts * 2;
    const overall = results.reduce((a, b) => (impact(b) > impact(a) ? b : a));
    await db
      .update(variants)
      .set({ status: "winner" })
      .where(
        inArray(
          variants.id,
          results.filter((r) => r.isWinner).map((r) => r.variantId),
        ),
      );

    await db
      .update(simulations)
      .set({ status: "done", results: { variants: results, overallWinnerVariantId: overall.variantId } })
      .where(eq(simulations.id, sim.id));
    await db.update(campaigns).set({ status: "simulated" }).where(eq(campaigns.id, campaignId));

    return { simulationId: sim.id, variantsTested: allVariants.length };
  } catch (err) {
    await db.update(simulations).set({ status: "error" }).where(eq(simulations.id, sim.id));
    throw err;
  }
}

async function scorePersonaVariant(persona: Persona, postText: string): Promise<ScoreOutput> {
  return structured<ScoreOutput>({
    model: FAST_MODEL,
    maxTokens: 1000,
    schemaName: "engagement_prediction",
    system: `You simulate ONE specific LinkedIn user scrolling their feed. Stay ruthlessly in character — most posts get scrolled past. Scores are probabilities 0-1.

CALIBRATION — hold this scale or your scores are useless:
- A typical decent post: scrollStop 0.15-0.35, readThrough 0.3-0.5 (of those who stop), react 0.05-0.15, comment 0.01-0.05, repost 0.005-0.02.
- Only a post you would genuinely screenshot-and-send scores scrollStop above 0.6.
- Commenting is rare and costly: reserve comment > 0.3 for posts that hit YOUR specific situation dead-on.
- If you're unsure, score LOWER. Generous scoring is a failure mode.`,
    prompt: `You are:
${persona.name} — ${persona.headline}
${persona.bio}

This post appears in your feed (first 210 chars visible before "...see more"):

---
${postText}
---

Score honestly: scrollStop (do you pause?), readThrough (if paused, do you expand and finish?), react (like/celebrate/etc.), comment, repost. rationale: one sentence in character.`,
    schema: {
      type: "object",
      properties: {
        scrollStop: { type: "number" },
        readThrough: { type: "number" },
        react: { type: "number" },
        comment: { type: "number" },
        repost: { type: "number" },
        rationale: { type: "string" },
      },
      required: ["scrollStop", "readThrough", "react", "comment", "repost", "rationale"],
    },
  });
}

/**
 * The persona panel scores with honest real-world probabilities (a great post
 * stops ~35% of scrollers; 1-5% comment), so the raw weighted blend tops out
 * around ~0.26. Rescale for display using the same anchors the judges hold:
 * a typical decent post (raw ≈ 0.088) reads 50; exceptional (raw ≈ 0.258)
 * reads 95. 80+ means "clearly above your usual bar", matching the critic.
 */
export function scaleEngagementIndex(rawBlend: number): number {
  const TYPICAL = 0.088; // → 50
  const EXCEPTIONAL = 0.258; // → 95
  const scaled = 50 + ((rawBlend - TYPICAL) * (95 - 50)) / (EXCEPTIONAL - TYPICAL);
  return Math.round(Math.max(2, Math.min(99, scaled)));
}

type Baseline = { reactions: number; comments: number };

/** Median engagement of the creator's real scraped posts. */
async function historicalBaseline(workspaceId: number): Promise<Baseline | null> {
  const rows = await db.query.posts.findMany({ where: eq(posts.workspaceId, workspaceId) });
  const reactions = rows.map((p) => p.reactionCount).filter((n) => n > 0);
  if (reactions.length < 3) return null; // not enough history to calibrate
  const comments = rows.map((p) => p.commentCount);
  return { reactions: median(reactions), comments: Math.max(1, median(comments)) };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/**
 * Re-anchor absolute counts: predictions scale off the creator's median post
 * (their audience's demonstrated behavior) by each take's performance relative
 * to the run average, instead of an invented reach multiplier.
 */
function calibratePredictions(results: VariantResult[], baseline: Baseline | null) {
  if (!baseline || results.length === 0) return; // keep uncalibrated fallback
  const meanOf = (f: (r: VariantResult) => number) =>
    results.reduce((a, r) => a + f(r), 0) / results.length || 1;
  const meanReact = meanOf((r) => r.predictedReactions);
  const meanComment = meanOf((r) => r.predictedComments);
  const meanRepost = meanOf((r) => r.predictedReposts);

  for (const r of results) {
    const relReact = meanReact > 0 ? r.predictedReactions / meanReact : 1;
    const relComment = meanComment > 0 ? r.predictedComments / meanComment : 1;
    const relRepost = meanRepost > 0 ? r.predictedReposts / meanRepost : 1;
    r.predictedReactions = Math.round(baseline.reactions * relReact);
    r.predictedComments = Math.round(baseline.comments * relComment);
    // repost history isn't scraped; anchor to a conservative share of reactions
    r.predictedReposts = Math.round(Math.max(baseline.reactions * 0.05, 1) * relRepost);
  }
}

function aggregate(
  variantId: number,
  segmentId: number,
  segmentSize: number,
  scores: ScoreOutput[],
): VariantResult {
  const mean = (k: keyof PersonaScore) => scores.reduce((a, s) => a + s[k], 0) / scores.length;
  const scrollStopRate = mean("scrollStop");
  const readThroughRate = mean("readThrough");
  const react = mean("react");
  const comment = mean("comment");
  const repost = mean("repost");

  // Confidence: 1 - normalized std-dev of the composite persona scores
  const composites = scores.map((s) => (s.scrollStop + s.react * 2 + s.comment * 3 + s.repost * 2) / 8);
  const cMean = composites.reduce((a, b) => a + b, 0) / composites.length;
  const variance = composites.reduce((a, b) => a + (b - cMean) ** 2, 0) / composites.length;
  const confidence = Math.max(0, Math.min(1, 1 - Math.sqrt(variance) * 2));

  // Project counts: engager segment is ~the reachable core; feed reach multiplies it
  const reach = segmentSize * 8;
  return {
    variantId,
    segmentId,
    scrollStopRate: round2(scrollStopRate),
    readThroughRate: round2(readThroughRate),
    predictedReactions: Math.round(reach * scrollStopRate * react),
    predictedComments: Math.round(reach * scrollStopRate * comment),
    predictedReposts: Math.round(reach * scrollStopRate * repost),
    engagementIndex: scaleEngagementIndex(
      scrollStopRate * 0.2 + react * 0.25 + comment * 0.35 + repost * 0.2,
    ),
    confidence: round2(confidence),
    isWinner: false,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
