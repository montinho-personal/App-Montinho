// Salva a estratégia (conferida pelo personal) no aluno. Se o aluno ainda
// não tem treino ativo, cria o plano inicial pelo mesmo caminho do montador
// (dias por músculo, metas de séries, frequência). Plano com exercícios nunca
// é substituído aqui; plano só com dias vazios (criado por uma importação
// anterior) é refeito, reaproveitando os dias pela letra. Cada importação fica guardada como versão.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { getPlanoAtivo, salvarPlano } from "@/lib/data/programas";
import { gravarEstrategia } from "@/lib/data/estrategias";
import { criarIntervencao } from "@/lib/data/acompanhamento";
import { planoDaEstrategia } from "@/lib/estrategia/plano";
import { lerJson, salvarEstrategiaSchema, salvarPlanoSchema } from "@/lib/validacao/schemas";
import { getDb } from "@/lib/supabase/rls";
import { isDemoMode } from "@/lib/env";
import type { EstrategiaImportada } from "@/lib/estrategia/ler";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, salvarEstrategiaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const aluno = await getAluno(id);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  const e = data.estrategia as EstrategiaImportada;

  try {
    let planoCriado = false;
    let motivoSemPlano: string | null = null;
    if (data.criar_plano) {
      const atual = await getPlanoAtivo(id);
      const plano = planoDaEstrategia(e);
      const ativos = atual.treinos.filter((t) => t.ativo);
      const soDiasVazios = ativos.length > 0 && ativos.every((t) => t.exercicios.length === 0);
      if (ativos.length && !soDiasVazios) motivoSemPlano = "O aluno já tem treino ativo: o plano não foi alterado (ajuste no montador).";
      else if (!plano) motivoSemPlano = `Divisão “${e.divisao ?? "—"}” sem modelo automático: monte os dias no montador.`;
      else {
        plano.treinos = plano.treinos.map((t) => ({ ...t, id: atual.treinos.find((x) => x.letra === t.letra)?.id ?? null }));
        // Dia vazio da importação anterior que não existe na nova divisão: desativado (nunca apagado).
        for (const t of ativos) {
          if (!plano.treinos.some((n) => n.letra === t.letra)) plano.treinos.push({ id: t.id, letra: t.letra, nome: t.nome, ativo: false, observacoes: t.observacoes ?? null, exercicios: [] });
        }
        const ok = salvarPlanoSchema.safeParse(plano);
        if (!ok.success) motivoSemPlano = "Plano gerado inválido; nada foi criado.";
        else {
          await salvarPlano(id, sessao.userId, plano);
          planoCriado = true;
        }
      }
    }
    const row = await gravarEstrategia(id, e, data.arquivo_nome ?? null, planoCriado);

    // Objetivo do cadastro: preenche só se estiver vazio (não sobrescreve).
    if (!isDemoMode() && !aluno.objetivo && e.objetivo) {
      const db = await getDb();
      await db.from("alunos").update({ objetivo: e.objetivo.slice(0, 300) }).eq("id", id);
    }
    await criarIntervencao(id, sessao.userId, { tipo: "decisao", titulo: "Estratégia importada", descricao: `${e.titulo ?? "Estratégia"} (Montinho Strategy)${planoCriado ? " — plano inicial criado." : ""}`, referencia: { estrategia_id: row.id }, visivel_aluno: false }).catch(() => undefined);
    return NextResponse.json({ ok: true, id: row.id, planoCriado, motivoSemPlano }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao salvar a estratégia" }, { status: 500 });
  }
}
