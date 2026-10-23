// Monte com IA / treinos prontos: junta perfil do visitante, biblioteca e o
// gerador puro. Leitura sempre com RLS (sessão do visitante).
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { perfilVisitante } from "@/lib/data/visitantes";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { gerarOpcoes, type OpcaoPlano, type ParametrosPlano } from "@/lib/visitante/gerar-treino";

/** Padrão do pedido a partir do cadastro (onboarding) do visitante. */
export async function padraoDoVisitante(alunoId: string): Promise<Partial<ParametrosPlano>> {
  const p = await perfilVisitante(alunoId).catch(() => null);
  if (!p) return {};
  return {
    ...(p.experiencia ? { nivel: p.experiencia } : {}),
    ...(p.frequencia_semanal ? { dias: p.frequencia_semanal } : {}),
    ...(p.minutos_por_treino ? { minutos: p.minutos_por_treino } : {}),
    ...(p.local_treino === "casa" ? { local: "casa" as const } : {}),
  };
}

export type ExercicioVisto = { slug: string; nome: string; grupo: GrupoMuscular; series: number; reps: string; descansoSeg: number; video: boolean };
export type OpcaoVista = Omit<OpcaoPlano, "treinos"> & { treinos: Array<{ letra: string; nome: string; minutos: number; exercicios: ExercicioVisto[] }> };

/** Opção com os nomes dos exercícios (para mostrar na tela). */
export function opcaoParaTela(o: OpcaoPlano, biblioteca: ItemBiblioteca[]): OpcaoVista {
  const porSlug = new Map(biblioteca.map((i) => [i.slug, i]));
  return {
    ...o,
    treinos: o.treinos.map((t) => ({
      letra: t.letra,
      nome: t.nome,
      minutos: t.minutos,
      exercicios: t.exercicios.map((e) => ({ slug: e.slug, nome: porSlug.get(e.slug)?.nome ?? e.slug, grupo: e.grupo, series: e.series, reps: e.reps, descansoSeg: e.descansoSeg, video: Boolean(porSlug.get(e.slug)?.midia?.verificada) })),
    })),
  };
}

export async function opcoesParaVisitante(parametros: Partial<ParametrosPlano>): Promise<{ biblioteca: ItemBiblioteca[]; opcoes: OpcaoPlano[] }> {
  const biblioteca = await listarBiblioteca();
  return { biblioteca, opcoes: gerarOpcoes(parametros, biblioteca.map((i) => i.slug)) };
}
