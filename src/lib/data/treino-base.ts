// ============================================================================
// “Escolher um treino para hoje” do personal no Meu treino (04/11/2026): lê os
// treinos prontos da vitrine e os protocolos ativos dos alunos (RLS: o login é
// do personal) e abre um treino livre já com os exercícios. Regras puras em
// src/lib/treino/treino-base.ts.
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { listAlunos } from "@/lib/db";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { normalizarNome } from "@/lib/grupos";
import { getPlanoAtivo } from "@/lib/data/programas";
import { nomeVisivel, planoDoPronto, prontosVisiveis } from "@/lib/visitante/treinos-prontos";
import { baseDoAluno, basesDosProntos, blocosDosJuntos, type GrupoBase, type TreinoBase } from "@/lib/treino/treino-base";
import { adicionarExercicioLivre, ajustarExercicioLivre, iniciarSessaoLivre } from "./livre";
import type { Tecnica } from "@/lib/volume/calcular";
import type { SessaoCompleta } from "./sessoes";

type ExercicioLinha = { nome: string; biblioteca_id: string | null; series: number; series_aquecimento: number | null; reps: string; ordem: number | null; removido_em: string | null };
type TreinoLinha = { id: string; aluno_id: string; letra: string; nome: string; exercicios: ExercicioLinha[] };

export async function prontosComoBase(): Promise<GrupoBase[]> {
  const biblioteca = await listarBiblioteca();
  const slugs = biblioteca.map((b) => b.slug);
  const porSlug = new Map(biblioteca.map((b) => [b.slug, { id: b.id, nome: b.nome }]));
  const prontos = prontosVisiveis(isDemoMode()).flatMap((t) => {
    const plano = planoDoPronto(t, slugs);
    return plano ? [{ slug: t.slug, nome: nomeVisivel(t), emoji: t.emoji, chamada: t.chamada, plano }] : [];
  });
  return basesDosProntos(prontos, porSlug);
}

/** Protocolos ativos dos alunos (sem visitantes). A ficha do próprio personal (`meuAluno`) vem
 *  em primeiro, como “⭐ Meus treinos” (10/11/2026, pedido do Montinho). */
export async function protocolosComoBase(meuAluno: string): Promise<GrupoBase[]> {
  const alunos = (await listAlunos().catch(() => [])).filter((a) => a.status === "ativo" || a.id === meuAluno);
  if (!alunos.some((a) => a.id === meuAluno)) alunos.push({ id: meuAluno, status: "ativo", profile: { nome: "Meus treinos" } } as (typeof alunos)[number]);
  const nome = new Map(alunos.map((a) => [a.id, a.profile?.nome ?? "Sem nome"]));
  let treinos: TreinoLinha[] = [];
  if (isDemoMode()) {
    treinos = (await Promise.all(alunos.map(async (a) => (await getPlanoAtivo(a.id)).treinos.filter((t) => t.ativo).map((t) => ({ ...t, aluno_id: a.id, exercicios: t.exercicios as unknown as ExercicioLinha[] }))))).flat();
  } else if (alunos.length) {
    const db = await getDb();
    const { data } = await db.from("treinos").select("id, aluno_id, letra, nome, exercicios(nome, biblioteca_id, series, series_aquecimento, reps, ordem, removido_em)").eq("ativo", true).in("aluno_id", alunos.map((a) => a.id));
    treinos = (data ?? []) as TreinoLinha[];
  }
  const porAluno = new Map<string, TreinoLinha[]>();
  for (const t of treinos) porAluno.set(t.aluno_id, [...(porAluno.get(t.aluno_id) ?? []), t]);
  return [...porAluno.entries()]
    .map(([id, ts]) => baseDoAluno({ id, nome: nome.get(id) ?? "Sem nome" }, ts))
    .filter((g): g is GrupoBase => !!g)
    .map((g) => (g.id === `aluno:${meuAluno}` ? { ...g, titulo: "⭐ Meus treinos", emoji: "⭐", detalhe: `${g.treinos.length} treino${g.treinos.length === 1 ? "" : "s"} montados por você`, treinos: g.treinos.map((t) => ({ ...t, titulo: t.titulo.replace(/ \([^)]*\)$/, "") })) } : g))
    .sort((a, b) => (a.id === `aluno:${meuAluno}` ? -1 : b.id === `aluno:${meuAluno}` ? 1 : a.titulo.localeCompare(b.titulo, "pt-BR")));
}

