import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all generations from database
    const { data: allGenerations, error: fetchError } = await supabaseAdmin
      .from("generations")
      .select("id, output_url, high_res_url, user_id, created_at, display_name, preset_label")
      .order("created_at", { ascending: false });

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      records: allGenerations || []
    });

  } catch (error: any) {
    console.error("Manual cleanup error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: "No IDs provided" }, { status: 400 });
    }

    // Delete the specified records
    const { error: deleteError } = await supabaseAdmin
      .from("generations")
      .delete()
      .in("id", ids);

    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Deleted ${ids.length} records`,
      deleted: ids.length
    });

  } catch (error: any) {
    console.error("Manual cleanup delete error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}
