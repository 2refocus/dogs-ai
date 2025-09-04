import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  if (process.env.ALLOW_DEV_RESET !== "1") {
    return NextResponse.json({ error: "Disabled" }, { status: 403 });
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user, error: errUser } = await supabaseAdmin.auth.getUser(token);
  if (errUser || !user?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("user_credits")
    .upsert({ user_id: user.user.id, credits: 100 });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, credits: 100 });
}
