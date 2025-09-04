import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: data?.detail || "Error" }), { status: res.status });
    }
    return new Response(JSON.stringify({
      ok: true,
      status: data.status,
      urls: Array.isArray(data.output) ? data.output : [],
      error: data.error ?? null,
    }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}
