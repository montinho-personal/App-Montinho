// ============================================================================
// Técnicas escolhidas na hora (treino livre) e perguntas didáticas (PURO).
// Pedido do Montinho (29/10/2026): ao escolher a técnica, o app já pergunta
// “só para finalizar ou em quantas séries?” e “quantos blocos?”, e junta os
// exercícios no bi-set/tri-set. Os números caem na mesma configuração que o
// personal usa no montador (tecnica-config.ts), então registro, volume e
// medalhas seguem as mesmas regras.
// ============================================================================

import type { Tecnica } from "@/lib/volume/calcular";
import type { SerieTipo } from "@/lib/supabase/types-sessoes";
import { PADRAO_TECNICA, podeFinalizar, registraEmBlocos, type ConfigTecnica } from "./tecnica-config";

export type GrupoTecnica = "juntar" | "serie" | "jeito";

export const GRUPOS_TECNICA: Array<{ id: GrupoTecnica; titulo: string; dica: string }> = [
  { id: "juntar", titulo: "⚡ Juntar exercícios", dica: "Um exercício atrás do outro, sem descanso no meio. Ganha tempo." },
  { id: "serie", titulo: "🔥 Técnica na série", dica: "Leva o músculo além do ponto em que pararia." },
  { id: "jeito", titulo: "🎯 Jeito de fazer", dica: "Muda a forma de executar as séries." },
];

export type InfoTecnica = {
  id: Tecnica;
  nome: string;
  grupo: GrupoTecnica;
  /** Uma frase do que é. */
  oQueE: string;
  /** Exemplo concreto (o aluno entende na hora). */
  exemplo: string;
  /** Bi-set/tri-set/superset: quantos exercícios no total. */
  exercicios?: number;
  /** Tipo de série anotada com a técnica (em blocos ou não). */
  serie?: SerieTipo;
};

export const TECNICAS_ALUNO: InfoTecnica[] = [
  { id: "biset", nome: "Bi-set", grupo: "juntar", exercicios: 2, oQueE: "Dois exercícios seguidos, sem descanso entre eles. Descansa só depois do par.", exemplo: "Supino → crucifixo → descanso → repete." },
  { id: "triset", nome: "Tri-set", grupo: "juntar", exercicios: 3, oQueE: "Três exercícios seguidos, sem descanso entre eles. Descansa só no fim da rodada.", exemplo: "Agachamento → extensora → afundo → descanso." },
  { id: "superset", nome: "Superset", grupo: "juntar", exercicios: 2, oQueE: "Dois exercícios de músculos opostos, um atrás do outro.", exemplo: "Rosca direta → tríceps na polia → descanso." },
  { id: "rest_pause", nome: "Rest-pause", grupo: "serie", serie: "rest_pause", oQueE: "Vai até perto da falha, pausa curta (10–20 s) e continua com o mesmo peso, em blocos.", exemplo: "3 blocos: 12 reps · 15 s · 5 reps · 15 s · 3 reps." },
  { id: "dropset", nome: "Drop-set", grupo: "serie", serie: "dropset", oQueE: "Chegou perto da falha: tira ~20% do peso e continua, sem descanso.", exemplo: "50 kg × 10 → 40 kg até a falha → 32 kg até a falha." },
  { id: "myo_reps", nome: "Myo-reps", grupo: "serie", serie: "myo_reps", oQueE: "Uma série longa (ativação) e depois mini-séries curtas com 3 a 5 respirações de pausa.", exemplo: "15 reps · respira · 5 · respira · 5 · respira · 5." },
  { id: "cluster", nome: "Cluster", grupo: "serie", serie: "cluster", oQueE: "A série dividida em blocos pequenos com pausas curtas, mesmo peso.", exemplo: "3 blocos de 4 reps com 20 s de pausa." },
  { id: "tres_sete", nome: "3/7", grupo: "serie", serie: "tres_sete", oQueE: "Blocos crescentes de 3 a 7 repetições com 15 s de pausa, mesmo peso.", exemplo: "3 · 4 · 5 · 6 · 7 reps." },
  { id: "piramide", nome: "Pirâmide", grupo: "jeito", oQueE: "Aumenta o peso e diminui as repetições a cada série.", exemplo: "12 reps → 10 → 8, cada vez mais pesado." },
  { id: "piramide_decrescente", nome: "Pirâmide decrescente", grupo: "jeito", oQueE: "Começa pesado e vai tirando peso a cada série.", exemplo: "6 reps pesado → 8 → 10, mais leve." },
  { id: "negativo", nome: "Negativo", grupo: "jeito", oQueE: "Descida bem lenta e controlada (3–5 s).", exemplo: "Desce em 4 s, sobe normal." },
  { id: "super_slow", nome: "Super slow", grupo: "jeito", oQueE: "Subida e descida bem lentas, sem embalo.", exemplo: "5 s descendo, 5 s subindo." },
  { id: "isometria", nome: "Isometria", grupo: "jeito", serie: "isometria", oQueE: "Segura parado na posição mais difícil.", exemplo: "Segura 20–30 s no meio do movimento." },
  { id: "unilateral", nome: "Unilateral", grupo: "jeito", oQueE: "Um lado de cada vez.", exemplo: "Faz o braço direito, depois o esquerdo." },
];

