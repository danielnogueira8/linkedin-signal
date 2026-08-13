import { getActiveWorkspace, getWorkspaceStats } from "@/lib/workspace";
import { isDemoMode } from "@/lib/claude";
import { SyncForm } from "./sync-form";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const ws = await getActiveWorkspace();
  const stats = ws ? await getWorkspaceStats(ws.id) : null;

  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs text-sky-400">STEP 01 — SYNC</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        See who actually engages with you
      </h1>
      <p className="mt-3 text-zinc-400">
        Paste your LinkedIn profile URL. We pull your recent posts and every person who
        reacted or commented — your <em>active</em> audience, not vanity followers.
      </p>

      {isDemoMode() && (
        <div className="mt-4 rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-2.5 text-sm text-amber-300">
          Demo mode is on — syncing loads a realistic sample audience, no scraping happens.
        </div>
      )}

      <SyncForm />

      {ws && stats && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-300">Current workspace</h2>
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="font-semibold">{ws.name ?? ws.linkedinUrl}</p>
            {ws.headline && <p className="mt-0.5 text-sm text-zinc-400">{ws.headline}</p>}
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
              <Stat label="Posts" value={stats.posts} />
              <Stat label="Engagers" value={stats.engagers} />
              <Stat label="Niches" value={stats.segments} />
              <Stat label="Campaigns" value={stats.campaigns} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-950/60 py-3">
      <p className="text-xl font-bold text-sky-400">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}
