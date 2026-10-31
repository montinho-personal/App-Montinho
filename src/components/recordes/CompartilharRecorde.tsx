"use client";

// “📲” de cada recorde: a imagem pronta “Novo recorde pessoal” (logo oficial
// completo), pelo mesmo caminho do compartilhar das medalhas.
import { useState } from "react";
import { gerarImagemMedalha } from "@/components/chalala/cardMedalha";
import { enviarEvento } from "@/components/chalala/evento";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import type { CardMedalha } from "@/lib/conquistas/compartilhavel";

function baixar(f: File) {
  const url = URL.createObjectURL(f);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function CompartilharRecorde({ card, refEvento, destaque = false }: { card: CardMedalha; refEvento: string; destaque?: boolean }) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  async function compartilhar() {
    setEnviando(true);
    setAviso(null);
    let r: ResultadoCompartilhar;
    try {
      r = await compartilharArquivo(navigator, await gerarImagemMedalha(card), card.legenda, baixar);
    } catch {
      r = "erro";
    }
    enviarEvento({ tipo: r === "baixado" ? "download" : r === "cancelado" ? "compartilhar_cancelado" : "compartilhar_nativo", formato: "stories", origem: "recordes", ref: refEvento });
    if (r !== "enviado_ao_sistema") setAviso(MENSAGEM_RESULTADO[r]);
    setEnviando(false);
  }
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button type="button" onClick={() => void compartilhar()} disabled={enviando} aria-label="Compartilhar este recorde" className={`alvo rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-60 ${destaque ? "bg-accent text-bg" : "border border-accent/60 text-accent"}`}>
        {enviando ? "…" : "📲 Compartilhar"}
      </button>
      {aviso ? <span className="max-w-40 text-right text-[10px] text-fg-muted">{aviso}</span> : null}
    </span>
  );
}
