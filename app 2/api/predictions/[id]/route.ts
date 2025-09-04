/* app/api/predictions/[id]/route.ts
 * GET -> returns status + output urls for a prediction id
 */
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (msg: string, status = 400, extra: any = {}) => json({ ok: false, error: msg, ...extra }, status);

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const id = ctx.params?.id;
    if (!id) return fail("Missing id", 400);
    if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);

    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) return fail(`Replicate get failed (${res.status})`, res.status, { detail: text });

    const pred = JSON.parse(text);
    const outputArray: string[] = Array.isArray(pred?.output) ? pred.output : [];
    const output = outputArray[0] || null;

    return ok({
      status: pred?.status,
      output,
      urls: outputArray,
      error: pred?.error ?? null,
    });
  } catch (e: any) {
    return fail(e?.message || "Unknown error", 500);
  }
}
