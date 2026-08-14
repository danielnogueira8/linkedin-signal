import {
  db,
  campaigns,
  segments,
  segmentMembers,
  engagers,
  variants,
  simulations,
  personaScores,
  workspaces,
  type Persona,
  type VariantResult,
  type SegmentTraits,
  type AudienceComposition,
} from "@/db";
import { eq, inArray } from "drizzle-orm";
import { setProgress } from "./jobs";
import { clearSegmentation } from "./reset";
import { goalFor } from "./goals";

/**
 * Demo engine: deterministic stand-ins for the AI stages so the whole product
 * loop runs with zero API spend. Mirrors the real engine's shapes exactly —
 * one audience profile, goal-aware takes, proportional persona panel.
 */

// ---------- audience profile ----------

const GROUP_RULES: { label: string; emoji: string; keywords: RegExp }[] = [
  { label: "Talent & HR", emoji: "🧭", keywords: /\b(recruiter|talent|people|hiring|hr|employer)\b/i },
  { label: "Sales Pros", emoji: "📞", keywords: /\b(sales|ae|sdr|account executive|outbound|meddic)\b/i },
  { label: "Students & Early Career", emoji: "🌱", keywords: /\b(student|grad|aspiring|junior|intern)\b/i },
  { label: "Growth & Marketing", emoji: "📈", keywords: /\b(growth|marketing|content|seo|brand|demand|social|ghostwriter|lifecycle)\b/i },
  { label: "AI Builders", emoji: "🤖", keywords: /\b(ml|ai|llm|engineer|cto|rag|agent|scientist|software|open.?source)\b/i },
  { label: "Founders & VC", emoji: "🚀", keywords: /\b(founder|ceo|co-founder|angel|investor|principal|fund|yc|exited|bootstrapped)\b/i },
];

export async function demoCluster(jobId: number, workspaceId: number) {
  await setProgress(jobId, "Profiling your engagers (demo engine)…");
  const people = await db.query.engagers.findMany({ where: eq(engagers.workspaceId, workspaceId) });
  if (people.length === 0) throw new Error("No engagers — sync first.");

  await clearSegmentation(workspaceId);

  // Bucket by headline keywords (specific roles matched first), then turn the
  // mix into composition percentages for the single profile.
  const counts = new Map<string, number>();
  for (const p of people) {
    const rule = GROUP_RULES.find((r) => r.keywords.test(p.headline ?? "")) ?? GROUP_RULES[5];
    counts.set(rule.label, (counts.get(rule.label) ?? 0) + 1);
  }
  const composition: AudienceComposition[] = GROUP_RULES.filter((r) => counts.has(r.label))
    .map((r) => ({
      label: r.label,
      emoji: r.emoji,
      percent: Math.round(((counts.get(r.label) ?? 0) / people.length) * 100),
    }))
    .sort((a, b) => b.percent - a.percent);

  const top = composition.slice(0, 2);
  const traits: SegmentTraits = {
    seniority: "Mostly senior ICs, founders and team leads, with an engaged early-career tail",
    industries: ["B2B SaaS", "AI/ML", "Marketing", "Venture"],
    contentPreferences:
      "Specific and practical over broad and inspirational: frameworks, numbers, behind-the-scenes. They expand posts that promise something usable.",
    toneGuidance:
      "Write like a practitioner talking to practitioners. Concrete claims, short lines, no hype. One idea per post.",
    scrollStoppers:
      "Concrete numbers in the first line, contrarian takes on advice they've heard before, and specific stories that name real stakes.",
    composition,
  };

  await setProgress(jobId, "Saving your audience profile…");

  const [row] = await db
    .insert(segments)
    .values({
      workspaceId,
      name: "Your audience",
      emoji: "🎯",
      description: `A ${top.map((t) => t.label.toLowerCase()).join("- and ")}-heavy audience that engages when you show the machinery behind the outcome. They follow you for the how, not the hype.`,
      size: people.length,
      traits,
    })
    .returning();

  await db
    .insert(segmentMembers)
    .values(people.map((p) => ({ segmentId: row.id, engagerId: p.id })));

  return { workspaceId, segments: 1, engagers: people.length };
}

// ---------- generation ----------

const GOAL_CTAS: Record<string, string> = {
  awareness: `♻️ Repost this for the one person in your feed who needs it — and follow for more.`,
  authority: `Save this one. I break down one of these every week — follow along.`,
  leads: `Comment "SIGNAL" and I'll DM you the full breakdown.`,
  relatability: `What was your version of this? Tell me below — I read every comment.`,
};

