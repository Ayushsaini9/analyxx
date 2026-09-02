import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route — /api/analysis/run
 *
 * Same-origin proxy for the cross-year analysis POST endpoint.
 * Avoids CORS issues on mobile browsers.
 *
 * Expects JSON body: { exam: string, subject: string }
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/v1/analyze/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: "Analysis failed" }));
      return NextResponse.json(errData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/analysis/run] Fetch error:", err);
    return NextResponse.json(
      { detail: "Analysis service unavailable" },
      { status: 502 }
    );
  }
}
