// app/api/test-url/route.ts
// Simple endpoint to test if a specific URL is accessible

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let url = 'unknown';
  
  try {
    const body = await req.json();
    url = body.url;
    
    if (!url) {
      return NextResponse.json({ ok: false, error: "URL is required" }, { status: 400 });
    }

    console.log(`[test-url] Testing URL: ${url}`);
    
    // Test with HEAD request first
    const headResponse = await fetch(url, { method: 'HEAD' });
    const headStatus = headResponse.status;
    const headOk = headResponse.ok;
    
    // Also test with GET request
    const getResponse = await fetch(url, { method: 'GET' });
    const getStatus = getResponse.status;
    const getOk = getResponse.ok;
    
    return NextResponse.json({
      ok: true,
      url,
      head: {
        status: headStatus,
        ok: headOk
      },
      get: {
        status: getStatus,
        ok: getOk
      },
      accessible: headOk || getOk
    });
  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message,
      url: url
    }, { status: 500 });
  }
}
