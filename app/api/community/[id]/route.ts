import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageId = params.id;
    
    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    console.log(`[API] Fetching community image with ID: ${imageId}`);

    // Fetch the specific community image by ID from the same table as the main API
    const { data: image, error } = await supabaseAdmin
      .from('generations')
      .select('id, user_id, output_url, high_res_url, input_url, aspect_ratio, preset_label, display_name, website, profile_image_url, pipeline_mode, model_used, user_tier, generation_time_ms, created_at')
      .eq('id', imageId)
      .single();

    if (error) {
      console.error('[API] Error fetching community image:', error);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    if (!image) {
      console.log('[API] No image found with ID:', imageId);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Process the image data the same way as the main community API
    const processedImage = {
      ...image,
      // For records without input_url, try to reconstruct it from the predictable path
      input_url: image.input_url || (image.id ? `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/public/inputs/input-${image.id}.jpg` : null)
    };

    console.log(`[API] Successfully fetched image:`, { id: processedImage.id, output_url: processedImage.output_url });

    return NextResponse.json(processedImage);

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
