"use client";

// Compartilhar um troféu da tribo: mesma imagem pronta das medalhas (logo
// oficial completo), com o card da tribo. Evento com origem “tribo”.
import { useState } from "react";
import { gerarImagemMedalha } from "@/components/chalala/cardMedalha";
import { enviarEvento } from "@/components/chalala/evento";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import { cardDaTribo, type ConquistaTribo, type MarcoTribo } from "@/lib/tribo/regras";

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

export function CompartilharTribo({ conquista, nome, marcos }: { conquista: ConquistaTribo; nome: string; marcos?: MarcoTribo[] }) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  async function compartilhar() {
    setEnviando(true);
    setAviso(null);
    const card = cardDaTribo(conquista, nome, marcos);
    let r: ResultadoCompartilhar;
    try {
      r = await compartilharArquivo(navigator, await gerarImagemMedalha(card), card.legenda, baixar);
    } catch {
      r = "erro";
    }
    enviarEvento({ tipo: r === "baixado" ? "download" : r === "cancelado" ? "compartilhar_cancelado" : "compartilhar_nativo", formato: "stories", origem: "tribo", ref: `tribo:${conquista.codigo}` });
    if (r !== "enviado_ao_sistema") setAviso(MENSAGEM_RESULTADO[r]);
    setEnviando(false);
  }
  return (
    <div className="space-y-1">
      <button type="button" onClick={() => void compartilhar()} disabled={enviando} className="alvo min-h-11 w-full rounded-lg bg-accent px-3 text-sm font-bold text-bg disabled:opacity-60">
        {enviando ? "Preparando a imagem…" : "📲 Compartilhar"}
      </button>
      {aviso ? <p className="text-[11px] text-fg-muted">{aviso}</p> : null}
    </div>
  );
}
