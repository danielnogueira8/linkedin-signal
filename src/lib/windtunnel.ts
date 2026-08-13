import {
  db,
  campaigns,
  segments,
  segmentMembers,
  engagers,
  variants,
  simulations,
  personaScores,
  type Persona,
  type PersonaScore,
  type VariantResult,
} from "@/db";
import { eq, inArray } from "drizzle-orm";
import { structured, SMART_MODEL, FAST_MODEL } from "./claude";
import { setProgress } from "./jobs";

const PERSONAS_PER_SEGMENT = 6;

type PersonaBatch = { personas: { name: string; headline: string; bio: string }[] };
type ScoreOutput = PersonaScore & { rationale: string };

export async function runWindTunnel(jobId: number, campaignId: number) {
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!campaign) throw new Error("Campaign not found");

  const allVariants = await db.query.variants.findMany({
    where: eq(variants.campaignId, campaignId),
  });
  if (allVariants.length === 0) throw new Error("No variants — generate content first.");

  const segIds = [...new Set(allVariants.map((v) => v.segmentId))];
  const segs = await db.query.segments.findMany({ where: inArray(segments.id, segIds) });

  const [sim] = await db
    .insert(simulations)
    .values({ campaignId, status: "running" })
    .returning();

  try {
    // 1) Synthesize personas per segment, grounded in real member data
    const personasBySegment = new Map<number, Persona[]>();
    for (const seg of segs) {
      await setProgress(jobId, `Synthesizing personas for ${seg.emoji} ${seg.name}…`);
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
        prompt: `Create ${PERSONAS_PER_SEGMENT} distinct personas representing this niche:

${seg.emoji} ${seg.name} — ${seg.description}
Traits: ${JSON.stringify(seg.traits)}

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
        `Wind tunnel: testing variant ${++vDone}/${allVariants.length} against ${personas.length} ${seg.name} agents…`,
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
    system: `You simulate ONE specific LinkedIn user scrolling their feed. Stay ruthlessly in character — most posts get scrolled past. Be calibrated: average posts score low; only content precisely aimed at this person scores high. Scores are probabilities 0-1.`,
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
    engagementIndex: Math.round((scrollStopRate * 0.2 + react * 0.25 + comment * 0.35 + repost * 0.2) * 100),
    confidence: round2(confidence),
    isWinner: false,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
