import { NextRequest } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";

const MODEL: `${string}/${string}` | `${string}/${string}:${string}` = (process.env.REPLICATE_MODEL as any) || "google/nano-banana";

const ALLOWED_AR = new Set(["1:1","4:5","3:4","16:9"]);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = String(form.get("prompt") || "").trim();
    const aspectFromForm = String(form.get("aspectRatio") || "").trim();
    const preset_label = String(form.get("preset_label") || "").trim();

    if (!file) return new Response(JSON.stringify({ error: "Missing file" }), { status: 400 });
    if (!prompt) return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const b64 = `data:${mime};base64,${buf.toString("base64")}`;

    const aspect_ratio = ALLOWED_AR.has(aspectFromForm as any) ? (aspectFromForm as any) : "1:1"; // default square

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
    if (!process.env.REPLICATE_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Missing REPLICATE_API_TOKEN" }), { status: 500 });
    }

    const input: Record<string, unknown> = {
      prompt,
      image_input: [b64],
      output_format: "jpg",
      aspect_ratio
    };

    const output = await replicate.run(MODEL, { input });
    const url = (Array.isArray(output) ? output[0] : output) as string | undefined;
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Model returned no URL", detail: output }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true, output: url, meta: { preset_label, aspect_ratio } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Stylize failed" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
