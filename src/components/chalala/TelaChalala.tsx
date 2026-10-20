"use client";

// “CHALALÁ! TREINO CONCLUÍDO!” — celebração breve, resumo REAL da sessão,
// progresso da meta semanal, conquista desta sessão e mensagem automática
// (identificada como tal). Compartilhar é opcional e nunca automático.

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatarMin, type DadosCard } from "@/lib/chalala/card";
import type { ResumoChalala } from "@/lib/data/conquistas";
import { CONTEUDO, nomeDaConquista } from "@/lib/conquistas/conteudo";
import type { CodigoConquista } from "@/lib/conquistas/regras";
import { enviarEvento } from "./evento";
import { FRACAO_CONCLUSAO } from "@/lib/aderencia/calcular";

// O editor (canvas, foto, exportação) só carrega quando o aluno pede.
const EditorCard = dynamic(() => import("./EditorCard"), { ssr: false });

const CHAVE_ANIMACOES = "montinho:animacoes";
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export type BaseConclusao = { sessaoId: string; status: "concluida" | "abandonada"; nomeTreino: string | null; series: number; seriesPlanejadas: number; duracaoMin: number | null; data: string };

export function dadosDoResumo(r: Pick<ResumoChalala, "nomeTreino" | "data" | "duracaoMin" | "exercicios" | "series" | "meta" | "pontosSemana" | "metaCumprida" | "recordes" | "retomada" | "conquistas">): DadosCard {
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
    conquistaTitulo: outra ? nomeDaConquista(outra.codigo, outra.titulo) : null,
    retomada: r.retomada,
  };
}

export function TelaChalala({ base, nome, children }: { base: BaseConclusao; nome: string; children?: React.ReactNode }) {
  const [resumo, setResumo] = useState<ResumoChalala | null>(null);
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
    fetch(`/api/sessoes/${base.sessaoId}/chalala`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ResumoChalala) => vivo && setResumo(d))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
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
  const dados: DadosCard = r ? dadosDoResumo(r) : { nomeTreino: base.nomeTreino, data: base.data, duracaoMin: base.duracaoMin, series: base.series };

  return (
    <div className={`space-y-4 ${animacoes ? "" : "sem-animacao"}`}>
      <Card className="relative overflow-hidden border-success/40 bg-grain-strong">
        <CardBody className="space-y-2 py-8 text-center">
          <div className="relative mx-auto h-16 w-16">
            <span aria-hidden className="chalala-brilho absolute inset-0 rounded-full bg-accent/40" />
            <span className="chalala-pop relative flex h-16 w-16 items-center justify-center rounded-full bg-success text-bg">
              <Icon name="check" size={36} />
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{parcial ? "Treino registrado" : "CHALALÁ! TREINO CONCLUÍDO!"}</h1>
          <p className="text-fg-muted">{parcial ? "Hoje você adaptou a rotina e conseguiu treinar." : "Mais um passo na sua evolução."}</p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Resumo da sessão</p>
            <p className="font-bold">{base.nomeTreino ?? "Treino"}</p>
            <p className="text-xs text-fg-muted">{dataBR(r?.data ?? base.data)}</p>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface p-2">
              <dt className="text-[11px] text-fg-subtle">Duração</dt>
              <dd className="font-mono text-lg font-bold">{duracao ? formatarMin(duracao) : "—"}</dd>
            </div>
            <div className="rounded-lg bg-surface p-2">
              <dt className="text-[11px] text-fg-subtle">Exercícios</dt>
              <dd className="font-mono text-lg font-bold">{r ? r.exercicios : "…"}</dd>
            </div>
            <div className="rounded-lg bg-surface p-2">
              <dt className="text-[11px] text-fg-subtle">Séries</dt>
              <dd className="font-mono text-lg font-bold">
                {base.series}
                <span className="text-xs font-normal text-fg-subtle">/{base.seriesPlanejadas}</span>
              </dd>
            </div>
          </dl>
          {!duracao ? <p className="text-[11px] text-fg-subtle">Duração não exibida: o início e o fim registrados não permitem um tempo confiável.</p> : <p className="text-[11px] text-fg-subtle">Tempo entre o início e o fim do treino, descontando as pausas.</p>}

          {r?.meta ? (
            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold">Meta da semana</span>
                <span className="font-mono">
                  {num(Math.min(r.pontosSemana, r.meta))}/{r.meta}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={r.meta} aria-valuenow={Math.min(r.pontosSemana, r.meta)} aria-label="Progresso da meta semanal">
                <div className={`h-full rounded-full ${r.metaCumprida ? "bg-success" : "bg-accent"} transition-[width] duration-700 motion-reduce:transition-none`} style={{ width: `${Math.min(100, (r.pontosSemana / r.meta) * 100)}%` }} />
              </div>
              <p className="text-xs text-fg-muted">{r.modo === "extra" ? "Treino extra: fica registrado, mas não entra na meta." : r.metaCumprida ? "Meta da semana cumprida." : `Você completou ${num(r.pontosSemana)} dos seus ${r.meta} treinos desta semana.`}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {conquista ? (
        <Card className="border-accent/40">
          <CardBody className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Conquista desta sessão</p>
            <p className="font-bold">{nomeDaConquista(conquista.codigo, conquista.titulo)}</p>
            <p className="text-sm text-fg-muted">{conquista.codigo === "recorde" ? conquista.descricao : (CONTEUDO[conquista.codigo as CodigoConquista]?.mensagem ?? conquista.descricao)}</p>
            {conquista.codigo !== "recorde" && conquista.codigo !== "eu_voltei" ? (
              <Link href={`/aluno/conquistas/todas?m=${conquista.codigo}`} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">Entenda por que isso é importante</Link>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {r ? (
        <div className="rounded-lg border border-border px-4 py-3">
          <p className="text-sm">{r.mensagem}</p>
          <p className="mt-1 text-[11px] text-fg-subtle">Mensagem automática do app, gerada a partir dos seus registros.</p>
        </div>
      ) : falhou ? (
        <p className="text-xs text-fg-subtle">Sem conexão agora: meta e conquistas aparecem quando a internet voltar. Seu treino já está salvo.</p>
      ) : (
        <p className="text-xs text-fg-subtle" role="status">
          Conferindo meta e conquistas…
        </p>
      )}

      {children}

      <div className="space-y-2">
        <button type="button" onClick={() => setEditor(true)} className="touch inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 font-bold text-bg">
          Compartilhar minha conquista
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

      {editor ? <EditorCard dados={dados} modeloInicial={r?.modeloSugerido ?? "A"} nome={nome} origem="conclusao" onFechar={() => setEditor(false)} /> : null}
    </div>
  );
}
