// Evoluções dos alunos: descobertas recentes e confiáveis, com a evidência,
// para o personal reconhecer. Não recomenda aumentar carga/volume/frequência.
import Link from "next/link";
import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";
import { listSessoes } from "@/lib/data/sessoes";
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { getConfigEvolucao } from "@/lib/data/evolucao";
import { painelDoAluno } from "@/lib/evolucao/painel";
import { dataLocal } from "@/lib/aderencia/calcular";
import { ConfigEvolucaoAluno } from "./ConfigEvolucaoAluno";

export const metadata = { title: "Evoluções dos alunos" };
export const dynamic = "force-dynamic";
const kg = (n: number) => `${String(n).replace(".", ",")} kg`;
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default async function EvolucoesPage() {
  await requireTreinadorPage();
  const hoje = dataLocal(new Date());
  const ativos = (await listAlunos()).filter((a) => a.status === "ativo").slice(0, 40);
  const ader = ativos.length ? await aderenciaDeTodos(ativos) : {};
  const linhas = await Promise.all(
    ativos.map(async (a) => {
      const [sessoes, config] = await Promise.all([listSessoes(a.id, { limite: 200, status: "todas" }), getConfigEvolucao(a.id)]);
      return { aluno: a, config, ...painelDoAluno(sessoes, ader[a.id], hoje) };
    }),
  );
  linhas.sort((x, y) => y.descobertas.length - x.descobertas.length || (y.tendencia ?? 0) - (x.tendencia ?? 0));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Montinho Evolução Inteligente</p>
        <h1 className="text-2xl font-bold">Evoluções dos alunos</h1>
        <p className="mt-1 text-sm text-fg-muted">Últimos 14 dias. Só comparações confiáveis (mesmo exercício, mesmo tipo de série, sem dor relatada). Ausência de recorde não é ausência de evolução — e nada aqui é recomendação de aumentar carga, volume ou frequência.</p>
      </header>
      <ul className="space-y-3">
        {linhas.map((l) => {
          const nome = l.aluno.profile?.nome ?? "Aluno";
          const msg = l.descobertas[0] ? `Vi sua evolução no ${l.descobertas[0].exercicio}: ${kg(l.descobertas[0].atual.carga)} × ${l.descobertas[0].atual.reps}. Continue assim!` : "";
          return (
            <li key={l.aluno.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/treinador/alunos/${l.aluno.id}`} className="font-bold hover:text-accent">{nome}</Link>
                <span className="text-xs text-fg-muted">
                  Aderência 4 sem: <span className="font-mono text-fg">{l.aderencia28 != null ? `${l.aderencia28}%` : "—"}</span>
                  {l.tendencia != null ? <span className={`ml-1 font-mono ${l.tendencia > 0 ? "text-success" : l.tendencia < 0 ? "text-warning" : ""}`}>({l.tendencia > 0 ? "+" : ""}{l.tendencia})</span> : null}
                  {" · "}{l.sessoes14} treino(s) em 14 dias
                </span>
              </div>
              {l.descobertas.length ? (
                <ul className="space-y-1 text-sm">
                  {l.descobertas.slice(0, 5).map((d, i) => (
                    <li key={`${d.sessaoId}-${i}`} className="rounded-lg bg-surface px-3 py-2">
                      <p><span className="font-semibold">{d.exercicio}</span> · <span className="text-accent">{d.titulo.replace("!", "")}</span> <span className="text-[11px] text-fg-subtle">{dm(d.dia)}</span></p>
                      <p className="text-xs text-fg-muted">{d.anterior ? `Antes: ${kg(d.anterior.carga)} × ${d.anterior.reps} (${dm(d.anterior.data.slice(0, 10))}) → ` : d.media ? `Média de ${d.media.sessoes} sessões: ${String(d.media.reps).replace(".", ",")} reps → ` : ""}Hoje: {kg(d.atual.carga)} × {d.atual.reps}</p>
                      <p className="text-[11px] text-fg-subtle">{d.criterio}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-subtle">{l.dadosInsuficientes ? "Dados insuficientes para comparar (menos de 2 treinos com carga e repetições em 28 dias)." : "Sem destaque de desempenho no período — manutenção também faz parte do plano."}</p>
              )}
              {l.revisar.length ? <p className="text-xs text-warning">Merece um olhar: {l.revisar.join(" ")}</p> : null}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Link href={`/treinador/conquistas?aluno=${l.aluno.id}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`} className="alvo font-semibold text-accent underline-offset-2 hover:underline">Enviar reconhecimento</Link>
                <Link href={`/treinador/alunos/${l.aluno.id}/jornada`} className="alvo text-fg-muted underline-offset-2 hover:underline">Jornada</Link>
                <ConfigEvolucaoAluno alunoId={l.aluno.id} inicial={l.config} />
              </div>
            </li>
          );
        })}
      </ul>
      {!linhas.length ? <p className="text-sm text-fg-muted">Nenhum aluno ativo.</p> : null}
    </div>
  );
}