export async function demoGenerate(jobId: number, campaignId: number) {
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!campaign) throw new Error("Campaign not found");
  const audience = await db.query.segments.findFirst({
    where: eq(segments.workspaceId, campaign.workspaceId),
  });
  if (!audience) throw new Error("No audience profile yet — build it on the Audience page first.");

  await db.delete(variants).where(eq(variants.campaignId, campaignId));

  const goal = goalFor(campaign.goal);
  await setProgress(jobId, `Writing 5 takes for the ${goal.label} goal (demo engine)…`);

  const p = campaign.productName;
  const firstLine = campaign.brief.split(".")[0];
  const cta = GOAL_CTAS[campaign.goal] ?? GOAL_CTAS.awareness;

  const texts: Record<string, string> = {
    contrarian: `Unpopular opinion:\n\nmost advice about ${p.toLowerCase()} is written for everyone —\nwhich means it lands with no one.\n\n${firstLine}.\n\nThe people who get this right don't work harder.\nThey just stopped guessing.\n\n${cta}`,
    story: `Three weeks ago I watched a great post die on LinkedIn.\n\n400 followers saw it. 6 reacted. Zero conversations.\n\nThe post wasn't bad — it just wasn't for anyone in particular.\n\nThat moment changed how I think about ${p.toLowerCase()}.\n\n${firstLine}.\n\n${cta}`,
    "data-led": `I looked at the numbers behind ${p.toLowerCase()}:\n\n→ 92% of posts are written for a "general audience"\n→ posts aimed at a specific reader get 3-5x the comments\n→ engagers convert 8x better than passive followers\n\n${firstLine}.\n\n${cta}`,
    "direct-value": `If ${p.toLowerCase()} is on your plate this quarter, read this.\n\nYou know the pain: you do the work, share it, and the feed shrugs.\n\nHere's what actually moves the needle:\n\n${firstLine}.\n\nNo guesswork. No posting into the void.\n\n${cta}`,
    question: `Honest question:\n\nwhen was the last time ${p.toLowerCase()} actually worked the way you hoped?\n\nMost people I ask go quiet.\n\n${firstLine}.\n\nThat gap — between effort and outcome — is fixable.\n\n${cta}`,
  };

  await db.insert(variants).values(
    Object.entries(texts).map(([hookStyle, text]) => ({
      campaignId,
      segmentId: audience.id,
      hookStyle,
      text,
    })),
  );

  await db.update(campaigns).set({ status: "generated" }).where(eq(campaigns.id, campaignId));
  return { campaignId, variants: 5 };
}

// ---------- AI Arena ----------

const DEMO_PERSONA_NAMES = ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Devon", "Quinn"];
const RATIONALES: Record<string, string[]> = {
  high: [
    "This opens with exactly the problem I complain about weekly — I'd stop and read.",
    "The specificity sells it. Feels written for my feed, not everyone's.",
    "Concrete and useful. I'd probably comment on this one.",
  ],
  mid: [
    "Decent hook but I've seen this framing before — might skim, might not.",
    "I'd pause, but the CTA feels like every other post this month.",
    "Interesting idea, though the middle loses me a little.",
  ],
  low: [
    "Reads like a template — I scroll past these on autopilot.",
    "Not my problem space; the hook doesn't name anything I care about.",
    "Too salesy for my feed. I'd keep scrolling.",
  ],
};

