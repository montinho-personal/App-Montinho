import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getMemoria } from "@/lib/data/memoria";
import { getPlanoAtivo, salvarPlano, type TreinoInput } from "@/lib/data/programas";
import { listTemplates } from "@/lib/db";
import { lerJson, LETRAS } from "@/lib/validacao/schemas";
import type { TemplateTreino, TemplateTreinoEstrutura } from "@/lib/supabase/types-extended";
import { detectarGrupo } from "@/lib/grupos";
import type { TreinoLetra } from "@/lib/supabase/types-sessoes";

const schema = z.object({
  aluno_id: z.string().min(1).max(64),
  template_id: z.string().max(64).optional(),
  memoria_id: z.string().max(64).optional(),
  somente_letra: z.enum(LETRAS).optional(), // "Usar só este dia"
  observacoes: z.string().trim().max(500).nullable().optional(),
  substituir: z.boolean().default(true),
});

/**
 * POST /api/treinos — aplica um template legado ou um programa da memória
 * como NOVO plano do aluno (clonado, com origem preservada). Os treinos
 * anteriores são arquivados (ativo=false), nunca apagados.
 */
export async function POST(request: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });

  let treinos: TreinoInput[] = [];
  let origem = "";
  let programa = { nome: "Programa atual", objetivo: null as string | null, nivel: null as string | null, split: null as string | null, frequencia: {} as Record<string, number>, prioridades: [] as string[], equipamentos: [] as string[], duracao_min: null as number | null };

  if (data.memoria_id) {
    const m = await getMemoria(data.memoria_id);
    if (!m) return NextResponse.json({ error: "Programa da memória não encontrado" }, { status: 404 });
    origem = `memória:${m.id}`;
    programa = { nome: m.nome, objetivo: m.metadados.objetivo, nivel: m.metadados.nivel, split: m.metadados.split, frequencia: m.estrutura.programa.frequencia ?? {}, prioridades: m.metadados.prioridades ?? [], equipamentos: m.metadados.equipamentos ?? [], duracao_min: m.metadados.duracao_min };
    treinos = m.estrutura.treinos
      .filter((t) => !data.somente_letra || t.letra === data.somente_letra)
      .map((t) => ({
        letra: t.letra,
        nome: t.nome,
        ativo: true,
        observacoes: data.observacoes ?? null,
        exercicios: t.exercicios.map((e) => ({
          nome: e.nome,
          series: e.series,
          reps: e.reps,
          ie: e.ie,
          rir: e.rir,
          descanso_seg: e.descanso_seg,
          observacoes: null,
          grupo_muscular: e.grupo_muscular,
          grupos_secundarios: e.grupos_secundarios ?? [],
          grupo_origem: e.grupo_muscular ? "manual" : null,
          grupo_confianca: e.grupo_muscular ? "alta" : null,
          series_aquecimento: e.series_aquecimento ?? 0,
          tecnica: e.tecnica ?? "normal",
          bloco: e.bloco ?? null,
          unilateral: e.unilateral ?? false,
          carga_alvo: null,
          conta_volume: e.grupo_muscular !== "cardio",
          series_config: e.series_config ?? null,
        })),
      }));
  } else if (data.template_id) {
    const tpl = ((await listTemplates()) as TemplateTreino[]).find((t) => t.id === data.template_id);
    if (!tpl) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    origem = `template:${tpl.id}`;
    const estrutura = tpl.estrutura as TemplateTreinoEstrutura;
    programa = { ...programa, nome: tpl.nome, frequencia: Object.fromEntries(Object.keys(estrutura).map((l) => [l, 1])) };
    treinos = (Object.keys(estrutura) as TreinoLetra[])
      .filter((l) => !data.somente_letra || l === data.somente_letra)
      .map((letra) => ({
        letra,
        nome: estrutura[letra].nome,
        ativo: true,
        observacoes: data.observacoes ?? null,
        exercicios: estrutura[letra].exercicios.map((e) => {
          const g = detectarGrupo(e.nome);
          return {
            nome: e.nome,
            series: e.series,
            reps: e.reps,
            ie: e.ie,
            rir: null,
            descanso_seg: e.descanso_seg,
            observacoes: null,
            biblioteca_id: e.biblioteca_id ?? null,
            grupo_muscular: g.grupo,
            grupos_secundarios: g.secundarios,
            grupo_origem: "heuristica" as const,
            grupo_confianca: g.confianca,
            series_aquecimento: 0,
            tecnica: "normal" as const,
            bloco: null,
            unilateral: false,
            carga_alvo: null,
            conta_volume: g.grupo !== "cardio",
          };
        }),
      }));
  } else {
    return NextResponse.json({ error: "Informe template_id ou memoria_id" }, { status: 400 });
  }

  if (!treinos.length) return NextResponse.json({ error: "Nada para aplicar" }, { status: 400 });

  // "Usar só este dia": mantém os demais treinos ativos; substitui apenas a letra escolhida.
  // Substituição completa: treinos anteriores são arquivados (ativo=false), nunca apagados.
  const atual = await getPlanoAtivo(data.aluno_id);
  const comoInput = (t: (typeof atual.treinos)[number], ativo: boolean): TreinoInput => ({
    id: t.id,
    letra: t.letra as TreinoLetra,
    nome: t.nome,
    ativo,
    observacoes: t.observacoes,
    exercicios: t.exercicios.map((e) => ({
      id: e.id, nome: e.nome, series: e.series, reps: e.reps, ie: e.ie, rir: e.rir, descanso_seg: e.descanso_seg, observacoes: e.observacoes,
      grupo_muscular: e.grupo_muscular, grupos_secundarios: e.grupos_secundarios, grupo_origem: e.grupo_origem, grupo_confianca: e.grupo_confianca,
      series_aquecimento: e.series_aquecimento, tecnica: e.tecnica, bloco: e.bloco, unilateral: e.unilateral, carga_alvo: e.carga_alvo,
      conta_volume: e.conta_volume, series_config: e.series_config, biblioteca_id: e.biblioteca_id,
    })),
  });
  let finais: TreinoInput[];
  if (data.somente_letra || !data.substituir) {
    const existentes = atual.treinos.filter((t) => !treinos.some((n) => n.letra === t.letra)).map((t) => comoInput(t, t.ativo));
    finais = [...existentes, ...treinos].sort((a, b) => LETRAS.indexOf(a.letra) - LETRAS.indexOf(b.letra));
  } else {
    finais = [...treinos, ...atual.treinos.map((t) => comoInput(t, false))];
  }

  try {
    const p = atual.programa;
    const resultado = await salvarPlano(data.aluno_id, sessao.userId, {
      programa: {
        nome: programa.nome,
        objetivo: programa.objetivo ?? p?.objetivo ?? null,
        nivel: programa.nivel ?? p?.nivel ?? null,
        split: programa.split ?? p?.split ?? null,
        modo_semana: p?.modo_semana ?? "fixa",
        frequencia: Object.keys(programa.frequencia).length ? programa.frequencia : Object.fromEntries(finais.filter((t) => t.ativo).map((t) => [t.letra, 1])),
        calendario: p?.calendario ?? {},
        metas_volume: p?.metas_volume ?? {},
        prioridades: programa.prioridades.length ? programa.prioridades : p?.prioridades ?? [],
        equipamentos: programa.equipamentos.length ? programa.equipamentos : p?.equipamentos ?? [],
        duracao_min: programa.duracao_min ?? p?.duracao_min ?? null,
        permite_versao_reduzida: p?.permite_versao_reduzida ?? false,
        observacoes: p?.observacoes ?? null,
      },
      treinos: finais,
      motivo: `Programa aplicado a partir de ${origem}`,
      registrarMemoria: false, // já veio da memória/template: evita duplicar o acervo
    });
    return NextResponse.json({ ok: true, origem, treinos: resultado.treinos.filter((t) => t.ativo), versao: resultado.versao }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao aplicar programa" }, { status: 500 });
  }
}
