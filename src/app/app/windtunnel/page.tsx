import { db, campaigns, variants, segments, simulations, personaScores } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
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
      <div className="mx-auto mt-24 max-w-md text-center">
        <h1 className="text-xl font-bold">Nothing to test yet</h1>
        <p className="mt-2 text-zinc-400">Generate variants in the Creative Studio first.</p>
        <Link
          href="/app/studio"
          className="mt-5 inline-block rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
        >
          Go to Creative Studio
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

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs text-sky-400">STEP 04 — WIND TUNNEL</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Pre-test before anything hits your feed
          </h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            {vars.length} variants tested by synthetic agents built from your real engagers —
            each one scores scroll-stop, read-through and engagement intent.
          </p>
        </div>
        <SimulateButton campaignId={campaign.id} hasResults={!!results} />
      </div>

      {results && overallWinner && (
        <div className="mt-8 rounded-xl border border-sky-800/60 bg-sky-950/20 p-5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-sky-400">
            🏆 Overall winner — {segById.get(overallWinner.segmentId)?.emoji}{" "}
            {segById.get(overallWinner.segmentId)?.name} · {overallWinner.hookStyle}
          </p>
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
            {overallWinner.text}
          </p>
          <Link
            href="/app/deploy"
            className="mt-4 inline-block rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
          >
            Next: Deploy →
          </Link>
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          {segs.map((seg) => {
            const segResults = results.variants
              .filter((r) => r.segmentId === seg.id)
              .sort((a, b) => b.engagementIndex - a.engagementIndex);
            if (segResults.length === 0) return null;
            return (
              <div key={seg.id}>
                <h3 className="text-sm font-semibold text-zinc-300">
                  {seg.emoji} {seg.name}{" "}
                  <span className="ml-1 font-normal text-zinc-500">
                    ({seg.size} {seg.size === 1 ? "engager" : "engagers"})
                  </span>
                </h3>
                <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/70 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-2.5">Variant</th>
                        <th className="px-3 py-2.5">Engagement index</th>
                        <th className="px-3 py-2.5">Scroll-stop</th>
                        <th className="px-3 py-2.5">Reactions</th>
                        <th className="px-3 py-2.5">Comments</th>
                        <th className="px-3 py-2.5">Reposts</th>
                        <th className="px-3 py-2.5">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segResults.map((r) => {
                        const v = varById.get(r.variantId);
                        return (
                          <tr
                            key={r.variantId}
                            className={
                              "border-b border-zinc-800/50 last:border-0 " +
                              (r.isWinner ? "bg-sky-950/30" : "bg-zinc-950/40")
                            }
                          >
                            <td className="px-4 py-3">
                              {r.isWinner && <span className="mr-1.5">🏆</span>}
                              <span className="font-mono text-xs uppercase text-zinc-300">
                                {v?.hookStyle}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                                  <div
                                    className="h-full rounded-full bg-sky-400"
                                    style={{ width: `${r.engagementIndex}%` }}
                                  />
                                </div>
                                <span className="font-semibold text-sky-400">
                                  {r.engagementIndex}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-zinc-300">
                              {Math.round(r.scrollStopRate * 100)}%
                            </td>
                            <td className="px-3 py-3 text-zinc-300">~{r.predictedReactions}</td>
                            <td className="px-3 py-3 text-zinc-300">~{r.predictedComments}</td>
                            <td className="px-3 py-3 text-zinc-300">~{r.predictedReposts}</td>
                            <td className="px-3 py-3 text-zinc-400">
                              {Math.round(r.confidence * 100)}%
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
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-zinc-300">What the agents said</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {pickInterestingScores(scores).map((s) => (
              <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs font-semibold text-zinc-200">{s.persona.name}</p>
                <p className="text-[11px] text-zinc-500">{s.persona.headline}</p>
                <p className="mt-2 text-xs italic leading-relaxed text-zinc-400">
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
  // Show a mix: the most enthusiastic and the most dismissive reactions
  const sorted = [...scores].sort(
    (a, b) => b.scores.comment + b.scores.scrollStop - (a.scores.comment + a.scores.scrollStop),
  );
  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-3);
  return [...top, ...bottom].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
}
