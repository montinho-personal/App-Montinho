import { NextResponse } from "next/server";
import { appMode, DEMO_COOKIE } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST /api/auth/logout — encerra a sessão (demo: apaga cookie; live: signOut). */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  if (appMode() === "demo") {
    res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
  if (appMode() === "live") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return res;
}
