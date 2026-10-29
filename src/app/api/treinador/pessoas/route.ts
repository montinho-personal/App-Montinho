// Lupa da barra de cima (painel do personal): lista leve de todas as pessoas
// (alunos e visitantes) para a busca rápida, sem sair da tela.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";

export async function GET() {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const alunos = await listAlunos({ incluirVisitantes: true });
  const pessoas = alunos
    .map((a) => ({ id: a.id, nome: a.profile?.nome ?? "Sem nome", email: a.profile?.email ?? null, telefone: a.telefone ?? null, status: a.status, visitante: a.modalidade === "visitante", ultimoTreino: a.ultimo_treino_em ?? null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return NextResponse.json({ pessoas }, { headers: { "Cache-Control": "no-store" } });
}
