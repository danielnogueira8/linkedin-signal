/**
 * Deterministic stand-ins for the three Claude-powered steps, used when
 * DEMO_MODE=1 so the entire product loop runs with zero API keys and zero
 * spend. Live mode (DEMO_MODE unset) uses the real engines.
 */
import {
  db,
  engagers,
  segments,
  segmentMembers,
  campaigns,
  variants,
  simulations,
  personaScores,
  workspaces,
  type SegmentTraits,
  type Persona,
  type VariantResult,
} from "@/db";
import { eq, inArray } from "drizzle-orm";
import { setProgress } from "./jobs";
import { clearSegmentation } from "./reset";

// ---------- clustering ----------

const NICHE_RULES: {
  name: string;
  emoji: string;
  description: string;
  keywords: RegExp;
  traits: SegmentTraits;
}[] = [
  {
    name: "AI Builders",
    emoji: "🤖",
    description: "Engineers and technical founders building with LLMs — they follow you for the how, not the hype.",
    keywords: /\b(ml|ai|llm|engineer|cto|rag|agent|scientist|software|open.?source)\b/i,
    traits: {
      seniority: "Senior ICs and technical founders",
      industries: ["AI/ML", "Developer tools", "SaaS"],
      contentPreferences: "Technical depth, benchmarks, architecture details; allergic to fluff",
      toneGuidance: "Precise and concrete. Show the machinery. Never oversell.",
    },
  },
  {
    name: "Founders & VC",
    emoji: "🚀",
    description: "Company builders and investors who read you for GTM insight and market signal.",
    keywords: /\b(founder|ceo|co-founder|angel|investor|principal|fund|yc|exited|bootstrapped)\b/i,
    traits: {
      seniority: "Founders, executives and investors",
      industries: ["Venture", "B2B SaaS", "Startups"],
      contentPreferences: "Numbers, playbooks, contrarian takes with receipts",
      toneGuidance: "Confident and outcome-first. Lead with the result, then the lesson.",
    },
  },
  {
    name: "Growth & Marketing",
    emoji: "📈",
    description: "Growth leads, content marketers and ghostwriters mining your posts for tactics they can ship this week.",
    keywords: /\b(growth|marketing|content|seo|brand|demand|social|ghostwriter|lifecycle)\b/i,
    traits: {
      seniority: "Managers to VPs",
      industries: ["Marketing", "B2B SaaS", "Agencies"],
      contentPreferences: "Frameworks, before/after data, swipeable tactics",
      toneGuidance: "Actionable and structured. Give them something to steal.",
    },
  },
  {
    name: "Talent & HR",
    emoji: "🧭",
    description: "Recruiters and people-ops leaders tracking the teams and tools behind the products.",
    keywords: /\b(recruiter|talent|people|hiring|hr|employer)\b/i,
    traits: {
      seniority: "Mid to senior talent professionals",
      industries: ["Recruiting", "People Ops"],
      contentPreferences: "Team stories, hiring signals, culture insights",
      toneGuidance: "Human and story-led. People over product.",
    },
  },
  {
    name: "Sales Pros",
    emoji: "🎯",
    description: "AEs and SDR leaders who treat your engager threads as pipeline.",
    keywords: /\b(sales|ae|sdr|account executive|outbound|meddic)\b/i,
    traits: {
      seniority: "ICs and first-line managers",
      industries: ["Sales", "RevOps"],
      contentPreferences: "Social-selling plays, prospecting angles, quick wins",
      toneGuidance: "Direct, energetic, benefit-forward.",
    },
  },
  {
    name: "Students & Early Career",
    emoji: "🌱",
    description: "Builders-in-training who amplify everything and convert into your loudest evangelists.",
    keywords: /\b(student|grad|aspiring|junior|intern)\b/i,
    traits: {
      seniority: "Students and early career",
      industries: ["Education", "Tech"],
      contentPreferences: "Behind-the-scenes, learning-in-public, accessible explainers",
      toneGuidance: "Welcoming and generous. Explain the why.",
    },
  },
];

export async function demoCluster(jobId: number, workspaceId: number) {
  await setProgress(jobId, "Clustering engagers (demo engine)…");
  const people = await db.query.engagers.findMany({ where: eq(engagers.workspaceId, workspaceId) });
  if (people.length === 0) throw new Error("No engagers — sync first.");

  await clearSegmentation(workspaceId);

  // Match specific roles (recruiter, sales, student) before broad ones — a
  // "Technical Recruiter hiring for AI startups" belongs in Talent, not AI.
  const matchOrder = [
    "Talent & HR",
    "Sales Pros",
    "Students & Early Career",
    "Growth & Marketing",
    "AI Builders",
    "Founders & VC",
  ].map((name) => NICHE_RULES.find((r) => r.name === name)!);

  const buckets = new Map<string, number[]>();
  for (const p of people) {
    const rule =
      matchOrder.find((r) => r.keywords.test(p.headline ?? "")) ??
      NICHE_RULES[1]; // default: Founders & VC
    buckets.set(rule.name, [...(buckets.get(rule.name) ?? []), p.id]);
  }

  let saved = 0;
  for (const rule of NICHE_RULES) {
    const memberIds = buckets.get(rule.name);
    if (!memberIds?.length) continue;
    const [row] = await db
      .insert(segments)
      .values({
        workspaceId,
        name: rule.name,
        emoji: rule.emoji,
        description: rule.description,
        size: memberIds.length,
        traits: rule.traits,
      })
      .returning();
    await db
      .insert(segmentMembers)
      .values(memberIds.map((id) => ({ segmentId: row.id, engagerId: id })));
    saved++;
  }
  return { workspaceId, segments: saved };
}

