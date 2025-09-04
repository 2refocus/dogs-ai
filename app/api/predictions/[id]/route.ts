// app/api/predictions/[id]/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (msg: string, status = 400, extra: any = {}) =>
  json({ ok: false, error: msg, ...extra }, status);

/** Normalize many possible output shapes to an array of URL-like strings. */
function extractImages(output: any): string[] {
  if (!output) return [];

  const isUrlish = (s: any) =>
    typeof s === "string" && (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:"));

  if (Array.isArray(output)) {
    const urls: string[] = [];
    for (const item of output) {
      if (isUrlish(item)) urls.push(item);
      else if (item && typeof item === "object") {
        const maybe = (item as any).url || (item as any).image || (item as any).path || (item as any).src || (item as any).href;
        if (isUrlish(maybe)) urls.push(maybe);
      }
    }
    return urls;
  }

  if (typeof output === "object") {
    const pools = [
      (output as any).images,
      (output as any).image,
      (output as any).output,
      (output as any).result,
      (output as any).data,
    ].filter(Boolean);

    for (const pool of pools) {
      const got = extractImages(pool);
      if (got.length) return got;
    }

    const direct =
      (output as any).url ||
      (output as any).image ||
      (output as any).path ||
      (output as any).src ||
      (output as any).href;
    if (isUrlish(direct)) return [direct];
  }

  if (isUrlish(output)) return [output];
  return [];
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!REPLICATE_API_TOKEN) return fail("Server missing Replicate token", 500);
    const id = params?.id;
    if (!id) return fail("Missing prediction id", 400);

    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      cache: "no-store",
    });

    const text = await res.text();
    let pred: any = {};
    try { pred = JSON.parse(text); } catch { return fail("Invalid JSON from Replicate", 502, { text }); }
    if (!res.ok) return fail(`Replicate error ${res.status}`, res.status, { pred });

    const status = pred?.status ?? "unknown";
    const images = extractImages(pred?.output ?? null);
    const url = images[0] || null;

    return ok({ status, url, output: images, raw: pred });
  } catch (e: any) {
    return fail(e?.message || "Unknown error", 500);
  }
}
