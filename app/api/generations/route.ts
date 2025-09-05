/* app/api/generations/route.ts
 * Fire-and-forget insert into public.generations using service role.
 * Safe to call from client after a successful generation.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE || "";

function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ ok: false, error: "Service insert not configured" }, 200); // soft-fail
    }
    const { output_url, input_url, prompt, preset_label, is_public } = await req.json().catch(() => ({}));
    if (!output_url) return json({ ok: false, error: "Missing output_url" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await admin.from("generations").insert({
      user_id: null,
      input_url: input_url ?? null,
      output_url,
      prompt: typeof prompt === "string" ? prompt : null,
      preset_label: typeof preset_label === "string" ? preset_label : null,
      is_public: is_public === undefined ? true : !!is_public,
    });

    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
