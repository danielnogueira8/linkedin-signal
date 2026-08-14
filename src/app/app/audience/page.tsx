import { db, segments, engagers } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
import { StepLabel } from "@/components/ui";
import { EngagerAvatar } from "@/components/engager-avatar";
import { ClusterButton } from "./cluster-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

const BAR_TONES = ["bg-cobalt", "bg-teal", "bg-ember", "bg-cobalt/60", "bg-teal/60", "bg-ember/60"];

export default async function AudiencePage() {
  const ws = await getActiveWorkspace();
  if (!ws) {
    return (
      <div className="mx-auto mt-28 max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">No workspace yet</h1>
        <p className="mt-2 text-ink-soft">Sync your LinkedIn audience first.</p>
        <Link
          href="/app"
          className="btn-press mt-6 inline-block rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-cobalt-deep"
        >
          Go to Sync
        </Link>
      </div>
    );
  }

  const audience = await db.query.segments.findFirst({
    where: eq(segments.workspaceId, ws.id),
  });

  const topEngagers = await db.query.engagers.findMany({
    where: eq(engagers.workspaceId, ws.id),
    orderBy: [desc(engagers.engagementScore)],
    limit: 9,
  });

  const composition = audience?.traits?.composition ?? [];

  return (
    <div>
      <div className="rise flex items-end justify-between gap-6">
        <div>
          <StepLabel n="02">Audience profile</StepLabel>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
            One audience. Actually yours.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            {audience
              ? `A living profile of the ${audience.size} people who actually engage with you — every post is written for them, and the wind tunnel samples its agents from this mix.`
              : "An agent profiles the people who actually engage with you — who they are, what stops their scroll, and how to write for them."}
          </p>
        </div>
        <ClusterButton workspaceId={ws.id} hasSegments={!!audience} />
      </div>

      {audience && (
        <>
          <div className="rise rise-1 mt-10 rounded-2xl border border-line bg-surface p-7 shadow-card">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="font-display text-xl font-semibold">
                  {audience.emoji} {audience.name}
                </p>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                  {audience.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-cobalt-soft px-4 py-1.5 font-mono text-lg font-bold text-cobalt-deep">
                {audience.size}
              </span>
            </div>

            {composition.length > 0 && (
              <div className="mt-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  Composition
                </p>
                <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
                  {composition.map((c, i) => (
                    <div
                      key={c.label}
                      className={`${BAR_TONES[i % BAR_TONES.length]} first:rounded-l-full last:rounded-r-full`}
                      style={{ width: `${c.percent}%` }}
                      title={`${c.label} ${c.percent}%`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                  {composition.map((c, i) => (
                    <span key={c.label} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                      <span className={`h-2 w-2 rounded-full ${BAR_TONES[i % BAR_TONES.length]}`} />
                      {c.emoji} {c.label}
                      <span className="font-mono text-xs tabular-nums text-ink-faint">
                        {c.percent}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {audience.traits && (
              <div className="mt-7 grid grid-cols-1 gap-5 border-t border-line pt-6 sm:grid-cols-2">
                <TraitBlock label="Seniority" value={audience.traits.seniority} />
                <TraitBlock label="Industries" value={audience.traits.industries.join(", ")} />
                <TraitBlock label="How they consume" value={audience.traits.contentPreferences} />
                <TraitBlock label="What stops their scroll" value={audience.traits.scrollStoppers ?? "—"} />
                <div className="sm:col-span-2">
                  <TraitBlock label="How to write for them" value={audience.traits.toneGuidance} />
                </div>
              </div>
            )}
          </div>

          <div className="rise rise-2 mt-6 rounded-2xl border border-line bg-surface p-7 shadow-card">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                Top engagers
              </p>
              <a
                href={`/api/export?segmentId=${audience.id}`}
                className="font-mono text-[11px] font-medium text-cobalt hover:text-cobalt-deep"
              >
                Export full audience CSV ↓
              </a>
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {topEngagers.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 text-sm">
                  <EngagerAvatar name={m.name} imageUrl={m.imageUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{m.name}</span>
                    {m.headline && (
                      <span className="block truncate text-xs text-ink-faint">{m.headline}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-ink-faint">
                    {m.engagementScore}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rise rise-3 mt-10">
            <Link
              href="/app/studio"
              className="btn-press inline-block rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-card hover:bg-black"
            >
              Next: brief the creative studio →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function TraitBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{value}</p>
    </div>
  );
}
