import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Avatar } from "@/components/ui/Avatar";
import { AlunoStatusPill } from "@/components/ui/StatusPill";
import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos, getDashboardMetrics, listCheckIns } from "@/lib/db";
import { listSessoes } from "@/lib/data/sessoes";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listAdaptacoes } from "@/lib/data/acompanhamento";
import { alertasDoAluno, resumoPeriodo, type AlertaTreinador } from "@/lib/relatorios/calcular";
import { tempoRelativo, dataBR } from "@/lib/format";
import { NovoAlunoButton } from "./alunos/NovoAlunoModal";

export const metadata = { title: "Visão geral" };

export default async function TreinadorDashboardPage() {
  const sessao = await requireTreinadorPage();
  const [m, alunos, adaptacoes] = await Promise.all([getDashboardMetrics(), listAlunos(), listAdaptacoes(undefined, true)]);
  const hojeLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  // Dados por aluno ativo (limitado para manter o painel rápido)
  const ativos = alunos.filter((a) => a.status === "ativo").slice(0, 40);
  const porAluno = await Promise.all(
    ativos.map(async (a) => {
      const [sessoes, plano, checkins] = await Promise.all([listSessoes(a.id, { limite: 80 }), getPlanoAtivo(a.id), listCheckIns(a.id, 7)]);
      const alertas = alertasDoAluno({
        alunoId: a.id,
        alunoNome: a.profile?.nome ?? "Aluno",
        status: a.status,
        sessoes,
        frequencia: plano.programa?.frequencia,
        temPlano: plano.treinos.some((t) => t.ativo),
        adaptacoesAbertas: adaptacoes.filter((x) => x.aluno_id === a.id).length,
        checkinsDorAlta: checkins.filter((c) => (c.dor ?? 0) >= 7).length,
      });
      const r7 = resumoPeriodo(sessoes, plano.programa?.frequencia, 7);
      const ultima = sessoes[0] ?? null;
      return { aluno: a, alertas, r7, ultima };
    })
  );
  const alertas: AlertaTreinador[] = porAluno.flatMap((x) => x.alertas).sort((a, b) => a.prioridade - b.prioridade);
  const treinaramSemana = porAluno.filter((x) => x.r7.sessoesFeitas > 0).length;
  const recentes = porAluno.filter((x) => x.ultima).sort((a, b) => (a.ultima!.iniciado_em < b.ultima!.iniciado_em ? 1 : -1)).slice(0, 8);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-accent font-bold">Visão geral</p>
          <h1 className="text-3xl font-bold mt-1">Olá, {sessao.nome.split(" ")[0]}</h1>
          <p className="text-fg-muted text-sm mt-1">{hojeLabel} · quem precisa da sua atenção aparece primeiro.</p>
        </div>
        <NovoAlunoButton />
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Alunos ativos" value={String(m.ativos)} hint={`de ${m.total_alunos} no total`} tone="success" />
        <StatCard label="Treinaram nos últimos 7 dias" value={String(treinaramSemana)} hint={`de ${ativos.length} ativos`} tone={treinaramSemana >= ativos.length * 0.6 ? "success" : "gold"} />
        <StatCard label="Pedidos de adaptação" value={String(adaptacoes.length)} hint="aguardando resposta" tone={adaptacoes.length ? "gold" : "neutral"} />
        <StatCard label="Pendentes / pausados" value={`${m.pendentes} / ${m.pausados}`} hint="cadastro ou acesso" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Precisa de atenção</span>
              <span className="text-xs font-normal text-fg-subtle">evidência · janela · ação</span>
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {alertas.length === 0 ? (
              <p className="text-sm text-fg-subtle text-center py-8">Nenhum alerta. Todos os alunos ativos estão dentro do esperado.</p>
            ) : (
              <ul className="divide-y divide-border">
                {alertas.slice(0, 12).map((al, i) => (
                  <li key={`${al.alunoId}-${al.tipo}-${i}`} className="px-5 py-3 flex items-start gap-3">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${al.prioridade === 1 ? "bg-red" : al.prioridade === 2 ? "bg-warning" : "bg-fg-subtle"}`} aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {al.alunoNome}: <span className="font-normal">{al.evidencia}</span>
                      </p>
                      <p className="text-xs text-fg-subtle">
                        {al.janela} · {al.acao}
                      </p>
                    </div>
                    <Link href={al.tipo === "sem_plano" ? `/treinador/alunos/${al.alunoId}/treinos` : `/treinador/alunos/${al.alunoId}`} className="alvo text-xs text-accent underline-offset-2 hover:underline shrink-0">
                      {al.tipo === "sem_plano" ? "Montar" : al.tipo === "adaptacao" ? "Responder" : "Abrir"}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treinos recentes</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {recentes.length === 0 ? (
              <p className="text-sm text-fg-subtle text-center py-8">Nenhuma sessão registrada ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentes.map(({ aluno, ultima, r7 }) => (
                  <li key={aluno.id} className="px-5 py-3 flex items-center gap-3">
                    <Avatar nome={aluno.profile?.nome ?? "?"} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/treinador/alunos/${aluno.id}`} className="block min-h-6 truncate text-sm font-semibold hover:text-accent">
                          {aluno.profile?.nome}
                        </Link>
                        <AlunoStatusPill status={aluno.status} />
                      </div>
                      <p className="text-xs text-fg-subtle mt-0.5">
                        {ultima!.letra ? `Treino ${ultima!.letra}` : "Sessão"} {tempoRelativo(ultima!.finalizado_em ?? ultima!.iniciado_em)} · {ultima!.series_concluidas}/{ultima!.series_planejadas} séries · semana: {r7.sessoesFeitas}/{r7.sessoesPlanejadas || "—"}
                        {ultima!.feedback_percepcao === "dor" ? <span className="text-warning"> · relatou dor</span> : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {adaptacoes.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos de adaptação em aberto</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {adaptacoes.slice(0, 8).map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {a.aluno_nome ?? "Aluno"} · {a.exercicio_nome ?? "exercício"}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {a.motivo.replace("_", " ")} · {dataBR(a.created_at)}
                      {a.descricao ? ` · “${a.descricao}”` : ""}
                    </p>
                  </div>
                  <Link href={`/treinador/alunos/${a.aluno_id}#adaptacoes`} className="alvo text-xs text-accent underline-offset-2 hover:underline">
                    Responder
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
