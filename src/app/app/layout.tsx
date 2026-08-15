import Link from "next/link";
import type { ReactNode } from "react";
import { AgentAvatar } from "@/components/ui";

const nav = [
  { href: "/app", label: "Sync", step: "01" },
  { href: "/app/audience", label: "Audience profile", step: "02" },
  { href: "/app/studio", label: "Creative studio", step: "03" },
  { href: "/app/arena", label: "AI Arena", step: "04" },
  { href: "/app/deploy", label: "Deploy", step: "05" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line px-4 py-6">
          <Link href="/" className="mb-10 flex items-center gap-2.5 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cobalt font-display text-lg font-bold text-white shadow-card">
              S
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Signal<span className="text-cobalt">/in</span>
            </span>
          </Link>
          <nav className="flex flex-col gap-0.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink hover:shadow-card"
              >
                <span className="font-mono text-[10px] tabular-nums text-ink-faint transition group-hover:text-cobalt">
                  {item.step}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="mb-2.5 flex -space-x-1.5">
              {["scout", "cartographer", "scribe", "pilot"].map((agent) => (
                <AgentAvatar
                  key={agent}
                  seed={agent}
                  size={30}
                  className="bg-surface p-[1px] ring-1 ring-line"
                />
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-ink-soft">
              Agentic audience intelligence for LinkedIn creators.
            </p>
          </div>
        </aside>
        <main className="min-h-screen flex-1 px-10 py-10">{children}</main>
      </div>
    </div>
  );
}