// Seeded PRNG so demo results are stable across runs
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function demoSimulate(jobId: number, campaignId: number) {
  const allVariants = await db.query.variants.findMany({
    where: eq(variants.campaignId, campaignId),
  });
  if (allVariants.length === 0) throw new Error("No variants — generate content first.");

  const segIds = [...new Set(allVariants.map((v) => v.segmentId))];
  const segs = await db.query.segments.findMany({ where: inArray(segments.id, segIds) });
  const [sim] = await db.insert(simulations).values({ campaignId, status: "running" }).returning();

  const results: VariantResult[] = [];
  let vDone = 0;
  for (const variant of allVariants) {
    const seg = segs.find((s) => s.id === variant.segmentId)!;
    await setProgress(
      jobId,
      `AI Arena: take ${++vDone}/${allVariants.length} vs ${DEMO_PERSONA_NAMES.length} audience agents…`,
    );
    await new Promise((r) => setTimeout(r, 400)); // let the simulation breathe in the UI

    const rand = mulberry32(variant.id * 7919 + seg.id * 104729);
    // Text-feature heuristics: numbers help; length hurts past ~1200 chars
    const hasNumbers = /\d/.test(variant.text) ? 0.08 : 0;
    const lengthPenalty = Math.max(0, (variant.text.length - 1200) / 4000);
    const hookBonus =
      { contrarian: 0.06, story: 0.09, "data-led": 0.07, "direct-value": 0.03, question: 0.05 }[
        variant.hookStyle
      ] ?? 0;
    const base = 0.36 + hasNumbers + hookBonus - lengthPenalty;

    // Persona panel mirrors the audience composition proportionally
    const composition = seg.traits?.composition ?? [];
    const groupFor = (i: number) => {
      if (composition.length === 0) return seg.name;
      let cum = 0;
      const slot = ((i + 0.5) / DEMO_PERSONA_NAMES.length) * 100;
      for (const c of composition) {
        cum += c.percent;
        if (slot <= cum) return c.label;
      }
      return composition[composition.length - 1].label;
    };

    const personaScoreRows = DEMO_PERSONA_NAMES.map((name, i) => {
      const jitter = (rand() - 0.5) * 0.3;
      const scrollStop = clamp01(base + jitter + 0.12);
      const readThrough = clamp01(scrollStop * (0.7 + rand() * 0.25));
      const react = clamp01(scrollStop * (0.55 + rand() * 0.3));
      const comment = clamp01(react * (0.35 + rand() * 0.3));
      const repost = clamp01(react * (0.2 + rand() * 0.25));
      const tier = scrollStop > 0.55 ? "high" : scrollStop > 0.35 ? "mid" : "low";
      const persona: Persona = {
        name,
        headline: groupFor(i),
        segmentId: seg.id,
        bio: `Synthetic audience agent — sampled from the ${groupFor(i)} share of your real engager mix.`,
      };
      return {
        simulationId: sim.id,
        variantId: variant.id,
        persona,
        scores: { scrollStop, readThrough, react, comment, repost },
        rationale: RATIONALES[tier][i % 3],
      };
    });
    await db.insert(personaScores).values(personaScoreRows);

    const mean = (k: "scrollStop" | "readThrough" | "react" | "comment" | "repost") =>
      personaScoreRows.reduce((a, r) => a + r.scores[k], 0) / personaScoreRows.length;
    const scrollStopRate = mean("scrollStop");
    const react = mean("react");
    const comment = mean("comment");
    const repost = mean("repost");
    const reach = seg.size * 8;
    results.push({
      variantId: variant.id,
      segmentId: seg.id,
      scrollStopRate: round2(scrollStopRate),
      readThroughRate: round2(mean("readThrough")),
      predictedReactions: Math.round(reach * scrollStopRate * react),
      predictedComments: Math.round(reach * scrollStopRate * comment),
      predictedReposts: Math.round(reach * scrollStopRate * repost),
      engagementIndex: Math.round(
        (scrollStopRate * 0.2 + react * 0.25 + comment * 0.35 + repost * 0.2) * 100,
      ),
      confidence: round2(0.6 + rand() * 0.3),
      isWinner: false,
    });
  }

  for (const segId of segIds) {
    const inSeg = results.filter((r) => r.segmentId === segId);
    const best = inSeg.reduce((a, b) => (b.engagementIndex > a.engagementIndex ? b : a));
    best.isWinner = true;
  }
  const impact = (r: VariantResult) =>
    r.predictedReactions + r.predictedComments * 3 + r.predictedReposts * 2;
  const overall = results.reduce((a, b) => (impact(b) > impact(a) ? b : a));

  await db
    .update(variants)
    .set({ status: "winner" })
    .where(inArray(variants.id, results.filter((r) => r.isWinner).map((r) => r.variantId)));
  await db
    .update(simulations)
    .set({ status: "done", results: { variants: results, overallWinnerVariantId: overall.variantId } })
    .where(eq(simulations.id, sim.id));
  await db.update(campaigns).set({ status: "simulated" }).where(eq(campaigns.id, campaignId));

  return { simulationId: sim.id, variantsTested: allVariants.length };
}

const clamp01 = (n: number) => Math.max(0.02, Math.min(0.98, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function demoWorkspaceGuard(workspaceId: number) {
  const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
  return ws;
}
