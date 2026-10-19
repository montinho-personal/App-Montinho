// ============================================================================
// Fila local idempotente para registrar séries com conexão instável.
//
//  • Cada operação tem uma client_key estável (gerada uma vez no dispositivo).
//    Reenviar a mesma operação NUNCA duplica no servidor (UNIQUE session_id+client_key).
//  • A fila persiste em localStorage (rascunho local) e é drenada em ordem.
//  • Estado por operação: pendente → enviando → confirmada | erro (reenvia).
// Este módulo é puro (recebe `storage` e `enviar` por injeção) para ser testável.
// ============================================================================

export type OperacaoFila =
  | { tipo: "serie"; sessionId: string; clientKey: string; payload: Record<string, unknown>; criadaEm: string; tentativas: number; ultimoErro?: string | null }
  | { tipo: "exercicio"; sessionId: string; clientKey: string; payload: Record<string, unknown>; criadaEm: string; tentativas: number; ultimoErro?: string | null }
  | { tipo: "finalizar"; sessionId: string; clientKey: string; payload: Record<string, unknown>; criadaEm: string; tentativas: number; ultimoErro?: string | null };

export type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

export type EstadoFila = { pendentes: number; enviando: boolean; ultimoErro: string | null; ultimaSincronizacao: string | null };

export type EnviarFn = (op: OperacaoFila) => Promise<{ ok: true } | { ok: false; definitivo?: boolean; erro: string }>;

const CHAVE = (sessionId: string) => `montinho:fila:${sessionId}`;

export function gerarClientKey(prefixo = "k"): string {
  const rnd = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefixo}:${rnd}`;
}

export function lerFila(storage: StorageLike, sessionId: string): OperacaoFila[] {
  try {
    const raw = storage.getItem(CHAVE(sessionId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as OperacaoFila[]) : [];
  } catch {
    return [];
  }
}

export function gravarFila(storage: StorageLike, sessionId: string, fila: OperacaoFila[]): void {
  try {
    if (!fila.length) storage.removeItem(CHAVE(sessionId));
    else storage.setItem(CHAVE(sessionId), JSON.stringify(fila));
  } catch {
    /* storage cheio/indisponível: segue só em memória */
  }
}

/** Enfileira (ou substitui) uma operação pela client_key — a última edição vence. */
export function enfileirar(storage: StorageLike, sessionId: string, op: Omit<OperacaoFila, "criadaEm" | "tentativas">): OperacaoFila[] {
  const fila = lerFila(storage, sessionId).filter((x) => !(x.tipo === op.tipo && x.clientKey === op.clientKey));
  const nova = { ...op, criadaEm: new Date().toISOString(), tentativas: 0 } as OperacaoFila;
  // "finalizar" vai sempre por último
  const semFinal = fila.filter((x) => x.tipo !== "finalizar");
  const finais = fila.filter((x) => x.tipo === "finalizar");
  const resultado = nova.tipo === "finalizar" ? [...semFinal, nova] : [...semFinal, nova, ...finais];
  gravarFila(storage, sessionId, resultado);
  return resultado;
}

/**
 * Drena a fila em ordem. Para no primeiro erro transitório (mantém a ordem);
 * erros definitivos (4xx de validação) descartam a operação para não travar a fila.
 */
export async function drenar(storage: StorageLike, sessionId: string, enviar: EnviarFn, maxTentativas = 8): Promise<{ confirmadas: number; restantes: OperacaoFila[]; erro: string | null }> {
  let fila = lerFila(storage, sessionId);
  let confirmadas = 0;
  let erro: string | null = null;
  while (fila.length) {
    const op = fila[0];
    const r = await enviar(op);
    if (r.ok) {
      confirmadas += 1;
      fila = fila.slice(1);
      gravarFila(storage, sessionId, fila);
      continue;
    }
    if (r.definitivo || op.tentativas + 1 >= maxTentativas) {
      // descarta para não bloquear as demais; o erro fica registrado
      erro = r.erro;
      fila = fila.slice(1);
      gravarFila(storage, sessionId, fila);
      continue;
    }
    fila = [{ ...op, tentativas: op.tentativas + 1, ultimoErro: r.erro }, ...fila.slice(1)];
    gravarFila(storage, sessionId, fila);
    erro = r.erro;
    break;
  }
  return { confirmadas, restantes: fila, erro };
}

/** Reconcilia o estado local com o que o servidor confirmou (séries por client_key). */
export function reconciliar<T extends { client_key: string }>(locais: Map<string, T>, servidor: T[]): Map<string, T> {
  const out = new Map(locais);
  for (const s of servidor) out.set(s.client_key, s);
  return out;
}
