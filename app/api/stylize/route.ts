import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.NANO_BANANA_VERSION || "google/nano-banana";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = (form.get("prompt") || "").toString();
    const species = (form.get("species") || "").toString();
    const preset_label = (form.get("preset_label") || "").toString();

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const b64 = `data:${file.type || "image/png"};base64,` + Buffer.from(ab).toString("base64");

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

    const output: any = await replicate.run(MODEL as `${string}/${string}` | `${string}/${string}:${string}`, {
      input: { prompt, image_input: [b64] }
    });

    let url: string | null = null;
    if (typeof output === "string") url = output;
    else if (Array.isArray(output)) url = output[0] || null;
    else if (output?.image || output?.output) url = (output.image || output.output) as string;
    else if (output?.images && Array.isArray(output.images)) url = output.images[0] || null;

    if (!url) {
      return NextResponse.json({ error: "Unexpected Replicate response", output }, { status: 500 });
    }

    let saved = false;
    let saveError: string | undefined;
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) {
      try {
        const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && userData?.user) {
          const { error: insErr } = await supabaseAdmin.from("generations").insert({
            user_id: userData.user.id,
            species,
            preset_label,
            prompt,
            output_url: url
          });
          if (!insErr) saved = true; else saveError = insErr.message;
        }
      } catch (e: any) {
        saveError = e?.message || "save failed";
      }
    }

    return NextResponse.json({ output: url, saved, saveError });
  } catch (err: any) {
    console.error("stylize error:", err);
    return NextResponse.json({ error: err?.message || "Stylize failed" }, { status: 500 });
  }
}
