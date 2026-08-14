import { db, workspaces, engagers, posts, segments, campaigns } from "@/db";
import { eq, desc, count } from "drizzle-orm";

/** Single-user MVP: the active workspace is simply the most recent one. */
export async function getActiveWorkspace() {
  return db.query.workspaces.findFirst({ orderBy: [desc(workspaces.lastSyncedAt)] });
}

export async function getWorkspaceStats(workspaceId: number) {
  const [[e], [p], [s], [c]] = await Promise.all([
    db.select({ n: count() }).from(engagers).where(eq(engagers.workspaceId, workspaceId)),
    db.select({ n: count() }).from(posts).where(eq(posts.workspaceId, workspaceId)),
    db.select({ n: count() }).from(segments).where(eq(segments.workspaceId, workspaceId)),
    db.select({ n: count() }).from(campaigns).where(eq(campaigns.workspaceId, workspaceId)),
  ]);
  return { engagers: e.n, posts: p.n, segments: s.n, campaigns: c.n };
}
