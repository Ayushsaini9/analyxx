import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route — /api/analysis/subjects
 *
 * Same-origin proxy for the cross-year analysis subjects endpoint.
 * Avoids CORS issues on mobile browsers.
 *
 * Query params:
 *   exam — exam name, e.g. "CBSE-10"
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const exam = request.nextUrl.searchParams.get("exam");

  if (!exam) {
    return NextResponse.json(
      { error: "Missing 'exam' query parameter" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/analyze/subjects?exam=${encodeURIComponent(exam)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.error("[api/analysis/subjects] Backend returned", res.status);
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    const subjects = Array.isArray(data) ? data : [];

    return NextResponse.json(subjects, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("[api/analysis/subjects] Fetch error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
