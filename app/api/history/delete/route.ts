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

    // Get the image record first to get the file paths
    const { data: imageData, error: fetchImageError } = await supabaseAdmin
      .from("generations")
      .select("output_url, high_res_url")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchImageError) {
      return NextResponse.json({ ok: false, error: "Image not found" }, { status: 404 });
    }

    // Delete the database record
    const { error: deleteError } = await supabaseAdmin
      .from("generations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // Ensure user can only delete their own images

    if (deleteError) {
      return NextResponse.json({ ok: false, error: "Failed to delete image" }, { status: 500 });
    }

    // Delete the actual image files from storage (optional - don't fail if this fails)
    try {
      const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";
      
      // Extract file paths from URLs
      const extractPath = (url: string) => {
        if (!url) return null;
        const match = url.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/);
        return match ? match[1] : null;
      };

      const outputPath = extractPath(imageData.output_url);
      const highResPath = extractPath(imageData.high_res_url);

      // Delete files from storage
      const deletePromises = [];
      if (outputPath) {
        deletePromises.push(
          supabaseAdmin.storage.from(STORAGE_BUCKET).remove([outputPath])
        );
      }
      if (highResPath && highResPath !== outputPath) {
        deletePromises.push(
          supabaseAdmin.storage.from(STORAGE_BUCKET).remove([highResPath])
        );
      }

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`[delete] Removed storage files for image ${id}`);
      }
    } catch (storageError) {
      console.warn(`[delete] Failed to delete storage files for image ${id}:`, storageError);
      // Don't fail the request if storage deletion fails
    }

    return NextResponse.json({ ok: true, message: "Image deleted successfully" });
  } catch (error: any) {
    console.error("Delete image error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}