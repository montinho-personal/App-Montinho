// ============================================================================
// Trilhas de recordes (pedido do Montinho, 11/11/2026: “evolução de carga é
// muito importante para a motivação; quero que valha troféu em outros
// momentos, e que conte no ranking”). Três trilhas, cada degrau vale 1 vez:
//   • Caçador de Recordes: recordes somados (cada exercício que bateu recorde
//     num treino = 1; no máximo 3 por treino, como o “Novo recorde pessoal”):
//     5, 10, 25, 50, 100, 250.
//   • Força em Todo Lugar: exercícios DIFERENTES em que já bateu recorde:
//     5, 10, 20, 30.
//   • Força em Alta: a carga de algum exercício subiu 25%, 50% e 100% desde a
//     primeira vez que a pessoa anotou carga nele (precisa de 2+ treinos antes
//     no exercício e carga inicial de 5 kg ou mais; treino com dor não conta;
//     série acima de 500 kg fica fora, como na Academia).
// O recorde é o MESMO do troféu “Novo recorde pessoal” (recordesDaSessao em
// regras.ts): carga maior que todas as anteriores, ou mais repetições com a
// mesma carga, com 2+ registros antes; histórico importado é base, não conta.
// ============================================================================
import type { ItemRecorde, SessaoConquista } from "./regras";

export const MARCOS_RECORDES = [5, 10, 25, 50, 100, 250] as const;
export const MARCOS_RECORDE_EXERCICIOS = [5, 10, 20, 30] as const;
export const MARCOS_FORCA_ALTA = [25, 50, 100] as const;
export const LIMITES_FORCA_ALTA = { cargaInicialMin: 5, treinosAntes: 2, cargaMax: 500 } as const;

export type CodigoRecordesTrilha =
  | `recordes_${(typeof MARCOS_RECORDES)[number]}`
  | `recordes_exercicios_${(typeof MARCOS_RECORDE_EXERCICIOS)[number]}`
  | `forca_alta_${(typeof MARCOS_FORCA_ALTA)[number]}`;

export const CODIGOS_RECORDES_TRILHA: CodigoRecordesTrilha[] = [
  ...MARCOS_RECORDES.map((n) => `recordes_${n}` as CodigoRecordesTrilha),
  ...MARCOS_RECORDE_EXERCICIOS.map((n) => `recordes_exercicios_${n}` as CodigoRecordesTrilha),
  ...MARCOS_FORCA_ALTA.map((n) => `forca_alta_${n}` as CodigoRecordesTrilha),
];

export type RecordesDaSessao = { sessaoId: string; data: string; itens: ItemRecorde[] };
export type TrofeuRecordes = { codigo: CodigoRecordesTrilha; data: string; sessaoId: string; descricao: string; evidencia: Record<string, unknown> };

const chave = (nome: string) => nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const fmtKg = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;

/** Totais para o progresso: recordes somados e exercícios diferentes com recorde. */
export function totaisDosRecordes(lista: RecordesDaSessao[]): { recordes: number; exercicios: number } {
  const ex = new Set<string>();
  let n = 0;
  for (const s of lista) for (const r of s.itens) {
    n++;
    ex.add(chave(r.exercicio));
  }
  return { recordes: n, exercicios: ex.size };
}

/** Caçador de Recordes e Força em Todo Lugar, na ordem dos treinos. */
export function trofeusDosRecordes(lista: RecordesDaSessao[]): TrofeuRecordes[] {
  const out: TrofeuRecordes[] = [];
  const ex = new Set<string>();
  let n = 0;
  for (const s of [...lista].sort((a, b) => (a.data < b.data ? -1 : 1))) {
    const antes = { n, ex: ex.size };
    for (const r of s.itens) {
      n++;
      ex.add(chave(r.exercicio));
    }
    for (const m of MARCOS_RECORDES) if (antes.n < m && n >= m) out.push({ codigo: `recordes_${m}`, data: s.data, sessaoId: s.sessaoId, descricao: `${m} recordes pessoais batidos no app.`, evidencia: { recordes: n } });
    for (const m of MARCOS_RECORDE_EXERCICIOS) if (antes.ex < m && ex.size >= m) out.push({ codigo: `recordes_exercicios_${m}`, data: s.data, sessaoId: s.sessaoId, descricao: `Recorde pessoal em ${m} exercícios diferentes.`, evidencia: { exercicios: ex.size } });
  }
  return out;
}

