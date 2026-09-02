import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// App Router segment config: extend timeout for large images + AI processing
export const maxDuration = 60; // seconds (Vercel hobby = 60s max)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";

    // Forward the raw body as-is (multipart form data)
    const body = await request.arrayBuffer();
    const contentType = request.headers.get("content-type") || "";

    const res = await fetch(`${API_URL}/api/v1/papers/analyze-image`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Authorization: authHeader,
      },
      body: body,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Unknown error" }));
      return NextResponse.json(
        { detail: errorData.detail || "Image analysis failed" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Image analysis proxy error:", err);
    return NextResponse.json(
      { detail: "Failed to connect to the analysis server. Please try again." },
      { status: 502 }
    );
  }
}
