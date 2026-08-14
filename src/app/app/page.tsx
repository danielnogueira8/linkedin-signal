import { getActiveWorkspace, getWorkspaceStats } from "@/lib/workspace";
import { isDemoMode } from "@/lib/claude";
import { StepLabel, Chip } from "@/components/ui";
import { SyncForm } from "./sync-form";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const ws = await getActiveWorkspace();
  const stats = ws ? await getWorkspaceStats(ws.id) : null;

  return (
    <div className="max-w-2xl">
      <div className="rise">
        <StepLabel n="01">Sync</StepLabel>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
          See who actually engages with you
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Paste your LinkedIn profile URL. An agent pulls your recent posts and every person
          who reacted or commented — your <em>active</em> audience, not vanity followers.
        </p>
      </div>

      {isDemoMode() && (
        <div className="rise rise-1 mt-5 flex items-center gap-2 rounded-2xl border border-ember/25 bg-ember-soft px-4 py-3 text-sm text-ink">
          <Chip tone="ember">demo mode</Chip>
          Syncing loads a realistic sample audience — no scraping, no spend.
        </div>
      )}

      <div className="rise rise-2">
        <SyncForm />
      </div>

      {ws && stats && (
        <div className="rise rise-3 mt-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Current workspace
          </h2>
          <div className="mt-3 rounded-2xl border border-line bg-surface p-6 shadow-card">
            <p className="font-display text-lg font-semibold">{ws.name ?? ws.linkedinUrl}</p>
            {ws.headline && <p className="mt-0.5 text-sm text-ink-soft">{ws.headline}</p>}
            <div className="mt-5 grid grid-cols-4 gap-3 text-center">
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
    <div className="rounded-xl bg-paper py-3.5">
      <p className="font-display text-2xl font-bold text-cobalt">{value}</p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
        {label}
      </p>
    </div>
  );
}
