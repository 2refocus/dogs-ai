// app/api/pipeline-options/route.ts
// API endpoint to get available pipeline options for user

import { NextRequest, NextResponse } from "next/server";
import { getAvailablePipelineOptions, getUserTier } from "@/lib/pipelineStrategy";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    const userTier = getUserTier(userId);
    const options = getAvailablePipelineOptions(userTier);

    return NextResponse.json({
      ok: true,
      user_tier: userTier,
      default_mode: options.default,
      available_modes: options.options,
      strategy: options.strategy,
    });

  } catch (e: any) {
    console.error("[pipeline-options] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
