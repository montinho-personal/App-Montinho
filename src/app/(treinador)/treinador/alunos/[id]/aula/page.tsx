import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { getSessaoEmAndamento, listSessoes } from "@/lib/data/sessoes";
import { Card, CardBody } from "@/components/ui/Card";
import { dataBR } from "@/lib/format";

export const metadata = { title: "Aula presencial" };

/** Modo aula presencial: o personal escolhe o treino do dia e registra a aula pelo painel. */
export default async function AulaPresencialPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTreinadorPage();
  const { id } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const nome = aluno.profile?.nome ?? "Aluno";
  const [plano, emAndamento, recentes] = await Promise.all([getPlanoAtivo(id), getSessaoEmAndamento(id), listSessoes(id, { limite: 10, status: "concluida" })]);
  const ultimaPorTreino = new Map<string, string>();
  for (const s of recentes) if (s.treino_id && !ultimaPorTreino.has(s.treino_id)) ultimaPorTreino.set(s.treino_id, s.finalizado_em ?? s.iniciado_em);
  // Sugestão: o treino feito há mais tempo (ou nunca feito).
  const sugerido = [...plano.treinos].sort((a, b) => (ultimaPorTreino.get(a.id) ?? "").localeCompare(ultimaPorTreino.get(b.id) ?? ""))[0]?.id;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href={`/treinador/alunos/${id}`} className="alvo inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        ← {nome}
      </Link>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">👥 Aula presencial</p>
        <h1 className="text-2xl font-bold">Qual treino hoje?</h1>
        <p className="text-sm text-fg-muted">Você marca peso e repetições de {nome.split(" ")[0]} pelo seu celular. Tudo entra no histórico, no volume da semana e na evolução dela(e).</p>
      </div>
      {emAndamento ? (
        <Link href={`/treinador/alunos/${id}/aula/${emAndamento.treino_id}?sessao=${emAndamento.id}`} className="block rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <span className="font-semibold">Treino em andamento: {emAndamento.nome_treino}</span>
          <span className="block text-xs text-fg-muted">Toque para continuar de onde parou.</span>
        </Link>
      ) : null}
      {plano.treinos.length ? (
        <ul className="space-y-2">
          {plano.treinos.map((t) => (
            <li key={t.id}>
              <Link href={`/treinador/alunos/${id}/aula/${t.id}`} className={`touch flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:border-accent ${t.id === sugerido ? "border-accent/60" : "border-border"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-lg font-bold text-accent">{t.letra}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.nome}</span>
                  <span className="block text-xs text-fg-subtle">
                    {t.exercicios.length} exercícios · {ultimaPorTreino.get(t.id) ? `última vez ${dataBR(ultimaPorTreino.get(t.id)!)}` : "ainda não feito"}
                    {t.id === sugerido ? " · sugerido hoje" : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <CardBody className="text-sm text-fg-muted">
            {nome.split(" ")[0]} ainda não tem treinos liberados. <Link href={`/treinador/alunos/${id}/treinos`} className="text-accent underline">Montar o plano</Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
