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
    console.log(`[community] Latest 3 records:`, allData?.slice(0, 3).map(r => ({ 
      id: r.id, 
      created_at: r.created_at, 
      output_url: r.output_url?.substring(0, 50) + "...",
      preset_label: r.preset_label,
      time_ago: r.created_at ? Math.round((Date.now() - new Date(r.created_at).getTime()) / 1000) + "s ago" : "unknown"
    })));
    
    // Filter for valid output_url and exclude deleted/inaccessible images
    const validItems = (allData || []).filter((r) => {
      // Basic URL validation
      if (!r.output_url || typeof r.output_url !== "string" || !r.output_url.startsWith("http")) {
        console.log(`[community] Filtering out record ${r.id}:`, {
          has_url: !!r.output_url,
          url_type: typeof r.output_url,
          url_starts_http: r.output_url?.startsWith("http"),
          url_preview: r.output_url?.substring(0, 50)
        });
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
    console.log(`[community] Latest valid items:`, validItems.slice(0, 3).map(i => ({ 
      id: i.id, 
      output_url: i.output_url?.substring(0, 50) + "...", 
      created_at: i.created_at,
      time_ago: i.created_at ? Math.round((Date.now() - new Date(i.created_at).getTime()) / 1000) + "s ago" : "unknown"
    })));
    
    // Check if any recent images (last 2 minutes) are missing
    const recentImages = allData?.filter(r => {
      if (!r.created_at) return false;
      const age = Date.now() - new Date(r.created_at).getTime();
      return age < 120000; // 2 minutes
    }) || [];
    console.log(`[community] Recent images (last 2 min):`, recentImages.length, recentImages.map(r => ({ id: r.id, time_ago: Math.round((Date.now() - new Date(r.created_at).getTime()) / 1000) + "s ago" })));
    
    console.log(`[community] Sample items with preset_label:`, validItems.slice(0, 3).map(item => ({
      id: item.id,
      preset_label: item.preset_label,
      has_preset: !!item.preset_label
    })));
    
    return NextResponse.json({ ok: true, items: validItems });
  } catch (e: any) {
    console.error("Community API error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Community fetch failed", items: [] }, { status: 500 });
  }
}
