// WOD livre (pedido do Montinho, 01/11/2026): o aluno monta e anota o WOD que
// fez (ou vai fazer) fora da ficha, como no treino livre da musculação.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES } from "@/lib/env";
import { getSessaoEmAndamento } from "@/lib/data/sessoes";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { ehWodLivre } from "@/lib/data/wod-dia";
import { hrefDaSessao } from "@/lib/treino/livre";
import { podeRegistrar } from "@/lib/visitante/acesso";
import type { BlocoTreino, ModalidadeTreino } from "@/lib/modalidades/tipos";
import { WodLivreClient } from "./WodLivreClient";

export const metadata = { title: "WOD livre" };

export default async function WodLivrePage() {
  if (!FEATURES.multimodalidade) notFound();
  const sessao = await requireAlunoPage();
  const visitante = ehVisitante(sessao);
  const [emAndamento, itens] = await Promise.all([getSessaoEmAndamento(sessao.alunoId).catch(() => null), listarBiblioteca().catch(() => [])]);
  const pode = podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null);
  const meu = emAndamento && ehWodLivre(emAndamento) ? emAndamento : null;
  const snap = (meu?.snapshot ?? null) as { blocos?: BlocoTreino[]; modalidade?: ModalidadeTreino; treino?: { nome?: string } } | null;

  return (
    <div className="space-y-5">
      <Link href={visitante ? "/aluno/meus-treinos" : "/aluno/treinar"} className="alvo inline-block text-sm text-fg-muted hover:text-fg">← {visitante ? "Meus treinos" : "Treinar"}</Link>
      <header className="space-y-1">
        <p className="text-4xl" aria-hidden>📝</p>
        <h1 className="text-2xl font-bold">WOD livre</h1>
        <p className="text-sm text-fg-muted">Fez (ou vai fazer) um WOD, HYROX ou funcional fora da sua ficha? Monte os blocos, use o relógio e anote o resultado. Conta na sua Jornada, nos troféus e nos seus recordes.</p>
      </header>
      {!pode && !visitante ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm">Seu acesso terminou. Para voltar a treinar pelo app, fale com o Montinho.</p>
      ) : emAndamento && !meu ? (
        <div className="space-y-2 rounded-xl border border-accent/50 bg-card p-4 text-sm">
          <p>Você tem um treino em andamento ({emAndamento.nome_treino ?? "treino"}). Termine ele antes de começar um WOD livre.</p>
          <Link href={hrefDaSessao(emAndamento)} className="alvo inline-block font-semibold text-accent">Continuar o treino →</Link>
        </div>
      ) : (
        <WodLivreClient itens={itens} sessaoInicial={meu ? { id: meu.id, status: meu.status, blocos: snap?.blocos ?? [], modalidade: snap?.modalidade ?? "cross", titulo: snap?.treino?.nome ?? "WOD livre" } : null} />
      )}
    </div>
  );
}
