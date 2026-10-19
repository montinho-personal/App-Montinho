import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { SimpleBars } from "@/components/ui/SimpleChart";
import { Avatar } from "@/components/ui/Avatar";
import { AlunoStatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { listAlunos, getDashboardMetrics } from "@/lib/db";
import { tempoRelativo, dataBR, diasAte } from "@/lib/format";

export default async function TreinadorDashboardPage() {
  const [m, alunos] = await Promise.all([
    getDashboardMetrics(),
    listAlunos(),
  ]);
  const agora = new Date();
  const agoraMs = agora.getTime();
  const hojeLabel = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const alunosOrdenados = alunos
    .slice()
    .sort((a, b) => {
      const aMs = a.ultimo_treino_em ? new Date(a.ultimo_treino_em).getTime() : 0;
      const bMs = b.ultimo_treino_em ? new Date(b.ultimo_treino_em).getTime() : 0;
      return bMs - aMs;
    });

  const inativos = alunos.filter((a) => {
    if (a.status !== "ativo" || !a.ultimo_treino_em) return false;
    const dias = (agoraMs - new Date(a.ultimo_treino_em).getTime()) / (1000 * 60 * 60 * 24);
    return dias > 5;
  });

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const treinosSemana = diasSemana.map((label) => ({ label, value: 0 }));
  for (const aluno of alunos) {
    if (!aluno.ultimo_treino_em) continue;
    const data = new Date(aluno.ultimo_treino_em);
    const diff = (agoraMs - data.getTime()) / (1000 * 60 * 60 * 24);
    if (diff >= 0 && diff <= 7) treinosSemana[data.getDay()].value += 1;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <Badge tone="accent">Visão Geral</Badge>
          <h1 className="text-3xl font-bold mt-3">Olá, Pedro</h1>
          <p className="text-fg-muted text-sm mt-1">
            Seu squad em um relance — {hojeLabel}
          </p>
        </div>
        <Link href="/treinador/alunos">
          <Button variant="primary">+ Novo aluno</Button>
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Alunos ativos"
          value={String(m.ativos)}
          hint={`de ${m.total_alunos} no total`}
          tone="success"
          trend={{ value: "+2 este mês", direction: "up" }}
        />
        <StatCard
          label="Pendentes"
          value={String(m.pendentes)}
          hint="aguardando ativação"
          tone="gold"
        />
        <StatCard
          label="Inativos"
          value={String(m.inadimplentes)}
          hint="acesso expirado"
          tone={m.inadimplentes > 0 ? "red" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos treinos registrados por dia</CardTitle>
        </CardHeader>
        <CardBody>
          <SimpleBars data={treinosSemana} height={160} tone="accent" />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Alunos inativos {">"} 5 dias</span>
              {inativos.length > 0 ? (
                <Badge tone="red">{inativos.length}</Badge>
              ) : (
                <Badge tone="success">tudo em dia</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {inativos.length === 0 ? (
              <p className="text-sm text-fg-subtle text-center py-6">
                Todos os alunos treinaram recentemente.
              </p>
            ) : (
              <ul className="space-y-3">
                {inativos.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <Avatar nome={a.profile?.nome ?? "?"} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{a.profile?.nome}</div>
                      <div className="text-xs text-fg-subtle">
                        último treino {tempoRelativo(a.ultimo_treino_em)}
                      </div>
                    </div>
                    <Link href={`/treinador/alunos/${a.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade recente dos alunos</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3">
              {alunosOrdenados.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <Avatar nome={a.profile?.nome ?? "?"} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{a.profile?.nome}</span>
                      <AlunoStatusPill status={a.status} />
                    </div>
                    <div className="text-xs text-fg-subtle mt-0.5">
                      treinou {tempoRelativo(a.ultimo_treino_em)} · acesso até {dataBR(a.acesso_ate)}{" "}
                      {diasAte(a.acesso_ate) !== null && diasAte(a.acesso_ate)! >= 0 && (
                        <span className="text-fg-muted">({diasAte(a.acesso_ate)}d)</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
