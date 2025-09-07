// app/api/migrate-images/route.ts
// API endpoint to migrate old Replicate URLs to permanent Supabase Storage

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Check if an image URL is still accessible
async function isImageAccessible(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Download and store image in Supabase Storage
async function downloadAndStoreImage(imageUrl: string, filename: string): Promise<string | null> {
  try {
    console.log(`[migrate] Downloading image from: ${imageUrl}`);
    
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[migrate] Image expired (404): ${imageUrl}`);
      } else {
        console.error(`[migrate] Failed to download image: ${response.status}`);
      }
      return null;
    }
    
    const imageBuffer = await response.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('generations')
      .upload(filename, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) {
      console.error(`[migrate] Failed to upload to storage:`, error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('generations')
      .getPublicUrl(data.path);
    
    console.log(`[migrate] Successfully stored image: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`[migrate] Error downloading/storing image:`, error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const showAll = url.searchParams.get('all') === 'true';
    const checkAccessible = url.searchParams.get('check') === 'true';
    
    let query = supabaseAdmin
      .from('generations')
      .select('id, output_url, high_res_url, preset_label, created_at')
      .like('output_url', '%replicate.delivery%')
      .order('created_at', { ascending: false });

    // Only filter by recent if not showing all
    if (!showAll) {
      // Use a more flexible range - images from last 48 hours that might still be available
      query = query.gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()); // Last 48 hours
    }

    const { data: rows, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let accessibleRows = rows || [];
    
    // If checking accessibility, test each URL
    if (checkAccessible && rows && rows.length > 0) {
      console.log(`[migrate] Checking accessibility of ${rows.length} images...`);
      const accessibilityChecks = await Promise.all(
        rows.map(async (row) => {
          const sourceUrl = row.high_res_url || row.output_url;
          const isAccessible = await isImageAccessible(sourceUrl);
          return { ...row, isAccessible };
        })
      );
      
      // Filter to only accessible images
      accessibleRows = accessibilityChecks.filter(row => row.isAccessible);
      console.log(`[migrate] Found ${accessibleRows.length} accessible images out of ${rows.length} total`);
    }

    // Get total count for comparison
    const { count: totalCount } = await supabaseAdmin
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .like('output_url', '%replicate.delivery%');

    return NextResponse.json({ 
      ok: true, 
      count: accessibleRows.length,
      totalCount: totalCount || 0,
      filter: checkAccessible ? 'accessible only' : (showAll ? 'all' : 'recent (last 48 hours)'),
      rows: accessibleRows.slice(0, 10) // Show first 10 for preview
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { limit = 5 } = await req.json().catch(() => ({}));
    
    // Find only recent rows that might still be available for migration
    const { data: rows, error } = await supabaseAdmin
      .from('generations')
      .select('id, output_url, high_res_url, preset_label, created_at')
      .like('output_url', '%replicate.delivery%')
      .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const results = [];
    
    for (const row of rows || []) {
      try {
        // Use high_res_url if available, otherwise output_url
        const sourceUrl = row.high_res_url || row.output_url;
        const filename = `migrated-${row.id}-${Date.now()}.jpg`;
        
        console.log(`[migrate] Processing row ${row.id}: ${sourceUrl}`);
        
        // Download and store the image
        const permanentUrl = await downloadAndStoreImage(sourceUrl, filename);
        
        if (permanentUrl) {
          // Update the database record
          const { error: updateError } = await supabaseAdmin
            .from('generations')
            .update({
              output_url: permanentUrl,
              high_res_url: permanentUrl
            })
            .eq('id', row.id);
          
          if (updateError) {
            console.error(`[migrate] Failed to update row ${row.id}:`, updateError);
            results.push({ id: row.id, status: 'error', error: updateError.message });
          } else {
            console.log(`[migrate] Successfully migrated row ${row.id}`);
            results.push({ id: row.id, status: 'success', new_url: permanentUrl });
          }
        } else {
          results.push({ id: row.id, status: 'expired', error: 'Image URL expired (404) - cannot migrate' });
        }
      } catch (error: any) {
        console.error(`[migrate] Error processing row ${row.id}:`, error);
        results.push({ id: row.id, status: 'error', error: error.message });
      }
    }

    return NextResponse.json({ 
      ok: true, 
      processed: results.length,
      results 
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
