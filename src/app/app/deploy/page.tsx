import { db, campaigns, variants, segments, simulations } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
import { StepLabel, Chip, ConfidenceMeter } from "@/components/ui";
import { CopyButton } from "./copy-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

// LinkedIn engagement peaks (US/EU B2B): Tue-Thu mornings.
const POST_TIMES = ["Tuesday 8:30–10:00", "Wednesday 8:30–10:00", "Thursday 8:00–9:30"];

export default async function DeployPage() {
  const ws = await getActiveWorkspace();
  const campaign = ws
    ? await db.query.campaigns.findFirst({
        where: eq(campaigns.workspaceId, ws.id),
        orderBy: [desc(campaigns.createdAt)],
      })
    : null;
  const sim = campaign
    ? await db.query.simulations.findFirst({
        where: eq(simulations.campaignId, campaign.id),
        orderBy: [desc(simulations.createdAt)],
      })
    : null;

  if (!campaign || sim?.status !== "done" || !sim.results) {
    return (
      <div className="mx-auto mt-28 max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Run the wind tunnel first</h1>
        <p className="mt-2 text-ink-soft">
          Deploy shows your winning posts once the simulation has picked them.
        </p>
        <Link
          href="/app/windtunnel"
          className="btn-press mt-6 inline-block rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-cobalt-deep"
        >
          Go to Wind tunnel
        </Link>
      </div>
    );
  }

  const winners = await db.query.variants.findMany({
    where: eq(variants.campaignId, campaign.id),
  });
  const winning = winners.filter((v) => v.status === "winner");
  const segs = await db.query.segments.findMany({ where: eq(segments.workspaceId, ws!.id) });
  const segById = new Map(segs.map((s) => [s.id, s]));
  const resultByVariant = new Map(sim.results.variants.map((r) => [r.variantId, r]));
  const overallId = sim.results.overallWinnerVariantId;

  const ordered = [...winning].sort((a, b) =>
    a.id === overallId ? -1 : b.id === overallId ? 1 : 0,
  );

  return (
    <div>
      <div className="rise">
        <StepLabel n="05">Deploy</StepLabel>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Ship the winners</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          One winning post per niche, ready to paste into LinkedIn. Stagger them across the
          week so each niche gets its own moment.
        </p>
      </div>

      <div className="rise rise-1 mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-5 py-3.5 text-sm shadow-card">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Best windows
        </span>
        {POST_TIMES.map((t) => (
          <Chip key={t} tone="teal">
            {t}
          </Chip>
        ))}
        <span className="text-xs text-ink-faint">your timezone · B2B peak engagement</span>
      </div>

      <div className="mt-9 space-y-5">
        {ordered.map((v, i) => {
          const seg = segById.get(v.segmentId);
          const r = resultByVariant.get(v.id);
          const isOverall = v.id === overallId;
          return (
            <div
              key={v.id}
              className={`rise rise-${Math.min(i + 1, 5)} overflow-hidden rounded-2xl border bg-surface shadow-card ${
                isOverall ? "border-cobalt/25 shadow-pop" : "border-line"
              }`}
            >
              <div
                className={`flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 ${
                  isOverall ? "bg-cobalt-soft/60" : ""
                }`}
              >
                {isOverall && (
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-cobalt-deep">
                    🏆 Top pick
                  </span>
                )}
                <Chip tone={isOverall ? "cobalt" : "neutral"}>
                  {seg?.emoji} {seg?.name}
                </Chip>
                <Chip>{v.hookStyle}</Chip>
                {r && (
                  <span className="text-xs tabular-nums text-ink-faint">
                    ~{r.predictedReactions} reactions · ~{r.predictedComments} comments
                  </span>
                )}
                <span className="ml-auto flex items-center gap-3">
                  {r && <ConfidenceMeter value={r.confidence} />}
                  <CopyButton text={v.text} />
                </span>
              </div>
              <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-ink">
                {v.text}
              </p>
              {seg && (
                <div className="border-t border-line px-5 py-3">
                  <a
                    href={`/api/export?segmentId=${seg.id}`}
                    className="font-mono text-[11px] font-medium text-cobalt hover:text-cobalt-deep"
                  >
                    Export {seg.name} audience CSV ↓
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
