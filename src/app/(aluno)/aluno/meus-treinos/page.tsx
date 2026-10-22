export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getPlanoAtivo } from "@/lib/data/programas";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { ArquivarTreino } from "./ArquivarTreino";

export const metadata = { title: "Meus treinos" };

export default async function MeusTreinosPage() {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  if (!ehVisitante(sessao) && !isDemoMode()) notFound();
  const plano = await getPlanoAtivo(sessao.alunoId);
  const meus = plano.treinos.filter((t) => t.ativo && t.autoria === "proprio");
  const pode = podeRegistrar("visitante", sessao.acessoFim ?? null);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Meus treinos</h1>
        <p className="text-sm text-fg-muted mt-1">Monte seus treinos com os exercícios da biblioteca do Montinho, com vídeo de execução. Você pode ter até 8 (A a H).</p>
      </header>
      {pode ? (
        <Link href="/aluno/meus-treinos/novo" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-bg">
          <Icon name="plus" size={18} /> Montar um treino
        </Link>
      ) : null}
      {meus.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="text-center py-8 text-sm text-fg-muted">Você ainda não montou nenhum treino. Comece pelo botão acima: leva uns 2 minutos.</CardBody>
        </Card>
      ) : (
        <ul className="space-y-3">
          {meus.map((t) => (
            <li key={t.id}>
              <Card>
                <CardBody className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-xl font-black text-accent" aria-hidden>
                    {t.letra}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{t.nome}</p>
                    <p className="text-xs text-fg-subtle">{t.exercicios.length} exercícios · {t.exercicios.reduce((n, e) => n + e.series, 0)} séries</p>
                  </div>
                  {pode ? (
                    <Link href={`/aluno/meus-treinos/${t.id}`} className="alvo min-h-11 rounded-lg border border-border px-3 text-sm leading-[2.6rem]">Editar</Link>
                  ) : null}
                  {pode ? <ArquivarTreino id={t.id} nome={t.nome} /> : null}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Link href="/aluno/treinar" className="alvo block text-center text-sm text-accent underline-offset-2 hover:underline">Ir para Treinar</Link>
    </div>
  );
}
