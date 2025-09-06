// app/api/community/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

export async function GET() {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      // Soft-fail so UI still works even if env missing
      return NextResponse.json({ ok: true, items: [] });
    }
    
    const { data: allData, error: allError } = await supabaseAdmin
      .from("generations")
      .select("id, user_id, output_url, high_res_url, aspect_ratio, preset_label, display_name, website, created_at")
      .order("id", { ascending: false });
    
    if (allError) {
      console.error("Database query error:", allError);
      return NextResponse.json({ ok: false, error: allError.message, items: [] }, { status: 500 });
    }
    
    // Return all data without filtering - let the frontend handle it
    return NextResponse.json({ ok: true, items: allData || [] });
  } catch (e: any) {
    console.error("Community API error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Community fetch failed", items: [] }, { status: 500 });
  }
}
