// ============================================================================
// Treino livre por metas (pedido do Montinho, 28/10/2026) — regras PURAS.
// O plano não tem treinos A/B/C: tem a faixa de séries por semana de cada
// músculo (ex.: costas 12–16). A pessoa treina quando e como dá, escolhe
// cada exercício na hora, e o app mostra o placar da semana e sugere o que
// faz mais sentido agora. Semana = segunda a domingo (Brasília).
// Passar do máximo só AVISA (decisão do Montinho): nunca bloqueia.
// ============================================================================

import { GRUPO_LABEL, GRUPOS_ORDEM } from "@/lib/grupos";
import { diaDaSemana, somarDias } from "@/lib/aderencia/calcular";
import { canonizarGrupo, type MetaVolume } from "@/lib/volume/calcular";
import { GRUPOS_SEM_VOLUME } from "@/lib/grupos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export type StatusMeta = "zerado" | "abaixo" | "na_faixa" | "limite" | "acima";

export const STATUS_META: Record<StatusMeta, { emoji: string; rotulo: string }> = {
  zerado: { emoji: "⚪", rotulo: "ainda não fez" },
  abaixo: { emoji: "🟡", rotulo: "abaixo da faixa" },
  na_faixa: { emoji: "✅", rotulo: "na faixa" },
  limite: { emoji: "🔴", rotulo: "no limite" },
  acima: { emoji: "🔴", rotulo: "passou do limite" },
};

export type LinhaPlacar = { grupo: GrupoMuscular; nome: string; feitas: number; min: number; max: number; status: StatusMeta; faltam: number };

export function statusDaMeta(feitas: number, m: MetaVolume): StatusMeta {
  if (feitas <= 0) return "zerado";
  if (feitas < m.min) return "abaixo";
  if (feitas < m.max) return "na_faixa";
  return feitas === m.max ? "limite" : "acima";
}

/** Placar da semana, na ordem dos músculos do app. Só os músculos com meta. */
export function placarDaSemana(metas: Partial<Record<GrupoMuscular, MetaVolume>>, feitas: Partial<Record<GrupoMuscular, number>>): LinhaPlacar[] {
  return (Object.entries(metas) as Array<[GrupoMuscular, MetaVolume | undefined]>)
    .filter((x): x is [GrupoMuscular, MetaVolume] => !!x[1] && x[1].max > 0)
    .sort(([a], [b]) => GRUPOS_ORDEM.indexOf(a) - GRUPOS_ORDEM.indexOf(b))
    .map(([grupo, m]) => {
      const f = Math.round((feitas[grupo] ?? 0) * 10) / 10;
      return { grupo, nome: GRUPO_LABEL[grupo] ?? grupo, feitas: f, min: m.min, max: m.max, status: statusDaMeta(f, m), faltam: Math.max(0, Math.ceil(m.min - f)) };
    });
}

/** Folga da meta tirada da ficha: até 25% a mais que o previsto ainda está na faixa. */
export const FOLGA_FICHA = 0.25;

/**
 * Meta da semana a partir da ficha (A/B/C…): séries válidas previstas por músculo
 * (volume programado). Para quem treina pelas fichas e quer fazer um treino livre hoje.
 */
export function metasDaFicha(linhas: Array<{ grupo: GrupoMuscular; total: number }>): Partial<Record<GrupoMuscular, MetaVolume>> {
  const out: Partial<Record<GrupoMuscular, MetaVolume>> = {};
  for (const l of linhas) {
    const min = Math.round(l.total);
    if (min >= 1) out[l.grupo] = { min, max: Math.max(min + 1, Math.ceil(min * (1 + FOLGA_FICHA))) };
  }
  return out;
}

/** “Nesta semana você já fez…”: os músculos com mais séries (até 3). */
export function resumoDaSemana(placar: LinhaPlacar[]): string {
  const feitos = placar.filter((l) => l.feitas > 0).sort((a, b) => b.feitas - a.feitas);
  if (!feitos.length) return "Nesta semana você ainda não treinou nenhum músculo da sua meta.";
  const top = feitos.slice(0, 3).map((l, i) => `${l.nome} (${fmt(l.feitas)} ${i === 0 ? (l.feitas === 1 ? "série" : "séries") : ""})`.replace(" )", ")"));
  return `Nesta semana você já fez ${juntar(top)}${feitos.length > 3 ? ` e mais ${feitos.length - 3}` : ""}.`;
}

