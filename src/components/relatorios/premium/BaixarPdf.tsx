"use client";

/** Abre a janela de impressão do navegador: lá é só escolher “Salvar como PDF”. */
export function BaixarPdf() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ba9e50] px-4 font-bold text-[#0a0a0a] hover:bg-[#cbb06a]">
      Baixar PDF
    </button>
  );
}
