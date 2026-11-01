"use client";

// Início: lembrete discreto para colocar o app na tela do celular (pedido do
// Montinho, 01/11/2026). Só no celular, só fora do app instalado; “Agora não”
// esconde por 14 dias neste aparelho.
import Link from "next/link";
import { useEffect, useState } from "react";
import { detectarAparelho } from "./ComoInstalar";

const CHAVE = "montinho-aviso-instalar";
const DIAS = 14;

export function AvisoInstalar() {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    const a = detectarAparelho();
    let dispensado = false;
    try {
      const em = Number(localStorage.getItem(CHAVE) ?? 0);
      dispensado = em > 0 && Date.now() - em < DIAS * 86_400_000;
    } catch {
      /* sem armazenamento: mostra */
    }
    // Lido só no navegador (o servidor não sabe qual é o celular).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMostrar(!!a.sistema && !a.instalado && !dispensado);
  }, []);
  if (!mostrar) return null;
  function agoraNao() {
    try {
      localStorage.setItem(CHAVE, String(Date.now()));
    } catch {
      /* ignora */
    }
    setMostrar(false);
  }
  return (
    <section aria-label="Instalar o app" className="flex items-center gap-3 rounded-2xl border border-accent/50 bg-accent/10 p-3">
      <span className="text-2xl" aria-hidden>📲</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">Coloque o app na tela do celular</span>
        <span className="block text-xs text-fg-muted">Abre mais rápido e as notificações funcionam. Leva 1 minuto.</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Link href="/aluno/instalar" className="alvo rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-bg">Ver como</Link>
        <button type="button" onClick={agoraNao} className="text-[11px] text-fg-subtle underline-offset-2 hover:underline">Agora não</button>
      </span>
    </section>
  );
}
