// app/api/community/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

export async function GET() {
  try {
    console.log("Community API called");
    console.log("SUPABASE_URL exists:", !!SUPABASE_URL);
    console.log("SERVICE_KEY exists:", !!SERVICE_KEY);
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.log("Missing environment variables");
      return NextResponse.json({ ok: true, items: [], debug: "Missing env vars" });
    }
    
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    console.log("Admin client created");
    
    // Let's try a very simple query first
    const { data, error } = await admin
      .from("generations")
      .select("*")
      .limit(10);
    
    console.log("Simple query result:", data);
    console.log("Simple query error:", error);
    
    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json({ ok: false, error: error.message, items: [], debug: "Query error" }, { status: 500 });
    }
    
    // Filter for items with valid output_url
    const items = (data || []).filter((r) => 
      r.output_url && 
      typeof r.output_url === "string" && 
      r.output_url.startsWith("http")
    );
    
    console.log("Filtered items:", items);
    
    return NextResponse.json({ ok: true, items, debug: { totalRecords: data?.length || 0, filteredItems: items.length } });
  } catch (e: any) {
    console.error("Community API error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Community fetch failed", items: [], debug: "Exception" }, { status: 500 });
  }
}
