// Debug endpoint to test database connection and data
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET() {
  try {
    console.log("Debug API called");
    console.log("SUPABASE_URL:", SUPABASE_URL ? "EXISTS" : "MISSING");
    console.log("SERVICE_KEY:", SERVICE_KEY ? "EXISTS" : "MISSING");
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing environment variables",
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SERVICE_KEY
        }
      });
    }
    
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    
    // Test basic connection
    const { data, error } = await admin
      .from("generations")
      .select("*")
      .limit(5);
    
    console.log("Debug query result:", data);
    console.log("Debug query error:", error);
    
    return NextResponse.json({
      ok: true,
      debug: {
        totalRecords: data?.length || 0,
        records: data,
        error: error,
        hasData: !!data && data.length > 0
      }
    });
    
  } catch (e: any) {
    console.error("Debug API error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Debug failed",
      debug: { exception: e.toString() }
    });
  }
}
