# Signal/in — launch accelerator for LinkedIn

A LinkedIn-native take on [Signal](https://www.use-signal.com): map your **real** audience,
write launch posts per niche, and wind-tunnel test every variant with AI agents — before you post.

LinkedIn has no follower-list API, so Signal/in builds your audience from **engagers**:
everyone who reacted to or commented on your recent posts. Arguably a better signal —
they're the people who actually stop for you.

## The loop

1. **Sync** — paste your LinkedIn profile URL; recent posts + all reactors/commenters are scraped via Apify (`harvestapi/linkedin-profile-posts`, no cookies).
2. **Audience Map** — Claude clusters engagers into named niches with sizes, traits, and writing guidance.
3. **Creative Studio** — one launch brief in → 4 hook-style variants per niche out (contrarian / story / data-led / direct-value).
4. **Wind Tunnel** — synthetic personas grounded in your real engagers score every variant (scroll-stop, read-through, react/comment/repost intent) → winners with confidence scores.
5. **Deploy** — copy-ready winning posts, best posting windows, per-niche audience CSV export.

## Run it

```bash
npm install
npx drizzle-kit push   # creates data/signal.db
npm run dev
```

Open http://localhost:3000.

### Demo mode (default)

`.env.local` ships with `DEMO_MODE=1`: the full loop runs on a seeded sample audience with
**zero API keys and zero spend** (deterministic engines stand in for scraping + AI).

### Live mode

```bash
# .env.local
DEMO_MODE=0
ANTHROPIC_API_KEY=sk-ant-...   # clustering, generation, wind tunnel
APIFY_TOKEN=apify_api_...      # LinkedIn engager scraping
```

A full sync (20 posts, capped reactions/comments) costs roughly $5–10 in Apify credits.
Wind tunnel uses `claude-opus-5` for personas and `claude-haiku-4-5` for the scoring swarm.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · SQLite + Drizzle · Anthropic SDK · Apify

## Notes

- Single-user MVP: no auth/billing; the latest synced workspace is active.
- Long steps run as in-process jobs polled via `/api/jobs/[id]`.
- Re-mapping the audience cascades: derived variants/simulations are cleared and campaigns reset to draft.
