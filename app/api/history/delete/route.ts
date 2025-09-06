import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    // Get user ID from Authorization header
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    // Verify user
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    const userId = userData.user.id;
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ ok: false, error: "Image ID required" }, { status: 400 });
    }

    // Get all user's images to check if this is the first one
    const { data: userImages, error: fetchError } = await supabaseAdmin
      .from("generations")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      return NextResponse.json({ ok: false, error: "Failed to fetch user images" }, { status: 500 });
    }

    // Check if this is the first image (oldest by created_at)
    if (userImages && userImages.length > 0) {
      const firstImage = userImages[0];
      if (firstImage.id === id) {
        return NextResponse.json({ ok: false, error: "Cannot delete your first image" }, { status: 400 });
      }
    }

    // Delete the image
    const { error: deleteError } = await supabaseAdmin
      .from("generations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // Ensure user can only delete their own images

    if (deleteError) {
      return NextResponse.json({ ok: false, error: "Failed to delete image" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Image deleted successfully" });
  } catch (error: any) {
    console.error("Delete image error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}