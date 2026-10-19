// Helpers de autenticação para Route Handlers (compatibilidade com rotas antigas).
// Devolvem um cliente AUTENTICADO (RLS). A service role fica restrita a
// src/lib/supabase/admin.ts e só é usada com checagem explícita (convites, cron).

import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { getDb } from "@/lib/supabase/rls";
import { isDemoMode } from "@/lib/env";

type Db = Awaited<ReturnType<typeof getDb>>;

export async function requireTreinador(): Promise<
  { user: { id: string; nome: string }; db: Db; error: null } | { user: null; db: null; error: NextResponse }
> {
  const s = await getSessao();
  if (!s) return { user: null, db: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (s.role !== "treinador") return { user: null, db: null, error: NextResponse.json({ error: "Apenas o treinador pode fazer isso" }, { status: 403 }) };
  if (isDemoMode()) return { user: null, db: null, error: NextResponse.json({ error: "Operação indisponível no modo demonstração" }, { status: 501 }) };
  return { user: { id: s.userId, nome: s.nome }, db: await getDb(), error: null };
}

export async function requireAuth(): Promise<
  { user: { id: string; nome: string; role: "treinador" | "aluno"; alunoId: string | null }; db: Db; error: null } | { user: null; db: null; error: NextResponse }
> {
  const s = await getSessao();
  if (!s) return { user: null, db: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (isDemoMode()) return { user: null, db: null, error: NextResponse.json({ error: "Operação indisponível no modo demonstração" }, { status: 501 }) };
  return { user: { id: s.userId, nome: s.nome, role: s.role, alunoId: s.alunoId }, db: await getDb(), error: null };
}
