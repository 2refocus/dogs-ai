import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  // Minimal stub: return empty receipts
  return NextResponse.json({ items: [] });
}
