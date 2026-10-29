import { dataLocal } from "@/lib/aderencia/calcular";
// ============================================================================
// Evolução geral por TREINO (A, B, C…) e por MÚSCULO — contas puras.
// Usadas no relatório premium (PDF) e na aba Evolução do app.
//
// Por treino (só treinos do plano; extra fica fora):
//  • Volume (carga × repetições das séries válidas) por sessão; compara a
//    média das 2 primeiras com a das 2 últimas sessões do período (com menos
//    de 4 sessões, a primeira com a última).
//  • Carga: para cada exercício feito na primeira E na última sessão daquele
//    treino, a maior carga de uma × da outra; mostra a variação típica
//    (mediana) e em quantos subiu.
// Por músculo (grupo principal de cada exercício):
//  • Séries por semana na 1ª metade × 2ª metade do período, contado do 1º
//    treino (só com 28+ dias, para cada metade ter pelo menos 2 semanas), volume e a variação típica
//    da carga dos exercícios do músculo. Prioridades do programa em destaque.
// Rótulos neutros: subir ou descer não é “bom” ou “ruim” por si só.
// ============================================================================

import { normalizarNome, GRUPO_LABEL } from "@/lib/grupos";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { somarDias } from "@/lib/aderencia/calcular";
import type { GrupoPremium } from "./premium";

export type SessaoTreino = { data: string; tonelagem: number; series: number };
export type TreinoEvolucao = {
  letra: string;
  nome: string;
  sessoes: SessaoTreino[];
  volumeInicial: number | null;
  volumeAtual: number | null;
  volumePct: number | null;
  cargaPct: number | null;
  exerciciosSubiram: number;
  exerciciosComparaveis: number;
};

export type MusculoEvolucao = {
  grupo: string;
  rotulo: string;
  prioridade: boolean;
  series: number;
  tonelagem: number;
  seriesSemanaAntes: number | null;
  seriesSemanaAgora: number | null;
  cargaPct: number | null;
  exerciciosSubiram: number;
  exercicios: number;
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const pct = (de: number, para: number) => (de > 0 ? r1(((para - de) / de) * 100) : null);
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return r1(o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2);
};
const doDia = (s: SessaoCompleta) => dataLocal(s.finalizado_em ?? s.iniciado_em); // dia de Brasília
const validas = (e: SessaoCompleta["exercicios"][number]) => e.series.filter((x) => x.tipo !== "aquecimento");
const tonelagemDe = (s: SessaoCompleta) =>
  s.exercicios.reduce((n, e) => n + validas(e).reduce((m, x) => m + (x.carga_kg != null && x.reps != null ? x.carga_kg * x.reps : 0), 0), 0);
const cargasDe = (s: SessaoCompleta) => {
  const m = new Map<string, number>();
  for (const e of s.exercicios) {
    const c = Math.max(0, ...validas(e).map((x) => x.carga_kg ?? 0));
    if (c > 0) m.set(normalizarNome(e.nome), Math.max(m.get(normalizarNome(e.nome)) ?? 0, c));
  }
  return m;
};

function doPeriodo(sessoes: SessaoCompleta[], inicio: string, fim: string) {
  return sessoes.filter((s) => s.status === "concluida" && doDia(s) >= inicio && doDia(s) <= fim);
}

