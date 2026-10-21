"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import type { MetricasChalala } from "@/lib/chalala/metricas";
import { ROTULO_MODELO, FORMATOS, type ModeloId, type Formato } from "@/lib/chalala/card";

const EditorCard = dynamic(() => import("@/components/chalala/EditorCard"), { ssr: false });

type Conquista = { id: string; alunoId: string; aluno: string; codigo: string; categoria: string; titulo: string; descricao: string | null; data: string; reconhecida: boolean };
type Resultados = { aderencia28: number | null; aderencia60: number | null; aderencia90: number | null; medalhas: number; retomadas: number; recordes: number };

/** Filtros por tipo de conquista (o personal vê o que importa celebrar). */
const TIPOS: Array<{ v: string; l: string; ok: (c: Conquista) => boolean }> = [
  { v: "", l: "Todos os tipos", ok: () => true },
  { v: "medalhas", l: "Novas medalhas", ok: (c) => c.codigo !== "recorde" && c.codigo !== "eu_voltei" },
  { v: "metas", l: "Metas e constância", ok: (c) => c.categoria === "constancia" },
  { v: "retornos", l: "Retornos após pausa", ok: (c) => c.categoria === "retomada" },
  { v: "marcos", l: "Marcos de acompanhamento", ok: (c) => ["acompanhamento", "pratica", "comeco"].includes(c.categoria) },
  { v: "recordes", l: "Recordes pessoais", ok: (c) => c.codigo === "recorde" },
];
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
const diaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const EXEMPLO = "Você está conseguindo manter sua rotina, mesmo com os desafios do dia a dia. Essa constância merece reconhecimento!";

