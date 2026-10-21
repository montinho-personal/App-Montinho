"use client";

// Painéis e pop-ups: o botão “voltar” do celular fecha o painel em vez de sair
// da página. Ao abrir, empilha um passo no histórico (o Next copia o estado
// interno dele); “voltar” fecha; fechar pelo ✕ desfaz esse passo.
import { useEffect, useRef } from "react";

export function useFecharComVoltar(aberto: boolean, fechar: () => void) {
  const fecharRef = useRef(fechar);
  useEffect(() => {
    fecharRef.current = fechar;
  });
  useEffect(() => {
    if (!aberto || typeof window === "undefined") return;
    const marca = `p${Date.now()}${Math.random()}`;
    window.history.pushState({ montinhoPainel: marca }, "");
    let porVoltar = false;
    const onPop = () => {
      porVoltar = true;
      fecharRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!porVoltar && (window.history.state as { montinhoPainel?: string } | null)?.montinhoPainel === marca) window.history.back();
    };
  }, [aberto]);
}
