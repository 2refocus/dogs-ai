import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  // Minimal stub: always allow one credit spend.
  // Replace with real Supabase check when ready.
  return NextResponse.json({ ok: true, credits_left: 999 });
}
