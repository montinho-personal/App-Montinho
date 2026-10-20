// ============================================================================
// Compartilhamento web do card — sem prometer o que o navegador não faz.
// 1) Web Share com arquivo (Android/iPhone recentes) → abre a folha do sistema
//    (Instagram, WhatsApp…). Tocar em “compartilhar” NÃO confirma publicação.
// 2) Sem suporte → baixa o PNG e explica como postar manualmente.
// ============================================================================

export type ResultadoCompartilhar = "enviado_ao_sistema" | "cancelado" | "baixado" | "erro";

export type Capacidades = {
  share?: (d: ShareData) => Promise<void>;
  canShare?: (d: ShareData) => boolean;
};

export function podeCompartilharArquivo(cap: Capacidades, arquivo: File): boolean {
  if (typeof cap.share !== "function" || typeof cap.canShare !== "function") return false;
  try {
    return cap.canShare({ files: [arquivo] });
  } catch {
    return false;
  }
}

/** Cancelamento do usuário chega como AbortError (não é erro). */
export function foiCancelado(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: string }).name === "AbortError";
}

export async function compartilharArquivo(cap: Capacidades, arquivo: File, texto: string, baixar: (f: File) => void): Promise<ResultadoCompartilhar> {
  if (podeCompartilharArquivo(cap, arquivo)) {
    try {
      await cap.share!({ files: [arquivo], text: texto });
      return "enviado_ao_sistema";
    } catch (e) {
      if (foiCancelado(e)) return "cancelado";
      // NotAllowedError (gesto expirou) ou falha do app de destino: cai para download.
    }
  }
  try {
    baixar(arquivo);
    return "baixado";
  } catch {
    return "erro";
  }
}

export const MENSAGEM_RESULTADO: Record<ResultadoCompartilhar, string> = {
  enviado_ao_sistema: "Card enviado para o app que você escolheu. É só finalizar a publicação por lá.",
  cancelado: "Compartilhamento cancelado. O card continua aqui se quiser tentar de novo.",
  baixado: "Imagem salva no aparelho. No Instagram: Story → galeria → escolha o card. No WhatsApp: Status ou conversa → anexar imagem.",
  erro: "Não foi possível gerar ou salvar a imagem agora. Tente de novo.",
};
