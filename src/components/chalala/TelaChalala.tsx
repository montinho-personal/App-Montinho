"use client";

// “CHALALÁ! TREINO CONCLUÍDO!” — celebração breve, resumo REAL da sessão,
// progresso da meta semanal, conquista desta sessão e mensagem automática
// (identificada como tal). Depois das medalhas, o card do treino (editar,
// pôr foto, compartilhar) abre sozinho, 1× por treino (pedido do Montinho,
// 26/10/2026), também na aula presencial. Compartilhar continua opcional.

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { evolucaoParaCard, formatarMin, type DadosCard } from "@/lib/chalala/card";
import type { ResumoChalala } from "@/lib/data/conquistas";
import { CONTEUDO, nomeDaConquista } from "@/lib/conquistas/conteudo";
import { POR_QUE } from "@/lib/evolucao/motor";
import { SugestaoConclusao } from "@/components/desbloqueia/SugestaoConclusao";
import type { CodigoConquista } from "@/lib/conquistas/regras";
import { enviarEvento } from "./evento";
import { CelebracaoMedalha } from "./CelebracaoMedalha";
import { RelatorioTreino } from "./RelatorioTreino";
import { FRACAO_CONCLUSAO } from "@/lib/aderencia/calcular";

// O editor (canvas, foto, exportação) só carrega quando o aluno pede.
const EditorCard = dynamic(() => import("./EditorCard"), { ssr: false });

const CHAVE_ANIMACOES = "montinho:animacoes";
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export type BaseConclusao = { sessaoId: string; status: "concluida" | "abandonada"; nomeTreino: string | null; series: number; seriesPlanejadas: number; duracaoMin: number | null; data: string };

export function dadosDoResumo(r: Pick<ResumoChalala, "nomeTreino" | "data" | "duracaoMin" | "exercicios" | "series" | "meta" | "pontosSemana" | "metaCumprida" | "recordes" | "retomada" | "conquistas"> & { listaTreino?: ResumoChalala["listaTreino"]; evolucao?: ResumoChalala["evolucao"]; relatorio?: ResumoChalala["relatorio"]; letra?: ResumoChalala["letra"] }): DadosCard {
  const outra = r.conquistas.find((c) => c.codigo !== "recorde" && c.codigo !== "eu_voltei" && c.codigo !== "relatorio_mensal");
  return {
    nomeTreino: r.nomeTreino,
    data: r.data,
    duracaoMin: r.duracaoMin,
    exercicios: r.exercicios,
    series: r.series,
    meta: r.meta,
    feitosSemana: r.pontosSemana,
    metaCumprida: r.metaCumprida,
    recordes: r.recordes,
    conquistaTitulo: outra ? nomeDaConquista(outra.codigo, outra.titulo) : r.evolucao && !r.recordes.length ? `Evoluí no ${r.evolucao.exercicio}` : null,
    conquistaFrase: !outra && r.evolucao && !r.recordes.length ? `${String(r.evolucao.atual.carga).replace(".", ",")} kg × ${r.evolucao.atual.reps}${r.evolucao.anterior ? ` (antes ${String(r.evolucao.anterior.carga).replace(".", ",")} kg × ${r.evolucao.anterior.reps})` : ""}` : null,
    retomada: r.retomada,
    evolucaoTreino: evolucaoParaCard(r.relatorio, r.letra),
    listaTreino: r.listaTreino ?? null,
  };
}

function Numero({ emoji, valor, extra, rotulo }: { emoji: string; valor: string; extra?: string; rotulo: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-surface px-1 py-3">
      <dt className="mt-1.5 text-xs font-semibold text-fg-muted">
        <span aria-hidden>{emoji} </span>
        {rotulo}
      </dt>
      <dd className="font-mono text-3xl font-black leading-none">
        {valor}
        {extra ? <span className="text-sm font-bold text-fg-subtle">{extra}</span> : null}
      </dd>
    </div>
  );
}

const faltam = (n: number) => (n <= 0 ? "" : n <= 1 ? "Falta 1 treino. Bora fechar a semana! 💪" : `Faltam ${num(n)} treinos. Um de cada vez! 💪`);

type AulaPresencial = { nomeAluno: string; voltarHref: string; cabecalhos: Record<string, string> };

