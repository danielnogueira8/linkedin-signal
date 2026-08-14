"use client";

import { useState } from "react";

type Predicted = { reactions: number; comments: number; reposts: number };

/**
 * Faithful LinkedIn post preview: the creator's avatar/name/headline, the
 * "...more" fold at ~210 chars, reaction cluster, and the action bar. Takes
 * render the way they'll actually look in the feed.
 */
export function LinkedInPost({
  name,
  headline,
  avatarUrl,
  text,
  predicted,
}: {
  name: string;
  headline?: string | null;
  avatarUrl?: string | null;
  text: string;
  predicted?: Predicted;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const folded = !expanded && text.length > 230;
  const visibleText = folded ? text.slice(0, 210).trimEnd() : text;

  return (
    <div className="overflow-hidden rounded-lg border border-[#e0dfdc] bg-white font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] shadow-sm">
      {/* header */}
      <div className="flex items-start gap-2 px-4 pt-3">
        {avatarUrl && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- LinkedIn CDN avatar
          <img
            src={avatarUrl}
            alt=""
            width={48}
            height={48}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cobalt text-base font-semibold text-white">
            {name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </span>
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-[rgba(0,0,0,0.9)]">
            {name} <span className="font-normal text-[rgba(0,0,0,0.6)]">· You</span>
          </p>
          {headline && (
            <p className="truncate text-xs text-[rgba(0,0,0,0.6)]">{headline}</p>
          )}
          <p className="flex items-center gap-1 text-xs text-[rgba(0,0,0,0.6)]">
            1d ·
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden>
              <path d="M8 1a7 7 0 107 7 7 7 0 00-7-7zm4.9 6H10.6a12.5 12.5 0 00-.8-3.6A5 5 0 0112.9 7zM8 13a11.2 11.2 0 01-1.1-4h2.2A11.2 11.2 0 018 13zM6.9 7a11.2 11.2 0 011-4h.2a11.2 11.2 0 011 4zM6.2 3.4A12.5 12.5 0 005.4 7H3.1a5 5 0 013.1-3.6zM3.1 9h2.3a12.5 12.5 0 00.8 3.6A5 5 0 013.1 9zm7.5 3.6a12.5 12.5 0 00.8-3.6h2.3a5 5 0 01-3.1 3.6z" />
            </svg>
          </p>
        </div>
      </div>

      {/* body */}
      <div className="px-4 pb-2 pt-2.5">
        <p className="whitespace-pre-wrap text-sm leading-normal text-[rgba(0,0,0,0.9)]">
          {visibleText}
          {folded && (
            <>
              {" "}
              <button
                onClick={() => setExpanded(true)}
                className="text-[rgba(0,0,0,0.6)] hover:text-cobalt hover:underline"
              >
                …more
              </button>
            </>
          )}
        </p>
      </div>

      {/* social proof */}
      {predicted && (
        <div className="flex items-center justify-between px-4 pb-1 pt-1 text-xs text-[rgba(0,0,0,0.6)]">
          <span className="flex items-center gap-1">
            <span className="flex -space-x-1 text-[13px]">
              <span>👍</span>
              <span>❤️</span>
              <span>💡</span>
            </span>
            {predicted.reactions}
          </span>
          <span>
            ~{predicted.comments} comments · ~{predicted.reposts} reposts
          </span>
        </div>
      )}

      {/* action bar */}
      <div className="mx-2 mt-1 flex border-t border-[#e0dfdc] py-0.5">
        {[
          ["Like", "M12.4 5.6l.7-2.9A1.5 1.5 0 0011.6.9L11 1a1.7 1.7 0 00-1.2 1L7.6 6H4a1.5 1.5 0 00-1.5 1.5v6A1.5 1.5 0 004 15h8.2a2.5 2.5 0 002.4-1.8l1.2-4.2A2.5 2.5 0 0013.4 6h-1.2z"],
          ["Comment", "M8 1.5A6.5 6.5 0 001.5 8c0 1.2.3 2.3.9 3.3L1.5 14.5l3.4-.8A6.5 6.5 0 108 1.5z"],
          ["Repost", "M4.5 6.5l-3 3 3 3v-2h6v-2h-6v-2zm7-3v2h-6v2h6v2l3-3-3-3z"],
          ["Send", "M14.5 1.5l-13 5.5 4.5 2 6-4.5-4.5 6 2 4.5 5-13.5z"],
        ].map(([label, d]) => (
          <span
            key={label}
            className="flex flex-1 items-center justify-center gap-1.5 rounded py-2.5 text-[13px] font-semibold text-[rgba(0,0,0,0.6)]"
          >
            <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden>
              <path d={d} />
            </svg>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
