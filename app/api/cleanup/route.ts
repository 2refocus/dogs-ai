import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Get all generations from database
    const { data: allGenerations, error: fetchError } = await supabaseAdmin
      .from("generations")
      .select("id, output_url, high_res_url, user_id, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }

    console.log(`[cleanup] Found ${allGenerations?.length || 0} total records`);

    // Check which images are actually accessible
    const orphanedRecords = [];
    const validRecords = [];

    for (const record of allGenerations || []) {
      try {
        // For Replicate delivery URLs, we need to be more careful
        // They might return 403/404 even for valid images due to CDN behavior
        const response = await fetch(record.output_url, { 
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; cleanup-bot/1.0)'
          }
        });
        
        // Consider 200, 301, 302 as valid (redirects are common for CDNs)
        if (response.ok || response.status === 301 || response.status === 302) {
          validRecords.push(record);
        } else if (response.status === 403) {
          // 403 might mean the image exists but access is restricted
          // Let's try a GET request to be more sure
          try {
            const getResponse = await fetch(record.output_url, { method: 'GET' });
            if (getResponse.ok) {
              validRecords.push(record);
            } else {
              orphanedRecords.push({
                ...record,
                status: getResponse.status,
                statusText: getResponse.statusText
              });
            }
          } catch {
            // If GET also fails, consider it orphaned
            orphanedRecords.push({
              ...record,
              status: response.status,
              statusText: response.statusText
            });
          }
        } else {
          orphanedRecords.push({
            ...record,
            status: response.status,
            statusText: response.statusText
          });
        }
      } catch (error) {
        orphanedRecords.push({
          ...record,
          status: 'error',
          statusText: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        total: allGenerations?.length || 0,
        valid: validRecords.length,
        orphaned: orphanedRecords.length
      },
      orphaned: orphanedRecords,
      valid: validRecords.slice(0, 10) // Show first 10 valid records as sample
    });

  } catch (error: any) {
    console.error("Cleanup check error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Get all generations from database
    const { data: allGenerations, error: fetchError } = await supabaseAdmin
      .from("generations")
      .select("id, output_url, high_res_url, user_id, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }

    console.log(`[cleanup] Checking ${allGenerations?.length || 0} records for orphaned images`);

    const orphanedIds = [];

    // Check which images are actually accessible
    for (const record of allGenerations || []) {
      try {
        // For Replicate delivery URLs, we need to be more careful
        const response = await fetch(record.output_url, { 
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; cleanup-bot/1.0)'
          }
        });
        
        // Consider 200, 301, 302 as valid (redirects are common for CDNs)
        if (response.ok || response.status === 301 || response.status === 302) {
          // Valid record, don't add to orphaned
        } else if (response.status === 403) {
          // 403 might mean the image exists but access is restricted
          // Let's try a GET request to be more sure
          try {
            const getResponse = await fetch(record.output_url, { method: 'GET' });
            if (!getResponse.ok) {
              orphanedIds.push(record.id);
              console.log(`[cleanup] Orphaned record ${record.id}: ${getResponse.status} ${getResponse.statusText}`);
            }
          } catch {
            // If GET also fails, consider it orphaned
            orphanedIds.push(record.id);
            console.log(`[cleanup] Orphaned record ${record.id}: ${response.status} ${response.statusText}`);
          }
        } else {
          orphanedIds.push(record.id);
          console.log(`[cleanup] Orphaned record ${record.id}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        orphanedIds.push(record.id);
        console.log(`[cleanup] Orphaned record ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (orphanedIds.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: "No orphaned records found",
        deleted: 0
      });
    }

    // Delete orphaned records
    const { error: deleteError } = await supabaseAdmin
      .from("generations")
      .delete()
      .in("id", orphanedIds);

    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    console.log(`[cleanup] Deleted ${orphanedIds.length} orphaned records`);

    return NextResponse.json({ 
      ok: true, 
      message: `Deleted ${orphanedIds.length} orphaned records`,
      deleted: orphanedIds.length,
      deletedIds: orphanedIds
    });

  } catch (error: any) {
    console.error("Cleanup delete error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}
