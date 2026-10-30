"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { haQuanto, LIMITES_RECADO, RECADO_ACOMPANHANDO, RECADOS_PRONTOS } from "@/lib/ao-vivo/regras";
import type { TreinandoAgora } from "@/lib/data/ao-vivo";
import type { OutraAtividadeAoVivo } from "@/lib/ao-vivo/regras";

const ATUALIZAR_MS = 15_000;

async function mandarRecado(sessaoId: string, texto: string): Promise<{ ok: boolean; notificados: number; error?: string }> {
  const r = await fetch("/api/ao-vivo/recado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessao_id: sessaoId, texto }) }).catch(() => null);
  const d = (await r?.json().catch(() => null)) as { notificados?: number; error?: string } | null;
  return { ok: !!r?.ok, notificados: d?.notificados ?? 0, error: d?.error };
}

export function AoVivoClient({ inicial, outrasInicial, agoraInicial }: { inicial: TreinandoAgora[]; outrasInicial: OutraAtividadeAoVivo[]; agoraInicial: string }) {
  const [lista, setLista] = useState(inicial);
  const [outras, setOutras] = useState(outrasInicial);
  const [agora, setAgora] = useState(() => Date.parse(agoraInicial));
  const [aberto, setAberto] = useState<string | null>(null);
  const [avisando, setAvisando] = useState<string | null>(null);
  const toast = useToast();

  /** “Tô de olho”: avisa que o personal está acompanhando ao vivo (um ou todos que estão treinando). */
  async function avisarAcompanhando(alvos: TreinandoAgora[], chave: string) {
    if (!alvos.length) return;
    setAvisando(chave);
    const rs = await Promise.all(alvos.map((t) => mandarRecado(t.sessaoId, RECADO_ACOMPANHANDO)));
    setAvisando(null);
    const ok = rs.filter((r) => r.ok).length;
    if (!ok) return toast.error(rs[0]?.error ?? "Não foi possível avisar agora.");
    toast.success(alvos.length === 1 ? `${alvos[0].nome.split(" ")[0]} já sabe que você está de olho! 👀` : `${ok} ${ok === 1 ? "pessoa avisada" : "pessoas avisadas"} de que você está de olho! 👀`);
    void atualizar();
  }

  async function atualizar() {
    const r = await fetch("/api/ao-vivo", { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null) as { agora: string; lista: TreinandoAgora[]; outras?: OutraAtividadeAoVivo[] } | null;
    if (!r) return;
    setLista(r.lista);
    setOutras(r.outras ?? []);
    setAgora(Date.parse(r.agora));
  }
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void atualizar();
    }, ATUALIZAR_MS);
    return () => window.clearInterval(t);
  }, []);

  const blocoOutras = outras.length ? (
    <section aria-label="Cardio e mobilidade agora" className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">❤️‍🔥 Cardio e 🧘 mobilidade agora</h2>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2" aria-live="polite">
        {outras.map((o) => (
          <li key={o.id} className={`flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-3 ${o.tipo === "cardio" ? "border-danger/40" : "border-accent/40"}`}>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full motion-safe:animate-pulse ${o.tipo === "cardio" ? "bg-danger" : "bg-accent"}`} aria-hidden />
            <span className="min-w-0 flex-1">
              <Link href={`/treinador/alunos/${o.alunoId}`} className="block truncate font-bold hover:underline">{o.nome}{o.visitante ? <span className="ml-1 text-xs font-normal text-fg-muted">· visitante</span> : null}</Link>
              <span className="block text-sm text-fg-muted">{o.atividade} · começou {haQuanto(o.iniciadoEm, agora)}</span>
            </span>
            <span className="shrink-0 rounded-full bg-fg/10 px-2 py-1 text-[11px] font-bold">{o.tipo === "cardio" ? "No cardio" : "Na mobilidade"}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-fg-subtle">Aparece quem tocou em “▶ Começar” no cronômetro do cardio ou na mobilidade. Cardio só anotado depois, sem o cronômetro, não aparece aqui.</p>
    </section>
  ) : null;

  if (!lista.length) {
    return (
      <div className="space-y-4">
        {blocoOutras}
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
          <p className="text-3xl" aria-hidden>😴</p>
          <p className="mt-2 font-semibold text-fg">{outras.length ? "Ninguém na musculação agora." : "Ninguém treinando agora."}</p>
          <p>Quando alguém começar o treino, o cardio ou a mobilidade, aparece aqui em até 15 segundos.</p>
        </div>
      </div>
    );
  }
  const semAviso = lista.filter((t) => !t.presencial && !t.recados.some((r) => r.texto === RECADO_ACOMPANHANDO));
  return (
    <div className="space-y-3">
    {semAviso.length > 1 ? (
      <button type="button" disabled={!!avisando} onClick={() => void avisarAcompanhando(semAviso, "todos")} className="alvo flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg disabled:opacity-60">
        {avisando === "todos" ? "Avisando…" : `👀 Avisar os ${semAviso.length} que estou acompanhando ao vivo`}
      </button>
    ) : null}
    <ul className="grid gap-3 md:grid-cols-2" aria-live="polite">
      {lista.map((t) => {
        const pct = t.series.planejadas ? Math.min(100, Math.round((t.series.feitas / t.series.planejadas) * 100)) : 0;
        return (
          <li key={t.sessaoId} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/treinador/alunos/${t.alunoId}`} className="block truncate text-lg font-bold hover:underline">{t.nome}</Link>
                <p className="truncate text-sm text-fg-muted">
                  {t.treino}
                  {t.extra ? " · extra" : ""}
                  {t.visitante ? " · visitante" : ""}
                  {t.presencial ? " · aula presencial" : ""}
                </p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${t.estado === "treinando" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                <span className={`h-2 w-2 rounded-full ${t.estado === "treinando" ? "bg-success motion-safe:animate-pulse" : "bg-warning"}`} aria-hidden />
                {t.estado === "treinando" ? "Treinando" : "Parado"}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-fg-muted">
                <span>{t.series.feitas} de {t.series.planejadas || "?"} séries</span>
                <span>começou {haQuanto(t.iniciadoEm, agora)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-border" aria-hidden>
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-sm">
                {t.exercicioAtual ? <>Agora: <strong>{t.exercicioAtual}</strong> · </> : null}
                <span className="text-fg-muted">última série {t.series.feitas ? haQuanto(t.ultimaAtividade, agora) : "—"}</span>
              </p>
            </div>
            {t.recados.length ? (
              <ul className="space-y-1 rounded-lg bg-bg/60 p-2 text-xs text-fg-muted">
                {t.recados.slice(-3).map((r) => <li key={r.id}>💬 “{r.texto}” · {haQuanto(r.em, agora)}</li>)}
              </ul>
            ) : null}
            {t.presencial ? null : t.recados.some((r) => r.texto === RECADO_ACOMPANHANDO) ? (
              <p className="text-center text-xs font-semibold text-success">👀 Já sabe que você está acompanhando ao vivo</p>
            ) : (
              <button type="button" disabled={!!avisando} onClick={() => void avisarAcompanhando([t], t.sessaoId)} className="alvo w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-bg disabled:opacity-60">
                {avisando === t.sessaoId ? "Avisando…" : "👀 Avisar que estou acompanhando ao vivo"}
              </button>
            )}
            {t.presencial ? null : aberto === t.sessaoId ? (
              <Recado sessaoId={t.sessaoId} nome={t.nome.split(" ")[0]} onFechar={() => setAberto(null)} onEnviado={() => { setAberto(null); void atualizar(); }} />
            ) : (
              <button type="button" onClick={() => setAberto(t.sessaoId)} className="alvo w-full rounded-xl border border-accent/60 px-4 py-2.5 text-sm font-bold text-accent">
                💬 Mandar recado
              </button>
            )}
          </li>
        );
      })}
    </ul>
    {blocoOutras}
    </div>
  );
}

