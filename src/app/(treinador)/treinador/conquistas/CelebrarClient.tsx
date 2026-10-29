"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import type { MetricasChalala } from "@/lib/chalala/metricas";
import { ROTULO_MODELO, FORMATOS, type ModeloId, type Formato } from "@/lib/chalala/card";
import { CATEGORIA_EMOJI, type Categoria } from "@/lib/conquistas/conteudo";
import { TIPOS_CELEBRAR, filtrarParaCelebrar, mensagemWhatsConquista, ordenarParaCelebrar, resumoCelebrar, type Situacao } from "@/lib/conquistas/celebrar";
import { linkWhatsApp } from "@/lib/acesso/mensagem";

const EditorCard = dynamic(() => import("@/components/chalala/EditorCard"), { ssr: false });

type Conquista = { id: string; alunoId: string; aluno: string; telefone: string | null; codigo: string; categoria: string; titulo: string; descricao: string | null; data: string; reconhecida: boolean };
type Resultados = { aderencia28: number | null; aderencia60: number | null; aderencia90: number | null; medalhas: number; retomadas: number; recordes: number };

const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
const diaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const EXEMPLO = "Você está conseguindo manter sua rotina, mesmo com os desafios do dia a dia. Essa constância merece reconhecimento!";
const POR_PAGINA = 30;
const SITUACOES: Array<{ v: Situacao; l: string }> = [
  { v: "todas", l: "Todas" },
  { v: "falta", l: "🎯 Falta celebrar" },
  { v: "celebradas", l: "✓ Já celebradas" },
];
const chip = (ativo: boolean) =>
  `inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors ${ativo ? "border-accent bg-accent-soft text-fg" : "border-border bg-card text-fg-muted hover:border-border-strong"}`;
const emoji = (c: Conquista) => (c.codigo === "recorde" ? "🏆" : (CATEGORIA_EMOJI[c.categoria as Categoria] ?? "🏅"));

