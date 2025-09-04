/* app/api/predictions/[id]/route.ts
 * Fetch a prediction by id from Replicate. Normalize outputs to { urls: string[] }.
 */

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (message: string, status = 400, extras: any = {}) =>
  json({ ok: false, error: message, ...extras }, status);

function collectUrls(node: any, acc: string[]) {
  if (!node) return;
  if (typeof node === "string") {
    try {
      const u = new URL(node);
      if (u.protocol === "http:" || u.protocol === "https:") acc.push(node);
    } catch {}
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectUrls(item, acc);
    return;
  }
  if (typeof node === "object") {
    // common patterns: { url: "..." }, { image: "..." }
    for (const k of Object.keys(node)) {
      if (k === "url" || k === "image" || k === "src") collectUrls((node as any)[k], acc);
      else collectUrls((node as any)[k], acc);
    }
    return;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) return fail("Missing id", 400);

    if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);

    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      return fail(`Replicate get failed (${res.status})`, res.status, { detail: text });
    }

    let pred: any = {};
    try {
      pred = JSON.parse(text);
    } catch {
      return fail("Invalid JSON from Replicate get", 502, { detail: text.slice(0, 400) });
    }

    const urls: string[] = [];
    collectUrls(pred.output, urls);

    return ok({
      status: pred?.status,
      urls,
      error: pred?.error ?? null,
      // Optional: include raw for client-side logging while debugging
      // raw: pred,
    });
  } catch (e: any) {
    return fail(e?.message || "Unknown error", 500);
  }
}
