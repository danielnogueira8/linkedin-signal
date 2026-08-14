import { db, engagers, segments, segmentMembers, type SegmentTraits } from "@/db";
import { eq } from "drizzle-orm";
import { structured, SMART_MODEL } from "./claude";
import { setProgress } from "./jobs";
import { clearSegmentation } from "./reset";

type ClusterOutput = {
  segments: {
    name: string;
    emoji: string;
    description: string;
    memberIndexes: number[];
    traits: SegmentTraits;
  }[];
};

export async function clusterAudience(jobId: number, workspaceId: number) {
  await setProgress(jobId, "Loading engagers…");
  const people = await db.query.engagers.findMany({
    where: eq(engagers.workspaceId, workspaceId),
    orderBy: (e, { desc }) => [desc(e.engagementScore)],
  });
  if (people.length < 5) {
    throw new Error(`Only ${people.length} engagers found — sync your audience first.`);
  }

  await setProgress(jobId, `Clustering ${people.length} engagers into niches with Claude…`);

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

  const out = await structured<ClusterOutput>({
    model: SMART_MODEL,
    schemaName: "audience_segments",
    system:
      "You are an audience strategist. You cluster a LinkedIn creator's active engagers into distinct, actionable niches the creator can write for. Headlines encode role/industry — they are your primary signal; comment text reveals intent and voice.",
    prompt: `Cluster these ${people.length} LinkedIn engagers into 4-7 distinct niches.

Rules:
- Every engager index (0 to ${people.length - 1}) must appear in exactly one segment.
- Segment names should be short and evocative (e.g. "AI Builders", "Talent & HR Leaders").
- Descriptions: 1-2 sentences on who they are and why they follow this creator.
- traits.seniority: one phrase. traits.industries: 2-4 items. traits.contentPreferences: how they consume (carousels? hot takes? data?). traits.toneGuidance: how to write for them.

Engagers:
${roster}`,
    schema: {
      type: "object",
      properties: {
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              emoji: { type: "string" },
              description: { type: "string" },
              memberIndexes: { type: "array", items: { type: "integer" } },
              traits: {
                type: "object",
                properties: {
                  seniority: { type: "string" },
                  industries: { type: "array", items: { type: "string" } },
                  contentPreferences: { type: "string" },
                  toneGuidance: { type: "string" },
                },
                required: ["seniority", "industries", "contentPreferences", "toneGuidance"],
              },
            },
            required: ["name", "emoji", "description", "memberIndexes", "traits"],
          },
        },
      },
      required: ["segments"],
    },
  });

  await setProgress(jobId, "Saving segments…");

  // Replace previous segmentation (cascades to derived variants/simulations)
  await clearSegmentation(workspaceId);

  let saved = 0;
  for (const seg of out.segments) {
    const validIndexes = seg.memberIndexes.filter((i) => i >= 0 && i < people.length);
    if (validIndexes.length === 0) continue;
    const [row] = await db
      .insert(segments)
      .values({
        workspaceId,
        name: seg.name,
        emoji: seg.emoji,
        description: seg.description,
        size: validIndexes.length,
        traits: seg.traits,
      })
      .returning();
    await db.insert(segmentMembers).values(
      validIndexes.map((i) => ({ segmentId: row.id, engagerId: people[i].id })),
    );
    saved++;
  }

  return { workspaceId, segments: saved };
}
