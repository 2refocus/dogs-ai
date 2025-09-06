import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    
    if (!url) {
      return NextResponse.json({ ok: false, error: "URL parameter required" }, { status: 400 });
    }

    // Search for records with this exact URL
    const { data: records, error: searchError } = await supabaseAdmin
      .from("generations")
      .select("id, output_url, high_res_url, user_id, created_at, display_name, preset_label")
      .or(`output_url.eq.${url},high_res_url.eq.${url}`);

    if (searchError) {
      return NextResponse.json({ ok: false, error: searchError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      records: records || [],
      found: (records || []).length
    });

  } catch (error: any) {
    console.error("Find record error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ ok: false, error: "URL required" }, { status: 400 });
    }

    // Find and delete records with this URL
    const { data: records, error: searchError } = await supabaseAdmin
      .from("generations")
      .select("id")
      .or(`output_url.eq.${url},high_res_url.eq.${url}`);

    if (searchError) {
      return NextResponse.json({ ok: false, error: searchError.message }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ ok: false, error: "No records found with this URL" }, { status: 404 });
    }

    const ids = records.map(r => r.id);

    // Delete the records
    const { error: deleteError } = await supabaseAdmin
      .from("generations")
      .delete()
      .in("id", ids);

    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Deleted ${ids.length} records with URL`,
      deleted: ids.length,
      deletedIds: ids
    });

  } catch (error: any) {
    console.error("Delete by URL error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}
