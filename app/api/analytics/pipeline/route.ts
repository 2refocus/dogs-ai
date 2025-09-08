// app/api/analytics/pipeline/route.ts
// Analytics API for pipeline usage

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Get pipeline usage statistics
    const { data: pipelineStats, error: pipelineError } = await supabaseAdmin
      .from("generations")
      .select("pipeline_mode, model_used, user_tier, generation_time_ms, created_at")
      .gte("created_at", since.toISOString())
      .not("pipeline_mode", "is", null);
    
    if (pipelineError) {
      console.error("Pipeline analytics error:", pipelineError);
      return NextResponse.json({ ok: false, error: pipelineError.message }, { status: 500 });
    }
    
    // Process statistics
    const stats = {
      total_generations: pipelineStats?.length || 0,
      pipeline_usage: {} as Record<string, number>,
      model_usage: {} as Record<string, number>,
      user_tier_usage: {} as Record<string, number>,
      avg_generation_time: 0,
      time_breakdown: {
        simple: 0,
        hybrid: 0,
        multimodel: 0,
      },
    };
    
    let totalTime = 0;
    let timeCount = 0;
    
    pipelineStats?.forEach((record: any) => {
      // Pipeline usage
      const mode = record.pipeline_mode || "unknown";
      stats.pipeline_usage[mode] = (stats.pipeline_usage[mode] || 0) + 1;
      
      // Model usage
      const model = record.model_used || "unknown";
      stats.model_usage[model] = (stats.model_usage[model] || 0) + 1;
      
      // User tier usage
      const tier = record.user_tier || "unknown";
      stats.user_tier_usage[tier] = (stats.user_tier_usage[tier] || 0) + 1;
      
      // Generation time
      if (record.generation_time_ms) {
        totalTime += record.generation_time_ms;
        timeCount++;
        
        // Time breakdown by pipeline
        if (mode in stats.time_breakdown) {
          stats.time_breakdown[mode as keyof typeof stats.time_breakdown] += record.generation_time_ms;
        }
      }
    });
    
    // Calculate averages
    if (timeCount > 0) {
      stats.avg_generation_time = Math.round(totalTime / timeCount);
      
      // Average time per pipeline
      Object.keys(stats.time_breakdown).forEach(mode => {
        const count = stats.pipeline_usage[mode] || 0;
        if (count > 0) {
          stats.time_breakdown[mode as keyof typeof stats.time_breakdown] = 
            Math.round(stats.time_breakdown[mode as keyof typeof stats.time_breakdown] / count);
        }
      });
    }
    
    return NextResponse.json({
      ok: true,
      period_days: days,
      stats,
    });
    
  } catch (e: any) {
    console.error("[analytics/pipeline] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
