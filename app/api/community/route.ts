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
    console.log("Environment check:");
    console.log("SUPABASE_URL:", SUPABASE_URL ? "EXISTS" : "MISSING");
    console.log("SERVICE_KEY:", SERVICE_KEY ? "EXISTS" : "MISSING");
    console.log("SUPABASE_URL value:", SUPABASE_URL);
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      // Soft-fail so UI still works even if env missing
      return NextResponse.json({ ok: true, items: [] });
    }
    // Try to bypass RLS by using the service role with explicit RLS bypass
    const { data: allData, error: allError } = await supabaseAdmin
      .from("generations")
      .select("*")
      .order("id", { ascending: false });
    
    console.log("All records from database:", allData);
    console.log("All records error:", allError);
    console.log("Number of records returned:", allData?.length || 0);
    
    console.log("All records from database:", allData);
    console.log("All records error:", allError);
    console.log("Number of records returned:", allData?.length || 0);
    
    if (allError) {
      console.error("Database query error:", allError);
      return NextResponse.json({ ok: false, error: allError.message, items: [] }, { status: 500 });
    }
    
    // Log each record individually to see what we have
    if (allData) {
      allData.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
          id: record.id,
          user_id: record.user_id,
          output_url: record.output_url,
          has_output_url: !!record.output_url,
          output_url_type: typeof record.output_url,
          starts_with_http: record.output_url?.startsWith('http')
        });
      });
    }
    
    // Filter for valid output_url
    const items = (allData || []).filter((r) => 
      r.output_url && 
      typeof r.output_url === "string" && 
      r.output_url.startsWith("http")
    );
    
    console.log("Filtered items for community feed:", items);
    console.log(`Total records: ${allData?.length || 0}, Valid items: ${items.length}`);
    
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("Community API error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Community fetch failed", items: [] }, { status: 500 });
  }
}
