"use client";

// “← Voltar” no topo das telas (pedido do Montinho, 28/10/2026): volta para a
// tela anterior sem precisar fechar o app. Sem histórico (link aberto direto),
// vai para `href`.
import { useRouter } from "next/navigation";

export function Voltar({ href = "/aluno", rotulo = "Voltar", className = "" }: { href?: string; rotulo?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(href))}
      className={`alvo inline-flex items-center gap-1 text-sm font-semibold text-fg-muted hover:text-fg ${className}`}
    >
      <span aria-hidden>←</span> {rotulo}
    </button>
  );
}
