import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";

  const upstreamUrl = new URL("/api/ndvi-map", backend);
  url.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v));

  const resp = await fetch(upstreamUrl.toString(), { cache: "no-store" });
  const text = await resp.text();

  return new NextResponse(text, {
    status: resp.status,
    headers: {
      "content-type": resp.headers.get("content-type") ?? "application/json",
    },
  });
}

