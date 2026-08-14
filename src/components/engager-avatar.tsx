"use client";

import { useState } from "react";
import { AvatarDot } from "./ui";

/**
 * Real engager avatar: LinkedIn profile photo when we have one, initials dot
 * otherwise. LinkedIn CDN URLs are signed and expire, so a broken image falls
 * back to the dot instead of a broken-image icon.
 */
export function EngagerAvatar({
  name,
  imageUrl,
  size = 28,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) return <AvatarDot name={name} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external LinkedIn CDN, next/image needs static remotePatterns
    <img
      src={imageUrl}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
