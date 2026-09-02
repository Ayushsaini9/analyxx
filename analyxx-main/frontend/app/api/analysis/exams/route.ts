import { NextResponse } from "next/server";

/**
 * Next.js API Route — /api/analysis/exams
 *
 * Same-origin proxy for the cross-year analysis exams endpoint.
 * Mobile browsers can be aggressive with CORS preflight timeouts on
 * cross-origin fetches (Railway → analyxx.com). This route runs
 * server-side, avoiding CORS entirely for the client.
 *
 * Response is cached for 5 minutes with stale-while-revalidate.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/analyze/exams`, {
      headers: { Accept: "application/json" },
      // Revalidate server-side cache every 5 minutes
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error("[api/analysis/exams] Backend returned", res.status);
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    const exams = Array.isArray(data) ? data : [];

    return NextResponse.json(exams, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("[api/analysis/exams] Fetch error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
