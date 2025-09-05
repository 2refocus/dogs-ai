/* app/api/generations/route.ts
 * Safe insert endpoint (service-role) for public.generations
 * - Does NOT touch your working stylize flow
 * - Expects JSON: { input_url, output_url, prompt?, preset_label?, is_public? }
 * - Requires env:
 *    NEXT_PUBLIC_SUPABASE_URL
 *    SUPABASE_SERVICE_ROLE  (server-only)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE;

function j(body: any, status = 200) { return NextResponse.json(body, { status }); }

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return j({ ok:false, error: "Missing Supabase env" }, 500);
    }
    const body = await req.json().catch(() => ({}));
    const input_url: string | null = body?.input_url ?? null;
    const output_url: string | null = body?.output_url ?? null;
    const prompt: string | null = (body?.prompt ?? null);
    const preset_label: string | null = (body?.preset_label ?? null);
    const is_public: boolean = body?.is_public ?? true;

    if (!output_url || typeof output_url !== "string") {
      return j({ ok:false, error: "output_url required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await admin.from("generations").insert({
      user_id: null,
      input_url,
      output_url,
      prompt,
      preset_label,
      is_public,
    });

    if (error) return j({ ok:false, error: error.message }, 500);
    return j({ ok:true });
  } catch (e:any) {
    return j({ ok:false, error: e?.message || "Unknown error" }, 500);
  }
}