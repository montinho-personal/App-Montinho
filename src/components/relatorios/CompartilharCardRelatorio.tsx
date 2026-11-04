"use client";

// “📲 Compartilhar” dos relatórios: gera o card (Story com o logo oficial) e
// abre o compartilhar do celular; sem ele, baixa a imagem.
import { useState } from "react";
import { gerarCardRelatorio } from "./cardRelatorio";
import { enviarEvento } from "@/components/chalala/evento";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import type { CardRelatorio } from "@/lib/relatorios/card-relatorio";

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

export function CompartilharCardRelatorio({ card, rotulo = "📲 Compartilhar", className, registrar = true }: { card: CardRelatorio | null; rotulo?: string; className?: string; /** O personal baixando para mandar ao aluno não conta como compartilhamento do aluno. */ registrar?: boolean }) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  if (!card) return null;
  const c = card;
  async function compartilhar() {
    setEnviando(true);
    setAviso(null);
    let r: ResultadoCompartilhar;
    try {
      r = await compartilharArquivo(navigator, await gerarCardRelatorio(c), c.legenda, baixar);
    } catch {
      r = "erro";
    }
    if (registrar) enviarEvento({ tipo: r === "baixado" ? "download" : r === "cancelado" ? "compartilhar_cancelado" : "compartilhar_nativo", formato: "stories", origem: "relatorio", modelo: c.tipo, ref: c.ref });
    if (r !== "enviado_ao_sistema") setAviso(MENSAGEM_RESULTADO[r]);
    setEnviando(false);
  }
  return (
    <span className="inline-flex flex-col items-stretch gap-1">
      <button type="button" onClick={() => void compartilhar()} disabled={enviando} className={className ?? "touch inline-flex items-center justify-center gap-1 rounded-xl border border-accent/60 px-4 text-sm font-bold text-accent disabled:opacity-60"}>
        {enviando ? "Preparando…" : rotulo}
      </button>
      {aviso ? <span className="text-[11px] text-fg-muted">{aviso}</span> : null}
    </span>
  );
}
