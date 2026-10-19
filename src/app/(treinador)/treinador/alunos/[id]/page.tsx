import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { AlunoStatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";
import { SimpleLine } from "@/components/ui/SimpleChart";
import {
  getAluno,
  listTreinos,
  listExerciciosByTreino,
  listDieta,
  listEvolucao,
  listTemplates,
  listFotos,
  listCheckIns,
} from "@/lib/db";
import { dataBR, diasAte } from "@/lib/format";
import { AtribuirTreinoButton } from "./AtribuirTreinoModal";
import { ComparadorFotos } from "./ComparadorFotos";
import { ComparadorMedidas } from "./ComparadorMedidas";
import { PainelCheckins } from "./PainelCheckins";
import { CalculoDietaCard } from "./CalculoDietaCard";

type PageProps = { params: Promise<{ id: string }> };

export default async function AlunoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();

  const [treinos, dieta, evolucao, templates, fotos, checkIns] =
    await Promise.all([
      listTreinos(id),
      listDieta(id),
      listEvolucao(id),
      listTemplates(),
      listFotos(id),
      listCheckIns(id, 90),
    ]);

  // Exercícios de todos os treinos (pra mostrar contagem)
  const exerciciosPorTreino = await Promise.all(
    treinos.map(async (t) => ({ treino: t, exercicios: await listExerciciosByTreino(t.id) }))
  );

  const dias = diasAte(aluno.acesso_ate);
  const ultimoPeso = evolucao.at(-1)?.peso_kg ?? null;

  return (
    <div className="space-y-6">
      <Link href="/treinador/alunos" className="text-fg-muted text-sm hover:text-fg flex items-center gap-1">
        ← Voltar para alunos
      </Link>

      {/* Header do aluno */}
      <Card className="bg-grain-strong border-accent/20">
        <CardBody className="flex flex-col md:flex-row gap-6">
          <Avatar nome={aluno.profile?.nome ?? "?"} size={88} className="text-2xl" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{aluno.profile?.nome}</h1>
              <AlunoStatusPill status={aluno.status} />
            </div>
            <p className="text-sm text-fg-muted mt-2">{aluno.objetivo}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <Field label="Telefone" value={aluno.telefone ?? "—"} />
              <Field label="Altura" value={aluno.altura_cm ? `${aluno.altura_cm}cm` : "—"} />
              <Field label="Início" value={dataBR(aluno.data_inicio)} />
              <Field
                label="Acesso até"
                value={dataBR(aluno.acesso_ate)}
                hint={
                  dias !== null
                    ? dias < 0
                      ? `vencido há ${Math.abs(dias)}d`
                      : `${dias}d restantes`
                    : undefined
                }
                tone={dias !== null && dias < 0 ? "red" : dias !== null && dias <= 7 ? "gold" : "neutral"}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 self-start">
            <Button variant="secondary" size="sm">Editar dados</Button>
            <Button variant="ghost" size="sm">Pausar acesso</Button>
          </div>
        </CardBody>
      </Card>

      {aluno.observacoes ? (
        <Card className="border-gold/20 bg-gold/5">
          <CardBody>
            <div className="flex gap-3">
              <span className="text-gold text-xl">⚠</span>
              <div>
                <div className="text-xs font-bold text-gold uppercase tracking-wider mb-1">
                  Observação clínica
                </div>
                <div className="text-sm">{aluno.observacoes}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Tabs
        tabs={[
          {
            key: "treinos",
            label: `Treinos (${treinos.length})`,
            content: (
              <div className="space-y-3">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/treinador/alunos/${id}/treinos`}
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-[12.5px] font-bold text-white hover:bg-accent-hover transition-colors"
                  >
                    ▦ Montador A–E (todos numa página)
                  </Link>
                  <AtribuirTreinoButton alunoId={id} templates={templates} />
                </div>
                {exerciciosPorTreino.map(({ treino, exercicios }) => (
                  <Link key={treino.id} href={`/treinador/alunos/${id}/treinos/${treino.id}`}>
                    <Card className="hover:border-accent/40 transition-colors">
                      <CardBody className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                          <span className="text-2xl font-black text-accent">{treino.letra}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold">{treino.nome}</div>
                          <div className="text-xs text-fg-subtle mt-0.5">
                            {exercicios.length} exercícios
                            {treino.observacoes ? ` · ${treino.observacoes}` : ""}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Editar</Button>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            ),
          },
          {
            key: "dieta",
            label: `Dieta (${dieta.length})`,
            content: (
              <div className="space-y-3">
                <CalculoDietaCard alunoId={id} pesoInicial={ultimoPeso} />
                {dieta.map((d) => (
                  <Card key={d.id}>
                    <CardBody>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold">{d.refeicao}</div>
                          {d.horario ? (
                            <div className="text-xs text-fg-subtle">{d.horario}</div>
                          ) : null}
                        </div>
                        <Button variant="ghost" size="sm">Editar</Button>
                      </div>
                      <ul className="text-sm space-y-1 text-fg-muted">
                        {d.alimentos.map((a, i) => (
                          <li key={i}>
                            <span className="text-fg">{a.nome}</span>
                            <span className="text-fg-subtle"> — {a.quantidade}</span>
                          </li>
                        ))}
                      </ul>
                      {d.substituicoes.length > 0 ? (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-[10px] uppercase tracking-wider text-accent font-bold mb-1">
                            Substituições
                          </div>
                          <ul className="text-xs space-y-0.5 text-fg-subtle">
                            {d.substituicoes.map((s, i) => (
                              <li key={i}>↔ {s.nome} ({s.quantidade})</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            key: "evolucao",
            label: "Evolução",
            content: (
              <div className="space-y-4">
                <ComparadorMedidas evolucao={evolucao as never} />
                {evolucao.length >= 2 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Peso</CardTitle>
                    </CardHeader>
                    <CardBody className="flex flex-col items-center">
                      <SimpleLine
                        data={evolucao.map((e) => e.peso_kg ?? 0)}
                        height={140}
                        width={320}
                        tone="accent"
                      />
                      <div className="flex gap-6 mt-4 text-xs text-fg-subtle">
                        {evolucao.map((e) => (
                          <div key={e.id}>
                            <div className="text-fg font-mono font-bold">{e.peso_kg}kg</div>
                            <div>{dataBR(e.data)}</div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                ) : null}
                <Card>
                  <CardHeader>
                    <CardTitle>Registros</CardTitle>
                  </CardHeader>
                  <CardBody className="p-0">
                    <ul className="divide-y divide-border">
                      {evolucao.map((e) => (
                        <li key={e.id} className="px-6 py-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold">{dataBR(e.data)}</span>
                            <span className="text-sm font-mono">{e.peso_kg}kg · {e.gordura_pct}%</span>
                          </div>
                          <div className="text-xs text-fg-subtle">
                            Cintura {e.cintura_cm}cm · Quadril {e.quadril_cm}cm · Braço {e.braco_cm}cm · Coxa {e.coxa_cm}cm
                          </div>
                          {e.observacoes ? (
                            <div className="text-xs text-fg-muted mt-1 italic">{e.observacoes}</div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              </div>
            ),
          },
          {
            key: "fotos",
            label: `Fotos (${fotos.length})`,
            content: <ComparadorFotos fotos={fotos as never} />,
          },
          {
            key: "checkins",
            label: "Check-ins",
            content: <PainelCheckins checkIns={checkIns as never} dias={30} />,
          },
        ]}
      />
    </div>
  );
}

function Field({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "red" | "gold";
}) {
  const hintColor = tone === "red" ? "text-red" : tone === "gold" ? "text-gold" : "text-fg-subtle";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">{label}</div>
      <div className="text-sm font-semibold mt-1">{value}</div>
      {hint ? <div className={`text-[10px] mt-0.5 ${hintColor}`}>{hint}</div> : null}
    </div>
  );
}
