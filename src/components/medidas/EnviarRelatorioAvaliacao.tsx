"use client";

// Personal manda o relatório da avaliação no WhatsApp do aluno (decisão do
// Montinho: tudo pelo WhatsApp). O aluno abre pelo link, logado no app.
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { mensagemRelatorio } from "@/lib/medidas/relatorio-avaliacao";

export function EnviarRelatorioAvaliacao({ id, nome, telefone, data }: { id: string; nome: string; telefone: string | null; data: string }) {
  function enviar() {
    const url = `${window.location.origin}/avaliacao/${id}`;
    window.open(linkWhatsApp(telefone, mensagemRelatorio(nome, data, url)), "_blank", "noopener");
  }
  return (
    <button type="button" onClick={enviar} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25d366] px-4 font-bold text-[#0a0a0a] hover:opacity-90">
      💬 Enviar no WhatsApp
    </button>
  );
}
