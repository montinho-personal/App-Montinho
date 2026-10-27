// Treino livre por metas (0100): grava o estilo/metas do programa e monta o
// placar da semana do aluno. Regras puras em src/lib/treino/livre-metas.ts.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { volumeRealizadoPorGrupo, type MetaVolume } from "@/lib/volume/calcular";
import { inicioDaSemanaDe, placarDaSemana, sugestaoDeAgora, type LinhaPlacar, type Sugestao } from "@/lib/treino/livre-metas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { Programa } from "@/lib/supabase/types-sessoes";

export type Metas = Partial<Record<GrupoMuscular, MetaVolume>>;

/** Liga/desliga o treino livre por metas e grava as faixas. Cria o programa se o aluno não tiver. */
export async function salvarLivreMetas(alunoId: string, metas: Metas, ligado: boolean): Promise<void> {
  const agora = new Date().toISOString();
  const estilo = ligado ? "livre_metas" : "fichas";
  if (isDemoMode()) {
    const st = demoStore();
    let p = st.programas.find((x) => x.aluno_id === alunoId && x.ativo);
    if (!p) {
      p = { id: uid(), aluno_id: alunoId, nome: "Treino livre por metas", objetivo: null, nivel: null, split: null, modo_semana: "fixa", frequencia: {}, calendario: {}, metas_volume: {}, prioridades: [], equipamentos: [], duracao_min: null, permite_versao_reduzida: false, observacoes: null, versao: 1, ativo: true, created_at: agora, updated_at: agora };
      st.programas.push(p);
    }
    Object.assign(p, { metas_volume: metas, estilo, updated_at: agora });
    return;
  }
  const db = await getDb();
  const { data: atual } = await db.from("programas").select("id").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle();
  if (atual) {
    const { error } = await db.from("programas").update({ metas_volume: metas, estilo }).eq("id", atual.id);
    if (error) throw new Error(/estilo/.test(error.message) ? "O banco ainda não tem o treino livre por metas (falta aplicar a 0100)." : error.message);
    return;
  }
  const { error } = await db.from("programas").insert({ aluno_id: alunoId, nome: "Treino livre por metas", metas_volume: metas, estilo, ativo: true });
  if (error) throw new Error(/estilo/.test(error.message) ? "O banco ainda não tem o treino livre por metas (falta aplicar a 0100)." : error.message);
}

export const ehLivreMetas = (p: Pick<Programa, "estilo"> | null | undefined) => p?.estilo === "livre_metas";

export type PlacarDoAluno = { placar: LinhaPlacar[]; sugestao: Sugestao | null; metas: Metas; feitas: Partial<Record<GrupoMuscular, number>>; recentes: GrupoMuscular[] };

/**
 * Placar da semana (segunda a hoje) do aluno com treino livre por metas.
 * `sessaoAtualId`: o treino em andamento entra na conta e os músculos dele
 * não são sugeridos de novo.
 */
export async function placarDoAluno(alunoId: string, sessaoAtualId?: string | null): Promise<PlacarDoAluno | null> {
  const { programa } = await getPlanoAtivo(alunoId);
  if (!ehLivreMetas(programa) || !programa) return null;
  const metas = programa.metas_volume ?? {};
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
  return { placar, sugestao: sugestaoDeAgora(placar, { hoje, recentes, jaHoje }), metas, feitas, recentes };
}