export function evolucaoPorTreino(sessoes: SessaoCompleta[], inicio: string, fim: string): TreinoEvolucao[] {
  const porLetra = new Map<string, SessaoCompleta[]>();
  for (const s of doPeriodo(sessoes, inicio, fim)) {
    const modo = (s as { modo?: string }).modo;
    if (!s.letra || modo === "extra") continue;
    porLetra.set(s.letra, [...(porLetra.get(s.letra) ?? []), s]);
  }
  const out: TreinoEvolucao[] = [];
  for (const [letra, lista] of porLetra) {
    const ord = [...lista].sort((a, b) => (doDia(a) < doDia(b) ? -1 : doDia(a) > doDia(b) ? 1 : 0));
    const sess: SessaoTreino[] = ord.map((s) => ({ data: doDia(s), tonelagem: Math.round(tonelagemDe(s)), series: s.exercicios.reduce((n, e) => n + validas(e).length, 0) }));
    const k = sess.length >= 4 ? 2 : 1;
    const comp = sess.length >= 2;
    const vIni = comp ? Math.round(media(sess.slice(0, k).map((x) => x.tonelagem))) : null;
    const vAtu = comp ? Math.round(media(sess.slice(-k).map((x) => x.tonelagem))) : null;
    const primeira = cargasDe(ord[0]);
    const ultima = cargasDe(ord.at(-1)!);
    const deltas: number[] = [];
    let subiram = 0;
    if (comp)
      for (const [ex, c0] of primeira) {
        const c1 = ultima.get(ex);
        if (c1 == null) continue;
        deltas.push(((c1 - c0) / c0) * 100);
        if (c1 > c0) subiram++;
      }
    out.push({
      letra,
      nome: ord.at(-1)!.nome_treino ?? `Treino ${letra}`,
      sessoes: sess,
      volumeInicial: vIni,
      volumeAtual: vAtu,
      volumePct: vIni != null && vAtu != null ? pct(vIni, vAtu) : null,
      cargaPct: mediana(deltas),
      exerciciosSubiram: subiram,
      exerciciosComparaveis: deltas.length,
    });
  }
  return out.sort((a, b) => (a.letra < b.letra ? -1 : 1));
}

export function evolucaoPorMusculo(input: { sessoes: SessaoCompleta[]; inicio: string; fim: string; prioridades?: string[] | null; grupos?: GrupoPremium[] }): MusculoEvolucao[] {
  const { fim } = input;
  const prioridades = new Set(input.prioridades ?? []);
  // As metades começam no 1º treino do período (antes dele não há o que comparar).
  const primeiro = doPeriodo(input.sessoes, input.inicio, fim).map(doDia).sort()[0];
  const inicio = primeiro && primeiro > input.inicio ? primeiro : input.inicio;
  const dias = Math.round((Date.parse(`${fim}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / 86_400_000) + 1;
  const metades = dias >= 28;
  const meio = somarDias(inicio, Math.floor(dias / 2)); // 2ª metade começa aqui
  const semanas1 = Math.floor(dias / 2) / 7;
  const semanas2 = (dias - Math.floor(dias / 2)) / 7;
  const acc = new Map<string, { series: number; ton: number; s1: number; s2: number }>();
  for (const s of doPeriodo(input.sessoes, input.inicio, fim)) {
    const d = doDia(s);
    for (const e of s.exercicios) {
      const g = e.grupo_muscular;
      if (!g) continue;
      const v = validas(e);
      const a = acc.get(g) ?? { series: 0, ton: 0, s1: 0, s2: 0 };
      a.series += v.length;
      a.ton += v.reduce((m, x) => m + (x.carga_kg != null && x.reps != null ? x.carga_kg * x.reps : 0), 0);
      if (d < meio) a.s1 += v.length;
      else a.s2 += v.length;
      acc.set(g, a);
    }
  }
  const carga = new Map((input.grupos ?? []).map((g) => [g.grupo, g]));
  return [...acc.entries()]
    .map(([grupo, a]) => {
      const c = carga.get(grupo);
      return {
        grupo,
        rotulo: GRUPO_LABEL[grupo as keyof typeof GRUPO_LABEL] ?? "Outros",
        prioridade: prioridades.has(grupo),
        series: a.series,
        tonelagem: Math.round(a.ton),
        seriesSemanaAntes: metades ? r1(a.s1 / semanas1) : null,
        seriesSemanaAgora: metades ? r1(a.s2 / semanas2) : null,
        cargaPct: c?.mediaPct ?? null,
        exerciciosSubiram: c?.subiram ?? 0,
        exercicios: c?.exercicios.length ?? 0,
      };
    })
    .sort((x, y) => Number(y.prioridade) - Number(x.prioridade) || y.series - x.series);
}
