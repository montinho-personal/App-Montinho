"use client";

/** Abre a janela de impressão do navegador: lá é só escolher “Salvar como PDF”.
 *  O navegador dá ao arquivo o título da página, por isso o título vira `arquivo`
 *  enquanto imprime (ex.: “Relatório de Evolução - Aline - Montinho Personal Trainer - 06-11-2026”). */
export function BaixarPdf({ arquivo }: { arquivo?: string }) {
  function baixar() {
    const antes = document.title;
    if (arquivo) document.title = arquivo;
    const voltar = () => {
      document.title = antes;
      window.removeEventListener("afterprint", voltar);
    };
    window.addEventListener("afterprint", voltar);
    window.print();
    // Alguns celulares não avisam o fim da impressão: volta o título depois.
    setTimeout(voltar, 60_000);
  }
  return (
    <button type="button" onClick={baixar} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ba9e50] px-4 font-bold text-[#0a0a0a] hover:bg-[#cbb06a]">
      Baixar PDF
    </button>
  );
}
