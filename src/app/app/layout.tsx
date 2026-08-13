import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/app", label: "Sync", step: "01" },
  { href: "/app/audience", label: "Audience Map", step: "02" },
  { href: "/app/studio", label: "Creative Studio", step: "03" },
  { href: "/app/windtunnel", label: "Wind Tunnel", step: "04" },
  { href: "/app/deploy", label: "Deploy", step: "05" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-zinc-800/60 px-4 py-6">
          <Link href="/" className="mb-8 flex items-center gap-2 px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500 font-black text-white">
              S
            </span>
            <span className="text-lg font-bold tracking-tight">
              Signal<span className="text-sky-400">/in</span>
            </span>
          </Link>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
              >
                <span className="font-mono text-[10px] text-zinc-600 group-hover:text-sky-400">
                  {item.step}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-3 text-[11px] leading-relaxed text-zinc-600">
            Audience intelligence for LinkedIn creators.
          </div>
        </aside>
        <main className="min-h-screen flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
