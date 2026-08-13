import { db, workspaces, posts, engagers, type EngagementEvent } from "@/db";
import { eq } from "drizzle-orm";

/**
 * Seeds a realistic demo workspace so the entire product loop works with no
 * Apify spend. Engagers are fictional but shaped like a real LinkedIn audience
 * for a founder posting about AI + growth.
 */
export async function ensureDemoWorkspace() {
  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.linkedinUrl, DEMO_PROFILE_URL),
  });
  if (existing) return existing;

  const [ws] = await db
    .insert(workspaces)
    .values({
      linkedinUrl: DEMO_PROFILE_URL,
      name: "Demo Creator",
      headline: "Founder building AI tools for go-to-market teams",
      lastSyncedAt: new Date(),
    })
    .returning();

  const insertedPosts = await db
    .insert(posts)
    .values(
      DEMO_POSTS.map((p) => ({
        workspaceId: ws.id,
        url: p.url,
        text: p.text,
        postedAt: p.postedAt,
        reactionCount: p.reactionCount,
        commentCount: p.commentCount,
      })),
    )
    .returning();

  const now = Date.now();
  const rows = DEMO_ENGAGERS.map((e, i) => {
    const events: EngagementEvent[] = e.events.map((ev) => ({
      postId: insertedPosts[ev.post].id,
      type: ev.type,
      reactionType: ev.reactionType,
      commentText: ev.commentText,
      at: new Date(now - ev.daysAgo * 86400_000).toISOString(),
    }));
    const score = events.reduce((acc, ev) => {
      const base = ev.type === "comment" ? 3 : 1;
      const ageDays = (now - new Date(ev.at!).getTime()) / 86400_000;
      return acc + base * Math.exp(-ageDays / 45);
    }, 0);
    return {
      workspaceId: ws.id,
      profileUrl: `https://linkedin.com/in/demo-person-${i}`,
      name: e.name,
      headline: e.headline,
      engagementScore: Math.round(score * 100) / 100,
      engagements: events,
    };
  });
  await db.insert(engagers).values(rows);

  return ws;
}

export const DEMO_PROFILE_URL = "https://linkedin.com/in/demo-creator";

const day = 86400_000;
const DEMO_POSTS = [
  {
    url: "https://linkedin.com/posts/demo-creator_activity-1",
    text: "I analyzed 100 SaaS launches on LinkedIn. The posts that drove signups had one thing in common: they were written for ONE specific reader, not everyone. Here's the breakdown 🧵",
    postedAt: new Date(Date.now() - 6 * day),
    reactionCount: 214,
    commentCount: 38,
  },
  {
    url: "https://linkedin.com/posts/demo-creator_activity-2",
    text: "Hot take: your follower count is a vanity metric. Your *engager* count — the people who actually stop and interact — is the only audience you really have.",
    postedAt: new Date(Date.now() - 13 * day),
    reactionCount: 156,
    commentCount: 29,
  },
  {
    url: "https://linkedin.com/posts/demo-creator_activity-3",
    text: "We shipped an AI agent that pre-tests your content against synthetic versions of your audience before you post. Wild what happens when you stop guessing.",
    postedAt: new Date(Date.now() - 21 * day),
    reactionCount: 310,
    commentCount: 52,
  },
  {
    url: "https://linkedin.com/posts/demo-creator_activity-4",
    text: "Recruiters, founders, and marketers all follow me — and they want completely different things from my content. Segmenting my audience changed how I write.",
    postedAt: new Date(Date.now() - 30 * day),
    reactionCount: 98,
    commentCount: 17,
  },
];

type DemoEvent = {
  post: number;
  type: "reaction" | "comment";
  reactionType?: string;
  commentText?: string;
  daysAgo: number;
};

type DemoEngager = { name: string; headline: string; events: DemoEvent[] };

const mk = (
  name: string,
  headline: string,
  events: DemoEvent[],
): DemoEngager => ({ name, headline, events });

