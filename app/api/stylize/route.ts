// app/api/stylize/route.ts
import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { supabase } from "@/lib/supabaseClient";

// Optional but recommended for ISR/caching behavior in Vercel
export const dynamic = "force-dynamic";

// --- Replicate types (help TS, avoid union-compare error)
type ReplicateStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "completed"
  | "failed"
  | "canceled";

type ReplicatePoll = {
  status?: ReplicateStatus | string;
  output?: string[] | string | null;
  urls?: string[] | null;
  error?: unknown;
};

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

async function uploadToSupabasePublic(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `public/inputs/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("generations")
    .upload(filename, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data: publicUrl } = supabase.storage
    .from("generations")
    .getPublicUrl(filename);

  if (!publicUrl?.publicUrl || !publicUrl.publicUrl.startsWith("https://")) {
    throw new Error("Public URL not available after upload");
  }
  return publicUrl.publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";

    if (!ct.startsWith("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Invalid content-type" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = (form.get("prompt") || "").toString().trim();
    const preset_label = (form.get("preset_label") || "").toString().trim();

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    // 1) Upload to Supabase -> public https URL
    const imageUrl = await uploadToSupabasePublic(file);

    // 2) Create prediction (Nano-Banana expects array for image_input)
    const prediction = await replicate.predictions.create({
      model: process.env.REPLICATE_MODEL || "google/nano-banana",
      input: {
        image_input: [imageUrl],
        prompt: prompt || "Elegant fine-art pet portrait, warm light, 1:1 crop",
      },
    });

    const prediction_id = prediction.id as string;

    // 3) Poll for result (up to ~55 seconds, server side)
    const deadline = Date.now() + 55_000;
    let outputUrl: string | null = null;

    while (Date.now() < deadline) {
      const p = (await replicate.predictions.get(
        prediction_id
      )) as unknown as ReplicatePoll;

      const status = String(p?.status || "");

      // normalize output URL
      if (Array.isArray(p?.output) && p.output.length > 0) {
        outputUrl = p.output[0]!;
      } else if (typeof p?.output === "string") {
        outputUrl = p.output;
      } else if (Array.isArray(p?.urls) && p.urls.length > 0) {
        outputUrl = p.urls[0]!;
      }

      if (status === "succeeded" || status === "completed") {
        if (!outputUrl) {
          return NextResponse.json(
            { ok: false, error: "No output URL returned" },
            { status: 502 }
          );
        }
        break;
      }

      if (status === "failed" || status === "canceled") {
        return NextResponse.json(
          { ok: false, error: p?.error ?? "Prediction failed" },
          { status: 500 }
        );
      }

      // keep polling
      await new Promise((r) => setTimeout(r, 2500));
    }

    if (!outputUrl) {
      // either timed out or succeeded without a URL
      return NextResponse.json(
        { ok: false, error: "No output URL returned" },
        { status: 500 }
      );
    }

    // 4) Try to persist (ignore if RLS blocks; just warn)
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

    // 5) Done
    return NextResponse.json({
      ok: true,
      input_url: imageUrl,
      output_url: outputUrl,
      prediction_id,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}