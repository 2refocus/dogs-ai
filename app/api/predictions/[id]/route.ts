/* app/api/predictions/[id]/route.ts */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (msg: string, status = 400, extra: any = {}) =>
  json({ ok: false, error: msg, ...extra }, status);

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${params.id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return fail(`Replicate get failed (${res.status})`, res.status, { detail: body });

    return ok({
      status: body?.status,
      output: Array.isArray(body?.output) ? body.output : [],
      error: body?.error ?? null,
    });
  } catch (e: any) {
    return fail(e?.message || "Unknown error", 500);
  }
}