export const infoTecnica = (t: string | null | undefined): InfoTecnica | null => TECNICAS_ALUNO.find((x) => x.id === t) ?? null;
/** Bi-set/tri-set/superset: junta exercícios. */
export const juntaExercicios = (t: string | null | undefined) => !!infoTecnica(t)?.exercicios;

/** O que perguntar ao escolher a técnica (null = nada a configurar). */
export type Perguntas = {
  /** “Só para finalizar” × “em quantas séries”. */
  onde: boolean;
  /** Pergunta dos blocos (valor mostrado ao aluno; já convertido para a config). */
  blocos: { rotulo: string; dica: string; min: number; max: number; padrao: number } | null;
  /** Rest-pause: total de repetições somando os blocos (opcional). */
  repsAlvo: boolean;
  /** Pausa entre os blocos (s). */
  pausa: { padrao: number; dica: string } | null;
};

export function perguntasDaTecnica(t: string | null | undefined): Perguntas | null {
  switch (t) {
    case "rest_pause":
      return { onde: true, blocos: { rotulo: "Quantos blocos?", dica: "Contando o 1º, que vai até perto da falha. 3 é o mais usado.", min: 2, max: 6, padrao: 3 }, repsAlvo: true, pausa: { padrao: PADRAO_TECNICA.rest_pause.pausaSeg, dica: "10–20 s" } };
    case "dropset":
      return { onde: true, blocos: { rotulo: "Quantos drops?", dica: "Quantas vezes tira peso. 1 a 3 é o usual.", min: 1, max: 4, padrao: PADRAO_TECNICA.dropset.blocos }, repsAlvo: false, pausa: null };
    case "myo_reps":
      return { onde: true, blocos: { rotulo: "Quantas mini-séries?", dica: "Depois da ativação. 3 a 5 é o usual.", min: 2, max: 6, padrao: PADRAO_TECNICA.myo_reps.blocos }, repsAlvo: false, pausa: { padrao: PADRAO_TECNICA.myo_reps.pausaSeg, dica: "3 a 5 respirações" } };
    case "cluster":
      return { onde: true, blocos: { rotulo: "Quantos blocos por série?", dica: "Ex.: 3 blocos de 4 reps.", min: 2, max: 6, padrao: PADRAO_TECNICA.cluster.blocos }, repsAlvo: false, pausa: { padrao: PADRAO_TECNICA.cluster.pausaSeg, dica: "15–30 s" } };
    case "tres_sete":
      return { onde: true, blocos: null, repsAlvo: false, pausa: null };
    default:
      return null;
  }
}

export type RespostasTecnica = {
  /** "finalizar" = 1 série a mais no fim; "series" = N séries com a técnica. */
  onde: "finalizar" | "series";
  series: number;
  blocos: number | null;
  repsAlvo: number | null;
  pausaSeg: number | null;
};

export function respostasPadrao(t: string | null | undefined): RespostasTecnica {
  const p = perguntasDaTecnica(t);
  return { onde: podeFinalizar(t) ? "finalizar" : "series", series: podeFinalizar(t) ? 1 : 3, blocos: p?.blocos?.padrao ?? null, repsAlvo: t === "rest_pause" ? null : null, pausaSeg: p?.pausa?.padrao ?? null };
}

/** Respostas → configuração (mesmo formato do montador). */
export function configDasRespostas(t: string | null | undefined, r: RespostasTecnica): ConfigTecnica | null {
  if (!perguntasDaTecnica(t)) return null;
  const fin = podeFinalizar(t) && r.onde === "finalizar";
  const c: ConfigTecnica = { aplicar: fin ? "finalizacao" : "principais", series: Math.max(1, Math.min(6, Math.round(r.series || 1))) };
  if (r.blocos != null) c.blocos = t === "rest_pause" ? Math.max(1, r.blocos - 1) : r.blocos;
  if (t === "rest_pause") c.repsAlvo = r.repsAlvo && r.repsAlvo > 0 ? r.repsAlvo : null;
  if (r.pausaSeg != null) c.pausaSeg = r.pausaSeg;
  return c;
}

