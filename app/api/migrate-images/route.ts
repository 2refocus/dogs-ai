// app/api/migrate-images/route.ts
// API endpoint to migrate old Replicate URLs to permanent Supabase Storage

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Check if an image URL is still accessible
async function isImageAccessible(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Copy image from high_res_url to permanent Supabase Storage
async function copyImageToStorage(imageUrl: string, filename: string): Promise<string | null> {
  try {
    console.log(`[migrate] Copying image from: ${imageUrl}`);
    
    // If it's already a Supabase URL, just return it
    if (imageUrl.includes('supabase')) {
      console.log(`[migrate] Already a Supabase URL, skipping copy`);
      return imageUrl;
    }
    
    // Download the image with browser-like headers
    console.log(`[migrate] Attempting to fetch: ${imageUrl}`);
    console.log(`[migrate] URL encoded: ${encodeURI(imageUrl)}`);
    
    // Try multiple approaches to bypass bot detection
    let response;
    let method = 'unknown';
    
    // Method 1: Try with different headers and referrer
    try {
      console.log(`[migrate] Trying method 1: Direct with referrer`);
      response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://replicate.com/',
          'Origin': 'https://replicate.com',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      method = 'direct_with_referrer';
      console.log(`[migrate] Method 1 response: ${response.status}, ok: ${response.ok}`);
    } catch (error) {
      console.log(`[migrate] Method 1 failed:`, error);
    }
    
    // Method 2: Try with minimal headers
    if (!response || !response.ok) {
      try {
        console.log(`[migrate] Trying method 2: Minimal headers`);
        response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'curl/7.68.0'
          }
        });
        method = 'minimal_headers';
        console.log(`[migrate] Method 2 response: ${response.status}, ok: ${response.ok}`);
      } catch (error) {
        console.log(`[migrate] Method 2 failed:`, error);
      }
    }
    
    // Method 3: Try with different proxy services
    if (!response || !response.ok) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
        console.log(`[migrate] Trying method 3: AllOrigins proxy`);
        response = await fetch(proxyUrl);
        method = 'allorigins_proxy';
        console.log(`[migrate] Method 3 response: ${response.status}, ok: ${response.ok}`);
      } catch (error) {
        console.log(`[migrate] Method 3 failed:`, error);
      }
    }
    
    // Method 4: Try with another proxy service
    if (!response || !response.ok) {
      try {
        const proxyUrl = `https://thingproxy.freeboard.io/fetch/${imageUrl}`;
        console.log(`[migrate] Trying method 4: ThingProxy`);
        response = await fetch(proxyUrl);
        method = 'thingproxy';
        console.log(`[migrate] Method 4 response: ${response.status}, ok: ${response.ok}`);
      } catch (error) {
        console.log(`[migrate] Method 4 failed:`, error);
      }
    }
    
    // Method 5: Try with a simple image proxy
    if (!response || !response.ok) {
      try {
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`;
        console.log(`[migrate] Trying method 5: Weserv proxy`);
        response = await fetch(proxyUrl);
        method = 'weserv_proxy';
        console.log(`[migrate] Method 5 response: ${response.status}, ok: ${response.ok}`);
      } catch (error) {
        console.log(`[migrate] Method 5 failed:`, error);
      }
    }
    console.log(`[migrate] Final response status: ${response?.status || 'no response'}, ok: ${response?.ok || false}, method: ${method}`);
    
    if (!response || !response.ok) {
      if (response && response.status === 404) {
        console.warn(`[migrate] Image expired (404): ${imageUrl} (method: ${method})`);
      } else {
        console.error(`[migrate] Failed to download image: ${response?.status || 'no response'} - ${response?.statusText || 'unknown error'} (method: ${method})`);
      }
      return null;
    }
    
    const imageBuffer = await response.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);
    
    console.log(`[migrate] Downloaded image size: ${imageBuffer.byteLength} bytes`);
    console.log(`[migrate] Blob size: ${imageBlob.size} bytes`);
    console.log(`[migrate] Content-Type: ${response.headers.get('content-type')}`);
    
    // Check if the response is actually an image
    if (imageBuffer.byteLength === 0) {
      console.error(`[migrate] Downloaded file is empty! Response might be HTML error page`);
      // Try to get the response as text to see what we actually got
      try {
        const textResponse = await fetch(response.url);
        const text = await textResponse.text();
        console.log(`[migrate] Empty response content (first 200 chars): ${text.substring(0, 200)}`);
      } catch (e) {
        console.log(`[migrate] Could not get response text:`, e);
      }
      return null;
    }
    
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
    console.error(`[migrate] Error copying/storing image:`, error);
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
          console.log(`[migrate] ID ${row.id}: ${isAccessible ? 'ACCESSIBLE' : 'EXPIRED'} - ${sourceUrl}`);
          return { ...row, isAccessible, sourceUrl };
        })
      );
      
      // Filter to only accessible images
      accessibleRows = accessibilityChecks.filter(row => row.isAccessible);
      console.log(`[migrate] Found ${accessibleRows.length} accessible images out of ${rows.length} total`);
      
      // Also return the failed ones for debugging
      const failedRows = accessibilityChecks.filter(row => !row.isAccessible);
      console.log(`[migrate] Failed images:`, failedRows.map(row => ({ id: row.id, url: row.sourceUrl })));
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
    const { limit = 5, ids } = await req.json().catch(() => ({}));
    
    let query = supabaseAdmin
      .from('generations')
      .select('id, output_url, high_res_url, preset_label, created_at')
      .like('output_url', '%replicate.delivery%')
      .order('created_at', { ascending: false });

    // If specific IDs are provided, use those
    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids);
    } else {
      // Otherwise use the time-based filter
      query = query.gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
    }

    const { data: rows, error } = await query.limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const results = [];
    
    for (const row of rows || []) {
      try {
        // Use high_res_url if available, otherwise output_url
        const sourceUrl = row.high_res_url || row.output_url;
        const filename = `migrated-${row.id}-${Date.now()}.jpg`;
        
        console.log(`[migrate] Processing row ${row.id}:`);
        console.log(`[migrate] - output_url: ${row.output_url}`);
        console.log(`[migrate] - output_url length: ${row.output_url?.length}`);
        console.log(`[migrate] - high_res_url: ${row.high_res_url}`);
        console.log(`[migrate] - high_res_url length: ${row.high_res_url?.length}`);
        console.log(`[migrate] - using sourceUrl: ${sourceUrl}`);
        console.log(`[migrate] - sourceUrl length: ${sourceUrl?.length}`);
        console.log(`[migrate] - sourceUrl === expected: ${sourceUrl === 'https://replicate.delivery/xezq/6IX4nBh2Bd4tERL4eXFno4YfEqlMvgqWsDyytFZ2DCS5ApSVA/tmpu5fwbg6j.jpeg'}`);
        
        // Copy the image to permanent storage
        const permanentUrl = await copyImageToStorage(sourceUrl, filename);
        
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
