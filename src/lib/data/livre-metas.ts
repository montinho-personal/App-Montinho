// Protocolo livre (por metas) (0100): grava o estilo/metas do programa e monta o
// placar da semana do aluno. Regras puras em src/lib/treino/livre-metas.ts.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { calcularVolumeSemanal, volumeRealizadoPorGrupo, type MetaVolume, type Tecnica } from "@/lib/volume/calcular";
import { inicioDaSemanaDe, metasDaFicha, placarDaSemana, resumoDaSemana, sugestaoDeAgora, type LinhaPlacar, type Sugestao } from "@/lib/treino/livre-metas";
import { referenciasPorNivel } from "@/lib/volume/referencias";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { Programa } from "@/lib/supabase/types-sessoes";

export type Metas = Partial<Record<GrupoMuscular, MetaVolume>>;

/** Liga/desliga o protocolo livre (por metas) e grava as faixas. Cria o programa se o aluno não tiver. */
export async function salvarLivreMetas(alunoId: string, metas: Metas, ligado: boolean): Promise<void> {
  const agora = new Date().toISOString();
  const estilo = ligado ? "livre_metas" : "fichas";
  if (isDemoMode()) {
    const st = demoStore();
    let p = st.programas.find((x) => x.aluno_id === alunoId && x.ativo);
    if (!p) {
      p = { id: uid(), aluno_id: alunoId, nome: "Protocolo livre (por metas)", objetivo: null, nivel: null, split: null, modo_semana: "fixa", frequencia: {}, calendario: {}, metas_volume: {}, prioridades: [], equipamentos: [], duracao_min: null, permite_versao_reduzida: false, observacoes: null, versao: 1, ativo: true, created_at: agora, updated_at: agora };
      st.programas.push(p);
    }
    Object.assign(p, { metas_volume: metas, estilo, updated_at: agora });
    return;
  }
  const db = await getDb();
  const { data: atual } = await db.from("programas").select("id").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle();
  if (atual) {
    const { error } = await db.from("programas").update({ metas_volume: metas, estilo }).eq("id", atual.id);
    if (error) throw new Error(/estilo/.test(error.message) ? "O banco ainda não tem o protocolo livre (por metas) (falta aplicar a 0100)." : error.message);
    return;
  }
  const { error } = await db.from("programas").insert({ aluno_id: alunoId, nome: "Protocolo livre (por metas)", metas_volume: metas, estilo, ativo: true });
  if (error) throw new Error(/estilo/.test(error.message) ? "O banco ainda não tem o protocolo livre (por metas) (falta aplicar a 0100)." : error.message);
}

function referenciaIniciante(): Metas {
  const r = referenciasPorNivel("iniciante");
  return Object.fromEntries(PRINCIPAIS.filter((g) => r[g]).map((g) => [g, r[g]!]));
}

export const ehLivreMetas = (p: Pick<Programa, "estilo"> | null | undefined) => p?.estilo === "livre_metas";

/** De onde veio a meta: o protocolo livre (por metas), as metas que o personal pôs no montador, ou as séries previstas na ficha. */
export type OrigemMetas = "livre_metas" | "metas" | "ficha" | "referencia";
const PRINCIPAIS: GrupoMuscular[] = ["peito", "costas", "ombros", "biceps", "triceps", "quadriceps", "posteriores", "gluteo", "panturrilha", "abdomen"];
export type PlacarDoAluno = { placar: LinhaPlacar[]; sugestao: Sugestao | null; resumo: string; origem: OrigemMetas; metas: Metas; feitas: Partial<Record<GrupoMuscular, number>>; recentes: GrupoMuscular[] };

/**
 * Placar da semana (segunda a hoje) do aluno com protocolo livre (por metas).
 * `sessaoAtualId`: o treino em andamento entra na conta e os músculos dele
 * não são sugeridos de novo.
 */
export async function placarDoAluno(alunoId: string, sessaoAtualId?: string | null, opts: { qualquerPlano?: boolean } = {}): Promise<PlacarDoAluno | null> {
  const { programa, treinos } = await getPlanoAtivo(alunoId);
  if (!programa && !opts.qualquerPlano) return null;
  let origem: OrigemMetas = "livre_metas";
  let metas: Metas = programa?.metas_volume ?? {};
  if (!programa) {
    origem = "referencia";
    metas = referenciaIniciante();
  } else if (!ehLivreMetas(programa)) {
    // “Não está a fim desses treinos?” — treino livre de quem treina pelas fichas.
    if (!opts.qualquerPlano) return null;
    const definidas = Object.values(metas).some((m) => m && m.max > 0);
    origem = definidas ? "metas" : "ficha";
    if (!definidas) {
      const ativos = treinos.filter((t) => t.ativo && t.exercicios.length > 0);
      const freq = programa.frequencia && Object.keys(programa.frequencia).length ? programa.frequencia : Object.fromEntries(ativos.map((t) => [t.letra, 1]));
      const dias = ativos.map((t) => ({ letra: t.letra, nome: t.nome, exercicios: t.exercicios.map((e) => ({ id: e.id, nome: e.nome, grupo: e.grupo_muscular ?? "nao_classificado", series: e.series, seriesAquecimento: e.series_aquecimento, tecnica: e.tecnica as Tecnica | null, contaVolume: e.conta_volume })) }));
      metas = metasDaFicha(calcularVolumeSemanal(dias, { frequencia: freq }).linhas);
      // Ainda sem ficha: faixa de referência de iniciante nos músculos principais.
      if (!Object.keys(metas).length) {
        origem = "referencia";
        metas = referenciaIniciante();
      }
    }
    if (!Object.keys(metas).length) return null;
  }
  const hoje = dataLocal(new Date());
  const inicio = inicioDaSemanaDe(hoje);
  const desde = somarDias(inicio < somarDias(hoje, -2) ? inicio : somarDias(hoje, -2), 0);
  const sessoes = (await listSessoes(alunoId, { desde: `${desde}T00:00:00-03:00`, limite: 60, status: "todas" })).filter((s) => s.status !== "abandonada");
  const agruparOmbros = !Object.keys(metas).some((g) => g.startsWith("ombro_"));
  const series = (lista: typeof sessoes) => lista.flatMap((s) => s.exercicios.flatMap((e) => e.series.map((x) => ({ grupo: e.grupo_muscular, tipo: x.tipo }))));
  const daSemana = sessoes.filter((s) => dataLocal(s.iniciado_em) >= inicio);
  const feitas = volumeRealizadoPorGrupo(series(daSemana), agruparOmbros);
  const atual = sessoes.find((s) => s.id === sessaoAtualId);
  const jaHoje = Object.keys(volumeRealizadoPorGrupo(series(atual ? [atual] : []), agruparOmbros)) as GrupoMuscular[];
  const recentes = Object.entries(volumeRealizadoPorGrupo(series(sessoes.filter((s) => s.id !== sessaoAtualId && dataLocal(s.iniciado_em) >= somarDias(hoje, -2) && dataLocal(s.iniciado_em) < hoje)), agruparOmbros)).filter(([, n]) => (n ?? 0) >= 3).map(([g]) => g as GrupoMuscular);
  const placar = placarDaSemana(metas, feitas);
  return { placar, sugestao: sugestaoDeAgora(placar, { hoje, recentes, jaHoje }), resumo: resumoDaSemana(placar), origem, metas, feitas, recentes };
}