/** Configuração salva → respostas (para reabrir e mudar). */
export function respostasDaConfig(t: string | null | undefined, c: ConfigTecnica | null | undefined): RespostasTecnica {
  const base = respostasPadrao(t);
  if (!c) return base;
  return {
    onde: c.aplicar === "finalizacao" ? "finalizar" : "series",
    series: c.series ?? base.series,
    blocos: c.blocos != null ? (t === "rest_pause" ? c.blocos + 1 : c.blocos) : base.blocos,
    repsAlvo: c.repsAlvo ?? null,
    pausaSeg: c.pausaSeg ?? base.pausaSeg,
  };
}

/** Quantas séries do exercício são feitas com a técnica (registradas em blocos). */
export function seriesComTecnica(t: string | null | undefined, c: ConfigTecnica | null | undefined): number {
  if (!registraEmBlocos(t) || !c) return 0;
  return Math.max(1, Math.min(6, c.series ?? 1));
}

/** Frase curta do que foi escolhido (fica no cartão do exercício). */
export function resumoEscolha(t: string | null | undefined, c: ConfigTecnica | null | undefined): string | null {
  const info = infoTecnica(t);
  if (!info) return null;
  if (info.exercicios) return `${info.nome}: ${info.exercicios === 2 ? "este + 1 exercício" : "este + 2 exercícios"}, sem descanso no meio`;
  if (!c || !perguntasDaTecnica(t)) return info.nome;
  const n = c.series ?? 1;
  const onde = c.aplicar === "finalizacao" ? (n === 1 ? "1 série de finalização" : `${n} séries de finalização`) : n === 1 ? "em 1 série" : `em ${n} séries`;
  const blocos = t === "rest_pause" ? `${(c.blocos ?? 2) + 1} blocos` : t === "dropset" ? `${c.blocos} ${c.blocos === 1 ? "drop" : "drops"}` : t === "myo_reps" ? `ativação + ${c.blocos} minis` : t === "cluster" ? `${c.blocos} blocos` : t === "tres_sete" ? "3-4-5-6-7" : "";
  return `${info.nome} · ${onde}${blocos ? ` · ${blocos}` : ""}`;
}

/** Bi-set/tri-set na tela: os exercícios do mesmo bloco ficam logo depois do primeiro deles. */
export function juntarBlocosAdjacentes<T extends { bloco: string | null }>(lista: T[]): T[] {
  const out: T[] = [];
  const usados = new Set<number>();
  lista.forEach((x, i) => {
    if (usados.has(i)) return;
    usados.add(i);
    out.push(x);
    if (!x.bloco) return;
    lista.forEach((y, j) => {
      if (!usados.has(j) && y.bloco === x.bloco) {
        usados.add(j);
        out.push(y);
      }
    });
  });
  return out;
}

/** Depois de salvar uma série no bloco: o próximo da rodada (sem descanso) ou fim da rodada (descansa e volta ao 1º). */
export function proximoDaRodada(membros: string[], atual: string): { proximo: string; descansa: boolean } | null {
  const i = membros.indexOf(atual);
  if (membros.length < 2 || i < 0) return null;
  return i < membros.length - 1 ? { proximo: membros[i + 1], descansa: false } : { proximo: membros[0], descansa: true };
}

/** Código curto para um bloco novo (bi-set/tri-set do aluno). */
export const codigoBloco = (usados: Array<string | null>) => {
  for (let n = 1; n < 100; n++) if (!usados.includes(`J${n}`)) return `J${n}`;
  return `J${Date.now() % 1000}`;
};

// ---------------------------------------------------------------------------
// Treino do personal: o aluno junta dois exercícios em bi-set para ganhar tempo
// ---------------------------------------------------------------------------
/** `livre` = ainda tem séries a fazer e não está em bi-set/tri-set. */
export type ItemJuntar = { id: string; livre: boolean; grupo: string | null };

/** Com quem juntar este exercício: o próximo livre (ou o anterior, se for o último). */
export function parceiroParaBiset(itens: ItemJuntar[], id: string): string | null {
  const i = itens.findIndex((x) => x.id === id);
  if (i < 0 || !itens[i].livre) return null;
  return itens.slice(i + 1).find((x) => x.livre)?.id ?? [...itens.slice(0, i)].reverse().find((x) => x.livre)?.id ?? null;
}

/** Melhor par para sugerir quando o treino está atrasado: dois seguidos livres, de preferência de músculos diferentes. */
export function sugestaoDeBiset(itens: ItemJuntar[]): [string, string] | null {
  const livres = itens.filter((x) => x.livre);
  if (livres.length < 2) return null;
  for (let i = 0; i < livres.length - 1; i++) {
    const a = livres[i], b = livres[i + 1];
    if (a.grupo && b.grupo && a.grupo !== b.grupo) return [a.id, b.id];
  }
  return [livres[0].id, livres[1].id];
}