type Ponto = { primeira: number; treinos: number; melhor: number };

/** Maior carga válida de cada exercício na sessão (sem aquecimento, sem série acima do limite). */
function cargasDaSessao(s: SessaoConquista): Map<string, { nome: string; kg: number }> {
  const m = new Map<string, { nome: string; kg: number }>();
  for (const e of s.exercicios ?? []) {
    let kg = 0;
    for (const x of e.series) {
      if (x.tipo === "aquecimento" || (x.reps ?? 0) <= 0) continue;
      const c = x.carga_kg ?? 0;
      if (c > 0 && c <= LIMITES_FORCA_ALTA.cargaMax) kg = Math.max(kg, c);
    }
    if (kg > 0) {
      const k = chave(e.nome);
      m.set(k, { nome: e.nome, kg: Math.max(kg, m.get(k)?.kg ?? 0) });
    }
  }
  return m;
}

const comDor = (s: SessaoConquista) => s.feedback_percepcao === "dor" || s.checkin_pre === "desconforto";

/**
 * Força em Alta. `sessoes` = a mesma base dos recordes (concluídas/parciais,
 * em ordem, com o importado como base). Importado e treino com dor não concedem.
 */
export function trofeusForcaEmAlta(sessoes: SessaoConquista[]): TrofeuRecordes[] {
  const out: TrofeuRecordes[] = [];
  const pontos = new Map<string, Ponto>();
  const faltam = new Set<number>(MARCOS_FORCA_ALTA);
  for (const s of [...sessoes].sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1))) {
    const vale = s.conta_aderencia !== false && s.origem !== "importado" && !comDor(s);
    for (const [k, { nome, kg }] of cargasDaSessao(s)) {
      const p = pontos.get(k);
      if (!p) {
        pontos.set(k, { primeira: kg, treinos: 1, melhor: kg });
        continue;
      }
      if (vale && p.treinos >= LIMITES_FORCA_ALTA.treinosAntes && p.primeira >= LIMITES_FORCA_ALTA.cargaInicialMin) {
        const pct = ((kg - p.primeira) / p.primeira) * 100;
        for (const m of MARCOS_FORCA_ALTA) {
          if (faltam.has(m) && pct >= m) {
            faltam.delete(m);
            out.push({ codigo: `forca_alta_${m}`, data: s.iniciado_em, sessaoId: s.id, descricao: `${nome}: de ${fmtKg(p.primeira)} para ${fmtKg(kg)} (+${Math.floor(pct)}%) desde a primeira vez no app.`, evidencia: { exercicio: nome, primeira: p.primeira, agora: kg, pct: Math.floor(pct) } });
          }
        }
      }
      p.treinos++;
      p.melhor = Math.max(p.melhor, kg);
    }
  }
  return out;
}

/** Maior subida de carga até agora (para o progresso da Força em Alta). */
export function maiorSubida(sessoes: SessaoConquista[]): { exercicio: string; pct: number } | null {
  const pontos = new Map<string, Ponto & { nome: string }>();
  for (const s of [...sessoes].sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1))) {
    if (s.status === "em_andamento") continue;
    for (const [k, { nome, kg }] of cargasDaSessao(s)) {
      const p = pontos.get(k);
      if (!p) pontos.set(k, { nome, primeira: kg, treinos: 1, melhor: kg });
      else {
        p.treinos++;
        p.melhor = Math.max(p.melhor, kg);
      }
    }
  }
  let r: { exercicio: string; pct: number } | null = null;
  for (const p of pontos.values()) {
    if (p.treinos < LIMITES_FORCA_ALTA.treinosAntes + 1 || p.primeira < LIMITES_FORCA_ALTA.cargaInicialMin) continue;
    const pct = Math.floor(((p.melhor - p.primeira) / p.primeira) * 100);
    if (pct > 0 && (!r || pct > r.pct)) r = { exercicio: p.nome, pct };
  }
  return r;
}

/** “7 de 10 para o próximo troféu”: o que mostrar na comemoração de cada recorde. */
export function proximoDaTrilha(recordes: number): { atual: number; alvo: number } | null {
  const alvo = MARCOS_RECORDES.find((m) => m > recordes);
  return alvo ? { atual: recordes, alvo } : null;
}
