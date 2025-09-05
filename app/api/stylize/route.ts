/* app/api/stylize/route.ts — drop‑in (works with your current flow)
   - Uploads input to Supabase Storage (public)
   - Calls Replicate nano‑banana properly
   - Polls until done
   - If SUPABASE_* envs exist, inserts a public row into `generations`
*/
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE || "";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";

function json(data: any, status = 200) { return NextResponse.json(data, { status }); }
function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try { return new URL(s).protocol === "https:"; } catch { return false; }
}

async function uploadToSupabasePublic(file: File) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase env");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const buf = Buffer.from(await file.arrayBuffer());
  const safe = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safe.includes(".") ? safe.split(".").pop()!.toLowerCase() : "jpg";
  const path = `public/inputs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(path, buf, {
    contentType: file.type || "image/jpeg", upsert: false,
  });
  if (error) throw new Error("upload: " + error.message);
  const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("upload: no public url");
  return data.publicUrl as string;
}

async function replicateCreate(imageUrl: string, prompt: string) {
  const res = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: { image_input: imageUrl, prompt } }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`replicate create ${res.status}: ${text}`);
  return JSON.parse(text);
}
async function replicateGet(id: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` }, cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`replicate get ${res.status}: ${text}`);
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.startsWith("multipart/form-data")) return json({ ok:false, error:"Invalid content-type" }, 400);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = (form.get("prompt") || "").toString().trim() || "fine‑art pet portrait, dramatic lighting, 1:1";
    const preset_label = (form.get("preset_label") || "").toString();
    if (!file) return json({ ok:false, error:"Missing file" }, 400);
    if (!REPLICATE_API_TOKEN) return json({ ok:false, error:"Missing Replicate token" }, 500);

    // 1) upload
    const inputUrl = await uploadToSupabasePublic(file);

    // 2) create prediction
    const created = await replicateCreate(inputUrl, prompt);
    const prediction_id: string | undefined = created?.id;
    if (!prediction_id) return json({ ok:false, error:"No prediction id" }, 502);

    // 3) poll
    const t0 = Date.now();
    const timeoutMs = 55_000;
    let outputUrl: string | null = null;

    while (Date.now() - t0 < timeoutMs) {
      const p = await replicateGet(prediction_id);
      const status = String(p?.status || "");

      if (Array.isArray(p?.output) && p.output.length > 0) outputUrl = p.output[0];
      else if (typeof p?.output === "string") outputUrl = p.output;
      else if (Array.isArray((p as any)?.urls) && (p as any).urls.length > 0) outputUrl = (p as any).urls[0];

      if (status === "succeeded" || status === "completed") break;
      if (status === "failed" || status === "canceled") return json({ ok:false, error: p?.error || "Generation failed" }, 500);
      await new Promise((r) => setTimeout(r, 1200));
    }

    if (!outputUrl || !isHttpsUrl(outputUrl)) return json({ ok:false, error:"No output URL returned" }, 500);

    // 4) insert row (best-effort, don't fail generation if missing env)
    try {
      if (SUPABASE_URL && SERVICE_KEY) {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY);
        await admin.from("generations").insert({
          user_id: null,
          input_url: inputUrl,
          output_url: outputUrl,
          prompt,
          preset_label,
          is_public: true,
        });
      }
    } catch (e) {
      console.warn("[stylize] insert skipped:", (e as any)?.message || e);
    }

    // also push to client-side local history via response (UI may store it)
    return json({ ok:true, prediction_id, input_url: inputUrl, output_url: outputUrl, prompt, preset_label });
  } catch (e: any) {
    console.error("[stylize] error:", e?.message || e);
    return json({ ok:false, error: e?.message || "Unknown error" }, 500);
  }
}
