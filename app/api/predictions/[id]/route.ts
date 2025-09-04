/* app/api/predictions/[id]/route.ts
 * Poll a prediction by id and return status/output in JSON.
 */
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (message: string, status = 400, extras: any = {}) =>
  json({ ok: false, error: message, ...extras }, status);

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);
    const id = ctx?.params?.id;
    if (!id) return fail("Missing prediction id", 400);

    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      cache: "no-store",
    });
    const text = await r.text();
    if (!r.ok) {
      return fail(`Replicate get failed (${r.status})`, r.status, { detail: text });
    }
    let pred: any = {};
    try { pred = JSON.parse(text); } catch {
      return fail("Unexpected Replicate response", 502, { detail: text });
    }

    return ok({
      status: pred?.status,
      output: Array.isArray(pred?.output) ? pred.output : [],
      error: pred?.error ?? null,
      raw: pred,
    });
  } catch (e: any) {
    return fail(e?.message || "Unknown error", 500);
  }
}
