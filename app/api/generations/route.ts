/* app/api/generations/route.ts
 * Inserts a row into public.generations using SERVICE ROLE.
 * Also supports GET to quickly check connectivity by listing latest 12.
 *
 * Env required for POST to work:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE   (server-only)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const TABLE = "generations";

function ok(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    if (!URL || !SRK) {
      return ok({ ok: false, configured: false, items: [], error: "Service insert not configured" });
    }
    const admin = createClient(URL, SRK);
    const { data, error } = await admin
      .from(TABLE)
      .select("id, output_url, input_url, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) return ok({ ok: false, configured: true, error: error.message, items: [] });
    return ok({ ok: true, configured: true, items: data || [] });
  } catch (e: any) {
    return ok({ ok: false, configured: Boolean(URL && SRK), error: e?.message || String(e), items: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!URL || !SRK) {
      // Soft success so UI never breaks, but make it obvious in logs
      return ok({ ok: false, configured: false, error: "Service insert not configured" });
    }
    const body = await req.json().catch(() => ({}));
    const row = {
      preset_label: body?.preset_label ?? null,
      output_url: body?.output_url ?? null,
      // Only insert columns that actually exist in the table schema
    };

    if (!row.output_url || typeof row.output_url !== "string") {
      return ok({ ok: false, error: "output_url required" }, 400);
    }

    const admin = createClient(URL, SRK);
    const { data, error } = await admin.from(TABLE).insert(row).select().single();
    if (error) return ok({ ok: false, error: error.message });
    return ok({ ok: true, row: data });
  } catch (e: any) {
    return ok({ ok: false, error: e?.message || String(e) });
  }
}
