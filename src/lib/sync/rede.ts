// fetch com prazo: no celular, uma resposta que se perde no caminho (sinal
// fraco na academia) deixava o fetch esperando para sempre e o botão girando.
// Passado o prazo, a chamada falha como “sem conexão” e a fila tenta de novo
// (as gravações são idempotentes: client_key e finalização repetida).

export const PRAZO_ENVIO_MS = 20_000;
export const PRAZO_LEITURA_MS = 8_000;

export async function fetchComPrazo(url: string, init: RequestInit = {}, prazoMs = PRAZO_ENVIO_MS, f: typeof fetch = fetch): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), prazoMs);
  try {
    return await f(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
