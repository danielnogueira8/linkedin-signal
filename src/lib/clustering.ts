import {
  db,
  engagers,
  segments,
  segmentMembers,
  type SegmentTraits,
  type AudienceComposition,
} from "@/db";
import { eq } from "drizzle-orm";
import { structured, SMART_MODEL } from "./llm";
import { setProgress } from "./jobs";
import { clearSegmentation } from "./reset";

type ProfileOutput = {
  description: string;
  composition: AudienceComposition[];
  seniority: string;
  industries: string[];
  contentPreferences: string;
  toneGuidance: string;
  scrollStoppers: string;
};

/**
 * Synthesizes ONE audience profile from all engagers. LinkedIn posts go to
 * everyone at once — so instead of splitting the audience into targeting
 * buckets, we build a single rich profile whose composition mix later drives
 * proportional persona sampling in the AI Arena.
 */
export async function clusterAudience(jobId: number, workspaceId: number) {
  await setProgress(jobId, "Loading engagers…");
  const people = await db.query.engagers.findMany({
    where: eq(engagers.workspaceId, workspaceId),
    orderBy: (e, { desc }) => [desc(e.engagementScore)],
  });
  if (people.length < 5) {
    throw new Error(`Only ${people.length} engagers found — sync your audience first.`);
  }

  await setProgress(jobId, `Profiling your ${people.length} engagers…`);

  const roster = people
    .map((p, i) => {
      const comments = p.engagements
        .filter((e) => e.type === "comment" && e.commentText)
        .map((e) => `"${e.commentText}"`)
        .slice(0, 2)
        .join(" | ");
      return `${i}. ${p.name} — ${p.headline ?? "(no headline)"} — score ${p.engagementScore}${comments ? ` — comments: ${comments}` : ""}`;
    })
    .join("\n");

  const out = await structured<ProfileOutput>({
    model: SMART_MODEL,
    schemaName: "audience_profile",
    system:
      "You are an audience strategist. You synthesize a LinkedIn creator's active engagers into ONE sharp audience profile the creator can write for. Headlines encode role/industry — they are your primary signal; comment text reveals intent and voice.",
    prompt: `Profile this audience of ${people.length} LinkedIn engagers as ONE audience.

Rules:
- description: 2-3 sentences — who this audience is and why they engage with this creator.
- composition: 3-6 role/interest groups with emoji and integer percents summing to ~100, largest first (e.g. "AI Builders" 40%). This is a lens on the mix, not separate targets.
- seniority: one phrase for the overall mix.
- industries: 3-5 items.
- contentPreferences: how they consume content (formats, depth, tone).
- toneGuidance: how the creator should write for them.
- scrollStoppers: what reliably makes this audience stop scrolling.

Engagers:
${roster}`,
    schema: {
      type: "object",
      properties: {
        description: { type: "string" },
        composition: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              emoji: { type: "string" },
              percent: { type: "integer" },
            },
            required: ["label", "emoji", "percent"],
          },
        },
        seniority: { type: "string" },
        industries: { type: "array", items: { type: "string" } },
        contentPreferences: { type: "string" },
        toneGuidance: { type: "string" },
        scrollStoppers: { type: "string" },
      },
      required: [
        "description",
        "composition",
        "seniority",
        "industries",
        "contentPreferences",
        "toneGuidance",
        "scrollStoppers",
      ],
    },
  });

  await setProgress(jobId, "Saving your audience profile…");

  // Replace previous profile (cascades to derived variants/simulations)
  await clearSegmentation(workspaceId);

  const traits: SegmentTraits = {
    seniority: out.seniority,
    industries: out.industries,
    contentPreferences: out.contentPreferences,
    toneGuidance: out.toneGuidance,
    composition: out.composition,
    scrollStoppers: out.scrollStoppers,
  };

  const [row] = await db
    .insert(segments)
    .values({
      workspaceId,
      name: "Your audience",
      emoji: "🎯",
      description: out.description,
      size: people.length,
      traits,
    })
    .returning();

  for (let i = 0; i < people.length; i += 200) {
    await db.insert(segmentMembers).values(
      people.slice(i, i + 200).map((p) => ({ segmentId: row.id, engagerId: p.id })),
    );
  }

  return { workspaceId, segments: 1, engagers: people.length };
}