export function CelebrarClient({ dias, autor, alunoInicial = "", mensagemInicial = "", alunos, conquistas, enviados, metricas, resultados }: { dias: number; autor: string; alunoInicial?: string; mensagemInicial?: string; alunos: Array<{ id: string; nome: string }>; conquistas: Conquista[]; enviados: Array<{ id: string; aluno: string; mensagem: string; data: string }>; metricas: MetricasChalala; resultados: Resultados }) {
  const router = useRouter();
  const toast = useToast();
  const [filtro, setFiltro] = useState("");
  const [tipo, setTipo] = useState("");
  const [sel, setSel] = useState<Conquista | null>(null);
  const [alunoLivre, setAlunoLivre] = useState(alunoInicial);
  const [msg, setMsg] = useState(mensagemInicial);
  const [notificar, setNotificar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [preview, setPreview] = useState(false);
  const cartaoMensagem = useRef<HTMLDivElement>(null);
  const okTipo = TIPOS.find((t) => t.v === tipo)?.ok ?? (() => true);
  const lista = conquistas.filter((c) => (!filtro || c.alunoId === filtro) && okTipo(c));
  const alunoAlvo = sel?.alunoId ?? alunoLivre;

  /** Escolher uma conquista já deixa a mensagem sugerida pronta e leva até o botão de enviar. */
  function escolher(c: Conquista) {
    setSel(c);
    setMsg((atual) => (atual.trim() ? atual : EXEMPLO));
    requestAnimationFrame(() => cartaoMensagem.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section className="min-w-0 space-y-3" aria-labelledby="recentes">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="recentes" className="text-xs font-bold uppercase tracking-wider text-fg-muted">
            Conquistas recentes
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[7, 30, 90].map((n) => (
              <Link key={n} href={`/treinador/conquistas?dias=${n}`} aria-current={n === dias ? "page" : undefined} className={`whitespace-nowrap rounded-full border px-2.5 py-1 ${n === dias ? "border-accent text-accent" : "border-border text-fg-muted"}`}>
                {n} dias
              </Link>
            ))}
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo" className="h-8 max-w-full rounded-md border border-border bg-bg px-2">
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por aluno" className="h-8 max-w-full rounded-md border border-border bg-bg px-2">
              <option value="">Todos os alunos</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        {lista.length ? (
          <ul className="space-y-2">
            {lista.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => escolher(c)} aria-pressed={sel?.id === c.id} className={`w-full rounded-xl border p-3 text-left transition-colors ${sel?.id === c.id ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/50"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{c.aluno}</span>
                    <span className="text-xs text-fg-subtle">{fmt.format(new Date(c.data))}</span>
                  </div>
                  <p className="text-sm font-bold">{c.titulo}</p>
                  {c.descricao ? <p className="text-xs text-fg-muted">{c.descricao}</p> : null}
                  {c.reconhecida ? <p className="mt-1 text-[11px] font-semibold text-success">Você já reconheceu esta conquista</p> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Nenhuma conquista registrada no período. Elas aparecem quando os alunos treinam e abrem o app.</div>
        )}
      </section>

      <div className="min-w-0 space-y-5">
        <Card className="scroll-mt-20 lg:sticky lg:top-4">
          <CardBody className="space-y-3 text-sm">
            <div ref={cartaoMensagem} className="scroll-mt-20" />
            <h2 className="font-bold">Sua mensagem</h2>
            {sel ? (
              <p className="text-xs text-fg-muted">
                Para <strong className="text-fg">{sel.aluno}</strong> — {sel.titulo}{" "}
                <button type="button" onClick={() => setSel(null)} className="alvo text-accent underline-offset-2 hover:underline">
                  trocar
                </button>
              </p>
            ) : (
              <label className="block space-y-1">
                <span className="text-xs text-fg-muted">Sem conquista específica? Escolha o aluno:</span>
                <select value={alunoLivre} onChange={(e) => setAlunoLivre(e.target.value)} className="h-10 w-full rounded-md border border-border bg-bg px-2">
                  <option value="">Selecione…</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <textarea value={msg} onChange={(e) => setMsg(e.target.value.slice(0, 600))} rows={5} placeholder={EXEMPLO} aria-label="Mensagem de reconhecimento" className="w-full rounded-md border border-border bg-bg p-3" />
            <div className="flex items-center justify-between text-[11px] text-fg-subtle">
              <span>Escrita por você — o aluno vê como “escrita pelo seu personal”.</span>
              <span>{msg.length}/600</span>
            </div>
            {!msg ? (
              <button type="button" onClick={() => setMsg(EXEMPLO)} className="alvo text-xs text-accent underline-offset-2 hover:underline">
                Usar o exemplo como ponto de partida
              </button>
            ) : null}
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={notificar} onChange={(e) => setNotificar(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
              Avisar o aluno no celular (se ele ativou notificações)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!alunoAlvo || msg.trim().length < 3} onClick={() => setPreview(true)} className="touch rounded-lg border border-border px-3 py-2.5 font-semibold text-fg-muted hover:text-fg disabled:opacity-50">
                Ver card
              </button>
              <button type="button" disabled={enviando || !alunoAlvo || msg.trim().length < 3} onClick={() => void enviar()} className="touch rounded-lg bg-accent px-3 py-2.5 font-bold text-bg disabled:opacity-50">
                {enviando ? "Enviando…" : "Enviar"}
              </button>
            </div>
            {!alunoAlvo || msg.trim().length < 3 ? <p className="text-[11px] text-fg-subtle">{!alunoAlvo ? "Escolha uma conquista na lista (ou o aluno acima) para liberar os botões." : "Escreva a mensagem (ou use o exemplo) para liberar os botões."}</p> : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3 text-sm">
            <h2 className="font-bold">Uso do “Meu Chalalá” ({dias} dias)</h2>
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
                <div key={r} className="rounded-lg bg-surface p-2">
                  <dt className="text-[11px] text-fg-subtle">{r}</dt>
                  <dd className="font-mono text-lg font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            {metricas.taxaAbertura != null ? <p className="text-xs text-fg-muted">Em {metricas.taxaAbertura}% das telas de conclusão o aluno abriu o editor de card. Cards também podem vir do histórico e do resumo de 30 dias.</p> : null}
            {metricas.porModelo.length ? (
              <p className="text-xs text-fg-muted">
                Modelos: {metricas.porModelo.map((m) => `${ROTULO_MODELO[m.modelo as ModeloId] ?? m.modelo} (${m.cards})`).join(" · ")}
                <br />
                Formatos: {metricas.porFormato.map((f) => `${FORMATOS[f.formato as Formato]?.rotulo ?? f.formato} (${f.cards})`).join(" · ")}
              </p>
            ) : null}
            <p className="text-[11px] text-fg-subtle">“Compartilhar acionado” é a abertura da lista de apps do celular — não confirma que algo foi publicado. Nenhuma foto ou texto do aluno é registrado.</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3 text-sm">
            <h2 className="font-bold">Conquistas e aderência ({dias} dias)</h2>
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
                <div key={r} className="rounded-lg bg-surface p-2">
                  <dt className="text-[11px] text-fg-subtle">{r}</dt>
                  <dd className="font-mono text-lg font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-fg-subtle">Números agregados da turma ativa (aderência = treinos válidos ÷ meta, sem pausas combinadas). Mostram tendência, não causa: não dá para afirmar que as medalhas fizeram alguém treinar mais. Nenhum ranking entre alunos é exibido.</p>
          </CardBody>
        </Card>

        {enviados.length ? (
          <Card>
            <CardBody className="space-y-2 text-sm">
              <h2 className="font-bold">Enviados recentemente</h2>
              <ul className="space-y-2">
                {enviados.map((e) => (
                  <li key={e.id} className="border-l-2 border-accent/50 pl-3">
                    <p className="text-xs text-fg-subtle">
                      {e.aluno} · {fmt.format(new Date(e.data))}
                    </p>
                    <p className="text-sm">{e.mensagem}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>

      {preview ? <EditorCard dados={{ reconhecimento: { mensagem: msg.trim(), autor, conquista: sel?.titulo ?? null }, data: diaLocal(new Date().toISOString()) }} modeloInicial="reconhecimento" nome="" origem="reconhecimento" registrarEventos={false} onFechar={() => setPreview(false)} /> : null}
    </div>
  );
}
