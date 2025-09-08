// app/api/community/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

export async function GET(request: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      // Soft-fail so UI still works even if env missing
      return NextResponse.json({ ok: true, items: [] });
    }
    
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const { data: allData, error: allError } = await supabaseAdmin
      .from("generations")
      .select("id, user_id, output_url, high_res_url, input_url, aspect_ratio, preset_label, display_name, website, profile_image_url, pipeline_mode, model_used, user_tier, generation_time_ms, created_at")
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);
    
    // For records without input_url, try to reconstruct it from the predictable path
    const processedData = (allData || []).map((item: any) => {
      if (!item.input_url && item.id) {
        // Try to reconstruct input URL from predictable path
        // Path format: public/inputs/input-{id}.{ext}
        // We'll try common extensions
        const extensions = ['jpg', 'jpeg', 'png', 'webp'];
        const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/public/inputs/input-${item.id}`;
        
        // For now, we'll use jpg as default since we can't check which extension exists
        // In a production system, you might want to store the extension in the database
        item.input_url = `${baseUrl}.jpg`;
      }
      return item;
    });
    
    if (allError) {
      console.error("Database query error:", allError);
      return NextResponse.json({ ok: false, error: allError.message, items: [] }, { status: 500 });
    }
    
    // Debug logs removed for cleaner console output
    
    // Filter for valid output_url and exclude deleted/inaccessible images
    const validItems = processedData.filter((r) => {
      // Basic URL validation
      if (!r.output_url || typeof r.output_url !== "string" || !r.output_url.startsWith("http")) {
        // Filtering out invalid record
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
    
    // Debug logs removed for cleaner console output
    
    // Return pagination info
    const hasMore = validItems.length === limit;
    
    return NextResponse.json({ 
      ok: true, 
      items: validItems,
      hasMore: hasMore,
      page: page,
      limit: limit
    });
  } catch (e: any) {
    console.error("Community API error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Community fetch failed", items: [] }, { status: 500 });
  }
}
