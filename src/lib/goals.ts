/** Post goals: what a post is trying to do for the creator. */
export const GOALS = {
  awareness: {
    label: "Awareness",
    tagline: "Reach new people",
    guidance:
      "Optimize for reach: a broad, scroll-stopping hook; shareable framing (repost-worthy insight or list); minimal friction. CTA is light — follow, repost, or none at all. No selling.",
  },
  authority: {
    label: "Authority",
    tagline: "Earn expert trust",
    guidance:
      "Optimize for credibility: specific frameworks, numbers, hard-won lessons, confident point of view. Depth over breadth — teach something real. CTA is soft: save this, follow for more like it.",
  },
  leads: {
    label: "Lead generation",
    tagline: "Start conversations",
    guidance:
      "Optimize for pipeline: name the reader's pain precisely, show the payoff, make the next step obvious — comment a keyword, DM, or link in comments. Warm and direct, never pushy.",
  },
  relatability: {
    label: "Relatability",
    tagline: "Connect through story",
    guidance:
      "Optimize for human connection: first-person story, specific moments, honest vulnerability. No lecture, no pitch. CTA is a genuine question that invites people to share their own experience.",
  },
} as const;

export type GoalKey = keyof typeof GOALS;

export function goalFor(key: string) {
  return GOALS[(key in GOALS ? key : "awareness") as GoalKey];
}
