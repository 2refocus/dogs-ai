import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type ReplicateModel = `${string}/${string}` | `${string}/${string}:${string}`;
const MODEL: ReplicateModel = (process.env.NANO_BANANA_VERSION ??
  "google/nano-banana:f0a9d34b12ad1c1cd76269a844b218ff4e64e128ddaba93e15891f47368958a0") as ReplicateModel;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = (form.get("prompt") as string | null) || "Stylized portrait";
    const species = (form.get("species") as string | null) || null;
    const preset_label = (form.get("preset_label") as string | null) || null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = `data:${file.type || "image/png"};base64,${buf.toString("base64")}`;

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
    const output = await replicate.run(MODEL, {
      input: { prompt, image_input: [b64] }
    });

    // Try to resolve the signed-in user from the Authorization header
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) {
      const { data: user } = await supabaseAdmin.auth.getUser(token);
      if (user?.user?.id && typeof output === "string") {
        await supabaseAdmin.from("generations").insert({
          user_id: user.user.id,
          prompt,
          species,
          preset_label,
          output_url: output,
          input_bytes: buf.length,
          model_version: MODEL
        });
      }
    }

    return NextResponse.json({ output });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Replicate call failed" }, { status: 500 });
  }
}