function Recado({ sessaoId, nome, onFechar, onEnviado }: { sessaoId: string; nome: string; onFechar: () => void; onEnviado: () => void }) {
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(t: string) {
    if (!t.trim() || enviando) return;
    setEnviando(true);
    const d = await mandarRecado(sessaoId, t);
    setEnviando(false);
    if (!d.ok) return toast.error(d.error ?? "Não foi possível enviar agora.");
    toast.success(d.notificados ? `Recado enviado! Chegou no celular de ${nome}.` : `Recado enviado! Aparece na tela do treino de ${nome}.`);
    onEnviado();
  }
  return (
    <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 p-3">
      <p className="text-xs font-semibold text-fg-muted">Toque num recado pronto ou escreva o seu:</p>
      <div className="flex flex-wrap gap-1.5">
        {RECADOS_PRONTOS.map((p) => (
          <button key={p} type="button" disabled={enviando} onClick={() => void enviar(p)} className="alvo rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-accent disabled:opacity-50">
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value.slice(0, LIMITES_RECADO.maxCaracteres))} onKeyDown={(e) => { if (e.key === "Enter") void enviar(texto); }} placeholder={`Escreva para ${nome}…`} aria-label="Recado" className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-sm" />
        <button type="button" disabled={!texto.trim() || enviando} onClick={() => void enviar(texto)} className="alvo h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-bg disabled:opacity-50">
          {enviando ? "…" : "Enviar"}
        </button>
      </div>
      <button type="button" onClick={onFechar} className="w-full py-1 text-xs text-fg-muted underline-offset-2 hover:underline">Fechar</button>
    </div>
  );
}
