import { NextRequest } from "next/server";
import { db, segments, segmentMembers, engagers } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const segmentId = Number(request.nextUrl.searchParams.get("segmentId"));
  if (!segmentId) return Response.json({ error: "segmentId required" }, { status: 400 });

  const seg = await db.query.segments.findFirst({ where: eq(segments.id, segmentId) });
  if (!seg) return Response.json({ error: "Segment not found" }, { status: 404 });

  const rows = await db
    .select({ e: engagers })
    .from(segmentMembers)
    .innerJoin(engagers, eq(segmentMembers.engagerId, engagers.id))
    .where(eq(segmentMembers.segmentId, segmentId));

  const esc = (s: string | null) => `"${(s ?? "").replaceAll('"', '""')}"`;
  const csv = [
    "name,headline,profile_url,engagement_score",
    ...rows.map(({ e }) =>
      [esc(e.name), esc(e.headline), esc(e.profileUrl), e.engagementScore].join(","),
    ),
  ].join("\n");

  const filename = `${seg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-audience.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