/** “✏️ Montar o de hoje”: o servidor confere cada id na biblioteca e põe o nome dela. */
export async function treinoMontadoComoBase(m: { titulo: string; itens: Array<{ biblioteca_id: string; series: number; reps: string; tecnica?: string; tecnica_config?: Record<string, unknown> | null; junto_com_proximo?: boolean }> }): Promise<TreinoBase | null> {
  const porId = new Map((await listarBiblioteca()).map((b) => [b.id, b]));
  const itens = m.itens.flatMap((i) => { const b = porId.get(i.biblioteca_id); return b ? [{ biblioteca_id: b.id, nome: b.nome, series: i.series, reps: i.reps, tecnica: i.tecnica ?? null, tecnicaConfig: i.tecnica_config ?? null, juntoComProximo: !!i.junto_com_proximo }] : []; });
  return itens.length ? { chave: "hoje", titulo: m.titulo, subtitulo: "", itens } : null;
}

/** O treino escolhido, remontado no servidor pela chave (nada vem pronto do aparelho). */
export async function treinoBasePorChave(chave: string, semAluno: string): Promise<TreinoBase | null> {
  const grupos = chave.startsWith("pronto:") ? await prontosComoBase() : await protocolosComoBase(semAluno);
  for (const g of grupos) for (const t of g.treinos) if (t.chave === chave) return t;
  return null;
}

/** Abre o treino livre do personal já com os exercícios do treino escolhido (séries e reps como meta). */
export async function comecarComBase(alunoId: string, clientKey: string, base: TreinoBase): Promise<SessaoCompleta> {
  const s = await iniciarSessaoLivre(alunoId, clientKey, { nome: base.titulo });
  // Já havia um treino livre em andamento: não mistura (a tela de Treinar mostra o “Continuar”).
  if (s.exercicios.length) throw new Error("Você tem um treino em andamento. Termine ou cancele ele antes de escolher outro.");
  const biblioteca = await listarBiblioteca();
  const porId = new Map(biblioteca.map((b) => [b.id, b]));
  // Exercício da ficha sem ligação com a biblioteca: casa pelo nome (ou sinônimo).
  const porNome = new Map(biblioteca.flatMap((b) => [b.nome, ...b.sinonimos].map((n) => [normalizarNome(n), b] as const)));
  const juntos = blocosDosJuntos(base.itens);
  for (const [k, it] of base.itens.entries()) {
    const item = (it.biblioteca_id ? porId.get(it.biblioteca_id) : undefined) ?? porNome.get(normalizarNome(it.nome)) ?? null;
    const se = await adicionarExercicioLivre(alunoId, s.id, { clientKey: `${clientKey}:${k}`, item, nomeLivre: item ? null : it.nome, tecnica: "normal", meta: { series: it.series, reps: it.reps } });
    // Treino de hoje montado com técnica / bi-set: grava como o “＋ Técnica / bi-set” do treino livre.
    const j = juntos[k];
    const tec = it.tecnica && it.tecnica !== "normal" ? it.tecnica : null;
    if (j || tec) await ajustarExercicioLivre(alunoId, s.id, se.id, { tecnica: (j ? j.tecnica : tec) as Tecnica, tecnicaConfig: j ? null : (it.tecnicaConfig ?? null), bloco: j ? j.bloco : null });
  }
  return s;
}
