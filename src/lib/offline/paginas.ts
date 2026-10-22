// Treino sem internet: nomes dos caches (os mesmos de public/sw.js) e as
// contas puras de “quando salvar de novo” e “quais arquivos a tela usa”.

export const CACHE_PAGINAS = "montinho-paginas-v1";
export const CACHE_ESTATICOS = "montinho-estaticos-v1";
/** Salva as telas de novo no máximo a cada 3 h (cada salvamento abre as telas no servidor). */
export const INTERVALO_SALVAR_MS = 3 * 60 * 60 * 1000;

/** Arquivos fixos (/_next/static…) citados no HTML de uma tela, sem repetir. */
export function arquivosDaPagina(html: string): string[] {
  const achados = html.match(/\/_next\/static\/[^"'\s\\)]+/g) ?? [];
  return [...new Set(achados.map((u) => u.replace(/&amp;/g, "&")))];
}

/** Precisa salvar de novo? (nunca salvou, mudou a lista de telas ou passou o intervalo) */
export function precisaSalvar(anterior: { em: number; chave: string } | null, chave: string, agora: number): boolean {
  if (!anterior || anterior.chave !== chave) return true;
  return agora - anterior.em >= INTERVALO_SALVAR_MS;
}

/** “Sair”: apaga as telas guardadas no aparelho (têm dados do aluno). */
export async function apagarTelasGuardadas(): Promise<void> {
  try {
    if (typeof caches !== "undefined") await caches.delete(CACHE_PAGINAS);
    localStorage.removeItem("montinho-offline-salvo");
  } catch {
    // sem suporte: nada guardado
  }
}

/** Atualiza a cópia guardada de uma tela (ex.: o treino já começado, com ?sessao=…). */
export async function guardarTela(url: string): Promise<void> {
  try {
    if (typeof caches === "undefined" || !navigator.onLine) return;
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok || res.redirected) return;
    await (await caches.open(CACHE_PAGINAS)).put(url, res);
  } catch {
    // sem rede agora: fica a cópia anterior
  }
}
