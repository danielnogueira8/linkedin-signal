import { db, segments, segmentMembers, engagers } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
import { StepLabel, Chip, AvatarDot } from "@/components/ui";
import { ClusterButton } from "./cluster-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AudiencePage() {
  const ws = await getActiveWorkspace();
  if (!ws) {
    return (
      <EmptyState
        title="No workspace yet"
        body="Sync your LinkedIn audience first."
        cta={{ href: "/app", label: "Go to Sync" }}
      />
    );
  }

  const segs = await db.query.segments.findMany({
    where: eq(segments.workspaceId, ws.id),
    orderBy: [desc(segments.size)],
  });

  const membersBySegment = new Map<number, { name: string; headline: string | null; score: number }[]>();
  for (const seg of segs) {
    const rows = await db
      .select({ name: engagers.name, headline: engagers.headline, score: engagers.engagementScore })
      .from(segmentMembers)
      .innerJoin(engagers, eq(segmentMembers.engagerId, engagers.id))
      .where(eq(segmentMembers.segmentId, seg.id))
      .orderBy(desc(engagers.engagementScore))
      .limit(4);
    membersBySegment.set(seg.id, rows);
  }

  const total = segs.reduce((a, s) => a + s.size, 0);

  return (
    <div>
      <div className="rise flex items-end justify-between gap-6">
        <div>
          <StepLabel n="02">Audience map</StepLabel>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
            Your audience, mapped
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            {segs.length > 0
              ? `${total} active engagers clustered into ${segs.length} niches. Every niche gets its own content in the next step.`
              : "An agent clusters your engagers into interest-based niches with names, sizes and writing guidance."}
          </p>
        </div>
        <ClusterButton workspaceId={ws.id} hasSegments={segs.length > 0} />
      </div>

      {segs.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {segs.map((seg, i) => (
            <div
              key={seg.id}
              className={`rise rise-${Math.min(i + 1, 5)} rounded-2xl border border-line bg-surface p-6 shadow-card transition hover:shadow-pop`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-semibold">
                    <span className="mr-2">{seg.emoji}</span>
                    {seg.name}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {seg.description}
                  </p>
                </div>
                <span className="ml-4 shrink-0 rounded-full bg-cobalt-soft px-3 py-1 font-mono text-sm font-bold text-cobalt-deep">
                  {seg.size}
                </span>
              </div>

              {seg.traits && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Chip tone="cobalt">{seg.traits.seniority}</Chip>
                  {seg.traits.industries.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-line pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  Top engagers
                </p>
                <ul className="mt-3 space-y-2.5">
                  {membersBySegment.get(seg.id)?.map((m) => (
                    <li key={m.name} className="flex items-center gap-2.5 text-sm">
                      <AvatarDot name={m.name} />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-ink">{m.name}</span>
                        {m.headline && (
                          <span className="ml-2 text-xs text-ink-faint">{m.headline}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-ink-faint">
                        {m.score}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href={`/api/export?segmentId=${seg.id}`}
                className="mt-4 inline-block font-mono text-[11px] font-medium text-cobalt hover:text-cobalt-deep"
              >
                Export CSV ↓
              </a>
            </div>
          ))}
        </div>
      )}

      {segs.length > 0 && (
        <div className="mt-10">
          <Link
            href="/app/studio"
            className="btn-press inline-block rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-black"
          >
            Next: brief the creative studio →
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="mx-auto mt-28 max-w-md text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-ink-soft">{body}</p>
      <Link
        href={cta.href}
        className="btn-press mt-6 inline-block rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-cobalt-deep"
      >
        {cta.label}
      </Link>
    </div>
  );
}
