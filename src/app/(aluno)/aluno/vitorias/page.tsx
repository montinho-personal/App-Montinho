// Pequena vitória da semana: o dado de origem, a comparação e a explicação —
// e o histórico das últimas semanas. Sem evidência, nada é inventado.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { vitoriasDoAluno } from "@/lib/data/evolucao";
import { VITORIA_NEUTRA } from "@/lib/evolucao/vitoria";
import { Card, CardBody } from "@/components/ui/Card";
import { PreferenciasEvolucao } from "@/components/evolucao/PreferenciasEvolucao";

export const metadata = { title: "Pequenas vitórias" };
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default async function VitoriasPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const { atual, historico } = await vitoriasDoAluno(aluno);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Sua evolução da semana</h1>
        <Link href="/aluno/evolucao" className="alvo text-sm text-fg-muted hover:text-fg">Evolução →</Link>
      </div>
      <Card className="border-accent/40">
        <CardBody className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Sua pequena vitória da semana</p>
          {atual ? (
            <>
              <p className="text-lg font-bold leading-tight">{atual.titulo}</p>
              <p className="text-sm">{atual.mensagem}</p>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">De onde vem</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-fg-muted">{atual.dados.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Por que isso é importante?</p>
                <p className="mt-1 text-sm text-fg-muted">{atual.porQue}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-fg-muted">{VITORIA_NEUTRA}</p>
          )}
          <p className="text-[11px] text-fg-subtle">Calculada só a partir dos seus registros dos últimos 7 dias. Dias sem recorde são normais: semanas de manutenção e recuperação também fazem parte do plano.</p>
        </CardBody>
      </Card>

      <section className="space-y-2" aria-labelledby="hist-vit">
        <h2 id="hist-vit" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Semanas anteriores</h2>
        <ol className="space-y-2">
          {historico.map((h) => (
            <li key={h.semana} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <p className="text-[11px] text-fg-subtle">Semana de {dm(h.semana)}</p>
              {h.vitoria ? <p><span className="font-semibold">{h.vitoria.titulo}:</span> <span className="text-fg-muted">{h.vitoria.mensagem}</span></p> : <p className="text-fg-subtle">Sem destaque nesta semana — tudo bem, nem toda semana precisa de um.</p>}
            </li>
          ))}
        </ol>
      </section>

      <PreferenciasEvolucao />
    </div>
  );
}
