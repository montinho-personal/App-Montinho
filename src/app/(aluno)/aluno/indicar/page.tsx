// Indique um amigo (0068/0102): link pessoal, +10 dias (visitante) e 10% de
// desconto por amigo que fechar (visitante e aluno, somam até 30%).
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES } from "@/lib/env";
import { minhaIndicacao } from "@/lib/data/indicacao";
import { campanhaDoVisitante } from "@/lib/data/campanhas";
import { ConviteAmigo } from "@/components/visitante/ConviteAmigo";
import { DescontoIndicacao } from "@/components/indicacao/DescontoIndicacao";
import { ondeVale, REGRAS_DESCONTO } from "@/lib/indicacao/desconto";
import { REGRAS_INDICACAO } from "@/lib/visitante/campanhas";

export const metadata = { title: "Indique um amigo" };
export const dynamic = "force-dynamic";

export default async function IndicarPage() {
  const sessao = await requireAlunoPage();
  const visitante = ehVisitante(sessao);
  const [r, campanha] = await Promise.all([minhaIndicacao(sessao.alunoId), visitante ? campanhaDoVisitante(sessao.alunoId, sessao.acessoFim ?? null).catch(() => null) : null]);
  const liberado = !visitante || (campanha?.treinosConcluidos ?? 0) >= REGRAS_INDICACAO.treinosMinimos;
  return (
    <div className="space-y-5">
      <Link href="/aluno/perfil" className="alvo inline-block text-sm text-fg-muted hover:text-fg">← Perfil</Link>
      <header>
        <h1 className="text-2xl font-bold">🎁 Indique um amigo</h1>
        <p className="text-sm text-fg-muted">Treinar junto é melhor. E ainda vale desconto para você.</p>
      </header>
      <ChamadaTrofeu acao="indicar" />
      <DescontoIndicacao r={r} nome={sessao.nome} aluno={!visitante} />
      {sessao.comoPersonal ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-fg-muted">No “Meu treino” não há convite de indicação: esta é a tela que os alunos veem.</p>
      ) : !FEATURES.modoVisitante ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-fg-muted">O convite de amigos ainda não está ligado.</p>
      ) : liberado ? (
        <ConviteAmigo amigos={campanha?.indicacao.amigos ?? r.cadastrados} diasGanhos={campanha?.indicacao.diasGanhos ?? 0} tela="indicar" aluno={!visitante} />
      ) : (
        <p className="rounded-xl border border-border bg-card p-4 text-sm">
          Seu convite libera a partir do {REGRAS_INDICACAO.treinosMinimos}º treino concluído. Você já fez {campanha?.treinosConcluidos ?? 0}. Bora!
        </p>
      )}
      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <p className="font-bold">Como funciona</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg-muted">
          <li>Mande o seu link para um amigo. Ele testa o app 30 dias de graça.</li>
          {visitante ? <li>Cada amigo que criar a conta te dá +{REGRAS_INDICACAO.diasPorAmigo} dias de app (até +{REGRAS_INDICACAO.maxDias}).</li> : null}
          <li>Se o amigo fechar um plano com o Montinho, você ganha {REGRAS_DESCONTO.porAmigo}% de desconto {ondeVale(!visitante)}.</li>
          <li>Mais amigos, mais desconto: 1 amigo = 10%, 2 amigos = 20%, 3 amigos = {REGRAS_DESCONTO.maximo}%. O desconto não tem prazo.</li>
        </ol>
        {r.cadastrados ? (
          <p className="mt-3 text-xs text-fg-subtle">
            Pelo seu convite: {r.cadastrados} {r.cadastrados === 1 ? "amigo entrou" : "amigos entraram"} · {r.fecharam} {r.fecharam === 1 ? "fechou" : "fecharam"}{r.usado ? ` · ${r.usado}% de desconto já usado` : ""}.
          </p>
        ) : null}
      </section>
    </div>
  );
}
