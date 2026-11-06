"use client";

// Personal manda o relatório de evolução no WhatsApp do aluno, com a frase que
// combina com os números (pedido do Montinho, 06/11/2026). O aluno abre pelo
// link, logado no app, e lá dentro baixa o PDF se quiser.
import { useState } from "react";
import { createPortal } from "react-dom";
import { linkWhatsApp } from "@/lib/acesso/mensagem";

export function EnviarRelatorioWhatsApp({ telefone, caminho, montar }: { telefone: string | null; caminho: string; montar: string }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  function abrir() {
    setTexto(montar.replace("{url}", `${window.location.origin}${caminho}`));
    setAberto(true);
  }
  return (
    <>
      <button type="button" onClick={abrir} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#25d366] px-3 font-bold text-[#0a0a0a] hover:opacity-90">
        💬 WhatsApp
      </button>
      {aberto ? createPortal(
        <div className="so-tela fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Enviar o relatório no WhatsApp" onClick={() => setAberto(false)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-4 text-[#1a1814]" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold">💬 Mandar o relatório no WhatsApp</p>
            <p className="text-xs text-[#625c4f]">A frase foi escolhida pelos números do relatório. Pode mudar o que quiser.</p>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={14} className="w-full rounded-lg border border-[#c9c2b2] p-2 text-sm" />
            {!telefone ? <p className="text-xs text-[#9a6b00]">Sem WhatsApp no cadastro: o WhatsApp vai pedir para escolher o contato.</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAberto(false)} className="h-10 rounded-lg border border-[#c9c2b2] px-4 font-semibold">Cancelar</button>
              <a href={linkWhatsApp(telefone, texto)} target="_blank" rel="noopener noreferrer" onClick={() => setAberto(false)} className="inline-flex h-10 items-center rounded-lg bg-[#25d366] px-4 font-bold text-[#0a0a0a]">Enviar</a>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
