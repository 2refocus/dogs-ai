// app/api/stylize/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";
const REPLICATE_VERSION = process.env.REPLICATE_VERSION;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const form = await req.formData();
    const file = form.get("file") as File;
    const prompt = String(form.get("prompt") || "");

    // upload file
    const buf = Buffer.from(await file.arrayBuffer());
    const path = `inputs/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buf, {
      contentType: file.type,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const imageUrl = data.publicUrl;

    const body: any = { input: { prompt, image_input: [imageUrl] } };
    if (REPLICATE_VERSION) body.version = REPLICATE_VERSION;
    const res = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created?.detail || "Replicate error");

    return new Response(JSON.stringify({ ok: true, prediction_id: created.id, input_url: imageUrl }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}
