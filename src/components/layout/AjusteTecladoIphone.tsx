"use client";

// iPhone (29/10/2026, treino da Natália): depois que o teclado fecha, o Safari às
// vezes deixa a tela “deslocada” e tudo que é fixo embaixo (descanso, menu,
// janelas) fica abaixo da parte visível. Aqui: (1) ao sair de um campo, força o
// iPhone a recalcular a tela; (2) publica em --vv-fundo quanto da parte de baixo
// está escondida, para os elementos fixos subirem junto.
import { useEffect } from "react";

export function AjusteTecladoIphone() {
  useEffect(() => {
    const vv = window.visualViewport;
    const raiz = document.documentElement;
    const atualizar = () => {
      if (!vv) return;
      const escondido = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
      // Teclado aberto (muito escondido): não sobe nada, senão o menu pula para cima do teclado.
      raiz.style.setProperty("--vv-fundo", `${escondido > 0 && escondido < 160 ? escondido : 0}px`);
    };
    const aoSair = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      window.setTimeout(() => {
        if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
        window.scrollTo(window.scrollX, window.scrollY);
        atualizar();
      }, 80);
    };
    vv?.addEventListener("resize", atualizar);
    vv?.addEventListener("scroll", atualizar);
    document.addEventListener("focusout", aoSair);
    atualizar();
    return () => {
      vv?.removeEventListener("resize", atualizar);
      vv?.removeEventListener("scroll", atualizar);
      document.removeEventListener("focusout", aoSair);
    };
  }, []);
  return null;
}
