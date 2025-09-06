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
      .select("id, user_id, output_url, high_res_url, aspect_ratio, preset_label, display_name, website, profile_image_url, created_at")
      .order("id", { ascending: false });
    
    if (allError) {
      console.error("Database query error:", allError);
      return NextResponse.json({ ok: false, error: allError.message, items: [] }, { status: 500 });
    }
    
    console.log(`[community] Found ${allData?.length || 0} total records`);
    
    // Filter for valid output_url and exclude deleted/inaccessible images
    const validItems = (allData || []).filter((r) => {
      // Basic URL validation
      if (!r.output_url || typeof r.output_url !== "string" || !r.output_url.startsWith("http")) {
        return false;
      }
      
      // Additional check: if it's a Supabase storage URL, make sure it's not a deleted file
      // This is a basic check - in production you might want to actually verify the file exists
      if (r.output_url.includes("supabase") && r.output_url.includes("storage")) {
        // Skip if the URL looks like it might be deleted (you can add more specific checks here)
        return true; // For now, we'll trust the database
      }
      
      return true;
    });
    
    console.log(`[community] Filtered to ${validItems.length} valid items`);
    console.log(`[community] Latest items:`, validItems.slice(0, 3).map(i => ({ id: i.id, output_url: i.output_url?.substring(0, 50) + "...", created_at: i.created_at })));
    
    return NextResponse.json({ ok: true, items: validItems });
  } catch (e: any) {
    console.error("Community API error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Community fetch failed", items: [] }, { status: 500 });
  }
}
