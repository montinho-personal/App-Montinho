// ============================================================================
// “Escolher um treino para hoje” no Meu treino do personal (pedido do Montinho,
// 04/11/2026: “escolher aqueles treinos prontos — Rainha do Agachamento… — e
// também os protocolos dos meus alunos”). Regras PURAS: transformam um treino
// pronto da vitrine ou um treino da ficha de um aluno na lista de exercícios
// (com séries e repetições) que abre o treino livre do personal já montado.
// Nada da ficha do aluno muda; as cargas do aluno nunca vão junto.
// ============================================================================
import type { OpcaoPlano } from "@/lib/visitante/gerar-treino";

export type ItemBase = { biblioteca_id: string | null; nome: string; series: number; reps: string };
export type TreinoBase = { chave: string; titulo: string; subtitulo: string; itens: ItemBase[] };
export type GrupoBase = { id: string; titulo: string; emoji: string; detalhe: string; treinos: TreinoBase[] };

export const CHAVE_BASE = /^(pronto:[a-z0-9-]{2,80}:[A-H]|aluno:[0-9A-Za-z-]{4,64})$/;

const resumo = (itens: ItemBase[]) => `${itens.length} exercício${itens.length === 1 ? "" : "s"} · ${itens.reduce((s, i) => s + i.series, 0)} séries`;

/** Treinos prontos (vitrine dos visitantes): um grupo por pronto, um treino por letra. */
export function basesDosProntos(prontos: Array<{ slug: string; nome: string; emoji: string; chamada: string; plano: OpcaoPlano }>, porSlug: Map<string, { id: string; nome: string }>): GrupoBase[] {
  return prontos
    .map((p) => ({
      id: `pronto:${p.slug}`,
      titulo: p.nome,
      emoji: p.emoji,
      detalhe: p.chamada,
      treinos: p.plano.treinos
        .map((t) => {
          const itens = t.exercicios.flatMap((e) => {
            const b = porSlug.get(e.slug);
            return b ? [{ biblioteca_id: b.id, nome: b.nome, series: e.series, reps: e.reps }] : [];
          });
          return { chave: `pronto:${p.slug}:${t.letra}`, titulo: `${p.nome} · Treino ${t.letra}`, subtitulo: `${t.nome} · ${resumo(itens)}`, itens };
        })
        .filter((t) => t.itens.length > 0),
    }))
    .filter((g) => g.treinos.length > 0);
}

type ExercicioFicha = { nome: string; biblioteca_id: string | null; series: number; series_aquecimento?: number | null; reps: string; ordem?: number | null; removido_em?: string | null };

/** Protocolo de um aluno: um grupo por aluno, um treino por letra ativa (séries sem o aquecimento, nunca a carga). */
export function baseDoAluno(aluno: { id: string; nome: string }, treinos: Array<{ id: string; letra: string; nome: string; exercicios: ExercicioFicha[] }>): GrupoBase | null {
  const lista = [...treinos]
    .sort((a, b) => a.letra.localeCompare(b.letra))
    .map((t) => {
      const itens = t.exercicios
        .filter((e) => !e.removido_em && e.nome.trim())
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((e) => ({ biblioteca_id: e.biblioteca_id, nome: e.nome, series: Math.max(1, (e.series ?? 0) - (e.series_aquecimento ?? 0)), reps: e.reps || "10-12" }));
      return { chave: `aluno:${t.id}`, titulo: `Treino ${t.letra} · ${t.nome} (${aluno.nome.split(" ")[0]})`, subtitulo: resumo(itens), itens };
    })
    .filter((t) => t.itens.length > 0);
  if (!lista.length) return null;
  return { id: `aluno:${aluno.id}`, titulo: aluno.nome, emoji: "👤", detalhe: `${lista.length} treino${lista.length === 1 ? "" : "s"} no protocolo`, treinos: lista };
}

/** Busca sem acento por nome do pronto, do aluno ou do treino. */
export function filtrarBases(grupos: GrupoBase[], q: string): GrupoBase[] {
  const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const t = sem(q.trim());
  if (!t) return grupos;
  return grupos.flatMap((g) => {
    if (sem(g.titulo).includes(t)) return [g];
    const treinos = g.treinos.filter((x) => sem(`${x.titulo} ${x.subtitulo}`).includes(t));
    return treinos.length ? [{ ...g, treinos }] : [];
  });
}