/** Dias que ainda restam na semana (contando hoje). Segunda = 7 … domingo = 1. */
export function diasRestantes(hoje: string): number {
  const dow = diaDaSemana(hoje); // 0 = domingo
  return dow === 0 ? 1 : 8 - dow;
}

export type Sugestao = { grupos: GrupoMuscular[]; texto: string; motivos: string[] };

/**
 * O que treinar agora: os músculos com mais falta (proporcional à faixa),
 * deixando para depois quem treinou nas últimas 48 h (descanso) e quem já está
 * na faixa. Até 3 músculos.
 */
export function sugestaoDeAgora(placar: LinhaPlacar[], opts: { hoje: string; recentes?: GrupoMuscular[]; jaHoje?: GrupoMuscular[] }): Sugestao | null {
  const recentes = new Set(opts.recentes ?? []);
  const jaHoje = new Set(opts.jaHoje ?? []);
  const falta = placar.filter((l) => l.faltam > 0 && !jaHoje.has(l.grupo));
  if (!falta.length) {
    const todos = placar.length && placar.every((l) => l.status !== "zerado" && l.status !== "abaixo");
    return todos ? { grupos: [], texto: "Todas as metas da semana estão na faixa. Chalalá! O que vier agora é bônus: vá leve e priorize a recuperação.", motivos: [] } : null;
  }
  const dias = diasRestantes(opts.hoje);
  const peso = (l: LinhaPlacar) => l.faltam / Math.max(1, l.min) + (l.status === "zerado" ? 0.5 : 0) - (recentes.has(l.grupo) ? 1 : 0);
  const escolhidos = [...falta].sort((a, b) => peso(b) - peso(a) || b.faltam - a.faltam).slice(0, 3).filter((l, i) => i === 0 || !recentes.has(l.grupo));
  const motivos = escolhidos.map((l) => (l.status === "zerado" ? `${l.nome}: ainda nada na semana (0 de ${faixa(l)})` : `${l.nome}: ${fmt(l.feitas)} de ${faixa(l)}, faltam ${l.faltam}`));
  const ok = placar.filter((l) => l.status === "na_faixa" || l.status === "limite" || l.status === "acima").map((l) => l.nome);
  const nomes = escolhidos.map((l) => l.nome);
  const texto = `Hoje o melhor é ${juntar(nomes)}.${dias <= 2 ? ` A semana termina ${dias === 1 ? "hoje" : "amanhã"}: priorize o que mais falta.` : ""}${ok.length ? ` ${juntar(ok.slice(0, 3))} já ${ok.length === 1 ? "está" : "estão"} na faixa.` : ""}`;
  return { grupos: escolhidos.map((l) => l.grupo), texto, motivos };
}

/** Linha do placar de um exercício (ombro anterior/lateral/posterior contam em “Ombros” quando a meta é só de ombros). */
export function linhaDoGrupo(placar: LinhaPlacar[], grupo: GrupoMuscular | null | undefined): LinhaPlacar | null {
  if (!grupo) return null;
  return placar.find((x) => x.grupo === grupo) ?? (grupo.startsWith("ombro_") ? (placar.find((x) => x.grupo === "ombros") ?? null) : null);
}

/** Placar depois de somar (ou tirar) séries de um músculo — para atualizar a tela na hora. */
export function somarNoPlacar(placar: LinhaPlacar[], grupo: GrupoMuscular | null | undefined, n: number): LinhaPlacar[] {
  const l = linhaDoGrupo(placar, grupo);
  if (!l) return placar;
  // Ombro lateral/posterior/anterior também conta em “Ombros” (o geral), quando os dois existem.
  const alvos = new Set<string>([l.grupo]);
  if (grupo?.startsWith("ombro_") && placar.some((x) => x.grupo === "ombros")) alvos.add("ombros");
  return placar.map((x) => {
    if (!alvos.has(x.grupo)) return x;
    const feitas = Math.max(0, Math.round((x.feitas + n) * 10) / 10);
    return { ...x, feitas, status: statusDaMeta(feitas, x), faltam: Math.max(0, Math.ceil(x.min - feitas)) };
  });
}

/** Série feita, com os músculos secundários do exercício e o peso de cada um (biblioteca). */
export type SerieFeita = { grupo: GrupoMuscular | null | undefined; tipo?: string | null; secundarios?: Partial<Record<GrupoMuscular, number>> | null };

