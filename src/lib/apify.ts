import { ApifyClient } from "apify-client";
import { db, workspaces, posts, engagers, type EngagementEvent } from "@/db";
import { eq, and } from "drizzle-orm";
import { setProgress } from "./jobs";

const PROFILE_POSTS_ACTOR = "harvestapi/linkedin-profile-posts";

// Cost guards: caps keep a full sync in the $5-10 range on harvestapi pricing.
const MAX_POSTS = 20;
const MAX_REACTIONS_PER_POST = 200;
const MAX_COMMENTS_PER_POST = 100;

function client() {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not set — add it to .env.local or use DEMO_MODE=1");
  return new ApifyClient({ token });
}

/** Shape of harvestapi/linkedin-profile-posts dataset items (fields we use). */
type HarvestPost = {
  linkedinUrl?: string;
  content?: string;
  postedAt?: { timestamp?: number; date?: string };
  author?: { name?: string; info?: string; linkedinUrl?: string };
  engagement?: { likes?: number; comments?: number; shares?: number; reactions?: number };
  reactions?: HarvestReaction[];
  comments?: HarvestComment[];
};
type HarvestReaction = {
  reactionType?: string;
  actor?: { name?: string; linkedinUrl?: string; position?: string };
};
type HarvestComment = {
  commentary?: string;
  createdAt?: { timestamp?: number };
  actor?: { name?: string; linkedinUrl?: string; position?: string };
};

export async function syncWorkspace(jobId: number, linkedinUrl: string) {
  await setProgress(jobId, "Launching LinkedIn scrape (posts + reactions + comments)…");

  const run = await client()
    .actor(PROFILE_POSTS_ACTOR)
    .call({
      targetUrls: [linkedinUrl],
      maxPosts: MAX_POSTS,
      postedLimit: "1y",
      includeReposts: false,
      includeQuotePosts: false,
      scrapeReactions: true,
      maxReactions: MAX_REACTIONS_PER_POST,
      postNestedReactions: true,
      scrapeComments: true,
      maxComments: MAX_COMMENTS_PER_POST,
      postNestedComments: true,
    });

  await setProgress(jobId, "Scrape finished — downloading results…");
  const { items } = await client().dataset(run.defaultDatasetId).listItems();
  const harvestPosts = items as unknown as HarvestPost[];
  if (harvestPosts.length === 0) {
    throw new Error("No posts found for that profile. Is the URL correct and the profile public?");
  }

  await setProgress(jobId, `Normalizing ${harvestPosts.length} posts…`);

  // Upsert workspace
  const author = harvestPosts.find((p) => p.author?.name)?.author;
  let ws = await db.query.workspaces.findFirst({ where: eq(workspaces.linkedinUrl, linkedinUrl) });
  if (!ws) {
    [ws] = await db
      .insert(workspaces)
      .values({ linkedinUrl, name: author?.name, headline: author?.info, lastSyncedAt: new Date() })
      .returning();
  } else {
    await db
      .update(workspaces)
      .set({ name: author?.name ?? ws.name, headline: author?.info ?? ws.headline, lastSyncedAt: new Date() })
      .where(eq(workspaces.id, ws.id));
  }

  // Reset previous sync for idempotent re-runs
  await db.delete(posts).where(eq(posts.workspaceId, ws.id));
  await db.delete(engagers).where(eq(engagers.workspaceId, ws.id));

  // Accumulate engager events across posts, then bulk insert
  const byProfile = new Map<
    string,
    { name: string; headline?: string; events: EngagementEvent[] }
  >();

  let postCount = 0;
  for (const hp of harvestPosts) {
    if (!hp.linkedinUrl) continue;
    const [post] = await db
      .insert(posts)
      .values({
        workspaceId: ws.id,
        url: hp.linkedinUrl,
        text: hp.content ?? "",
        postedAt: hp.postedAt?.timestamp ? new Date(hp.postedAt.timestamp) : null,
        reactionCount: hp.engagement?.reactions ?? hp.engagement?.likes ?? 0,
        commentCount: hp.engagement?.comments ?? 0,
      })
      .returning();
    postCount++;

    for (const r of hp.reactions ?? []) {
      const url = r.actor?.linkedinUrl;
      if (!url || !r.actor?.name) continue;
      const entry = byProfile.get(url) ?? { name: r.actor.name, headline: r.actor.position, events: [] };
      entry.headline ??= r.actor.position;
      entry.events.push({ postId: post.id, type: "reaction", reactionType: r.reactionType });
      byProfile.set(url, entry);
    }
    for (const c of hp.comments ?? []) {
      const url = c.actor?.linkedinUrl;
      if (!url || !c.actor?.name) continue;
      const entry = byProfile.get(url) ?? { name: c.actor.name, headline: c.actor.position, events: [] };
      entry.headline ??= c.actor.position;
      entry.events.push({
        postId: post.id,
        type: "comment",
        commentText: c.commentary?.slice(0, 500),
        at: c.createdAt?.timestamp ? new Date(c.createdAt.timestamp).toISOString() : undefined,
      });
      byProfile.set(url, entry);
    }
  }

  await setProgress(jobId, `Scoring ${byProfile.size} unique engagers…`);

  // Exclude the author themself from their own audience
  const selfUrl = author?.linkedinUrl;
  const rows = [...byProfile.entries()]
    .filter(([url]) => url !== selfUrl)
    .map(([profileUrl, e]) => ({
      workspaceId: ws.id,
      profileUrl,
      name: e.name,
      headline: e.headline ?? null,
      engagementScore: score(e.events),
      engagements: e.events,
    }));

  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(engagers).values(rows.slice(i, i + 100));
  }

  return { workspaceId: ws.id, posts: postCount, engagers: rows.length };
}

function score(events: EngagementEvent[]): number {
  const now = Date.now();
  const total = events.reduce((acc, ev) => {
    const base = ev.type === "comment" ? 3 : 1;
    const ageDays = ev.at ? (now - new Date(ev.at).getTime()) / 86400_000 : 30;
    return acc + base * Math.exp(-Math.max(0, ageDays) / 45);
  }, 0);
  return Math.round(total * 100) / 100;
}

export async function getWorkspaceEngagers(workspaceId: number) {
  return db.query.engagers.findMany({
    where: and(eq(engagers.workspaceId, workspaceId)),
  });
}
