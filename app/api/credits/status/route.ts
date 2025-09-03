import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  // Minimal stub: report 0 (client handles free)
  return NextResponse.json({ credits: 0 });
}
