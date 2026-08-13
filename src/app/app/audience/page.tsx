import { db, segments, segmentMembers, engagers } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
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
      .limit(5);
    membersBySegment.set(seg.id, rows);
  }

  const total = segs.reduce((a, s) => a + s.size, 0);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs text-sky-400">STEP 02 — AUDIENCE MAP</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Your audience, mapped</h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            {segs.length > 0
              ? `${total} active engagers clustered into ${segs.length} niches. Every niche gets its own content in the next step.`
              : "Cluster your engagers into interest-based niches with names, sizes and writing guidance."}
          </p>
        </div>
        <ClusterButton workspaceId={ws.id} hasSegments={segs.length > 0} />
      </div>

      {segs.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {segs.map((seg) => (
            <div key={seg.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    <span className="mr-2">{seg.emoji}</span>
                    {seg.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">{seg.description}</p>
                </div>
                <span className="ml-4 shrink-0 rounded-full bg-sky-500/10 px-3 py-1 text-sm font-bold text-sky-400">
                  {seg.size}
                </span>
              </div>

              {seg.traits && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[seg.traits.seniority, ...seg.traits.industries].map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 border-t border-zinc-800 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Top engagers</p>
                <ul className="mt-2 space-y-1.5">
                  {membersBySegment.get(seg.id)?.map((m) => (
                    <li key={m.name} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">
                        <span className="text-zinc-200">{m.name}</span>
                        {m.headline && (
                          <span className="ml-2 text-xs text-zinc-500">{m.headline}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-zinc-500">{m.score}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href={`/api/export?segmentId=${seg.id}`}
                className="mt-4 inline-block text-xs font-medium text-sky-400 hover:text-sky-300"
              >
                Export CSV ↓
              </a>
            </div>
          ))}
        </div>
      )}

      {segs.length > 0 && (
        <div className="mt-8">
          <Link
            href="/app/studio"
            className="inline-block rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Next: brief the Creative Studio →
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
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-zinc-400">{body}</p>
      <Link
        href={cta.href}
        className="mt-5 inline-block rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
      >
        {cta.label}
      </Link>
    </div>
  );
}
