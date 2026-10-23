// ============================================================================
// Relatório Premium de Evolução de Carga — documento A4 (tela e PDF).
// Quem abre: o personal (qualquer aluno) ou o próprio aluno (só o dele),
// sempre por getSessao + podeAcessarAluno. Contas em lib/relatorios/premium.
// ============================================================================
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessao } from "@/lib/auth/session";
import { podeAcessarAluno } from "@/lib/auth/guards";
import { getAluno, listEvolucao } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { listIntervencoes } from "@/lib/data/acompanhamento";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { listarHistoricoResumo } from "@/lib/data/historico";
import { dataLocal } from "@/lib/aderencia/calcular";
import { aderenciaDaJanela } from "@/lib/relatorios/calcular";
import { evolucaoPorMusculo, evolucaoPorTreino } from "@/lib/relatorios/evolucao-geral";
import { inicioDoPeriodo, PERIODOS_PREMIUM, relatorioPremium, type ExercicioPremium, type PeriodoPremium } from "@/lib/relatorios/premium";
import { BRAND } from "@/config/brand";
import { dataBR } from "@/lib/format";
import { AntesAgora, BarrasSemanas, LinhaCarga, MiniLinha } from "@/components/relatorios/premium/Graficos";
import { BaixarPdf } from "@/components/relatorios/premium/BaixarPdf";
import type { Evolucao } from "@/lib/supabase/types";

export const metadata = { title: "Relatório de evolução", robots: { index: false } };

type Props = { params: Promise<{ alunoId: string }>; searchParams: Promise<{ periodo?: string }> };

const br = (v: number, casas = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
const sinal = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "");
const kgTxt = (v: number) => `${br(v)} kg`;
const pctTxt = (v: number | null) => (v == null ? "—" : `${sinal(v)}${br(Math.abs(v))}%`);
const FASE: Record<string, string> = { adaptacao: "Adaptação", intensificacao: "Intensificação", consolidacao: "Consolidação" };

