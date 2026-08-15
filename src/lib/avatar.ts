/**
 * Blob mascots (blobstudio.xyz style) are the visual identity of our synthetic
 * agents — arena personas and the job-runner agents. Real humans (engagers)
 * keep initials dots / photos; only agents get blob faces, so synthetic vs.
 * real stays legible.
 *
 * Each seed deterministically generates a unique organic blob silhouette with
 * a brand-gradient body, white pill eyes, and a mouth. Rendered locally (no
 * network, no deps) and returned as an SVG data URI for <img>.
 */

// Brand palettes: [light, mid, dark] — cobalt, teal, ember
const PALETTES: [string, string, string][] = [
  ["#a9c7ff", "#2f6fec", "#1e56c8"],
  ["#9fe3c6", "#1f7a5f", "#14523f"],
  ["#ffcfa3", "#e56d24", "#b34e12"],
];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth closed blob path through seeded radii (quadratic through midpoints). */
function blobPath(rand: () => number, cx: number, cy: number, r: number): string {
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    const radius = r * (0.88 + rand() * 0.16);
    pts.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const f = (x: number) => x.toFixed(1);
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[(i + 1) % n];
    const m = mid(pts[(i + 1) % n], pts[(i + 2) % n]);
    if (i === 0) {
      const m0 = mid(pts[0], pts[1]);
      d = `M ${f(m0[0])} ${f(m0[1])} `;
    }
    d += `Q ${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])} `;
  }
  return d + "Z";
}

export function agentAvatarUri(seed: string): string {
  const rand = mulberry32(hashSeed(seed));
  const [light, mid, dark] = PALETTES[hashSeed(seed + "p") % PALETTES.length];

  const body = blobPath(rand, 50, 51, 38);

  // Eyes: white vertical pills, slightly-off-centre gaze reads alive
  const eyeH = 11 + rand() * 5;
  const eyeW = 4.6 + rand() * 1.6;
  const gapX = 8.5 + rand() * 3.5;
  const gazeX = (rand() - 0.35) * 4;
  const gazeY = (rand() - 0.5) * 4;
  const eyeY = 44 + gazeY;
  const lx = 50 - gapX + gazeX;
  const rx = 50 + gapX + gazeX;

  // Mouth variants: smile arc, open oval, contented flat
  const mouthY = eyeY + eyeH + 7 + rand() * 3;
  const mouthKind = rand();
  const mouth =
    mouthKind < 0.55
      ? `<path d="M ${(46 + gazeX).toFixed(1)} ${mouthY.toFixed(1)} Q ${(50 + gazeX).toFixed(1)} ${(mouthY + 4.5).toFixed(1)} ${(54 + gazeX).toFixed(1)} ${mouthY.toFixed(1)}" stroke="#fff" stroke-width="3.2" stroke-linecap="round" fill="none"/>`
      : mouthKind < 0.8
        ? `<ellipse cx="${(50 + gazeX).toFixed(1)}" cy="${(mouthY + 1.5).toFixed(1)}" rx="3.4" ry="${(2.6 + rand() * 2).toFixed(1)}" fill="#fff"/>`
        : `<path d="M ${(46.5 + gazeX).toFixed(1)} ${(mouthY + 1).toFixed(1)} L ${(53.5 + gazeX).toFixed(1)} ${(mouthY + 1).toFixed(1)}" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`;

  const gid = `g${(hashSeed(seed) % 100000).toString(36)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><radialGradient id="${gid}" cx="35%" cy="30%" r="85%">
<stop offset="0%" stop-color="${light}"/><stop offset="55%" stop-color="${mid}"/><stop offset="100%" stop-color="${dark}"/>
</radialGradient></defs>
<path d="${body}" fill="url(#${gid})"/>
<rect x="${(lx - eyeW / 2).toFixed(1)}" y="${eyeY.toFixed(1)}" width="${eyeW.toFixed(1)}" height="${eyeH.toFixed(1)}" rx="${(eyeW / 2).toFixed(1)}" fill="#fff"/>
<rect x="${(rx - eyeW / 2).toFixed(1)}" y="${eyeY.toFixed(1)}" width="${eyeW.toFixed(1)}" height="${eyeH.toFixed(1)}" rx="${(eyeW / 2).toFixed(1)}" fill="#fff"/>
${mouth}
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
