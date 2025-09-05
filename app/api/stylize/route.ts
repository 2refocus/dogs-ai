/* app/api/stylize/route.ts
   Old working flow + minimal patch to persist to Supabase after success.
   - Uses Replicate SDK (no "version" field to avoid 422)
   - Uploads the input file to Supabase Storage
   - Polls Replicate until "succeeded"
   - Then tries a non-blocking insert into public.generations via Service Role
*/

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// --- Env
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";
const STORAGE_PREFIX = "public/inputs";

// admin client (server-only; bypasses RLS)
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Replicate client
const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

async function uploadToSupabasePublic(file: File): Promise<string> {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // sanitize filename
  const safeName = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${STORAGE_PREFIX}/${Date.now()}-${safeName}`;

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error("Upload failed: " + error.message);

  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get public URL for upload");
  return data.publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }
    if (!SUPABASE_URL) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    const ct = req.headers.get("content-type") || "";
    if (!ct.startsWith("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Invalid content-type" },
        { status: 400 }
      );
    }

    // ---- Parse form
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = (form.get("prompt") || "").toString();
    const preset_label = (form.get("preset_label") || "").toString();

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    // ---- Upload to Supabase Storage (public URL)
    let imageUrl = "";
    try {
      imageUrl = await uploadToSupabasePublic(file);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.message || "Upload failed" },
        { status: 500 }
      );
    }

    // ---- Create Replicate prediction
    const prediction = await replicate.predictions.create({
      model: REPLICATE_MODEL, // allow "google/nano-banana" or "google/nano-banana:<hash>"
      input: {
        image_input: imageUrl, // single URL or array also works; URL is fine
        prompt,
      },
    });

    const prediction_id = prediction.id;
    let outputUrl: string | null = null;

    // ---- Poll Replicate
    const deadline = Date.now() + 55_000; // ~55s budget
    while (Date.now() < deadline) {
      const p = await replicate.predictions.get(prediction_id);

      if (p.error) {
        return NextResponse.json(
          { ok: false, error: p.error },
          { status: 500 }
        );
      }

      // success?
      if (p.status === "succeeded") {
        // normalize different output shapes
        if (Array.isArray(p.output) && p.output.length > 0) {
          outputUrl = p.output[0] as string;
        } else if (typeof (p as any).urls?.[0] === "string") {
          outputUrl = (p as any).urls[0] as string;
        } else if (typeof p.output === "string") {
          outputUrl = p.output as string;
        }
        break;
      }

      // terminal failures
      if (p.status === "failed" || p.status === "canceled") {
        return NextResponse.json(
          { ok: false, error: "Prediction failed" },
          { status: 500 }
        );
      }

      await new Promise((r) => setTimeout(r, 1200));
    }

    if (!outputUrl) {
      return NextResponse.json(
        { ok: false, error: "No output URL returned" },
        { status: 500 }
      );
    }

    // ---- PATCH: Non-blocking insert into public.generations
    (async () => {
      try {
        if (!supabaseAdmin) {
          console.warn(
            "[stylize] Skipping DB insert: missing SUPABASE_SERVICE_ROLE_KEY"
          );
          return;
        }
        await supabaseAdmin.from("generations").insert({
          user_id: null,          // keep guest; replace if you attach auth user id
          input_url: imageUrl,
          output_url: outputUrl,
          prompt,
          preset_label,
          is_public: true,        // so it can appear in the community feed
        });
      } catch (err: any) {
        console.warn("[stylize] Insert failed:", err?.message || err);
      }
    })();

    // ---- Done
    return NextResponse.json({
      ok: true,
      input_url: imageUrl,
      output_url: outputUrl,
      prediction_id,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}