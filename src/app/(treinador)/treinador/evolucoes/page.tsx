// Evoluções dos alunos: descobertas recentes e confiáveis, com a evidência,
// para o personal reconhecer. Não recomenda aumentar carga/volume/frequência.
import Link from "next/link";
import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";
import { listSessoes } from "@/lib/data/sessoes";
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { getConfigEvolucao } from "@/lib/data/evolucao";
import { painelDoAluno } from "@/lib/evolucao/painel";
import { antesDepois, diaMes, ehRecorde, ganho, kgBR, mensagemParabens, ROTULO_TIPO } from "@/lib/evolucao/painel-tela";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { ConfigEvolucaoAluno } from "./ConfigEvolucaoAluno";

export const metadata = { title: "Evoluções dos alunos" };
export const dynamic = "force-dynamic";

const PERIODOS = [7, 14] as const;
const MAX_LINHAS = 5;
const ABERTOS = 3;

type Busca = Promise<{ dias?: string; ver?: string }>;

export default async function EvolucoesPage({ searchParams }: { searchParams: Busca }) {
  await requireTreinadorPage();
  const sp = await searchParams;
  const dias = sp.dias === "7" ? 7 : 14;
  const soCom = sp.ver === "com";
  const hoje = dataLocal(new Date());
  const ontem = somarDias(hoje, -1);
  const quando = (d: string) => (d === hoje ? "Hoje" : d === ontem ? "Ontem" : diaMes(d));

  const ativos = (await listAlunos()).filter((a) => a.status === "ativo").slice(0, 40);
  const ader = ativos.length ? await aderenciaDeTodos(ativos) : {};
  const todas = await Promise.all(
    ativos.map(async (a) => {
      const [sessoes, config] = await Promise.all([listSessoes(a.id, { limite: 200, status: "todas" }), getConfigEvolucao(a.id)]);
      return { aluno: a, config, ...painelDoAluno(sessoes, ader[a.id], hoje, dias) };
    }),
  );
  todas.sort((x, y) => y.descobertas.length - x.descobertas.length || (y.tendencia ?? 0) - (x.tendencia ?? 0));

  const comEvolucao = todas.filter((l) => l.descobertas.length).length;
  const totalEvolucoes = todas.reduce((s, l) => s + l.descobertas.length, 0);
  const marcas = todas.reduce((s, l) => s + l.descobertas.filter(ehRecorde).length, 0);
  const olhar = todas.filter((l) => l.revisar.length).length;
  const linhas = soCom ? todas.filter((l) => l.descobertas.length) : todas;

  const url = (p: { dias?: number; ver?: string }) => {
    const q = new URLSearchParams();
    const d = p.dias ?? dias;
    const v = p.ver ?? (soCom ? "com" : "todos");
    if (d !== 14) q.set("dias", String(d));
    if (v === "com") q.set("ver", "com");
    const s = q.toString();
    return `/treinador/evolucoes${s ? `?${s}` : ""}`;
  };
  const chip = (ativo: boolean) => `alvo rounded-full border px-3 py-1 text-xs font-semibold ${ativo ? "border-accent bg-accent text-bg" : "border-border text-fg-muted hover:text-fg"}`;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Montinho Evolução Inteligente</p>
        <h1 className="text-2xl font-bold">Evoluções dos alunos</h1>
        <p className="mt-1 text-sm text-fg-muted">Quem evoluiu nos últimos {dias} dias — e um toque para parabenizar.</p>
      </header>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Numero valor={`${comEvolucao} de ${todas.length}`} rotulo="alunos com evolução" />
        <Numero valor={String(totalEvolucoes)} rotulo={totalEvolucoes === 1 ? "evolução no período" : "evoluções no período"} />
        <Numero valor={String(marcas)} rotulo={marcas === 1 ? "🏆 marca pessoal" : "🏆 marcas pessoais"} />
        <Numero valor={String(olhar)} rotulo="⚠️ merecem um olhar" destaque={olhar > 0} />
      </section>

      <nav aria-label="Filtros" className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <Link key={p} href={url({ dias: p })} className={chip(dias === p)} aria-current={dias === p ? "page" : undefined}>{p} dias</Link>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <Link href={url({ ver: "todos" })} className={chip(!soCom)}>Todos</Link>
        <Link href={url({ ver: "com" })} className={chip(soCom)}>Só com evolução</Link>
      </nav>

      <details className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-fg-muted">
        <summary className="cursor-pointer text-sm font-semibold text-fg">ℹ️ Como funciona</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Só entram comparações confiáveis: mesmo exercício, mesmo tipo de série e treino sem dor relatada.</li>
          <li>A comparação é com a última sessão comparável (ou com a média recente). Toque numa evolução para ver o critério.</li>
          <li>Ausência de recorde não é ausência de evolução — manutenção também faz parte do plano.</li>
          <li>Nada aqui é recomendação de aumentar carga, volume ou frequência.</li>
        </ul>
      </details>

      <ul className="space-y-3">
        {linhas.map((l, idx) => {
          const nome = l.aluno.profile?.nome ?? "Aluno";
          const n = l.descobertas.length;
          const primeira = l.descobertas[0];
          const msg = primeira ? `Vi sua evolução no ${primeira.exercicio}: ${kgBR(primeira.atual.carga)} × ${primeira.atual.reps}. Continue assim!` : "";
          const zap = linkWhatsApp(l.aluno.telefone, mensagemParabens(nome, l.descobertas));
          const aberto = n > 0 && idx < ABERTOS;
          return (
            <li key={l.aluno.id}>
              <details open={aberto} className="group rounded-xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{nome}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      Aderência (4 sem.): <span className="font-mono font-semibold text-fg">{l.aderencia28 != null ? `${l.aderencia28}%` : "—"}</span>
                      {l.tendencia != null && l.tendencia !== 0 ? (
                        <span className={`ml-1 font-mono ${l.tendencia > 0 ? "text-success" : "text-warning"}`}>{l.tendencia > 0 ? "▲ +" : "▼ "}{l.tendencia}</span>
                      ) : null}
                      {" · "}{l.sessoes14} {l.sessoes14 === 1 ? "treino" : "treinos"} em {dias} dias
                    </p>
                  </div>
                  {n ? (
                    <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">📈 {n}</span>
                  ) : l.revisar.length ? (
                    <span className="shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">⚠️</span>
                  ) : null}
                  <span className="shrink-0 text-fg-subtle transition-transform group-open:rotate-180" aria-hidden>▾</span>
                </summary>

                <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                  {n ? (
                    <ul className="space-y-1.5">
                      {l.descobertas.slice(0, MAX_LINHAS).map((d, i) => {
                        const g = ganho(d);
                        return (
                          <li key={`${d.sessaoId}-${i}`}>
                            <details className="rounded-lg bg-surface px-3 py-2">
                              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className="min-w-0 truncate text-sm font-semibold">{d.exercicio}</p>
                                  <span className="shrink-0 text-[11px] text-fg-subtle">{quando(d.dia)}</span>
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-mono text-xs text-fg-muted">{antesDepois(d)}</span>
                                  {g ? <span className="rounded bg-success/15 px-1.5 py-0.5 text-[11px] font-bold text-success">{g}</span> : null}
                                  <span className={`text-[11px] ${ehRecorde(d) ? "font-semibold text-accent" : "text-fg-subtle"}`}>{ROTULO_TIPO[d.tipo]}</span>
                                </div>
                              </summary>
                              <p className="mt-1.5 text-[11px] text-fg-subtle">
                                {d.anterior ? `Comparado com ${diaMes(d.anterior.data.slice(0, 10))}. ` : d.media ? `Média de ${d.media.sessoes} sessões. ` : ""}
                                {d.criterio}
                              </p>
                            </details>
                          </li>
                        );
                      })}
                      {n > MAX_LINHAS ? (
                        <li className="text-xs text-fg-muted">
                          + {n - MAX_LINHAS} {n - MAX_LINHAS === 1 ? "outra evolução" : "outras evoluções"} ·{" "}
                          <Link href={`/relatorio/${l.aluno.id}`} className="alvo font-semibold text-accent underline-offset-2 hover:underline">ver no relatório</Link>
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="text-sm text-fg-subtle">{l.dadosInsuficientes ? "Dados insuficientes para comparar (menos de 2 treinos com carga e repetições em 28 dias)." : "Sem destaque de desempenho no período — manutenção também faz parte do plano."}</p>
                  )}

                  {l.revisar.length ? <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">⚠️ Merece um olhar: {l.revisar.join(" ")}</p> : null}

                  <div className="flex flex-wrap gap-2">
                    <a href={zap} target="_blank" rel="noopener noreferrer" className="alvo rounded-lg bg-success px-3 py-2 text-sm font-bold text-bg">
                      {n ? "💬 Parabenizar no WhatsApp" : "💬 Incentivar no WhatsApp"}
                    </a>
                    <Link href={`/treinador/alunos/${l.aluno.id}`} className="alvo rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:text-accent">👤 Ficha</Link>
                    <Link href={`/relatorio/${l.aluno.id}`} className="alvo rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:text-accent">📄 Relatório</Link>
                  </div>
                  {!l.aluno.telefone ? <p className="text-[11px] text-fg-subtle">Sem WhatsApp na ficha: o WhatsApp vai pedir o contato.</p> : null}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                    <Link href={`/treinador/conquistas?aluno=${l.aluno.id}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`} className="alvo font-semibold text-accent underline-offset-2 hover:underline">Enviar reconhecimento no app</Link>
                    <Link href={`/treinador/alunos/${l.aluno.id}/jornada`} className="alvo text-fg-muted underline-offset-2 hover:underline">Jornada</Link>
                    <ConfigEvolucaoAluno alunoId={l.aluno.id} inicial={l.config} />
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {!todas.length ? <p className="text-sm text-fg-muted">Nenhum aluno ativo.</p> : null}
      {todas.length && !linhas.length ? (
        <p className="text-sm text-fg-muted">
          Nenhum aluno com evolução nos últimos {dias} dias. <Link href={url({ ver: "todos" })} className="font-semibold text-accent underline-offset-2 hover:underline">Ver todos</Link>
        </p>
      ) : null}
    </div>
  );
}

function Numero({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card px-3 py-2 ${destaque ? "border-warning/50" : "border-border"}`}>
      <p className={`font-mono text-xl font-bold ${destaque ? "text-warning" : ""}`}>{valor}</p>
      <p className="text-[11px] leading-tight text-fg-muted">{rotulo}</p>
    </div>
  );
}
