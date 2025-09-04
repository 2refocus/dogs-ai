// app/api/predictions/[id]/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return json({ ok: false, error: "Missing REPLICATE_API_TOKEN" }, 500);
    }
    const id = ctx?.params?.id;
    if (!id) return json({ ok: false, error: "Missing id" }, 400);

    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json(
        { ok: false, error: `Replicate GET failed (${res.status})`, detail },
        res.status,
      );
    }

    const pred: any = await res.json();

    // Normalize possible output shapes to an array of HTTPS URLs
    const urls: string[] = [];
    const pushIfUrl = (v: any) => {
      if (typeof v === "string" && /^https?:\/\//i.test(v)) urls.push(v);
    };

    if (Array.isArray(pred?.output)) {
      pred.output.forEach(pushIfUrl);
    } else if (typeof pred?.output === "string") {
      pushIfUrl(pred.output);
    } else if (pred?.output && typeof pred.output === "object") {
      // common patterns: { image: "https://..." }, { images: ["https://...", ...] }
      if (Array.isArray(pred.output.images))
        pred.output.images.forEach(pushIfUrl);
      if (pred.output.image) pushIfUrl(pred.output.image);
      // last-resort scan of object values
      Object.values(pred.output).forEach(pushIfUrl);
    }

    return json({
      ok: true,
      status: pred?.status ?? null,
      urls, // <- use this on the client
      output: pred?.output ?? null, // keep raw for debugging
      error: pred?.error ?? null,
      id: pred?.id ?? id,
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
