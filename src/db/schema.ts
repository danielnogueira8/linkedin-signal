import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  linkedinUrl: text("linkedin_url").notNull(),
  name: text("name"),
  headline: text("headline"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  url: text("url").notNull(),
  text: text("text"),
  postedAt: integer("posted_at", { mode: "timestamp" }),
  reactionCount: integer("reaction_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
});

export type EngagementEvent = {
  postId: number;
  type: "reaction" | "comment";
  reactionType?: string;
  commentText?: string;
  at?: string;
};

export const engagers = sqliteTable(
  "engagers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    profileUrl: text("profile_url").notNull(),
    name: text("name").notNull(),
    headline: text("headline"),
    // comments 3x, reposts 2x, reactions 1x, with recency decay
    engagementScore: real("engagement_score").notNull().default(0),
    engagements: text("engagements", { mode: "json" })
      .$type<EngagementEvent[]>()
      .notNull()
      .default([]),
  },
  (t) => [uniqueIndex("engagers_ws_profile").on(t.workspaceId, t.profileUrl)],
);

export type SegmentTraits = {
  seniority: string;
  industries: string[];
  contentPreferences: string;
  toneGuidance: string;
};

export const segments = sqliteTable("segments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("👥"),
  description: text("description").notNull(),
  size: integer("size").notNull().default(0),
  traits: text("traits", { mode: "json" }).$type<SegmentTraits>(),
});

export const segmentMembers = sqliteTable(
  "segment_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    segmentId: integer("segment_id")
      .notNull()
      .references(() => segments.id),
    engagerId: integer("engager_id")
      .notNull()
      .references(() => engagers.id),
  },
  (t) => [uniqueIndex("segment_members_uniq").on(t.segmentId, t.engagerId)],
);

export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  productName: text("product_name").notNull(),
  brief: text("brief").notNull(),
  goal: text("goal").notNull().default("launch"),
  status: text("status").notNull().default("draft"), // draft | generated | simulated
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const variants = sqliteTable("variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  segmentId: integer("segment_id")
    .notNull()
    .references(() => segments.id),
  hookStyle: text("hook_style").notNull(), // e.g. "contrarian", "story", "data-led"
  text: text("text").notNull(),
  status: text("status").notNull().default("candidate"), // candidate | winner
});

export type VariantResult = {
  variantId: number;
  segmentId: number;
  scrollStopRate: number; // 0-1
  readThroughRate: number; // 0-1
  predictedReactions: number;
  predictedComments: number;
  predictedReposts: number;
  engagementIndex: number; // composite 0-100
  confidence: number; // 0-1, from persona score variance
  isWinner: boolean;
};

export type SimulationResults = {
  variants: VariantResult[];
  overallWinnerVariantId: number | null;
};

export const simulations = sqliteTable("simulations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  status: text("status").notNull().default("running"), // running | done | error
  results: text("results", { mode: "json" }).$type<SimulationResults>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Persona = {
  name: string;
  headline: string;
  segmentId: number;
  bio: string; // grounded in real engager data
};

export type PersonaScore = {
  scrollStop: number;
  readThrough: number;
  react: number;
  comment: number;
  repost: number;
};

export const personaScores = sqliteTable("persona_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  simulationId: integer("simulation_id")
    .notNull()
    .references(() => simulations.id),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id),
  persona: text("persona", { mode: "json" }).$type<Persona>().notNull(),
  scores: text("scores", { mode: "json" }).$type<PersonaScore>().notNull(),
  rationale: text("rationale").notNull().default(""),
});

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // scrape | cluster | generate | simulate
  status: text("status").notNull().default("pending"), // pending | running | done | error
  progress: text("progress").notNull().default(""),
  error: text("error"),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
  result: text("result", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
