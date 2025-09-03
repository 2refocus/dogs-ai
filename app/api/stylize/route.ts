import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.NANO_BANANA_VERSION || "google/nano-banana";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = (form.get("prompt") || "").toString();

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const b64 = `data:${file.type || "image/png"};base64,` + Buffer.from(ab).toString("base64");

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

    // nano-banana expects: { prompt, image_input: [<b64-or-url>] }
    const output: any = await replicate.run(MODEL as `${string}/${string}` | `${string}/${string}:${string}`, {
      input: { prompt, image_input: [b64] }
    });

    // Try to resolve the first image URL/string from common shapes
    let url: string | null = null;
    if (typeof output === "string") url = output;
    else if (Array.isArray(output)) url = output[0] || null;
    else if (output?.image || output?.output) url = (output.image || output.output) as string;
    else if (output?.images && Array.isArray(output.images)) url = output.images[0] || null;

    if (!url) {
      return NextResponse.json({ error: "Unexpected Replicate response", output }, { status: 500 });
    }

    return NextResponse.json({ output: url });
  } catch (err: any) {
    console.error("stylize error:", err);
    return NextResponse.json({ error: err?.message || "Stylize failed" }, { status: 500 });
  }
}