export const DEMO_ENGAGERS: DemoEngager[] = [
  // --- AI builders / engineers
  mk("Sofia Ramirez", "ML Engineer @ Series B startup · building agent infra", [
    { post: 2, type: "comment", commentText: "The synthetic audience idea is genius. How do you validate persona fidelity?", daysAgo: 20 },
    { post: 0, type: "reaction", reactionType: "insightful", daysAgo: 5 },
  ]),
  mk("Dev Patel", "Staff Software Engineer · LLM apps · ex-Google", [
    { post: 2, type: "comment", commentText: "We tried something similar internally, eval drift is the hard part.", daysAgo: 19 },
    { post: 1, type: "reaction", reactionType: "like", daysAgo: 12 },
  ]),
  mk("Lena Fischer", "AI Engineer · RAG pipelines · open-source contributor", [
    { post: 2, type: "reaction", reactionType: "love", daysAgo: 21 },
    { post: 0, type: "reaction", reactionType: "like", daysAgo: 6 },
  ]),
  mk("Marcus Chen", "CTO & Co-founder · applied AI", [
    { post: 2, type: "comment", commentText: "Shipping this as an API would be huge. DM'd you.", daysAgo: 18 },
  ]),
  mk("Priya Nair", "Senior ML Scientist · personalization systems", [
    { post: 2, type: "reaction", reactionType: "insightful", daysAgo: 20 },
    { post: 3, type: "reaction", reactionType: "like", daysAgo: 29 },
  ]),
  // --- Founders / VC
  mk("Jonas Weber", "Founder & CEO @ B2B SaaS · 2x exited", [
    { post: 0, type: "comment", commentText: "The 'write for one reader' point is underrated. We rewrote our launch post this way and 3x'd replies.", daysAgo: 5 },
    { post: 1, type: "reaction", reactionType: "insightful", daysAgo: 13 },
  ]),
  mk("Amelia Stone", "Principal @ seed fund · GTM nerd", [
    { post: 0, type: "reaction", reactionType: "insightful", daysAgo: 6 },
    { post: 2, type: "comment", commentText: "Portfolio companies need this. What's pricing looking like?", daysAgo: 17 },
  ]),
  mk("Tom Okafor", "Co-founder @ devtools startup · YC alum", [
    { post: 1, type: "comment", commentText: "Engager count > follower count. Stealing this framing for our board deck.", daysAgo: 11 },
  ]),
  mk("Isabella Rossi", "Founder · bootstrapped to $2M ARR", [
    { post: 0, type: "reaction", reactionType: "love", daysAgo: 4 },
    { post: 3, type: "reaction", reactionType: "like", daysAgo: 28 },
  ]),
  mk("Ethan Brooks", "Angel investor · former founder", [
    { post: 2, type: "reaction", reactionType: "like", daysAgo: 16 },
  ]),
  // --- Marketing / growth
  mk("Chloe Dubois", "Head of Growth @ PLG SaaS · lifecycle & content", [
    { post: 0, type: "comment", commentText: "This matches our data exactly. Specific > broad every single time.", daysAgo: 6 },
    { post: 1, type: "comment", commentText: "We track 'active engagers' weekly now. Completely changed our content strategy.", daysAgo: 12 },
  ]),
  mk("Ryan Kowalski", "Content Marketing Lead · B2B demand gen", [
    { post: 0, type: "reaction", reactionType: "insightful", daysAgo: 5 },
    { post: 3, type: "comment", commentText: "Segmenting by reader intent is the whole game. Great post.", daysAgo: 29 },
  ]),
  mk("Hana Suzuki", "Growth Marketing Manager · SEO + social", [
    { post: 1, type: "reaction", reactionType: "like", daysAgo: 13 },
    { post: 0, type: "reaction", reactionType: "like", daysAgo: 6 },
  ]),
  mk("Diego Fernandez", "VP Marketing @ Series A · brand + performance", [
    { post: 3, type: "comment", commentText: "The recruiter/founder/marketer split is so real. Each needs its own hook.", daysAgo: 28 },
  ]),
  mk("Nina Larsen", "Social media strategist · LinkedIn ghostwriter", [
    { post: 1, type: "comment", commentText: "Preaching this to clients daily. Followers are rented, engagers are earned.", daysAgo: 10 },
    { post: 2, type: "reaction", reactionType: "love", daysAgo: 15 },
  ]),
  // --- Talent / recruiting
  mk("Grace Adeyemi", "Technical Recruiter · hiring for AI startups", [
    { post: 3, type: "comment", commentText: "As the recruiter in your audience: yes, we want the hiring-signal content 😄", daysAgo: 27 },
  ]),
  mk("Oliver Hart", "Head of Talent @ scaleup", [
    { post: 3, type: "reaction", reactionType: "like", daysAgo: 29 },
    { post: 0, type: "reaction", reactionType: "like", daysAgo: 5 },
  ]),
  mk("Yuki Tanaka", "People Ops & Employer Branding", [
    { post: 3, type: "reaction", reactionType: "love", daysAgo: 26 },
  ]),
  // --- Sales
  mk("Liam Murphy", "Enterprise AE · MEDDIC · social selling", [
    { post: 1, type: "comment", commentText: "Engagers are literally my pipeline. This is how I source half my meetings.", daysAgo: 12 },
  ]),
  mk("Fatima Al-Rashid", "SDR Manager · outbound systems", [
    { post: 2, type: "reaction", reactionType: "insightful", daysAgo: 19 },
    { post: 1, type: "reaction", reactionType: "like", daysAgo: 11 },
  ]),
  // --- Students / early career
  mk("Noah Kim", "CS student · building side projects in public", [
    { post: 2, type: "comment", commentText: "This is the coolest thing I've seen this week. Is there a waitlist?", daysAgo: 20 },
    { post: 0, type: "reaction", reactionType: "love", daysAgo: 6 },
  ]),
  mk("Aisha Mohammed", "Recent grad · aspiring PM · AI enthusiast", [
    { post: 0, type: "reaction", reactionType: "like", daysAgo: 4 },
    { post: 2, type: "reaction", reactionType: "like", daysAgo: 18 },
  ]),
];
