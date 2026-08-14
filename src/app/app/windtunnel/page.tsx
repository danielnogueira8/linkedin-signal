import { db, campaigns, variants, segments, simulations, personaScores } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
import { StepLabel, Chip, ConfidenceMeter, AvatarDot } from "@/components/ui";
import { SimulateButton } from "./simulate-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WindTunnelPage() {
  const ws = await getActiveWorkspace();
  const campaign = ws
    ? await db.query.campaigns.findFirst({
        where: eq(campaigns.workspaceId, ws.id),
        orderBy: [desc(campaigns.createdAt)],
      })
    : null;
  const vars = campaign
    ? await db.query.variants.findMany({ where: eq(variants.campaignId, campaign.id) })
    : [];

  if (!campaign || vars.length === 0) {
    return (
      <div className="mx-auto mt-28 max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Nothing to test yet</h1>
        <p className="mt-2 text-ink-soft">Generate variants in the creative studio first.</p>
        <Link
          href="/app/studio"
          className="btn-press mt-6 inline-block rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-cobalt-deep"
        >
          Go to Creative studio
        </Link>
      </div>
    );
  }

  const sim = await db.query.simulations.findFirst({
    where: eq(simulations.campaignId, campaign.id),
    orderBy: [desc(simulations.createdAt)],
  });
  const segs = await db.query.segments.findMany({ where: eq(segments.workspaceId, ws!.id) });
  const segById = new Map(segs.map((s) => [s.id, s]));
  const varById = new Map(vars.map((v) => [v.id, v]));

  const results = sim?.status === "done" ? sim.results : null;
  const scores =
    sim && results
      ? await db.query.personaScores.findMany({ where: eq(personaScores.simulationId, sim.id) })
      : [];

  const overallWinner = results?.overallWinnerVariantId
    ? varById.get(results.overallWinnerVariantId)
    : null;
  const overallResult = overallWinner
    ? results!.variants.find((r) => r.variantId === overallWinner.id)
    : null;

  return (
    <div>
      <div className="rise flex items-end justify-between gap-6">
        <div>
          <StepLabel n="04">Wind tunnel</StepLabel>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
            Pre-test before anything hits your feed
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            {vars.length} variants tested by synthetic agents built from your real engagers —
            each one scores scroll-stop, read-through and engagement intent.
          </p>
        </div>
        <SimulateButton campaignId={campaign.id} hasResults={!!results} />
      </div>

      {results && overallWinner && (
        <div className="rise rise-1 mt-9 overflow-hidden rounded-2xl border border-cobalt/25 bg-surface shadow-pop">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cobalt-soft/60 px-6 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-cobalt-deep">
              🏆 Overall winner
            </span>
            <Chip tone="cobalt">
              {segById.get(overallWinner.segmentId)?.emoji}{" "}
              {segById.get(overallWinner.segmentId)?.name}
            </Chip>
            <Chip>{overallWinner.hookStyle}</Chip>
            {overallResult && (
              <span className="ml-auto">
                <ConfidenceMeter value={overallResult.confidence} />
              </span>
            )}
          </div>
          <p className="max-w-2xl whitespace-pre-wrap px-6 py-5 text-sm leading-relaxed text-ink">
            {overallWinner.text}
          </p>
          <div className="px-6 pb-5">
            <Link
              href="/app/deploy"
              className="btn-press inline-block rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-cobalt-deep"
            >
              Next: deploy →
            </Link>
          </div>
        </div>
      )}

      {results && (
        <div className="mt-10 space-y-7">
          {segs.map((seg) => {
            const segResults = results.variants
              .filter((r) => r.segmentId === seg.id)
              .sort((a, b) => b.engagementIndex - a.engagementIndex);
            if (segResults.length === 0) return null;
            return (
              <div key={seg.id}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  {seg.emoji} {seg.name} · {seg.size} {seg.size === 1 ? "engager" : "engagers"}
                </h3>
                <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        <th className="px-5 py-3 font-medium">Variant</th>
                        <th className="px-3 py-3 font-medium">Engagement index</th>
                        <th className="px-3 py-3 font-medium">Scroll-stop</th>
                        <th className="px-3 py-3 font-medium">Reactions</th>
                        <th className="px-3 py-3 font-medium">Comments</th>
                        <th className="px-3 py-3 font-medium">Reposts</th>
                        <th className="px-3 py-3 font-medium">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segResults.map((r) => {
                        const v = varById.get(r.variantId);
                        return (
                          <tr
                            key={r.variantId}
                            className={
                              "border-b border-line/60 last:border-0 " +
                              (r.isWinner ? "bg-cobalt-soft/40" : "")
                            }
                          >
                            <td className="px-5 py-3.5">
                              <span className="flex items-center gap-2">
                                {r.isWinner ? (
                                  <Chip tone="teal">winner</Chip>
                                ) : (
                                  <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                                )}
                                <span className="font-mono text-xs text-ink">{v?.hookStyle}</span>
                              </span>
                            </td>
                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                                  <div
                                    className="h-full rounded-full bg-cobalt"
                                    style={{ width: `${r.engagementIndex}%` }}
                                  />
                                </div>
                                <span className="font-mono font-semibold tabular-nums text-cobalt-deep">
                                  {r.engagementIndex}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 tabular-nums text-ink-soft">
                              {Math.round(r.scrollStopRate * 100)}%
                            </td>
                            <td className="px-3 py-3.5 tabular-nums text-ink-soft">
                              ~{r.predictedReactions}
                            </td>
                            <td className="px-3 py-3.5 tabular-nums text-ink-soft">
                              ~{r.predictedComments}
                            </td>
                            <td className="px-3 py-3.5 tabular-nums text-ink-soft">
                              ~{r.predictedReposts}
                            </td>
                            <td className="px-3 py-3.5">
                              <ConfidenceMeter value={r.confidence} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results && scores.length > 0 && (
        <div className="mt-12">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            What the agents said
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {pickInterestingScores(scores).map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-line bg-surface p-4 shadow-card"
              >
                <div className="flex items-center gap-2.5">
                  <AvatarDot name={s.persona.name} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{s.persona.name}</p>
                    <p className="truncate text-[11px] text-ink-faint">{s.persona.headline}</p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] italic leading-relaxed text-ink-soft">
                  &ldquo;{s.rationale}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type ScoreRow = {
  id: number;
  persona: { name: string; headline: string };
  rationale: string;
  scores: { comment: number; scrollStop: number };
};

function pickInterestingScores(scores: ScoreRow[]): ScoreRow[] {
  const sorted = [...scores].sort(
    (a, b) => b.scores.comment + b.scores.scrollStop - (a.scores.comment + a.scores.scrollStop),
  );
  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-3);
  return [...top, ...bottom].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
}
