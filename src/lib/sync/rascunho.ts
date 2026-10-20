// ============================================================================
// Rascunho do treino em andamento — guarda no aparelho o que ainda NÃO foi
// concluído (carga/reps digitadas, séries extras, exercício aberto e o
// descanso em curso) para o aluno voltar de onde parou se o app fechar.
// Séries concluídas já ficam seguras na fila local e no servidor (fila.ts).
// ============================================================================

import type { StorageLike } from "./fila";

export type SerieRascunho = {
  clientKey: string;
  serie: number;
  carga: string;
  reps: string;
  rir: string;
  desconforto: string;
  /** Série adicionada pelo aluno (não existe na prescrição). */
  extra?: boolean;
};

export type Rascunho = {
  v: 1;
  /** session_exercise_id → séries ainda não concluídas com algo digitado (ou extras). */
  series: Record<string, SerieRascunho[]>;
  aberto: string | null;
  /** Fim do descanso em andamento (epoch ms). */
  descansoAte: number | null;
  salvoEm: number;
};

/** Rascunhos mais velhos que isso são descartados (treino esquecido aberto). */
export const VALIDADE_RASCUNHO_MS = 18 * 60 * 60 * 1000;

const chave = (sessaoId: string) => `montinho:rascunho:${sessaoId}`;

export function lerRascunho(storage: StorageLike, sessaoId: string, agora = Date.now()): Rascunho | null {
  try {
    const bruto = storage.getItem(chave(sessaoId));
    if (!bruto) return null;
    const r = JSON.parse(bruto) as Rascunho;
    if (r?.v !== 1 || typeof r.salvoEm !== "number" || typeof r.series !== "object" || r.series === null) return null;
    if (agora - r.salvoEm > VALIDADE_RASCUNHO_MS) {
      storage.removeItem(chave(sessaoId));
      return null;
    }
    return r;
  } catch {
    return null; // corrompido: ignora sem quebrar o treino
  }
}

export function gravarRascunho(storage: StorageLike, sessaoId: string, r: Omit<Rascunho, "v" | "salvoEm">, agora = Date.now()): void {
  try {
    const vazio = !Object.values(r.series).some((l) => l.length) && !r.aberto && !r.descansoAte;
    if (vazio) storage.removeItem(chave(sessaoId));
    else storage.setItem(chave(sessaoId), JSON.stringify({ ...r, v: 1, salvoEm: agora }));
  } catch {
    /* armazenamento cheio ou bloqueado: o treino segue, só sem rascunho */
  }
}

export function limparRascunho(storage: StorageLike, sessaoId: string): void {
  try {
    storage.removeItem(chave(sessaoId));
  } catch {}
}

type SerieTela = SerieRascunho & { tipo: "valida" | "aquecimento"; concluida: boolean; sincronizada: boolean };

/** Extrai do estado da tela só o que precisa ser lembrado. */
export function rascunhoDasSeries(series: Record<string, SerieTela[]>, planejadas: Record<string, number>): Rascunho["series"] {
  const out: Rascunho["series"] = {};
  for (const [seId, lista] of Object.entries(series)) {
    const guardar = lista
      .filter((s) => !s.concluida && (s.serie > (planejadas[seId] ?? Infinity) || s.carga || s.reps || s.rir || s.desconforto))
      .map((s) => ({ clientKey: s.clientKey, serie: s.serie, carga: s.carga, reps: s.reps, rir: s.rir, desconforto: s.desconforto, ...(s.serie > (planejadas[seId] ?? Infinity) ? { extra: true } : {}) }));
    if (guardar.length) out[seId] = guardar;
  }
  return out;
}

/**
 * Aplica o rascunho sobre as séries vindas do servidor/fila. Série já
 * concluída nunca é sobrescrita; séries extras voltam ao fim da lista.
 */
export function aplicarRascunho(series: Record<string, SerieTela[]>, r: Rascunho | null): { series: Record<string, SerieTela[]>; restaurou: boolean } {
  if (!r) return { series, restaurou: false };
  let restaurou = false;
  const out: Record<string, SerieTela[]> = {};
  for (const [seId, lista] of Object.entries(series)) {
    const salvas = r.series[seId] ?? [];
    const nova = lista.map((s) => {
      if (s.concluida) return s;
      const d = salvas.find((x) => x.serie === s.serie && !x.extra);
      if (!d) return s;
      restaurou = true;
      return { ...s, carga: d.carga, reps: d.reps, rir: d.rir, desconforto: d.desconforto };
    });
    for (const x of salvas.filter((x) => x.extra).sort((a, b) => a.serie - b.serie)) {
      if (nova.some((s) => s.clientKey === x.clientKey || s.serie === x.serie)) continue;
      restaurou = true;
      nova.push({ ...x, tipo: "valida", concluida: false, sincronizada: false });
    }
    out[seId] = nova;
  }
  return { series: out, restaurou };
}

/** Primeiro exercício com série válida por fazer (para abrir onde o aluno parou). */
export function primeiroPendente(ordem: string[], series: Record<string, Array<{ tipo: string; concluida: boolean }>>): string | null {
  for (const id of ordem) if ((series[id] ?? []).some((s) => s.tipo === "valida" && !s.concluida)) return id;
  return ordem[0] ?? null;
}
