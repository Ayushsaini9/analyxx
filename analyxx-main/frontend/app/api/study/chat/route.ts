import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("authorization") || "";

    const res = await fetch(`${API_URL}/api/v1/study/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: "Unknown error" }));
      return NextResponse.json(
        { error: data.detail || "Study chat failed" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Study chat proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