export function CelebrarClient({ dias, autor, alunoInicial = "", mensagemInicial = "", alunos, conquistas, enviados, metricas, resultados }: { dias: number; autor: string; alunoInicial?: string; mensagemInicial?: string; alunos: Array<{ id: string; nome: string }>; conquistas: Conquista[]; enviados: Array<{ id: string; aluno: string; mensagem: string; data: string }>; metricas: MetricasChalala; resultados: Resultados }) {
  const router = useRouter();
  const toast = useToast();
  const [filtro, setFiltro] = useState("");
  const [tipo, setTipo] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("todas");
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [sel, setSel] = useState<Conquista | null>(null);
  const [alunoLivre, setAlunoLivre] = useState(alunoInicial);
  const [msg, setMsg] = useState(mensagemInicial);
  const [notificar, setNotificar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [preview, setPreview] = useState(false);
  const cartaoMensagem = useRef<HTMLDivElement>(null);
  const alunoAlvo = sel?.alunoId ?? alunoLivre;

  const resumo = useMemo(() => resumoCelebrar(conquistas), [conquistas]);
  const doAluno = useMemo(() => filtrarParaCelebrar(conquistas, { alunoId: filtro }), [conquistas, filtro]);
  const lista = useMemo(() => ordenarParaCelebrar(filtrarParaCelebrar(doAluno, { tipo, situacao })), [doAluno, tipo, situacao]);
  const visiveis = lista.slice(0, mostrar);
  const temFiltro = !!filtro || !!tipo || situacao !== "todas";
  const nomeAlvo = alunos.find((a) => a.id === alunoAlvo)?.nome;

  const rolarParaMensagem = () => requestAnimationFrame(() => cartaoMensagem.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  // Veio de outra tela com ?aluno=…&msg=… (ex.: Evoluções): já leva até a mensagem pronta.
  useEffect(() => {
    if (alunoInicial) rolarParaMensagem();
  }, [alunoInicial]);

  /** Escolher uma conquista já deixa a mensagem sugerida pronta e leva até o botão de enviar. */
  function escolher(c: Conquista) {
    setSel(c);
    setMsg((atual) => (atual.trim() ? atual : EXEMPLO));
    rolarParaMensagem();
  }

  async function enviar() {
    if (!alunoAlvo || msg.trim().length < 3) return toast.error("Escolha o aluno e escreva sua mensagem.");
    setEnviando(true);
    const res = await fetch("/api/reconhecimentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aluno_id: alunoAlvo, conquista_id: sel?.id ?? null, mensagem: msg.trim(), notificar }) }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível enviar.");
    toast.success(d?.notificados ? "Reconhecimento enviado e aluno avisado no celular." : "Reconhecimento enviado. O aluno vê no app.");
    setMsg("");
    setSel(null);
    router.refresh();
  }

  const hrefDias = (n: number) => `/treinador/conquistas?dias=${n}${alunoInicial ? `&aluno=${encodeURIComponent(alunoInicial)}` : ""}`;
  const contagemTipo = (v: string) => filtrarParaCelebrar(doAluno, { tipo: v, situacao }).length;
  const contagemSituacao = (v: Situacao) => filtrarParaCelebrar(doAluno, { tipo, situacao: v }).length;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumo">
        <Numero valor={resumo.total} rotulo={resumo.total === 1 ? "conquista no período" : "conquistas no período"} />
        <Numero valor={resumo.alunos} rotulo={resumo.alunos === 1 ? "aluno ganhou" : "alunos ganharam"} />
        <Numero valor={resumo.celebradas} rotulo="✓ já celebradas" />
        <Numero valor={resumo.falta} rotulo="🎯 falta celebrar" destaque={resumo.falta > 0} />
      </dl>

      <section className="space-y-3" aria-label="Filtros">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg-muted">Período</p>
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map((n) => (
              <Link key={n} href={hrefDias(n)} aria-current={n === dias ? "page" : undefined} className={chip(n === dias)}>
                {n} dias
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg-muted">Situação</p>
          <div className="flex flex-wrap gap-2">
            {SITUACOES.map((s) => (
              <button key={s.v} type="button" aria-pressed={situacao === s.v} onClick={() => { setSituacao(s.v); setMostrar(POR_PAGINA); }} className={chip(situacao === s.v)}>
                {s.l} <span className="font-mono text-xs text-fg-subtle">{contagemSituacao(s.v)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg-muted">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {TIPOS_CELEBRAR.map((t) => (
              <button key={t.v} type="button" aria-pressed={tipo === t.v} onClick={() => { setTipo(t.v); setMostrar(POR_PAGINA); }} className={chip(tipo === t.v)}>
                {t.v ? t.l : "Todos"} <span className="font-mono text-xs text-fg-subtle">{contagemTipo(t.v)}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-fg-muted">Aluno</span>
          <select value={filtro} onChange={(e) => { setFiltro(e.target.value); setMostrar(POR_PAGINA); }} aria-label="Filtrar por aluno" className="h-11 w-full max-w-full rounded-xl border border-border bg-card px-3 text-base sm:max-w-sm">
            <option value="">Todos os alunos</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>
        {temFiltro ? (
          <button type="button" onClick={() => { setFiltro(""); setTipo(""); setSituacao("todas"); setMostrar(POR_PAGINA); }} className="alvo min-h-11 text-sm font-semibold text-accent underline-offset-2 hover:underline">
            Limpar filtros
          </button>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0 space-y-3" aria-labelledby="recentes">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="recentes" className="text-xs font-bold uppercase tracking-wider text-fg-muted">
              Conquistas · {lista.length}
            </h2>
            <button type="button" onClick={() => { setSel(null); rolarParaMensagem(); }} className="alvo min-h-11 text-xs font-semibold text-accent underline-offset-2 hover:underline lg:hidden">
              ✍️ Mensagem sem conquista
            </button>
          </div>
          {visiveis.length ? (
            <ul className="space-y-2">
              {visiveis.map((c, i) => {
                const escolhida = sel?.id === c.id;
                const comecaCelebradas = situacao === "todas" && c.reconhecida && (i === 0 || !visiveis[i - 1].reconhecida) && i > 0;
                return (
                  <li key={c.id}>
                    {comecaCelebradas ? <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-fg-subtle">✓ Já celebradas</p> : null}
                    <div className={`rounded-xl border p-3 transition-colors ${escolhida ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate font-bold">{c.aluno}</p>
                        <span className="shrink-0 font-mono text-xs text-fg-subtle">{fmt.format(new Date(c.data))}</span>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold">
                        <span aria-hidden>{emoji(c)}</span> {c.titulo}
                      </p>
                      {c.descricao ? <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{c.descricao}</p> : null}
                      {c.reconhecida ? (
                        <p className="mt-1 text-[11px] font-semibold text-success">✓ Você já celebrou esta conquista</p>
                      ) : (
                        <p className="mt-1 text-[11px] font-semibold text-warning">🎯 Falta celebrar</p>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => escolher(c)}
                          aria-pressed={escolhida}
                          className={`min-h-11 rounded-lg px-2 py-2 text-sm font-bold leading-tight ${c.reconhecida ? "border border-border text-fg-muted hover:text-fg" : "bg-accent text-bg"}`}
                        >
                          {escolhida ? "✍️ Escrevendo…" : c.reconhecida ? "🎉 Celebrar de novo" : "🎉 Celebrar no app"}
                        </button>
                        <a href={linkWhatsApp(c.telefone, mensagemWhatsConquista(c.aluno, c.titulo, c.codigo))} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-lg bg-success px-2 py-2 text-center text-sm font-bold leading-tight text-bg">
                          💬 Parabenizar no WhatsApp
                        </a>
                      </div>
                      {!c.telefone ? <p className="mt-1 text-[11px] text-fg-subtle">Sem WhatsApp na ficha: o WhatsApp vai pedir o contato.</p> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">
              {temFiltro ? "Nenhuma conquista com esses filtros." : "Nenhuma conquista registrada no período. Elas aparecem quando os alunos treinam e abrem o app."}
            </div>
          )}
          {lista.length > mostrar ? (
            <button type="button" onClick={() => setMostrar((m) => m + POR_PAGINA)} className="min-h-11 w-full rounded-xl border border-border bg-card text-sm font-semibold text-fg-muted hover:text-fg">
              Ver mais ({lista.length - mostrar})
            </button>
          ) : null}
        </section>

        <div className="min-w-0 space-y-5">
          <div ref={cartaoMensagem} className="scroll-mt-20 lg:sticky lg:top-4">
            <Card>
              <CardBody className="space-y-3 px-4 text-sm sm:px-6">
                <h2 className="font-bold">✍️ Sua mensagem</h2>
                {sel ? (
                  <p className="text-xs text-fg-muted">
                    Para <strong className="text-fg">{sel.aluno}</strong> — {sel.titulo}{" "}
                    <button type="button" onClick={() => setSel(null)} className="alvo min-h-11 px-1 text-accent underline-offset-2 hover:underline">
                      trocar
                    </button>
                  </p>
                ) : (
                  <label className="block space-y-1">
                    <span className="text-xs text-fg-muted">Sem conquista específica? Escolha o aluno:</span>
                    <select value={alunoLivre} onChange={(e) => setAlunoLivre(e.target.value)} className="h-11 w-full rounded-md border border-border bg-bg px-2 text-base">
                      <option value="">Selecione…</option>
                      {alunos.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <textarea value={msg} onChange={(e) => setMsg(e.target.value.slice(0, 600))} rows={5} placeholder={EXEMPLO} aria-label="Mensagem de reconhecimento" className="w-full rounded-md border border-border bg-bg p-3 text-base" />
                <div className="flex items-start justify-between gap-2 text-[11px] text-fg-subtle">
                  <span>Escrita por você — o aluno vê como “escrita pelo seu personal”.</span>
                  <span className="shrink-0 font-mono">{msg.length}/600</span>
                </div>
                {!msg ? (
                  <button type="button" onClick={() => setMsg(EXEMPLO)} className="alvo min-h-11 text-xs text-accent underline-offset-2 hover:underline">
                    Usar o exemplo como ponto de partida
                  </button>
                ) : null}
                <label className="flex min-h-11 items-center gap-2 text-xs">
                  <input type="checkbox" checked={notificar} onChange={(e) => setNotificar(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
                  Avisar o aluno no celular (quem ativou as notificações recebe)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={!alunoAlvo || msg.trim().length < 3} onClick={() => setPreview(true)} className="touch rounded-lg border border-border px-3 py-2.5 font-semibold text-fg-muted hover:text-fg disabled:opacity-50">
                    Ver card
                  </button>
                  <button type="button" disabled={enviando || !alunoAlvo || msg.trim().length < 3} onClick={() => void enviar()} className="touch rounded-lg bg-accent px-3 py-2.5 font-bold text-bg disabled:opacity-50">
                    {enviando ? "Enviando…" : nomeAlvo ? `🎉 Enviar para ${nomeAlvo.split(" ")[0]}` : "🎉 Enviar"}
                  </button>
                </div>
                {!alunoAlvo || msg.trim().length < 3 ? <p className="text-[11px] text-fg-subtle">{!alunoAlvo ? "Escolha uma conquista na lista (ou o aluno acima) para liberar os botões." : "Escreva a mensagem (ou use o exemplo) para liberar os botões."}</p> : null}
              </CardBody>
            </Card>
          </div>

          {enviados.length ? (
            <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold">📨 Enviados recentemente ({enviados.length})</summary>
              <ul className="mt-2 space-y-2">
                {enviados.map((e) => (
                  <li key={e.id} className="border-l-2 border-accent/50 pl-3">
                    <p className="text-xs text-fg-subtle">
                      {e.aluno} · {fmt.format(new Date(e.data))}
                    </p>
                    <p className="break-words text-sm">{e.mensagem}</p>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>

      <section className="space-y-2" aria-label="Números">
        <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">📈 Conquistas e aderência da turma ({dias} dias)</summary>
          <div className="mt-2 space-y-3">
            <dl className="grid grid-cols-2 gap-2">
              {(
                [
                  ["Medalhas conquistadas", resultados.medalhas],
                  ["Retomadas após pausa", resultados.retomadas],
                  ["Treinos com recorde", resultados.recordes],
                  ["Vitrine aberta", metricas.vitrines],
                  ["Coleção completa aberta", metricas.colecoes],
                  ["Explicações abertas", `${metricas.explicacoes} (${metricas.alunosQueLeram} aluno${metricas.alunosQueLeram === 1 ? "" : "s"})`],
                  ["Aderência da turma — 28 dias", resultados.aderencia28 != null ? `${resultados.aderencia28}%` : "—"],
                  ["Aderência — 60 dias", resultados.aderencia60 != null ? `${resultados.aderencia60}%` : "—"],
                  ["Aderência — 90 dias", resultados.aderencia90 != null ? `${resultados.aderencia90}%` : "—"],
                ] as const
              ).map(([r, v]) => (
                <Caixa key={r} rotulo={r} valor={v} />
              ))}
            </dl>
            <p className="text-[11px] text-fg-subtle">Números agregados da turma ativa (aderência = treinos válidos ÷ meta, sem pausas combinadas). Mostram tendência, não causa: não dá para afirmar que as medalhas fizeram alguém treinar mais. Nenhum ranking entre alunos é exibido.</p>
          </div>
        </details>

        <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">📸 Uso do “Meu Chalalá” ({dias} dias)</summary>
          <div className="mt-2 space-y-3">
            <dl className="grid grid-cols-2 gap-2">
              {(
                [
                  ["Telas de conclusão vistas", metricas.conclusoes],
                  ["Editores abertos", metricas.editores],
                  ["Cards gerados", metricas.cardsGerados],
                  ["Alunos que geraram card", metricas.alunosQueGeraram],
                  ["Imagens baixadas", metricas.downloads],
                  ["Compartilhar acionado", metricas.compartilhamentos],
                  ["Compartilhar cancelado", metricas.cancelados],
                  ["Visitas pelo link", metricas.visitas],
                ] as const
              ).map(([r, v]) => (
                <Caixa key={r} rotulo={r} valor={v} />
              ))}
            </dl>
            {metricas.taxaAbertura != null ? <p className="text-xs text-fg-muted">Em {metricas.taxaAbertura}% das telas de conclusão o aluno abriu o editor de card. Cards também podem vir do histórico e do resumo de 30 dias.</p> : null}
            {metricas.porModelo.length ? (
              <p className="break-words text-xs text-fg-muted">
                Modelos: {metricas.porModelo.map((m) => `${ROTULO_MODELO[m.modelo as ModeloId] ?? m.modelo} (${m.cards})`).join(" · ")}
                <br />
                Formatos: {metricas.porFormato.map((f) => `${FORMATOS[f.formato as Formato]?.rotulo ?? f.formato} (${f.cards})`).join(" · ")}
              </p>
            ) : null}
            <p className="text-[11px] text-fg-subtle">“Compartilhar acionado” é a abertura da lista de apps do celular — não confirma que algo foi publicado. Nenhuma foto ou texto do aluno é registrado.</p>
          </div>
        </details>
      </section>

      {preview ? <EditorCard dados={{ reconhecimento: { mensagem: msg.trim(), autor, conquista: sel?.titulo ?? null }, data: diaLocal(new Date().toISOString()) }} modeloInicial="reconhecimento" nome="" origem="reconhecimento" registrarEventos={false} onFechar={() => setPreview(false)} /> : null}
    </div>
  );
}

function Numero({ valor, rotulo, destaque }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`flex flex-col rounded-xl border bg-card px-3 py-2.5 ${destaque ? "border-warning/50" : "border-border"}`}>
      <dt className="order-2 text-[11px] font-semibold leading-tight text-fg-muted">{rotulo}</dt>
      <dd className={`order-1 font-mono text-2xl font-bold leading-tight ${destaque ? "text-warning" : ""}`}>{valor}</dd>
    </div>
  );
}

function Caixa({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface p-2">
      <dt className="text-[11px] leading-tight text-fg-subtle">{rotulo}</dt>
      <dd className="font-mono text-lg font-bold">{valor}</dd>
    </div>
  );
}
