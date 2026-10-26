"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { haQuanto, LIMITES_RECADO, RECADOS_PRONTOS } from "@/lib/ao-vivo/regras";
import type { TreinandoAgora } from "@/lib/data/ao-vivo";

const ATUALIZAR_MS = 15_000;

export function AoVivoClient({ inicial, agoraInicial }: { inicial: TreinandoAgora[]; agoraInicial: string }) {
  const [lista, setLista] = useState(inicial);
  const [agora, setAgora] = useState(() => Date.parse(agoraInicial));
  const [aberto, setAberto] = useState<string | null>(null);

  async function atualizar() {
    const r = await fetch("/api/ao-vivo", { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null) as { agora: string; lista: TreinandoAgora[] } | null;
    if (!r) return;
    setLista(r.lista);
    setAgora(Date.parse(r.agora));
  }
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void atualizar();
    }, ATUALIZAR_MS);
    return () => window.clearInterval(t);
  }, []);

  if (!lista.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
        <p className="text-3xl" aria-hidden>😴</p>
        <p className="mt-2 font-semibold text-fg">Ninguém treinando agora.</p>
        <p>Quando alguém começar o treino, aparece aqui em até 15 segundos.</p>
      </div>
    );
  }
  return (
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
  );
}

function Recado({ sessaoId, nome, onFechar, onEnviado }: { sessaoId: string; nome: string; onFechar: () => void; onEnviado: () => void }) {
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(t: string) {
    if (!t.trim() || enviando) return;
    setEnviando(true);
    const r = await fetch("/api/ao-vivo/recado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessao_id: sessaoId, texto: t }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { notificados?: number; error?: string } | null;
    setEnviando(false);
    if (!r?.ok) return toast.error(d?.error ?? "Não foi possível enviar agora.");
    toast.success(d?.notificados ? `Recado enviado! Chegou no celular de ${nome}.` : `Recado enviado! Aparece na tela do treino de ${nome}.`);
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
