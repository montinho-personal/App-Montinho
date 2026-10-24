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
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { salvarDesempate } from "@/lib/data/ranking";
import { SemanasBarras, type SemanaBarra } from "@/components/graficos/SemanasBarras";
import { AnelPercentual } from "@/components/graficos/AnelPercentual";
import { AcessosDoDia } from "@/components/painel/AcessosDoDia";
import { resumoDeAcessos } from "@/lib/data/acessos";
import { ExerciciosSemVideo } from "@/components/painel/ExerciciosSemVideo";
import { listarSemVideo } from "@/lib/data/sem-video";

export const metadata = { title: "Visão geral" };

export default async function TreinadorDashboardPage() {
  const sessao = await requireTreinadorPage();
  const [m, alunos, adaptacoes, acessos, semVideo] = await Promise.all([getDashboardMetrics(), listAlunos(), listAdaptacoes(undefined, true), resumoDeAcessos().catch(() => null), listarSemVideo().catch(() => [])]);
  const hojeLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  // Dados por aluno ativo (limitado para manter o painel rápido)
  const ativos = alunos.filter((a) => a.status === "ativo").slice(0, 40);
  const aderencias = ativos.length ? await aderenciaDeTodos(ativos) : {};
  // Desempate do ranking (0079): aproveita a conta da aderência já feita aqui.
  await salvarDesempate(aderencias).catch(() => undefined);
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
        aderencia: aderencias[a.id] ?? null,
      });
      const r7 = resumoPeriodo(sessoes, plano.programa?.frequencia, 7);
      const ultima = sessoes[0] ?? null;
      return { aluno: a, alertas, r7, ultima };
    })
  );
  // Consistência da turma: soma dos treinos válidos ÷ soma das metas, semana a semana.
  const porSemana = new Map<string, { inicio: string; pontos: number; meta: number; atual: boolean; alunos: number; cumpriram: number }>();
  for (const r of Object.values(aderencias)) {
    for (const w of r.semanas.slice(-8)) {
      if (!w.meta || w.pausada) continue;
      const x = porSemana.get(w.inicio) ?? { inicio: w.inicio, pontos: 0, meta: 0, atual: w.atual, alunos: 0, cumpriram: 0 };
      x.pontos += Math.min(w.pontos, w.meta);
      x.meta += w.meta;
      x.alunos += 1;
      if (w.pontos >= w.meta) x.cumpriram += 1;
      porSemana.set(w.inicio, x);
    }
  }
  const turma = [...porSemana.values()].sort((a, b) => (a.inicio < b.inicio ? -1 : 1)).slice(-8);
  const turmaBarras: Array<SemanaBarra & { alunos: number; cumpriram: number }> = turma.map((w) => ({ inicio: w.inicio, meta: 100, pontos: Math.round((w.pontos / w.meta) * 100), pausada: false, atual: w.atual, status: "parcial", alunos: w.alunos, cumpriram: w.cumpriram }));
  const fechadas = turma.filter((w) => !w.atual).slice(-4);
  const turma4 = fechadas.length ? Math.round((fechadas.reduce((a, w) => a + w.pontos, 0) / fechadas.reduce((a, w) => a + w.meta, 0)) * 100) : null;
  const semanaTurma = turma.find((w) => w.atual) ?? null;
  const dicaTurma = (b: SemanaBarra) => {
    const w = turmaBarras.find((x) => x.inicio === b.inicio);
    return `${b.atual ? "Esta semana" : `Semana de ${dataBR(b.inicio).slice(0, 5)}`}: ${b.pontos}% dos treinos previstos · ${w?.cumpriram ?? 0} de ${w?.alunos ?? 0} alunos com a meta cumprida`;
  };

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

      {acessos ? <AcessosDoDia r={acessos} /> : null}

      <ExerciciosSemVideo lista={semVideo} />

      {turmaBarras.length >= 2 ? (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3">
              <AnelPercentual valor={turma4} rotulo="Aderência da turma nas últimas 4 semanas" tamanho={64} espessura={7} />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">Consistência da turma</p>
                <p className="text-sm text-fg-muted">últimas 4 semanas fechadas</p>
                {semanaTurma ? <p className="mt-0.5 text-sm"><span className="font-semibold">{semanaTurma.cumpriram} de {semanaTurma.alunos}</span> já cumpriram a meta desta semana</p> : null}
              </div>
            </div>
            <div className="min-w-[220px] flex-1">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-fg-subtle">Treinos feitos ÷ previstos, por semana</p>
              <SemanasBarras semanas={turmaBarras} quantidade={8} altura={56} textoDica={dicaTurma} />
            </div>
            <Link href="/treinador/aderencia" className="alvo text-sm text-accent underline-offset-2 hover:underline">Central de aderência →</Link>
          </CardBody>
        </Card>
      ) : null}

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
                    <Avatar nome={aluno.profile?.nome ?? "?"} url={aluno.profile?.avatar_url} size={36} />
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
                    {aderencias[aluno.id] ? <SemanasBarras semanas={aderencias[aluno.id].semanas} compacto altura={24} className="hidden w-20 shrink-0 sm:block" /> : null}
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
