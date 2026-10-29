"use client";

// Fim do treino livre com a MESMA experiência dos outros treinos (pedido do
// Montinho, 28/10/2026): medalhas para abrir, card “Treino pago”, relatório e
// cardio depois; embaixo, o que foi feito e “Salvar como treino” (visitante).
import Link from "next/link";
import { TelaChalala, type BaseConclusao } from "@/components/chalala/TelaChalala";
import { CardioDoTreino } from "@/components/strava/CardioDoTreino";
import { CardioAposTreino } from "@/components/cardio/CardioAposTreino";
import type { ExercicioLivre, ResumoLivre } from "@/lib/treino/livre";
import { ResumoLivreClient } from "./ResumoLivreClient";
import { PedirAvaliacao } from "@/components/visitante/PedirAvaliacao";
import { BRAND } from "@/config/brand";

export function FimLivreClient({ base, nome, resumo, exercicios, podeSalvar, duracaoMin, extra, dor, avaliacao = null }: { avaliacao?: { link: string; treinos: number } | null; base: BaseConclusao; nome: string; resumo: ResumoLivre; exercicios: ExercicioLivre[]; podeSalvar: boolean; duracaoMin: number | null; extra: boolean; dor: boolean }) {
  const concluida = base.status === "concluida";
  return (
    <TelaChalala base={base} nome={nome}>
      {concluida ? <CardioDoTreino sessionId={base.sessaoId} /> : null}
      {concluida ? <CardioAposTreino sessionId={base.sessaoId} nome={nome} dor={dor} /> : null}
      {base.series > 0 ? <ResumoLivreClient resumo={resumo} exercicios={exercicios} podeSalvar={podeSalvar} duracaoMin={duracaoMin} extra={extra} dentroDoFim /> : null}
      {concluida && !dor && avaliacao ? <PedirAvaliacao link={avaliacao.link} treinos={avaliacao.treinos} whatsapp={BRAND.contact.whatsapp || null} tela="fim_treino" /> : null}
      {concluida && !dor ? (
        <Link href="/aluno/desafios/novo" className="alvo flex items-center gap-3 rounded-2xl border border-accent/50 bg-card px-4 py-3">
          <span className="text-2xl" aria-hidden>⚔️</span>
          <span className="flex-1">
            <span className="block font-bold">Treino pago! Bora desafiar alguém?</span>
            <span className="block text-xs text-fg-muted">Quem pega mais peso hoje, quem treina mais na semana… escolha e chame a galera.</span>
          </span>
          <span aria-hidden className="text-fg-subtle">→</span>
        </Link>
      ) : null}
    </TelaChalala>
  );
}
