
// app/api/community/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TABLE = "generations";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ ok: false, error: "Missing Supabase env" }, 500);
    }
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supa
      .from(TABLE)
      .select("id, output_url, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) return json({ ok: false, error: error.message }, 500);
    const items = (data || []).filter((r: any) => !!r.output_url);
    return json({ ok: true, items });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
