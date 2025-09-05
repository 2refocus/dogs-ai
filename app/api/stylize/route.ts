import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { supabase } from "@/lib/supabaseClient";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

async function uploadToSupabasePublic(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename = `public/inputs/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from("generations")
    .upload(filename, buffer, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage
    .from("generations")
    .getPublicUrl(filename);
  return publicUrl.publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let file: File | null = null;
    let prompt = "";
    let preset_label = "";
    let imageUrl: string | null = null;

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      file = form.get("file") as File | null;
      prompt = (form.get("prompt") || "").toString();
      preset_label = (form.get("preset_label") || "").toString();
      if (!file) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
      imageUrl = await uploadToSupabasePublic(file);
    } else {
      return NextResponse.json({ ok: false, error: "Invalid content-type" }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }

    const prediction = await replicate.predictions.create({
      model: process.env.REPLICATE_MODEL || "google/nano-banana",
      input: {
        image_input: imageUrl,
        prompt,
      },
    });

    const prediction_id = prediction.id;
    let outputUrl: string | null = null;

    const deadline = Date.now() + 55000;
    while (Date.now() < deadline) {
      const p = await replicate.predictions.get(prediction_id);
      if (p.error) {
        return NextResponse.json({ ok: false, error: p.error }, { status: 500 });
      }
      
// p is the poll response
const p = (await pollRes.json()) as ReplicatePoll;

// normalize status
const status = String(p?.status || "");

// pick first available output URL from either shape
let outputUrl: string | null = null;
if (Array.isArray(p.output) && p.output.length > 0) {
  outputUrl = p.output[0]!;
} else if (typeof p.output === "string") {
  outputUrl = p.output;
} else if (Array.isArray(p.urls) && p.urls.length > 0) {
  outputUrl = p.urls[0]!;
}

// handle terminal states
if (status === "succeeded" || status === "completed") {
  if (!outputUrl) {
    return NextResponse.json(
      { ok: false, error: "No output URL returned" },
      { status: 502 }
    );
  }
  // ...continue with your success flow using `outputUrl`
}

if (status === "failed" || status === "canceled") {
  return NextResponse.json(
    { ok: false, error: p?.error ?? "Generation failed" },
    { status: 500 }
  );
}

// otherwise keep polling…

if (Array.isArray(p.output) && p.output.length > 0) outputUrl = p.output[0];
        else if (Array.isArray((p as any).urls) && (p as any).urls.length > 0)
          outputUrl = (p as any).urls[0];
        else if (typeof p.output === "string") outputUrl = p.output;
        break;
      }
      if (p.status === "failed" || p.status === "canceled") {
        return NextResponse.json({ ok: false, error: "Prediction failed" }, { status: 500 });
      }
      await new Promise((r) => setTimeout(r, 2500));
    }

    if (!outputUrl) {
      return NextResponse.json({ ok: false, error: "No output URL returned" }, { status: 500 });
    }

    try {
      await supabase.from("generations").insert({
        user_id: null,
        input_url: imageUrl,
        output_url: outputUrl,
        prompt,
        preset_label,
        is_public: true,
      });
    } catch (e) {
      console.warn("Insert to generations failed:", e);
    }

    return NextResponse.json({ ok: true, input_url: imageUrl, output_url: outputUrl, prediction_id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