const CSS = `
.folha{width:210mm;min-height:297mm;margin:0 auto 24px;background:#faf8f3;color:#1a1814;box-shadow:0 8px 30px rgba(0,0,0,.18);position:relative;display:flex;flex-direction:column;padding:16mm 15mm 14mm;break-after:page;page-break-after:always;overflow:hidden}
.folha.capa{background:#0a0a0a;color:#f4f1ea}
.folha .rodape{margin-top:auto;padding-top:8mm;display:flex;justify-content:space-between;font-size:8.5pt;color:#8a8273;letter-spacing:.04em}
.folha.capa .rodape{color:#8a8273}
.eyebrow{font-size:8.5pt;letter-spacing:.32em;text-transform:uppercase;color:#ba9e50;font-weight:700}
.titulo{font-size:20pt;font-weight:800;line-height:1.1;letter-spacing:-.01em}
.num{font-variant-numeric:tabular-nums}
@media screen and (max-width:820px){.folha{width:100%;min-height:auto;padding:24px 18px;margin-bottom:16px}}
@page{size:A4;margin:0}
@media print{html,body{background:#fff!important}.folha{margin:0;box-shadow:none;width:210mm;height:297mm;min-height:297mm}.so-tela{display:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

function Rodape({ n, total, nome }: { n: number; total: number; nome: string }) {
  return (
    <div className="rodape">
      <span>{BRAND.fullName} · Relatório de Evolução · {nome}</span>
      <span className="num">{n} / {total}</span>
    </div>
  );
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-lg border border-[#e4dfd3] bg-white px-4 py-3">
      <p className="text-[8pt] font-bold uppercase tracking-[0.16em] text-[#8a8273]">{rotulo}</p>
      <p className="num mt-1 text-[19pt] font-extrabold leading-none">{valor}</p>
      {detalhe ? <p className="mt-1 text-[8.5pt] text-[#8a8273]">{detalhe}</p> : null}
    </div>
  );
}

function Secao({ eyebrow, titulo, children }: { eyebrow: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="titulo mt-1">{titulo}</h2>
        <div className="mt-2 h-[2px] w-14 bg-[#ba9e50]" />
      </div>
      {children}
    </div>
  );
}

const pedaco = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export default async function RelatorioPremiumPage({ params, searchParams }: Props) {
  const { alunoId } = await params;
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?next=/relatorio/${alunoId}`);
  if (!podeAcessarAluno(sessao, alunoId)) notFound();
  const { periodo: p } = await searchParams;
  const periodo: PeriodoPremium = p === "30" || p === "90" ? p : "tudo";

  const aluno = await getAluno(alunoId);
  if (!aluno) notFound();
  const [plano, sessoes, evolucao, intervencoes, historicoResumo, aderencia] = await Promise.all([
    getPlanoAtivo(alunoId),
    listSessoes(alunoId, { limite: 1000 }),
    listEvolucao(alunoId),
    listIntervencoes(alunoId, 30),
    listarHistoricoResumo(alunoId),
    aderenciaDoAluno(aluno),
  ]);

  const hoje = dataLocal(new Date());
  const inicioAcomp = aluno.data_inicio ?? dataLocal(aluno.created_at);
  const inicio = inicioDoPeriodo(periodo, hoje, inicioAcomp);
  const r = relatorioPremium({ sessoes, resumos: historicoResumo, inicio, fim: hoje });
  const nome = aluno.profile?.nome ?? "Aluno";
  const primeiroNome = nome.split(" ")[0];
  const ehPersonal = sessao.role === "treinador";
  const voltar = ehPersonal ? `/treinador/alunos/${alunoId}#evolucao` : "/aluno/evolucao";
  const programa = plano.programa;
  const consist = periodo === "tudo" ? aderencia.indices.total : null;
  const janela = periodo === "tudo" ? null : aderenciaDaJanela(aderencia, Number(periodo));
  const aderenciaPct = consist?.pct ?? janela?.pct ?? null;
  const medidas = (evolucao as Evolucao[]).filter((e) => e.data.slice(0, 10) >= inicio).sort((a, b) => (a.data < b.data ? -1 : 1));
  const mPrim = medidas[0];
  const mUlt = medidas.length >= 2 ? medidas.at(-1) : undefined;
  const mensagem = intervencoes.find((i) => i.visivel_aluno && (i.tipo === "nota" || i.tipo === "mensagem" || i.tipo === "revisao_treino"));
  const maxDestaque = Math.max(1, ...r.destaques.map((d) => d.atual.carga));
  const top = r.exercicios.slice(0, 12);
  const porTreino = evolucaoPorTreino(sessoes, inicio, hoje);
  const porMusculo = evolucaoPorMusculo({ sessoes, inicio, fim: hoje, prioridades: plano.programa?.prioridades ?? [], grupos: r.grupos });
  const temMetades = porMusculo.some((m) => m.seriesSemanaAntes != null);

  // Paginação: capa, resumo, músculos (≈20 linhas por folha), gráficos (6 por folha), consistência, fechamento.
  const linhasGrupo: Array<{ tipo: "grupo"; g: (typeof r.grupos)[number] } | { tipo: "ex"; e: ExercicioPremium }> = [];
  for (const g of r.grupos) {
    linhasGrupo.push({ tipo: "grupo", g });
    for (const e of g.exercicios) linhasGrupo.push({ tipo: "ex", e });
  }
  // 1ª folha tem o texto de abertura: cabem menos linhas.
  // O título de um músculo nunca fica sozinho no pé da folha.
  const folhasGrupo: Array<typeof linhasGrupo> = [];
  let atualFolha: typeof linhasGrupo = [];
  for (const l of linhasGrupo) {
    const cap = folhasGrupo.length === 0 ? 15 : 18;
    if (atualFolha.length >= cap || (l.tipo === "grupo" && atualFolha.length >= cap - 1)) {
      folhasGrupo.push(atualFolha);
      atualFolha = [];
    }
    atualFolha.push(l);
  }
  if (atualFolha.length) folhasGrupo.push(atualFolha);
  const folhasGraf = pedaco(top, 6);
  const total = 2 + (r.semDados ? 0 : (porTreino.length ? 1 : 0) + (porMusculo.length ? 1 : 0) + folhasGrupo.length + folhasGraf.length) + 2;
  let n = 0;
  const prox = () => ++n;

  const leitura: string[] = [];
  if (!r.semDados) {
    leitura.push(`Em ${r.semanas} ${r.semanas === 1 ? "semana" : "semanas"}, ${primeiroNome} registrou ${r.treinos} ${r.treinos === 1 ? "treino" : "treinos"}, ${br(r.series, 0)} séries e ${br(r.tonelagem / 1000)} toneladas movimentadas (carga × repetições).`);
    if (r.exerciciosComparaveis) leitura.push(`A carga subiu em ${r.exerciciosQueSubiram} de ${r.exerciciosComparaveis} exercícios com pelo menos dois treinos no período${r.mediaPct != null ? `; a variação típica (mediana) foi de ${pctTxt(r.mediaPct)}` : ""}.`);
    if (r.destaques[0]) leitura.push(`A maior evolução foi em ${r.destaques[0].nome}: de ${kgTxt(r.destaques[0].inicial.carga)} para ${kgTxt(r.destaques[0].atual.carga)} (${pctTxt(r.destaques[0].deltaPct)}).`);
    if (r.marcos.length) leitura.push(`${r.marcos.length === 1 ? "Houve 1 nova marca pessoal" : `Foram ${r.marcos.length} novas marcas pessoais`} de carga no período.`);
  }

  return (
    <div className="py-6 print:py-0">
      <style>{CSS}</style>

      {/* Barra de ações (só na tela) */}
      <div className="so-tela mx-auto mb-5 flex w-[210mm] max-w-full flex-wrap items-center gap-3 px-4 text-sm text-[#1a1814] md:px-0">
        <Link href={voltar} className="alvo font-semibold underline-offset-2 hover:underline">← Voltar</Link>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período do relatório">
          {PERIODOS_PREMIUM.map((o) => (
            <Link key={o.v} href={`/relatorio/${alunoId}${o.v === "tudo" ? "" : `?periodo=${o.v}`}`} aria-current={periodo === o.v ? "true" : undefined} className={`touch inline-flex items-center rounded-full border px-3 text-xs font-semibold ${periodo === o.v ? "border-[#ba9e50] bg-[#ba9e50]/15" : "border-[#c9c2b2] text-[#625c4f]"}`}>
              {o.rotulo}
            </Link>
          ))}
        </div>
        <span className="ml-auto"><BaixarPdf /></span>
      </div>

      {/* 1 — Capa */}
      <section className="folha capa">
        <div className="flex items-start justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial completo, também no PDF */}
          <img src={BRAND.logo.full} alt={BRAND.fullName} style={{ height: 64, width: "auto" }} />
          <p className="text-[9pt] text-[#8a8273]">{dataBR(hoje)}</p>
        </div>
        <div className="my-auto space-y-6 py-16">
          <p className="eyebrow" style={{ letterSpacing: ".45em" }}>Relatório exclusivo de evolução</p>
          <h1 className="text-[34pt] font-extrabold leading-[1.05]">{nome}</h1>
          <div className="h-[3px] w-20 bg-[#ba9e50]" />
          <div className="grid max-w-[150mm] grid-cols-2 gap-x-8 gap-y-4 text-[10.5pt]">
            <div><p className="eyebrow !text-[#8a8273]">Período</p><p className="mt-1 font-semibold">{dataBR(inicio)} a {dataBR(hoje)}</p></div>
            <div><p className="eyebrow !text-[#8a8273]">Protocolo</p><p className="mt-1 font-semibold">{programa?.nome ?? "—"}{programa?.fase ? ` · ${FASE[programa.fase] ?? programa.fase}` : ""}</p></div>
            {aluno.objetivo ? <div className="col-span-2"><p className="eyebrow !text-[#8a8273]">Objetivo</p><p className="mt-1 font-semibold">{aluno.objetivo}</p></div> : null}
          </div>
          <p className="max-w-[140mm] text-[12pt] italic text-[#c2bba9]">“Cada número deste relatório saiu de um treino que você registrou. É a sua constância, em dados.”</p>
        </div>
        <Rodape n={prox()} total={total} nome={nome} />
      </section>

      {/* 2 — Resumo */}
      <section className="folha">
        <Secao eyebrow="Visão geral" titulo="Sua evolução em números">
          {r.semDados ? (
            <p className="text-[11pt] text-[#625c4f]">Ainda não há treinos registrados neste período. Assim que os treinos forem registrados no app, este relatório se preenche sozinho.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
                <Numero rotulo="Treinos" valor={br(r.treinos, 0)} detalhe={`em ${r.semanas} ${r.semanas === 1 ? "semana" : "semanas"}`} />
                <Numero rotulo="Séries" valor={br(r.series, 0)} detalhe="sem aquecimento" />
                <Numero rotulo="Volume" valor={`${br(r.tonelagem / 1000)} t`} detalhe="carga × repetições" />
                <Numero rotulo="Tempo" valor={`${br(r.minutos / 60, 0)} h`} detalhe="treinando" />
                <Numero rotulo="Aderência" valor={aderenciaPct != null ? `${aderenciaPct}%` : "—"} detalhe={periodo === "tudo" ? "desde o início" : janela?.rotulo} />
                <Numero rotulo="Cargas que subiram" valor={`${r.exerciciosQueSubiram}/${r.exerciciosComparaveis}`} detalhe="exercícios comparáveis" />
                <Numero rotulo="Variação típica" valor={pctTxt(r.mediaPct)} detalhe="mediana da carga" />
                <Numero rotulo="Marcas pessoais" valor={br(r.marcos.length, 0)} detalhe="novas maiores cargas" />
              </div>
              <div className="rounded-lg border-l-[3px] border-[#ba9e50] bg-white px-5 py-4">
                <p className="eyebrow">Leitura do período</p>
                <div className="mt-2 space-y-1.5 text-[10.5pt] leading-relaxed">{leitura.map((t) => <p key={t}>{t}</p>)}</div>
              </div>
              {r.destaques.length ? (
                <div>
                  <p className="eyebrow">Maiores evoluções de carga</p>
                  <div className="mt-3 space-y-3">
                    {r.destaques.map((d, i) => (
                      <div key={d.chave} className="grid grid-cols-[22px_1fr_120px] items-center gap-3">
                        <span className="num text-[14pt] font-extrabold text-[#ba9e50]">{i + 1}</span>
                        <div>
                          <p className="text-[10.5pt] font-bold">{d.nome} <span className="font-normal text-[#8a8273]">· {d.grupoRotulo}</span></p>
                          <div className="mt-1"><AntesAgora antes={d.inicial.carga} agora={d.atual.carga} max={maxDestaque} /></div>
                        </div>
                        <p className="num text-right text-[10pt]"><span className="text-[#8a8273]">{kgTxt(d.inicial.carga)} →</span> <b>{kgTxt(d.atual.carga)}</b><br /><span className="font-bold text-[#8a6f25]">{sinal(d.deltaKg)}{kgTxt(Math.abs(d.deltaKg))} · {pctTxt(d.deltaPct)}</span></p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[8.5pt] text-[#8a8273]">Barra cinza: carga do primeiro treino do período. Barra dourada: carga do treino mais recente.</p>
                </div>
              ) : null}
            </>
          )}
        </Secao>
        <Rodape n={prox()} total={total} nome={nome} />
      </section>

      {/* 2b — Evolução de cada treino */}
      {r.semDados || !porTreino.length ? null : (
        <section className="folha">
          <Secao eyebrow="Evolução geral" titulo="Treino a treino">
            <p className="text-[9.5pt] text-[#625c4f]">Para cada treino do plano: volume (carga × repetições) das primeiras vezes × das últimas vezes no período, e a variação típica da carga dos exercícios que se repetiram entre a primeira e a última vez.</p>
            <table className="w-full border-collapse text-[9.5pt]">
              <thead>
                <tr className="text-left text-[7.5pt] uppercase tracking-[0.12em] text-[#8a8273]">
                  <th className="py-1.5 font-bold">Treino</th>
                  <th className="px-2 py-1.5 text-right font-bold">Vezes</th>
                  <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                  <th className="px-2 py-1.5 text-right font-bold">Variação</th>
                  <th className="px-2 py-1.5 text-right font-bold">Carga</th>
                  <th className="py-1.5 pl-3 font-bold">Tendência</th>
                </tr>
              </thead>
              <tbody>
                {porTreino.map((t) => (
                  <tr key={t.letra} className="border-t border-[#e4dfd3]">
                    <td className="py-2.5 pr-2"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#ba9e50] text-[10pt] font-extrabold text-[#0a0a0a]">{t.letra}</span><b>{t.nome}</b></td>
                    <td className="num px-2 py-2.5 text-right">{t.sessoes.length}</td>
                    <td className="num px-2 py-2.5 text-right whitespace-nowrap">{t.volumeInicial != null ? <>{br(t.volumeInicial / 1000)} t → <b>{br(t.volumeAtual! / 1000)} t</b></> : "—"}</td>
                    <td className={`num px-2 py-2.5 text-right font-bold ${(t.volumePct ?? 0) > 0 ? "text-[#8a6f25]" : "text-[#625c4f]"}`}>{pctTxt(t.volumePct)}</td>
                    <td className="num px-2 py-2.5 text-right">{pctTxt(t.cargaPct)}{t.exerciciosComparaveis ? <span className="block text-[7.5pt] text-[#8a8273]">subiu em {t.exerciciosSubiram} de {t.exerciciosComparaveis}</span> : null}</td>
                    <td className="py-2.5 pl-3">{t.sessoes.length >= 2 ? <MiniLinha pontos={t.sessoes.map((x) => ({ data: x.data, cargaMax: x.tonelagem, e1rmMax: null, tonelagem: x.tonelagem, series: x.series, fonte: "app" as const }))} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[8.5pt] text-[#8a8273]">Com 4 ou mais vezes no período, compara a média das 2 primeiras com a das 2 últimas; com menos, a primeira com a última. Treino extra fica fora.</p>
          </Secao>
          <Rodape n={prox()} total={total} nome={nome} />
        </section>
      )}

      {/* 2c — Evolução de cada músculo */}
      {r.semDados || !porMusculo.length ? null : (
        <section className="folha">
          <Secao eyebrow="Evolução geral" titulo="Músculo a músculo: visão geral">
            <p className="text-[9.5pt] text-[#625c4f]">{temMetades ? "Séries por semana na 1ª metade × 2ª metade do período" : "Séries feitas no período"}, volume e a variação típica da carga dos exercícios de cada músculo. As prioridades do programa aparecem em destaque.</p>
            <table className="w-full border-collapse text-[9.5pt]">
              <thead>
                <tr className="text-left text-[7.5pt] uppercase tracking-[0.12em] text-[#8a8273]">
                  <th className="py-1.5 font-bold">Músculo</th>
                  <th className="py-1.5 text-right font-bold">{temMetades ? "Séries/semana" : "Séries"}</th>
                  <th className="py-1.5 text-right font-bold">Volume</th>
                  <th className="py-1.5 text-right font-bold">Carga típica</th>
                </tr>
              </thead>
              <tbody>
                {porMusculo.map((m) => (
                  <tr key={m.grupo} className={`border-t border-[#e4dfd3] ${m.prioridade ? "bg-[#ba9e50]/15" : ""}`}>
                    <td className="py-2 pl-2 font-semibold">{m.prioridade ? <span className="mr-1.5 rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[7pt] font-bold uppercase tracking-wider text-[#ba9e50]">Prioridade</span> : null}{m.rotulo}</td>
                    <td className="num py-2 text-right">{m.seriesSemanaAntes != null ? <>{br(m.seriesSemanaAntes)} → <b>{br(m.seriesSemanaAgora!)}</b></> : br(m.series, 0)}</td>
                    <td className="num py-2 text-right">{br(m.tonelagem / 1000)} t</td>
                    <td className="num py-2 pr-2 text-right font-bold">{pctTxt(m.cargaPct)}{m.exercicios ? <span className="block text-[7.5pt] font-normal text-[#8a8273]">subiu em {m.exerciciosSubiram} de {m.exercicios}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[8.5pt] text-[#8a8273]">Carga típica = mediana da variação de carga dos exercícios do músculo (primeiro × último treino do período). Séries contam só o músculo principal de cada exercício.</p>
          </Secao>
          <Rodape n={prox()} total={total} nome={nome} />
        </section>
      )}

      {/* 3 — Carga por grupo muscular */}
      {r.semDados ? null : folhasGrupo.map((linhas, fi) => (
        <section key={`g${fi}`} className="folha">
          <Secao eyebrow="Evolução de carga" titulo={fi === 0 ? "Músculo a músculo" : "Músculo a músculo (continuação)"}>
            {fi === 0 ? <p className="text-[9.5pt] text-[#625c4f]">Para cada exercício: a maior carga do primeiro treino do período, a do treino mais recente e a maior de todas. A força estimada (fórmula de Epley, até 12 repetições) junta carga e repetições num número só.</p> : null}
            <table className="w-full border-collapse text-[9pt]">
              <thead>
                <tr className="text-left text-[7.5pt] uppercase tracking-[0.12em] text-[#8a8273]">
                  <th className="py-1.5 font-bold">Exercício</th>
                  <th className="py-1.5 text-right font-bold">Início</th>
                  <th className="py-1.5 text-right font-bold">Atual</th>
                  <th className="py-1.5 text-right font-bold">Maior</th>
                  <th className="py-1.5 text-right font-bold">Variação</th>
                  <th className="py-1.5 text-right font-bold">Força est.</th>
                  <th className="py-1.5 pl-3 font-bold">Tendência</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) =>
                  l.tipo === "grupo" ? (
                    <tr key={`g-${l.g.grupo}`}>
                      <td colSpan={7} className="pt-4 pb-1">
                        <span className="text-[10.5pt] font-extrabold">{l.g.rotulo}</span>
                        <span className="ml-2 text-[8.5pt] text-[#8a8273]">carga subiu em {l.g.subiram} de {l.g.exercicios.length} · variação típica {pctTxt(l.g.mediaPct)}</span>
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.e.chave} className="border-t border-[#e4dfd3]">
                      <td className="py-1.5 pr-2 font-semibold">{l.e.nome}<span className="block text-[7.5pt] font-normal text-[#8a8273]">{l.e.dias} treinos · {dataBR(l.e.inicial.data).slice(0, 5)} a {dataBR(l.e.atual.data).slice(0, 5)}</span></td>
                      <td className="num py-1.5 text-right">{kgTxt(l.e.inicial.carga)}</td>
                      <td className="num py-1.5 text-right font-bold">{kgTxt(l.e.atual.carga)}</td>
                      <td className="num py-1.5 text-right">{kgTxt(l.e.melhor.carga)}</td>
                      <td className={`num py-1.5 text-right font-bold ${l.e.deltaKg > 0 ? "text-[#8a6f25]" : "text-[#625c4f]"}`}>{l.e.deltaKg === 0 ? "igual" : `${sinal(l.e.deltaKg)}${br(Math.abs(l.e.deltaKg))} kg`}<span className="block text-[7.5pt] font-normal">{pctTxt(l.e.deltaPct)}</span></td>
                      <td className="num py-1.5 text-right">{l.e.e1rmAtual != null ? `${br(l.e.e1rmAtual)} kg` : "—"}<span className="block text-[7.5pt] text-[#8a8273]">{l.e.e1rmDeltaPct != null ? pctTxt(l.e.e1rmDeltaPct) : ""}</span></td>
                      <td className="py-1.5 pl-3"><MiniLinha pontos={l.e.pontos} /></td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </Secao>
          <Rodape n={prox()} total={total} nome={nome} />
        </section>
      ))}

      {/* 4 — Gráficos por exercício */}
      {r.semDados ? null : folhasGraf.map((exs, fi) => (
        <section key={`x${fi}`} className="folha">
          <Secao eyebrow="Exercício a exercício" titulo={fi === 0 ? "A curva de cada carga" : "A curva de cada carga (continuação)"}>
            {fi === 0 ? <p className="text-[9.5pt] text-[#625c4f]">Os exercícios mais treinados no período. Linha dourada: maior carga de cada treino. Linha tracejada: força estimada. O último ponto é o treino mais recente.</p> : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
              {exs.map((e) => (
                <div key={e.chave} className="rounded-lg border border-[#e4dfd3] bg-white p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[10pt] font-bold leading-tight">{e.nome}</p>
                    <p className={`num shrink-0 text-[9.5pt] font-bold ${e.deltaKg > 0 ? "text-[#8a6f25]" : "text-[#625c4f]"}`}>{e.deltaKg === 0 ? "igual" : `${sinal(e.deltaKg)}${br(Math.abs(e.deltaKg))} kg`}</p>
                  </div>
                  <p className="text-[8pt] text-[#8a8273]">{e.grupoRotulo} · {kgTxt(e.inicial.carga)} → {kgTxt(e.atual.carga)} · maior {kgTxt(e.melhor.carga)}</p>
                  <div className="mt-2"><LinhaCarga pontos={e.pontos} /></div>
                </div>
              ))}
            </div>
          </Secao>
          <Rodape n={prox()} total={total} nome={nome} />
        </section>
      ))}

      {/* 5 — Volume, consistência e marcos */}
      <section className="folha">
        <Secao eyebrow="Constância" titulo="Volume e regularidade">
          {r.semDados ? <p className="text-[10.5pt] text-[#625c4f]">Sem treinos no período.</p> : (
            <div className="rounded-lg border border-[#e4dfd3] bg-white p-4">
              <p className="text-[10pt] font-bold">Volume por semana</p>
              <p className="text-[8.5pt] text-[#8a8273]">Soma de carga × repetições das séries válidas. A barra escura é a semana atual.</p>
              <div className="mt-2"><BarrasSemanas semanas={r.volumeSemanal} /></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
            <Numero rotulo="Aderência" valor={aderenciaPct != null ? `${aderenciaPct}%` : "—"} detalhe={periodo === "tudo" ? "desde o início" : janela?.rotulo} />
            <Numero rotulo="Últimas 4 semanas" valor={aderencia.indices.d28.pct != null ? `${aderencia.indices.d28.pct}%` : "—"} detalhe="da meta semanal" />
            <Numero rotulo="Semanas com meta" valor={`${aderencia.sequencia.semanasCumpridas}`} detalhe={`de ${aderencia.sequencia.semanasParticipando} ${aderencia.sequencia.semanasParticipando === 1 ? "semana" : "semanas"}`} />
            <Numero rotulo="Melhor sequência" valor={`${aderencia.sequencia.melhor}`} detalhe="semanas seguidas" />
          </div>
          <p className="text-[8.5pt] text-[#8a8273]">Aderência = treinos feitos ÷ meta semanal combinada com o {BRAND.name}. Semanas de pausa combinada ficam fora da conta; treino parcial vale meio.</p>
          {r.marcos.length ? (
            <div>
              <p className="eyebrow">Marcas pessoais do período</p>
              <ol className="mt-2 grid grid-cols-1 gap-x-6 md:grid-cols-2 print:grid-cols-2">
                {r.marcos.map((m) => (
                  <li key={`${m.exercicio}-${m.data}`} className="flex items-baseline justify-between gap-3 border-b border-[#e4dfd3] py-1.5 text-[9.5pt]">
                    <span><span className="num text-[#8a8273]">{dataBR(m.data).slice(0, 5)}</span> · <b>{m.exercicio}</b></span>
                    <span className="num shrink-0">{kgTxt(m.anterior)} → <b>{kgTxt(m.carga)}</b></span>
                  </li>
                ))}
              </ol>
              <p className="mt-1 text-[8pt] text-[#8a8273]">Marca pessoal = maior carga já registrada no exercício, contando a partir do terceiro treino com ele.</p>
            </div>
          ) : null}
        </Secao>
        <Rodape n={prox()} total={total} nome={nome} />
      </section>

      {/* 6 — Fechamento */}
      <section className="folha">
        <Secao eyebrow="Fechamento" titulo="Corpo, método e próximos passos">
          {mPrim && mUlt ? (
            <div className="rounded-lg border border-[#e4dfd3] bg-white p-4">
              <p className="text-[10pt] font-bold">Medidas: {dataBR(mPrim.data)} × {dataBR(mUlt.data)}</p>
              <table className="mt-2 w-full text-[9.5pt]">
                <tbody>
                  {([["peso_kg", "Peso", "kg"], ["gordura_pct", "Gordura", "%"], ["cintura_cm", "Cintura", "cm"], ["quadril_cm", "Quadril", "cm"], ["braco_cm", "Braço", "cm"], ["coxa_cm", "Coxa", "cm"], ["peito_cm", "Peito", "cm"]] as const).map(([k, rot, u]) => {
                    const a = typeof mPrim[k] === "number" && (mPrim[k] as number) > 0 ? (mPrim[k] as number) : null;
                    const b = typeof mUlt[k] === "number" && (mUlt[k] as number) > 0 ? (mUlt[k] as number) : null;
                    if (a == null && b == null) return null;
                    const d = a != null && b != null ? Math.round((b - a) * 10) / 10 : null;
                    return (
                      <tr key={k} className="border-t border-[#e4dfd3]">
                        <td className="py-1.5 font-semibold">{rot}</td>
                        <td className="num py-1.5 text-right">{a != null ? `${br(a)} ${u}` : "—"}</td>
                        <td className="num py-1.5 text-right">{b != null ? `${br(b)} ${u}` : "—"}</td>
                        <td className="num py-1.5 text-right text-[#625c4f]">{d == null ? "—" : d === 0 ? "igual" : `${d > 0 ? "↑ +" : "↓ −"}${br(Math.abs(d))} ${u}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-1 text-[8pt] text-[#8a8273]">A seta mostra se a medida subiu ou desceu. O que isso significa depende do seu objetivo — quem interpreta é o {BRAND.name}.</p>
            </div>
          ) : null}

          {mensagem ? (
            <div className="rounded-lg bg-[#0a0a0a] px-5 py-4 text-[#f4f1ea]">
              <p className="eyebrow">Palavra do {BRAND.name}</p>
              {mensagem.titulo ? <p className="mt-2 text-[11pt] font-bold">{mensagem.titulo}</p> : null}
              <p className="mt-1 text-[10.5pt] leading-relaxed">{mensagem.descricao}</p>
              <p className="mt-2 text-[8.5pt] text-[#8a8273]">{mensagem.autor?.nome ?? BRAND.name} · {dataBR(mensagem.created_at)}</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-[#e4dfd3] bg-white p-4 text-[9pt] leading-relaxed text-[#3d3830]">
            <p className="text-[10pt] font-bold text-[#1a1814]">Como este relatório é calculado</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Tudo vem dos treinos registrados no app{historicoResumo.length ? " e do histórico importado de outro app" : ""}. Nada é estimado sem registro.</li>
              <li>Carga de um treino = maior carga das séries válidas do exercício (aquecimento fica de fora).</li>
              <li>Variação = treino mais recente × primeiro treino do período. Só entram exercícios feitos em pelo menos 2 treinos.</li>
              <li>Força estimada = carga × (1 + repetições ÷ 30), fórmula de Epley, válida até 12 repetições.</li>
              <li>Carga é um sinal de evolução, não o único: técnica, amplitude, cansaço e dias difíceis também mudam os números. Ganho de músculo ou perda de gordura não se medem só pela carga.</li>
            </ul>
          </div>

          <div className="mt-2 flex items-center justify-between gap-4 rounded-lg border border-[#ba9e50]/50 bg-[#ba9e50]/10 px-5 py-4">
            <p className="text-[11pt] font-semibold italic">“{BRAND.tagline}”</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial completo, também no PDF */}
            <img src={BRAND.logo.fullLight} alt={BRAND.fullName} style={{ height: 44, width: "auto" }} />
          </div>
        </Secao>
        <Rodape n={prox()} total={total} nome={nome} />
      </section>
    </div>
  );
}
