import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";
  const upstreamUrl = new URL("/api/analyze", backend);

  const body = await req.text();
  const resp = await fetch(upstreamUrl.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });

  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: {
      "content-type": resp.headers.get("content-type") ?? "application/json",
    },
  });
}

