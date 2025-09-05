import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Graceful fallback: if env is missing, return empty list (client will fallback to local history)
    if (!url || !key) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("generations")
      .select("id, output_url, created_at")
      .eq("is_public", true)
      .not("output_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) throw error;
    const items = (data || []).filter((r: any) => typeof r.output_url === "string");
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, items: [], error: e?.message || "Unknown error" },
      { status: 200 }
    );
  }
}
