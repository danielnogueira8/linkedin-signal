import {
  db,
  campaigns,
  variants,
  simulations,
  personaScores,
  segments,
  segmentMembers,
} from "@/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Re-segmenting invalidates everything derived from the old segments
 * (variants, simulations, persona scores). Delete children before parents so
 * FK constraints hold; campaigns survive but drop back to draft.
 */
export async function clearSegmentation(workspaceId: number) {
  const camps = await db.query.campaigns.findMany({
    where: eq(campaigns.workspaceId, workspaceId),
  });
  const campIds = camps.map((c) => c.id);

  if (campIds.length > 0) {
    const sims = await db.query.simulations.findMany({
      where: inArray(simulations.campaignId, campIds),
    });
    const simIds = sims.map((s) => s.id);
    if (simIds.length > 0) {
      await db.delete(personaScores).where(inArray(personaScores.simulationId, simIds));
      await db.delete(simulations).where(inArray(simulations.id, simIds));
    }
    await db.delete(variants).where(inArray(variants.campaignId, campIds));
    await db
      .update(campaigns)
      .set({ status: "draft" })
      .where(inArray(campaigns.id, campIds));
  }

  const segs = await db.query.segments.findMany({
    where: eq(segments.workspaceId, workspaceId),
  });
  const segIds = segs.map((s) => s.id);
  if (segIds.length > 0) {
    await db.delete(segmentMembers).where(inArray(segmentMembers.segmentId, segIds));
    await db.delete(segments).where(inArray(segments.id, segIds));
  }
}