/**
 * Séries da semana por músculo, como a tabela de volume do montador: cada série
 * válida conta 1 no músculo principal e a fração da biblioteca em cada
 * secundário (ex.: remada → costas 1 + antebraço 0,25). Pedido do Montinho
 * (29/10/2026): o placar usa o mesmo cálculo de volume secundário da tabela.
 */
export function volumeDaSemana(series: SerieFeita[], agruparOmbros: boolean): Partial<Record<GrupoMuscular, number>> {
  const out: Partial<Record<GrupoMuscular, number>> = {};
  for (const s of series) {
    if (s.tipo && !contaNoPlacar(s.tipo)) continue;
    const g = canonizarGrupo(s.grupo ?? null, agruparOmbros);
    if (GRUPOS_SEM_VOLUME.includes(g)) continue;
    out[g] = (out[g] ?? 0) + 1;
    for (const [sec, peso] of Object.entries(s.secundarios ?? {}) as Array<[GrupoMuscular, number]>) {
      const gs = canonizarGrupo(sec, agruparOmbros);
      if (gs === g || GRUPOS_SEM_VOLUME.includes(gs) || !(peso > 0)) continue;
      out[gs] = (out[gs] ?? 0) + Math.min(1, peso);
    }
  }
  for (const k of Object.keys(out) as GrupoMuscular[]) out[k] = Math.round((out[k] ?? 0) * 100) / 100;
  return out;
}

/**
 * “Ombros” é o geral: quando a meta tem Ombros E as partes (anterior/lateral/
 * posterior) separadas, a linha Ombros soma tudo (pedido do Montinho, 29/10/2026).
 */
export function ombrosNoGeral(feitas: Partial<Record<GrupoMuscular, number>>, metas: Partial<Record<GrupoMuscular, MetaVolume>>): Partial<Record<GrupoMuscular, number>> {
  if (!metas.ombros || !Object.keys(metas).some((g) => g.startsWith("ombro_"))) return feitas;
  const soma = (["ombros", "ombro_anterior", "ombro_lateral", "ombro_posterior"] as GrupoMuscular[]).reduce((n, g) => n + (feitas[g] ?? 0), 0);
  return { ...feitas, ombros: Math.round(soma * 100) / 100 };
}

/** Tipos de série que contam no volume (os mesmos de volumeRealizadoPorGrupo). */
export const contaNoPlacar = (tipo: string) => ["valida", "dropset", "rest_pause", "cluster", "isometria"].includes(tipo);

/** Ordem do “escolher exercício”: primeiro os músculos que mais faltam; os que passaram da faixa por último. */
export function prioridadeDoGrupo(placar: LinhaPlacar[], grupo: GrupoMuscular | null): number {
  const l = linhaDoGrupo(placar, grupo);
  if (!l) return 2;
  if (l.status === "zerado") return 0;
  if (l.status === "abaixo") return 1;
  if (l.status === "na_faixa") return 3;
  return 4;
}

/** Aviso ao salvar uma série: quando o músculo entra na faixa ou chega/passa do máximo. */
export function avisoDaSerie(antes: number, depois: number, l: Pick<LinhaPlacar, "nome" | "min" | "max">): string | null {
  if (antes <= l.max && depois > l.max) return `🔴 ${l.nome} passou do limite da semana (${fmt(depois)} de ${l.min}–${l.max}). Séries a mais dele agora contam pouco: que tal outro músculo?`;
  if (antes < l.max && depois === l.max) return `🔴 ${l.nome} chegou no limite da semana (${fmt(depois)} de ${l.min}–${l.max}). Bora pro próximo músculo?`;
  if (antes < l.min && depois >= l.min) return `✅ ${l.nome} entrou na faixa da semana (${fmt(depois)} de ${l.min}–${l.max}). Chalalá!`;
  return null;
}

/** Semana atual (segunda a hoje) — para filtrar as sessões. */
export function inicioDaSemanaDe(hoje: string): string {
  return somarDias(hoje, -((diaDaSemana(hoje) + 6) % 7));
}

const faixa = (l: Pick<LinhaPlacar, "min" | "max">) => (l.max > l.min ? `${l.min}–${l.max}` : String(l.min));
const fmt = (n: number) => String(n).replace(".", ",");
const juntar = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);
