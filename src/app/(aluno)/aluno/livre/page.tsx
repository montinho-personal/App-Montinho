// Treino livre (freestyle): começa sem ficha e decide cada exercício na hora.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getSessaoEmAndamento } from "@/lib/data/sessoes";
import { ehSessaoLivre, hrefDaSessao } from "@/lib/treino/livre";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { ComecarLivre } from "./ComecarLivre";
import { placarDoAluno } from "@/lib/data/livre-metas";
import { PlacarMetas } from "@/components/livre-metas/PlacarMetas";

export const metadata = { title: "Treino livre" };

export default async function ComecarLivrePage() {
  const sessao = await requireAlunoPage();
  const visitante = ehVisitante(sessao);
  const emAndamento = await getSessaoEmAndamento(sessao.alunoId).catch(() => null);
  if (emAndamento && ehSessaoLivre(emAndamento)) redirect(`/aluno/livre/${emAndamento.id}`);
  const metas = await placarDoAluno(sessao.alunoId, null, { qualquerPlano: true }).catch(() => null);
  const pode = podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null);

  return (
    <div className="space-y-5">
      <Link href={visitante ? "/aluno/meus-treinos" : "/aluno/treinar"} className="alvo inline-block text-sm text-fg-muted hover:text-fg">← {visitante ? "Meus treinos" : "Treinar"}</Link>
      <header className="space-y-2">
        <p className="text-4xl" aria-hidden>🎲</p>
        <h1 className="text-2xl font-bold">Treino livre</h1>
        <p className="text-sm text-fg-muted">Chegou na academia sem saber o que vai treinar? Sem problema. Você decide cada exercício na hora e o app anota tudo.</p>
      </header>
      {metas?.placar.length ? <PlacarMetas placar={metas.placar} sugestao={metas.sugestao} resumo={metas.resumo} nota={metas.origem === "ficha" ? "Meta de cada músculo = as séries que a sua ficha prevê na semana." : metas.origem === "referencia" ? "Sem ficha ainda: meta de referência para quem está começando." : null} /> : null}
      <ol className="space-y-2 text-sm">
        <li className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3"><span className="font-bold text-accent">1</span><span>Escolha o exercício (com vídeo) ou escreva o nome que você usa.</span></li>
        <li className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3"><span className="font-bold text-accent">2</span><span>Anote cada série: carga e repetições. Usou drop-set, rest-pause, bi-set? Marque a técnica.</span></li>
        <li className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3"><span className="font-bold text-accent">3</span><span>Toque em “Próximo exercício” e siga. No fim, conte como foi{visitante ? " e, se quiser, salve como treino para repetir" : ""}.</span></li>
      </ol>
      <p className="text-xs text-fg-subtle">Conta na sua semana, nos troféus e na sua evolução como qualquer treino. Precisa de internet para anotar.</p>
      {!pode && !visitante ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm">Seu acesso terminou. Para voltar a treinar pelo app, fale com o Montinho.</p>
      ) : emAndamento ? (
        <div className="space-y-2 rounded-xl border border-accent/50 bg-card p-4 text-sm">
          <p>Você tem um treino em andamento ({emAndamento.nome_treino ?? "treino"}). Termine ele antes de começar um treino livre.</p>
          <Link href={hrefDaSessao(emAndamento)} className="alvo inline-block font-semibold text-accent">Continuar o treino →</Link>
        </div>
      ) : (
        // Visitante depois dos 30 dias: o botão continua e abre o convite para o WhatsApp (TravaVisitante).
        <ComecarLivre />
      )}
    </div>
  );
}
