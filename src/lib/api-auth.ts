// Helper reutilizável para validar auth em API routes.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function requireTreinador() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, admin: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "treinador") {
    return { user: null, admin: null, error: NextResponse.json({ error: "Apenas o treinador pode fazer isso" }, { status: 403 }) };
  }
  return { user, admin, error: null };
}

export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, admin: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  const admin = createSupabaseAdminClient();
  return { user, admin, error: null };
}
