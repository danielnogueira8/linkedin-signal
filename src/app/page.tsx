import Link from "next/link";

const steps = [
  {
    n: "01",
    name: "Audience Map",
    title: "See who actually engages with you",
    body: "We pull every reactor and commenter from your recent posts and cluster them into named niches — AI Builders, Talent Leaders, Founders & VC — with sizes, seniority and writing guidance. Your real audience, not a follower count.",
  },
  {
    n: "02",
    name: "Creative Studio",
    title: "Brief once, write for every niche",
    body: "One launch brief in, a full variant matrix out: four hook styles per niche, every post written for one specific reader, formatted the way LinkedIn actually rewards.",
  },
  {
    n: "03",
    name: "Wind Tunnel",
    title: "Pre-test before anything hits your feed",
    body: "Synthetic agents grounded in your real engagers scroll past your drafts and score scroll-stop, read-through, and engagement intent. Winners are picked with confidence scores — before you spend your credibility on a flop.",
  },
  {
    n: "04",
    name: "Deploy",
    title: "Ship the winner, export the audience",
    body: "Copy the winning post per niche with best-time-to-post guidance, and export each niche as a CSV — ready for ads, outreach, or your CRM.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500 font-black text-white">
            S
          </span>
          <span className="text-lg font-bold tracking-tight">
            Signal<span className="text-sky-400">/in</span>
          </span>
        </div>
        <Link
          href="/app"
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Open the app
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <p className="mx-auto w-fit rounded-full border border-sky-800/60 bg-sky-950/30 px-4 py-1 text-xs font-medium text-sky-300">
          An accelerator for LinkedIn launches
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-black leading-[1.1] tracking-tight sm:text-6xl">
          Stop posting into the void.
          <br />
          <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
            Launch to people who&apos;ll care.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
          Signal/in maps your real LinkedIn audience, writes launch posts for each niche,
          and wind-tunnel tests every variant with AI agents — before you hit post.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/app"
            className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400"
          >
            Map my audience →
          </Link>
          <a
            href="#how"
            className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500"
          >
            How it works
          </a>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-7 transition hover:border-zinc-700"
            >
              <p className="font-mono text-xs text-sky-400">
                {s.n} — {s.name.toUpperCase()}
              </p>
              <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-900 py-16 text-center">
        <h2 className="text-2xl font-bold">Your next launch deserves a wind tunnel.</h2>
        <Link
          href="/app"
          className="mt-6 inline-block rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400"
        >
          Get started free
        </Link>
        <p className="mt-8 text-xs text-zinc-600">
          Signal/in — audience intelligence for LinkedIn creators.
        </p>
      </section>
    </div>
  );
}
