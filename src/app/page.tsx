import Link from "next/link";
import { Chip, ConfidenceMeter, AgentAvatar } from "@/components/ui";

const steps = [
  {
    n: "01",
    name: "Audience map",
    title: "See who actually engages with you",
    body: "An agent pulls every reactor and commenter from your recent posts and clusters them into named niches — AI Builders, Talent Leaders, Founders & VC — with sizes, seniority and writing guidance.",
    tone: "cobalt" as const,
  },
  {
    n: "02",
    name: "Creative studio",
    title: "Brief once, write for every niche",
    body: "One launch brief in, a full variant matrix out: four hook styles per niche, every post written for one specific reader, formatted the way LinkedIn actually rewards.",
    tone: "teal" as const,
  },
  {
    n: "03",
    name: "Wind tunnel",
    title: "Pre-test before anything hits your feed",
    body: "Synthetic agents grounded in your real engagers scroll past your drafts and score scroll-stop, read-through, and engagement intent. Winners picked with confidence scores.",
    tone: "ember" as const,
  },
  {
    n: "04",
    name: "Deploy",
    title: "Ship the winner, export the audience",
    body: "Copy the winning post per niche with best-time-to-post guidance, and export each niche as a CSV — ready for ads, outreach, or your CRM.",
    tone: "cobalt" as const,
  },
];

function HeroDemo() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Agent trace card */}
      <div className="rise rise-2 rounded-2xl border border-line bg-surface p-5 shadow-pop">
        <div className="flex items-center gap-3">
          <div className="pixel-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
          <span className="shimmer-text text-sm font-medium">Wind tunnel running…</span>
          <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-faint">4.1s</span>
        </div>
        <ol className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13px]">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-teal">✓</span>
            <span className="text-ink-soft">Mapped 1,284 engagers into 6 niches</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-teal">✓</span>
            <span className="text-ink-soft">Wrote 24 launch variants (4 hooks × 6 niches)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-cobalt" />
            <span className="shimmer-text">
              Testing variant 17/24 against AI Builders agents…
            </span>
            <span className="ml-auto flex shrink-0 -space-x-1.5">
              {["nova", "atlas", "quill"].map((agent) => (
                <AgentAvatar key={agent} seed={agent} size={20} className="ring-2 ring-surface" />
              ))}
            </span>
          </li>
        </ol>
      </div>

      {/* Recommendation card, overlapping */}
      <div className="rise rise-4 relative z-10 -mt-4 ml-8 rounded-2xl border border-cobalt/25 bg-surface p-5 shadow-pop">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-cobalt-deep">
            🏆 Winner
          </span>
          <Chip tone="cobalt">🤖 AI Builders</Chip>
          <Chip>story</Chip>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          &ldquo;Three weeks ago I watched a great product launch die on LinkedIn. 400
          followers saw it. 6 reacted…&rdquo;
        </p>
        <div className="mt-4 flex items-center justify-between">
          <ConfidenceMeter value={0.84} />
          <span className="rounded-lg bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper">
            Copy post
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="chrome sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cobalt font-display text-lg font-bold text-white shadow-card">
            S
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Signal<span className="text-cobalt">/in</span>
          </span>
        </div>
          <Link
            href="/app"
            className="btn-press rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-card hover:bg-black"
          >
            Open the app
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="rise w-fit rounded-full border border-cobalt/25 bg-cobalt-soft px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-cobalt-deep">
            An agent fleet for LinkedIn launches
          </p>
          <h1 className="rise rise-1 mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Stop posting into the void. Launch to people who&apos;ll{" "}
            <span className="text-cobalt">care</span>.
          </h1>
          <p className="rise rise-2 mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            Signal/in maps your real LinkedIn audience, writes launch posts for each niche,
            and wind-tunnel tests every variant with AI agents — before you hit post.
          </p>
          <div className="rise rise-3 mt-8 flex items-center gap-3">
            <Link
              href="/app"
              className="btn-press rounded-xl bg-cobalt px-7 py-3.5 font-semibold text-white shadow-card transition hover:bg-cobalt-deep"
            >
              Map my audience →
            </Link>
            <a
              href="#how"
              className="btn-press rounded-xl border border-line-strong bg-surface px-7 py-3.5 font-semibold text-ink shadow-card transition hover:border-ink-faint"
            >
              How it works
            </a>
          </div>
        </div>
        <HeroDemo />
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          The loop
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.n}
              className="group rounded-2xl border border-line bg-surface p-7 shadow-card transition hover:shadow-pop"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] tabular-nums text-ink-faint">{s.n}</span>
                <Chip tone={s.tone}>{s.name}</Chip>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line py-20 text-center">
        <h2 className="font-display text-3xl font-bold">
          Your next launch deserves a wind tunnel.
        </h2>
        <Link
          href="/app"
          className="btn-press mt-7 inline-block rounded-xl bg-cobalt px-7 py-3.5 font-semibold text-white shadow-card transition hover:bg-cobalt-deep"
        >
          Get started free
        </Link>
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Signal/in — agentic audience intelligence for LinkedIn creators
        </p>
      </section>
    </div>
  );
}
