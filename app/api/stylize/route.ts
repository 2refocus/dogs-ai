/* app/api/stylize/route.ts — keep old working flow, fix only Replicate's input shape.
   - Uploads to Supabase Storage using your existing anon client (as before)
   - Creates + polls Replicate prediction
   - Returns { ok, input_url, output_url, prediction_id }
   - OPTIONAL: if SUPABASE_SERVICE_ROLE is set, inserts a row into public.generations
*/

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // <-- same client you were using before
import { createClient as createAdmin } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---- Minimal envs (only Replicate is required for generation)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";

// Optional — ONLY used if present (won’t break if missing)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

// Small helpers
function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

// Get user ID from Authorization header, fallback to anonymous UUID
async function getUserId(req: NextRequest): Promise<string> {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return "00000000-0000-0000-0000-000000000000"; // Anonymous UUID
    
    const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !userData?.user) return "00000000-0000-0000-0000-000000000000"; // Anonymous UUID
    
    return userData.user.id;
  } catch {
    return "00000000-0000-0000-0000-000000000000"; // Anonymous UUID
  }
}

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

// Your original upload path, same storage client/policies you already had
async function uploadToSupabasePublic(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop()!.toLowerCase() : "jpg";
  const path = `public/inputs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase
    .storage
    .from("generations")
    .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false });

  if (error) throw new Error("upload failed: " + error.message);

  const { data } = supabase.storage.from("generations").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("no public url from storage");
  return data.publicUrl;
}

// ---- Replicate REST helpers (no SDK; very stable)
async function replicateCreate(imageUrl: string, prompt: string) {
  // IMPORTANT: image_input as an ARRAY (fix for 422)
  const body = {
    input: {
      image_input: [imageUrl], // <-- key fix
      prompt,
    },
  };

  const res = await fetch(
    `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`replicate create ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function replicateGet(id: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`replicate get ${res.status}: ${text}`);
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return json({ ok: false, error: "Missing Replicate token" }, 500);
    }

    const ct = req.headers.get("content-type") || "";
    if (!ct.startsWith("multipart/form-data")) {
      return json({ ok: false, error: "Invalid content-type" }, 400);
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt =
      (form.get("prompt") || "").toString().trim() ||
      "transform this into a single pet head-and-shoulders portrait, looking at camera; convert any human or other subject into a realistic pet (dog or cat), preserve the original pose and composition; realistic breed, unique markings, fur texture and eye color; respect the original pose and proportions; no changes to anatomy. fine-art studio photograph, 85mm lens look, shallow depth of field (f/1.8), soft key + subtle rim light, gentle bokeh, high detail, crisp facial features. Inspired by Annie Leibovitz, elegant, intricate details, painterly yet realistic, ultra high quality. Avoid: no text, no watermark, no frame, no hands, no extra limbs, no second animal, no distortion, no over-saturation, no human, no person, no people.";
    const preset_label = (form.get("preset_label") || "").toString();

    if (!file) return json({ ok: false, error: "Missing file" }, 400);

    // 1) Upload input (same as before)
    const inputUrl = await uploadToSupabasePublic(file);

    // 2) Create prediction
    const created = await replicateCreate(inputUrl, prompt);
    const prediction_id: string | undefined = created?.id;
    if (!prediction_id) return json({ ok: false, error: "No prediction id" }, 502);

    // 3) Poll up to ~55s
    const t0 = Date.now();
    const timeoutMs = 55_000;
    let outputUrl: string | null = null;

    while (Date.now() - t0 < timeoutMs) {
      const p = await replicateGet(prediction_id);
      const status = String(p?.status || "");

      // Normalize output
      if (Array.isArray(p?.output) && p.output.length > 0) {
        outputUrl = p.output[0]!;
      } else if (typeof p?.output === "string") {
        outputUrl = p.output;
      } else if (Array.isArray((p as any)?.urls) && (p as any).urls.length > 0) {
        outputUrl = (p as any).urls[0]!;
      }

      if (status === "succeeded" || status === "completed") break;
      if (status === "failed" || status === "canceled") {
        return json({ ok: false, error: p?.error || "Generation failed" }, 500);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    if (!outputUrl || !isHttpsUrl(outputUrl)) {
      return json({ ok: false, error: "No output URL returned" }, 500);
    }

    // 4) Optional persistence — only if admin envs are present.
    //    Inserts a row for the Community feed.
    console.log("[stylize] About to insert into database:", {
      SUPABASE_URL: !!SUPABASE_URL,
      SERVICE_ROLE: !!SERVICE_ROLE,
      outputUrl: !!outputUrl,
      preset_label
    });
    
    if (SUPABASE_URL && SERVICE_ROLE) {
      try {
        const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE);
        const insertData = {
          user_id: null,
          output_url: outputUrl,
          high_res_url: outputUrl,
          preset_label: preset_label || "DEFAULT Portrait",
          display_name: null,
          website: null,
          profile_image_url: null,
        };
        console.log("[stylize] Inserting data:", insertData);
        
        const { error } = await admin.from("generations").insert(insertData);
        if (error) {
          console.error("[stylize] insert error:", error);
        } else {
          console.log("[stylize] Successfully inserted into database ✅");
        }
      } catch (e) {
        console.error("[stylize] insert exception:", e);
      }
    } else {
      console.warn("[stylize] skipped insert — missing SUPABASE_SERVICE_ROLE or URL");
    }

    return json({
      ok: true,
      prediction_id,
      input_url: inputUrl,
      output_url: outputUrl,
    });
  } catch (e: any) {
    console.error("[stylize] error:", e?.message || e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
