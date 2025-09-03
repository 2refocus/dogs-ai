
import { NextRequest } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";

const MODEL: `${string}/${string}` | `${string}/${string}:${string}` = (process.env.REPLICATE_MODEL as any) || "google/nano-banana";

function toDataUrl(buf: Buffer, mime = "image/jpeg") {
  const b64 = buf.toString("base64");
  return `data:${mime};base64,${b64}`;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), { status: 400 });
    }
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = String(form.get("prompt") || "").trim();
    const species = String(form.get("species") || "").trim();
    const preset_label = String(form.get("preset_label") || "").trim();

    if (!file) return new Response(JSON.stringify({ error: "Missing file" }), { status: 400 });
    if (!prompt) return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const b64url = toDataUrl(buf, mime);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
    if (!process.env.REPLICATE_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Missing REPLICATE_API_TOKEN" }), { status: 500 });
    }

    // Build input according to Replicate schema
    const input: Record<string, unknown> = {
      prompt,
      image_input: [b64url],
      output_format: "jpg"
    };

    const output = await replicate.run(MODEL, { input });
    // Expect a single URL string (Replicate often returns string or array of strings)
    const url = (Array.isArray(output) ? output[0] : output) as string | undefined;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Model returned no URL", detail: output }), { status: 502 });
    }

    // Guard: if the model echoed the original data URL back (should not happen)
    if (url.startsWith("data:")) {
      return new Response(JSON.stringify({ error: "Transform failed (echoed input). Try a different preset or prompt." }), { status: 502 });
    }

    return new Response(JSON.stringify({
      ok: true,
      output: url,
      meta: { preset_label, species, size: buf.length }
    }), { status: 200, headers: { "content-type": "application/json" } });

  } catch (e: any) {
    const msg = e?.message || "Stylize failed";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
