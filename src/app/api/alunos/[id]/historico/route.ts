// Importa o resumo do histórico de outro app (transcrito de prints pelo
// personal). Só o treinador; RLS; idempotente (linhas já gravadas são puladas).
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { IMPORTACOES } from "@/lib/historico";
import { importarHistoricoResumo, registrarDiasDeTreino } from "@/lib/data/historico";
import { getPlanoAtivo } from "@/lib/data/programas";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { lerJson } from "@/lib/validacao/schemas";
import { normalizarNome } from "@/lib/grupos";

// acao "resumo": grava o resumo por exercício; "dias": registra os dias de
// treino identificados como sessões importadas (aderência e conquistas).
const schema = z.object({ importacao_id: z.string().min(1).max(80), acao: z.enum(["resumo", "dias"]).default("resumo") });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const imp = IMPORTACOES.find((i) => i.id === data.importacao_id);
  if (!imp) return NextResponse.json({ error: "Importação não encontrada" }, { status: 404 });
  const aluno = await getAluno(id);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  if (normalizarNome(aluno.profile?.nome) !== normalizarNome(imp.alunoNome)) return NextResponse.json({ error: `Este histórico é de ${imp.alunoNome}.` }, { status: 409 });
  try {
    if (data.acao === "dias") {
      const plano = await getPlanoAtivo(id);
      const treinos = plano.treinos.filter((t) => t.ativo).map((t) => ({ id: t.id, letra: t.letra, nome: t.nome, series: t.exercicios.reduce((a, e) => a + (e.series || 0), 0), exercicios: t.exercicios }));
      if (!treinos.length) return NextResponse.json({ error: "Cadastre o treino da aluna antes." }, { status: 409 });
      const r = await registrarDiasDeTreino(id, imp, treinos);
      // Conquistas pelas mesmas regras, já agora (sem esperar a aluna abrir o app).
      const c = await sincronizarConquistas(aluno).catch(() => null);
      return NextResponse.json({ ok: true, ...r, conquistas: c?.novas.map((x) => x.titulo) ?? [] }, { status: r.novos || r.seriesCompletadas ? 201 : 200 });
    }
    const r = await importarHistoricoResumo(id, imp);
    return NextResponse.json({ ok: true, ...r }, { status: r.novas ? 201 : 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao importar" }, { status: 500 });
  }
}
