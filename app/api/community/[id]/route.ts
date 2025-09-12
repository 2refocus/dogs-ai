import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageId = params.id;
    
    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Fetch the specific community image by ID
    const { data: image, error } = await supabase
      .from('community_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (error) {
      console.error('[API] Error fetching community image:', error);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Return the image data in the same format as the community API
    return NextResponse.json({
      id: image.id,
      output_url: image.output_url,
      high_res_url: image.high_res_url,
      input_url: image.input_url,
      aspect_ratio: image.aspect_ratio,
      created_at: image.created_at,
      display_name: image.display_name,
      website: image.website,
      preset_label: image.preset_label,
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