export function TelaChalala({ base, nome, presencial = null, confianca = null, children }: { base: BaseConclusao; nome: string; presencial?: AulaPresencial | null; confianca?: string | null; children?: React.ReactNode }) {
  const [resumo, setResumo] = useState<ResumoChalala | null>(null);
  // Medalhas desta sessão: celebração interativa assim que o resumo chega.
  const [celebrar, setCelebrar] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [editor, setEditor] = useState(false);
  const [animacoes, setAnimacoes] = useState(true);

  useEffect(() => {
    let vivo = true;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência guardada só no aparelho
      if (localStorage.getItem(CHAVE_ANIMACOES) === "0") setAnimacoes(false);
    } catch {
      // armazenamento indisponível: mantém o padrão
    }
    enviarEvento({ tipo: "conclusao_vista", origem: "conclusao" });
    fetch(`/api/sessoes/${base.sessaoId}/chalala`, presencial ? { headers: presencial.cabecalhos } : undefined)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ResumoChalala) => vivo && setResumo(d))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- busca uma vez por sessão
  }, [base.sessaoId]);

  function alternarAnimacoes() {
    const v = !animacoes;
    setAnimacoes(v);
    try {
      localStorage.setItem(CHAVE_ANIMACOES, v ? "1" : "0");
    } catch {
      // ignora
    }
  }

  // Mesma regra da aderência: menos da metade das séries = treino parcial.
  const parcial = base.status === "abandonada" || (base.seriesPlanejadas > 0 && base.series / base.seriesPlanejadas < FRACAO_CONCLUSAO);
  const r = resumo;
  const duracao = r ? r.duracaoMin : base.duracaoMin;
  const conquista = r?.conquistas.find((c) => c.codigo !== "relatorio_mensal") ?? null;
  // Aula presencial: as deste treino (o aluno ainda vê de novo no app dele). App do aluno: só as novas, nunca repete.
  const medalhasNovas = r ? (presencial ? r.conquistas.filter((c) => c.codigo !== "relatorio_mensal") : (r.comemorar ?? r.conquistas.filter((c) => c.codigo !== "relatorio_mensal" && !c.vista_em))) : [];
  function fecharCelebracao() {
    setCelebrar(false);
    // No app do aluno, marca como vistas (não repete). Na aula presencial, o
    // aluno ainda vê a celebração quando abrir o app dele.
    if (!presencial && medalhasNovas.length) {
      fetch("/api/conquistas/vistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: medalhasNovas.map((c) => c.id) }) }).catch(() => undefined);
    }
  }
  // Destaques sem repetir o que o topo e o cartão da conquista já mostram.
  const destaquesHoje = (r?.destaques ?? []).filter((d) => !/^Meta da semana|^Você completou sua meta/.test(d) && !(conquista && d.startsWith("Conquista:")));
  const dados: DadosCard = r ? dadosDoResumo(r) : { nomeTreino: base.nomeTreino, data: base.data, duracaoMin: base.duracaoMin, series: base.series };

  // Medalhas mostradas (ou nenhuma) → abre o card do treino sozinho, uma vez por sessão.
  const medalhasPendentes = celebrar && medalhasNovas.length > 0;
  useEffect(() => {
    if (!r || medalhasPendentes || base.status !== "concluida") return;
    const chave = `montinho-card-auto:${base.sessaoId}`;
    try {
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "1");
    } catch {
      // sem armazenamento: abre do mesmo jeito
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- abre o card logo depois da celebração
    setEditor(true);
  }, [r, medalhasPendentes, base.status, base.sessaoId]);

  // Encerrado sem nenhuma série = treino cancelado (começou o treino errado):
  // não conta na semana nem gera medalha; nada de “Treino registrado”.
  if (base.series === 0 && base.status === "abandonada") {
    return (
      <Card className="border-border">
        <CardBody className="space-y-3 py-8 text-center">
          <p className="text-3xl" aria-hidden>✖</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Treino cancelado</h1>
          <p className="text-fg-muted">Nenhuma série foi marcada, então ele não conta na semana. Pode começar o treino certo quando quiser!</p>
          <Link href={presencial ? "/treinador/alunos" : "/aluno/treinar"} className="touch inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 font-bold text-bg">
            {presencial ? "Voltar" : "Escolher o treino"}
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${animacoes ? "" : "sem-animacao"}`}>
      {/* Topo (17/11/2026, pedido do Montinho: “bater o olho e ler”): celebração, os 3 números grandes e a meta em bolinhas, num cartão só. */}
      <Card className="relative overflow-hidden border-success/40 bg-grain-strong">
        <CardBody className="space-y-5 py-7 text-center">
          <div className="space-y-2">
            <div className="relative mx-auto h-16 w-16">
              <span aria-hidden className="chalala-brilho absolute inset-0 rounded-full bg-accent/40" />
              <span className="chalala-pop relative flex h-16 w-16 items-center justify-center rounded-full bg-success text-bg">
                <Icon name="check" size={36} />
              </span>
            </div>
            {parcial ? (
              <h1 className="text-2xl font-extrabold tracking-tight">Treino registrado</h1>
            ) : (
              <h1 className="leading-none">
                <span className="block text-4xl font-black tracking-tight text-accent">CHALALÁ!</span>
                <span className="mt-1 block text-lg font-extrabold uppercase tracking-wide">Treino concluído</span>
              </h1>
            )}
            {parcial && confianca ? <p className="font-bold text-accent">{confianca}</p> : null}
            <p className="text-sm text-fg-muted">
              {base.nomeTreino ?? "Treino"} · {dataBR(r?.data ?? base.data)}
            </p>
            {parcial ? (
              <p className="text-fg-muted">Hoje você adaptou a rotina e conseguiu treinar.</p>
            ) : resumo?.relatorio?.completo ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-success">🏆 100% do treino feito</span>
            ) : null}
          </div>

          <dl className="grid grid-cols-3 gap-2">
            <Numero emoji="⏱" valor={!duracao ? "—" : duracao < 60 ? String(duracao) : formatarMin(duracao)} extra={duracao && duracao < 60 ? " min" : undefined} rotulo="de treino" />
            <Numero emoji="💪" valor={r ? String(r.exercicios) : "…"} rotulo={r?.exercicios === 1 ? "exercício" : "exercícios"} />
            <Numero emoji="🔥" valor={String(base.series)} extra={base.seriesPlanejadas > 0 && base.seriesPlanejadas !== base.series ? `/${base.seriesPlanejadas}` : undefined} rotulo="séries" />
          </dl>
          {!duracao ? <p className="text-[11px] text-fg-subtle">Duração não exibida: o início e o fim registrados não permitem um tempo confiável.</p> : null}

          {r?.meta && r.modo !== "extra" ? (
            <div className="space-y-2 rounded-xl bg-bg/60 px-3 py-3">
              <p className="text-sm font-bold">{r.metaCumprida ? "✅ Meta da semana cumprida!" : `Meta da semana: ${num(Math.min(r.pontosSemana, r.meta))} de ${r.meta}`}</p>
              <div className="flex justify-center gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={r.meta} aria-valuenow={Math.min(r.pontosSemana, r.meta)} aria-label="Progresso da meta semanal">
                {Array.from({ length: Math.min(r.meta, 14) }, (_, i) => (
                  <span key={i} className={`h-3 max-w-10 flex-1 rounded-full ${i < Math.floor(r.pontosSemana) ? (r.metaCumprida ? "bg-success" : "bg-accent") : "bg-border"}`} />
                ))}
              </div>
              {!r.metaCumprida ? <p className="text-xs text-fg-muted">{faltam(r.meta - r.pontosSemana)}</p> : null}
            </div>
          ) : r?.modo === "extra" ? (
            <p className="text-xs text-fg-muted">Treino extra: fica registrado, mas não entra na meta da semana.</p>
          ) : null}
        </CardBody>
      </Card>

      {r?.relatorio ? <RelatorioTreino r={r.relatorio} letra={r.letra} /> : null}

      {destaquesHoje.length ? (
        <Card className="border-accent/40">
          <CardBody className="space-y-1.5">
            <p className="text-sm font-extrabold uppercase tracking-wide text-accent">✨ Destaques de hoje</p>
            <ul className="space-y-1.5 text-base">
              {destaquesHoje.map((d) => <li key={d} className="flex gap-2"><span className="text-accent" aria-hidden>✦</span><span>{d}</span></li>)}
            </ul>
            {r?.evolucao ? (
              <details className="text-xs text-fg-muted">
                <summary className="cursor-pointer font-semibold text-accent">Por que isso é importante?</summary>
                <p className="mt-1">{POR_QUE[r.evolucao.tipo]}</p>
                <p className="mt-1 text-[11px] text-fg-subtle">Comparação: {r.evolucao.criterio}</p>
              </details>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {r?.descoberta ? <SugestaoConclusao sessaoId={base.sessaoId} d={r.descoberta} /> : null}

      {conquista ? (
        <Card className="border-accent/40">
          <CardBody className="space-y-1">
            <p className="text-sm font-extrabold uppercase tracking-wide text-accent">🏅 Conquista de hoje</p>
            <p className="text-lg font-extrabold leading-tight">{nomeDaConquista(conquista.codigo, conquista.titulo)}</p>
            <p className="text-sm text-fg-muted">{conquista.codigo === "recorde" ? conquista.descricao : (CONTEUDO[conquista.codigo as CodigoConquista]?.mensagem ?? conquista.descricao)}</p>
            {!presencial && conquista.codigo !== "recorde" && conquista.codigo !== "eu_voltei" ? (
              <Link href={`/aluno/conquistas/todas?m=${conquista.codigo}`} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">Entenda por que isso é importante</Link>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {/* Próxima missão (Fase 1): só informação, sem botão — não compete com o compartilhar. */}
      {r?.proximaMissao && !presencial ? (
        <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
          <span aria-hidden className="text-2xl">🎯</span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold uppercase tracking-wide text-accent">Próxima missão</p>
            <p className="font-bold leading-tight">{r.proximaMissao.titulo}</p>
            <p className="text-sm text-fg-muted">{r.proximaMissao.texto}</p>
          </div>
        </div>
      ) : null}

      {r ? (
        <div className="px-1 text-center">
          <p className="text-base font-semibold">💛 {r.mensagem}</p>
          <p className="mt-1 text-[10px] text-fg-subtle">Mensagem automática do app, gerada a partir dos seus registros.</p>
        </div>
      ) : falhou ? (
        <p className="text-xs text-fg-subtle">Sem conexão agora: meta e conquistas aparecem quando a internet voltar. Seu treino já está salvo.</p>
      ) : (
        <p className="text-xs text-fg-subtle" role="status">
          Conferindo meta e conquistas…
        </p>
      )}

      {children}

      {presencial ? (
        <div className="space-y-2">
          <button type="button" onClick={() => setEditor(true)} className="touch inline-flex w-full items-center justify-center gap-2 rounded-lg border border-accent/60 px-5 py-3 font-bold text-accent">
            📸 Card do treino de {presencial.nomeAluno.split(" ")[0]}
          </button>
          <Link href={presencial.voltarHref} className="touch flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 font-bold text-bg">
            Voltar para {presencial.nomeAluno}
          </Link>
        </div>
      ) : (
      <div className="space-y-2">
        <button type="button" onClick={() => setEditor(true)} className="touch inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 font-bold text-bg">
          📲 Compartilhar meu treino
        </button>
        <p className="text-center text-[11px] text-fg-subtle">Opcional. Suas conquistas e sua sequência não dependem de compartilhar.</p>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/aluno/evolucao" className="touch inline-flex items-center justify-center rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-fg-muted hover:text-fg">
            Ver evolução
          </Link>
          <Link href="/aluno/conquistas" className="touch inline-flex items-center justify-center rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-fg-muted hover:text-fg">
            Minhas conquistas
          </Link>
        </div>
        <Link href="/aluno" className="touch inline-flex w-full items-center justify-center rounded-lg border border-border px-5 py-3 font-semibold">
          Voltar ao início
        </Link>
        <button type="button" onClick={alternarAnimacoes} className="w-full py-1 text-[11px] text-fg-subtle underline-offset-2 hover:underline">
          Animações de comemoração: {animacoes ? "ligadas (desligar)" : "desligadas (ligar)"}
        </button>
      </div>
      )}

      {celebrar && medalhasNovas.length ? <CelebracaoMedalha conquistas={medalhasNovas} nome={presencial ? presencial.nomeAluno : nome} animacoes={animacoes} onFechar={fecharCelebracao} /> : null}

      {editor ? <EditorCard dados={dados} modeloInicial={r?.modeloSugerido ?? "A"} nome={presencial ? presencial.nomeAluno : nome} origem="conclusao" registrarEventos={!presencial} refEvento={`sessao:${base.sessaoId}`} onFechar={() => setEditor(false)} /> : null}
    </div>
  );
}