// ---------- generation ----------

export async function demoGenerate(jobId: number, campaignId: number) {
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!campaign) throw new Error("Campaign not found");
  const segs = await db.query.segments.findMany({
    where: eq(segments.workspaceId, campaign.workspaceId),
  });
  if (segs.length === 0) throw new Error("No segments yet — run Audience Map first.");

  await db.delete(variants).where(eq(variants.campaignId, campaignId));

  const p = campaign.productName;
  let done = 0;
  for (const seg of segs) {
    await setProgress(jobId, `Writing variants for ${seg.emoji} ${seg.name} (${++done}/${segs.length})…`);
    const who = seg.name.toLowerCase();
    const texts: Record<string, string> = {
      contrarian: `Unpopular opinion for ${who}:\n\nmost launches fail before the first post goes live.\n\nNot because the product is bad —\nbecause the announcement was written for everyone,\nwhich means it landed with no one.\n\nWe built ${p} to fix exactly that.\n\n${campaign.brief.split(".")[0]}.\n\nIf you want early access, comment "SIGNAL" and I'll DM you.`,
      story: `Three weeks ago I watched a great product launch die on LinkedIn.\n\n400 followers saw it. 6 reacted. Zero signed up.\n\nThe post wasn't bad — it just wasn't for anyone in particular.\n\nThat's the exact problem ${p} solves for ${who}.\n\n${campaign.brief.split(".")[0]}.\n\nEarly access is open — comment "SIGNAL" and I'll send it over.`,
      "data-led": `We analyzed why launch posts flop:\n\n→ 92% are written for a "general audience"\n→ posts aimed at ONE niche get 3-5x the comments\n→ engagers convert 8x better than passive followers\n\n${p} operationalizes this for ${who}.\n\n${campaign.brief.split(".")[0]}.\n\nComment "SIGNAL" for early access.`,
      "direct-value": `If you're in ${who}, this is for you.\n\nYou know the pain: you ship something great, post about it, and the feed shrugs.\n\n${p} changes the odds:\n\n${campaign.brief.split(".")[0]}.\n\nNo guesswork. No posting into the void.\n\nComment "SIGNAL" and I'll DM you early access.`,
    };
    await db.insert(variants).values(
      Object.entries(texts).map(([hookStyle, text]) => ({
        campaignId,
        segmentId: seg.id,
        hookStyle,
        text,
      })),
    );
  }

  await db.update(campaigns).set({ status: "generated" }).where(eq(campaigns.id, campaignId));
  return { campaignId, segments: segs.length, variants: segs.length * 4 };
}

// ---------- wind tunnel ----------

const DEMO_PERSONA_NAMES = ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan"];
const RATIONALES: Record<string, string[]> = {
  high: [
    "This opens with exactly the problem I complain about weekly — I'd stop and read.",
    "The specificity sells it. Feels written for my feed, not everyone's.",
    "Concrete and useful. I'd probably comment to grab the resource.",
  ],
  mid: [
    "Decent hook but I've seen this framing before — might skim, might not.",
    "I'd pause, but the CTA feels like every other launch post this month.",
    "Interesting idea, though the middle loses me a little.",
  ],
  low: [
    "Reads like a launch announcement — I scroll past those on autopilot.",
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
      `Wind tunnel: variant ${++vDone}/${allVariants.length} vs ${seg.name} agents…`,
    );
    await new Promise((r) => setTimeout(r, 400)); // let the simulation breathe in the UI

    const rand = mulberry32(variant.id * 7919 + seg.id * 104729);
    // Text-feature heuristics: numbers and niche-name mentions help; length hurts past ~1200 chars
    const hasNumbers = /\d/.test(variant.text) ? 0.08 : 0;
    const namesNiche = variant.text.toLowerCase().includes(seg.name.toLowerCase()) ? 0.1 : 0;
    const lengthPenalty = Math.max(0, (variant.text.length - 1200) / 4000);
    const hookBonus = { contrarian: 0.06, story: 0.09, "data-led": 0.07, "direct-value": 0.03 }[
      variant.hookStyle
    ] ?? 0;
    const base = 0.32 + hasNumbers + namesNiche + hookBonus - lengthPenalty;

    const personaScoreRows = DEMO_PERSONA_NAMES.map((name, i) => {
      const jitter = (rand() - 0.5) * 0.3;
      const scrollStop = clamp01(base + jitter + 0.15);
      const readThrough = clamp01(scrollStop * (0.7 + rand() * 0.25));
      const react = clamp01(scrollStop * (0.55 + rand() * 0.3));
      const comment = clamp01(react * (0.35 + rand() * 0.3));
      const repost = clamp01(react * (0.2 + rand() * 0.25));
      const tier = scrollStop > 0.55 ? "high" : scrollStop > 0.35 ? "mid" : "low";
      const persona: Persona = {
        name: `${name} (${seg.name})`,
        headline: seg.traits?.seniority ?? seg.name,
        segmentId: seg.id,
        bio: `Synthetic ${seg.name} agent #${i + 1}, grounded in this niche's real engagers.`,
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
