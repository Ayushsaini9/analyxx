import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route — /api/library/list-papers
 *
 * Proxies to the backend /api/v1/library/list-papers endpoint which handles
 * listing from R2 (primary) or Supabase (fallback).
 *
 * Query params:
 *   folder — storage folder path, e.g. "rtu-csit/Sem 3"
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const folder = request.nextUrl.searchParams.get("folder")?.trim();

  if (!folder) {
    return NextResponse.json(
      { error: "Missing 'folder' query parameter" },
      { status: 400 }
    );
  }

  // Block path traversal
  if (folder.includes("..") || folder.startsWith("/")) {
    return NextResponse.json({ error: "Invalid folder path" }, { status: 400 });
  }

  // Only allow listing library paper folders
  const validPrefixes = ["rtu-", "cbse-", "jee-", "neet", "cat", "gate", "upsc-"];
  if (!validPrefixes.some((p) => folder.startsWith(p))) {
    return NextResponse.json(
      { error: "Only library paper folders are supported" },
      { status: 400 }
    );
  }

  try {
    // Proxy to backend which handles R2/Supabase
    const backendUrl = `${BACKEND_URL}/api/v1/library/list-papers?folder=${encodeURIComponent(folder)}`;
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.error("[list-papers] Backend error:", res.status, res.statusText);
      return NextResponse.json(
        { error: "Failed to list papers" },
        { status: res.status }
      );
    }

    const pdfs = await res.json();

    return NextResponse.json(pdfs, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("[list-papers] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
