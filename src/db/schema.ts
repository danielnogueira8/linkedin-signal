import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  linkedinUrl: text("linkedin_url").notNull(),
  name: text("name"),
  headline: text("headline"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  url: text("url").notNull(),
  text: text("text"),
  postedAt: timestamp("posted_at"),
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

export const engagers = pgTable(
  "engagers",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    profileUrl: text("profile_url").notNull(),
    name: text("name").notNull(),
    headline: text("headline"),
    // comments 3x, reposts 2x, reactions 1x, with recency decay
    engagementScore: real("engagement_score").notNull().default(0),
    engagements: jsonb("engagements")
      .$type<EngagementEvent[]>()
      .notNull()
      .default([]),
  },
  (t) => [uniqueIndex("engagers_ws_profile").on(t.workspaceId, t.profileUrl)],
);

export type AudienceComposition = {
  label: string;
  emoji: string;
  percent: number;
};

export type SegmentTraits = {
  seniority: string;
  industries: string[];
  contentPreferences: string;
  toneGuidance: string;
  /** Role/interest mix of the single audience profile, percents summing ~100 */
  composition?: AudienceComposition[];
  /** What reliably makes this audience stop scrolling */
  scrollStoppers?: string;
};

export const segments = pgTable("segments", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("👥"),
  description: text("description").notNull(),
  size: integer("size").notNull().default(0),
  traits: jsonb("traits").$type<SegmentTraits>(),
});

export const segmentMembers = pgTable(
  "segment_members",
  {
    id: serial("id").primaryKey(),
    segmentId: integer("segment_id")
      .notNull()
      .references(() => segments.id),
    engagerId: integer("engager_id")
      .notNull()
      .references(() => engagers.id),
  },
  (t) => [uniqueIndex("segment_members_uniq").on(t.segmentId, t.engagerId)],
);

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  productName: text("product_name").notNull(), // display: the post's topic
  brief: text("brief").notNull(),
  goal: text("goal").notNull().default("awareness"),
  status: text("status").notNull().default("draft"), // draft | generated | simulated
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
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

export const simulations = pgTable("simulations", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  status: text("status").notNull().default("running"), // running | done | error
  results: jsonb("results").$type<SimulationResults>(),
  createdAt: timestamp("created_at")
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

export const personaScores = pgTable("persona_scores", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id")
    .notNull()
    .references(() => simulations.id),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id),
  persona: jsonb("persona").$type<Persona>().notNull(),
  scores: jsonb("scores").$type<PersonaScore>().notNull(),
  rationale: text("rationale").notNull().default(""),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // scrape | cluster | generate | simulate
  status: text("status").notNull().default("pending"), // pending | running | done | error
  progress: text("progress").notNull().default(""),
  error: text("error"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  result: jsonb("result").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});
