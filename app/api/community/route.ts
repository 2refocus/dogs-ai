// app/api/community/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin
      .from("generations")
      .select("id, output_url, preset_label")
      .not("output_url", "is", null) // Only get rows with output_url
      .order("id", { ascending: false }) // Order by id since created_at doesn't exist
      .limit(24);
    if (error) throw error;
    const items = (data || []).filter((r) => typeof r.output_url === "string" && r.output_url.startsWith("http"));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Community fetch failed", items: [] }, { status: 500 });
  }
}
