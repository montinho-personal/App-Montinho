// ============================================================================
// Prática acumulada (pedido do Montinho, 06/11/2026): troféus que somam o que
// a pessoa já fez no app, treino após treino.
//   • Repetições: 1.000 → 100.000 (aquecimento não conta).
//   • Toneladas: carga × repetições somadas, 25 t → 1.000 t (mesma conta da
//     Academia da Tribo: blocos somados um a um, exercício unilateral = os dois
//     lados; série acima de 500 kg ou 100 reps fica fora, como lá).
//   • Explorador: 15, 30 e 50 exercícios diferentes feitos (com 1+ série válida).
// Contam os mesmos treinos das séries (volume-series.ts): todo treino feito no
// app, inclusive extra/livre e o que terminou antes do fim; nunca o importado
// nem o que o personal tirou da aderência. Cada marco vale uma vez.
// Diferença da Academia: aqui o peso é o ANOTADO (quem anota “por lado” não
// tem o dobro), porque a conta precisa sair igual em toda tela, só com a sessão.
// ============================================================================
import type { SessaoConquista } from "./regras";
import { ehUnilateral, kgDaSerie, serieForaDoLimite } from "@/lib/academia/regras";

export const MARCOS_REPS = [1000, 5000, 10000, 25000, 50000, 100000] as const;
export const MARCOS_TONELADAS = [25, 100, 250, 500, 1000] as const;
export const MARCOS_EXPLORADOR = [15, 30, 50] as const;

export type CodigoPratica =
  | `reps_${(typeof MARCOS_REPS)[number]}`
  | `toneladas_${(typeof MARCOS_TONELADAS)[number]}`
  | `explorador_${(typeof MARCOS_EXPLORADOR)[number]}`;

export const CODIGOS_PRATICA: CodigoPratica[] = [
  ...MARCOS_REPS.map((n) => `reps_${n}` as CodigoPratica),
  ...MARCOS_TONELADAS.map((n) => `toneladas_${n}` as CodigoPratica),
  ...MARCOS_EXPLORADOR.map((n) => `explorador_${n}` as CodigoPratica),
];

export type TrofeuPratica = { codigo: CodigoPratica; data: string; sessaoId: string; descricao: string; evidencia: Record<string, unknown> };

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function contam(sessoes: SessaoConquista[]): SessaoConquista[] {
  return sessoes
    .filter((s) => s.status !== "em_andamento" && s.origem !== "importado" && s.origem !== "legado_logbook" && s.conta_aderencia !== false)
    .sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
}

type Serie = NonNullable<SessaoConquista["exercicios"]>[number]["series"][number];
/** Repetições de uma série: blocos somados (rest-pause, drop-set…), senão as reps. */
export function repsDaSerie(s: Serie): number {
  if (s.blocos && s.blocos.length) return s.blocos.reduce((t, b) => t + (Number(b.reps ?? 0) || 0), 0);
  return Math.max(0, s.reps ?? 0);
}

/** Exercício para o Explorador: o da biblioteca; sem ele, o nome. */
export const chaveDoExercicio = (e: { biblioteca_id?: string | null; nome: string }) => (e.biblioteca_id ? `b:${e.biblioteca_id}` : `n:${semAcento(e.nome)}`);

/** O que uma sessão soma: repetições, kg e os exercícios feitos. */
export function somaDaSessao(s: SessaoConquista): { reps: number; kg: number; exercicios: string[] } {
  let reps = 0;
  let kg = 0;
  const exercicios: string[] = [];
  for (const e of s.exercicios ?? []) {
    const lados = ehUnilateral({ nome: e.nome, unilateral: e.unilateral }) ? 2 : 1;
    let fez = false;
    for (const x of e.series) {
      if (x.tipo === "aquecimento" || serieForaDoLimite(x)) continue;
      const r = repsDaSerie(x);
      if (r <= 0) continue;
      fez = true;
      reps += r * lados;
      kg += kgDaSerie(x) * lados;
    }
    if (fez) exercicios.push(chaveDoExercicio(e));
  }
  return { reps, kg, exercicios };
}

export type TotaisPratica = { reps: number; toneladas: number; exercicios: number };

/** Totais de tudo que já foi feito (para o progresso na vitrine). */
export function totaisDaPratica(sessoes: SessaoConquista[]): TotaisPratica {
  let reps = 0;
  let kg = 0;
  const vistos = new Set<string>();
  for (const s of contam(sessoes)) {
    const t = somaDaSessao(s);
    reps += t.reps;
    kg += t.kg;
    for (const e of t.exercicios) vistos.add(e);
  }
  return { reps, toneladas: kg / 1000, exercicios: vistos.size };
}

export function trofeusDaPratica(sessoes: SessaoConquista[]): TrofeuPratica[] {
  const out: TrofeuPratica[] = [];
  let reps = 0;
  let kg = 0;
  const vistos = new Set<string>();
  for (const s of contam(sessoes)) {
    const t = somaDaSessao(s);
    const antes = { reps, t: kg / 1000, ex: vistos.size };
    reps += t.reps;
    kg += t.kg;
    for (const e of t.exercicios) vistos.add(e);
    const ton = kg / 1000;
    for (const n of MARCOS_REPS) if (antes.reps < n && reps >= n) out.push({ codigo: `reps_${n}`, data: s.iniciado_em, sessaoId: s.id, descricao: `${fmt(n)} repetições feitas no app.`, evidencia: { total: reps } });
    for (const n of MARCOS_TONELADAS) if (antes.t < n && ton >= n) out.push({ codigo: `toneladas_${n}`, data: s.iniciado_em, sessaoId: s.id, descricao: `${fmt(n)} toneladas levantadas no app (carga × repetições).`, evidencia: { toneladas: Math.round(ton * 10) / 10 } });
    for (const n of MARCOS_EXPLORADOR) if (antes.ex < n && vistos.size >= n) out.push({ codigo: `explorador_${n}`, data: s.iniciado_em, sessaoId: s.id, descricao: `${n} exercícios diferentes feitos no app.`, evidencia: { exercicios: vistos.size } });
  }
  return out;
}

/** Comparações divertidas para as toneladas (aproximadas, só ilustração). */
export const COMPARACAO_TONELADAS: Record<(typeof MARCOS_TONELADAS)[number], string> = {
  25: "o peso de uns 4 elefantes",
  100: "o peso de uns 75 carros populares",
  250: "o peso de um avião grande de passageiros, cheio",
  500: "o peso de umas 3 baleias-azuis",
  1000: "o peso de quase 7 baleias-azuis",
};
