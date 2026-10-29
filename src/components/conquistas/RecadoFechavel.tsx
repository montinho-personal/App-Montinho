"use client";
// Mensagem do personal no topo das Conquistas: fica até a pessoa tocar em
// “Fechar” (lembrado no aparelho) ou passar 7 dias. Vindo do aviso no celular
// (?recado=), aparece de novo mesmo fechada.
import { useEffect, useState, type ReactNode } from "react";

const CHAVE = "montinho-recados-fechados";
function fechados(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function RecadoFechavel({ id, forcar, children }: { id: string; forcar: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(true);
  useEffect(() => {
    if (!forcar && fechados().includes(id)) setAberto(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [id, forcar]);
  if (!aberto) return null;
  return (
    <div className="relative">
      {children}
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(CHAVE, JSON.stringify([...fechados().filter((x) => x !== id), id].slice(-30)));
          } catch {}
          setAberto(false);
        }}
        className="alvo absolute right-3 top-3 rounded-full border border-line px-2.5 py-1 text-xs text-fg-muted hover:text-fg"
        aria-label="Fechar a mensagem"
      >
        ✕ Fechar
      </button>
    </div>
  );
}
