"use client";

// “📋 Copiar resumo da fase” (pedido do Montinho, 14/11/2026): copia o JSON do
// período para colar no Montinho Strategy (“Colar do app”). Só o personal.
import { useState } from "react";

type Trecho = { fase: string | null; inicio: string; fim: string; atual: boolean };
const ROTULO: Record<string, string> = { adaptacao: "Adaptação", intensificacao: "Intensificação", consolidacao: "Consolidação" };
const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const hojeBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const menos = (d: string, dias: number) => new Date(Date.parse(`${d}T12:00:00Z`) - dias * 86_400_000).toISOString().slice(0, 10);

type Resumo = { treinosFeitos: number; exercicios: unknown[]; checkins: unknown[]; corpo: { inicio: unknown; fim: unknown } };

export function CopiarResumoFase({ alunoId }: { alunoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [trechos, setTrechos] = useState<Trecho[] | null>(null);
  const [inicio, setInicio] = useState(() => menos(hojeBR(), 30));
  const [fim, setFim] = useState(hojeBR);
  const [estado, setEstado] = useState<"" | "carregando" | "copiado" | "erro">("");
  const [msg, setMsg] = useState("");
  const [texto, setTexto] = useState("");

  async function abrir() {
    setAberto(true);
    if (trechos) return;
    const r = await fetch(`/api/alunos/${alunoId}/resumo-fase`).then((x) => x.json()).catch(() => null);
    const lista: Trecho[] = r?.trechos ?? [];
    setTrechos(lista);
    // Sugestão: a fase que está terminando = a atual (se já durou 7+ dias), senão a anterior.
    const sug = lista.find((t) => t.atual && t.inicio <= menos(t.fim, 7)) ?? lista.find((t) => !t.atual) ?? lista[0];
    if (sug) {
      setInicio(sug.inicio);
      setFim(sug.fim);
    }
  }

  async function copiar() {
    setEstado("carregando");
    setMsg("");
    const url = `/api/alunos/${alunoId}/resumo-fase?inicio=${inicio}&fim=${fim}`;
    const pedir = fetch(url).then(async (r) => {
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.resumo) throw new Error(j?.error ?? "Não foi possível montar o resumo.");
      return j.resumo as Resumo;
    });
    const comoTexto = pedir.then((r) => JSON.stringify(r, null, 2));
    try {
      // O iPhone só copia no mesmo toque: o ClipboardItem aceita o texto que ainda vai chegar.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": comoTexto.then((t) => new Blob([t], { type: "text/plain" })) })]);
      } else {
        await navigator.clipboard.writeText(await comoTexto);
      }
      const r = await pedir;
      setTexto(await comoTexto);
      setEstado("copiado");
      setMsg(`✅ Copiado! ${r.treinosFeitos} ${r.treinosFeitos === 1 ? "treino" : "treinos"}, ${r.exercicios.length} exercícios principais, ${r.checkins.length} check-ins${r.corpo.inicio || r.corpo.fim ? ", medidas" : ""}. Agora é só “Colar do app” no Strategy.`);
    } catch (e) {
      try {
        setTexto(await comoTexto);
        setEstado("erro");
        setMsg("Não deu para copiar sozinho. Toque no texto abaixo, selecione tudo e copie.");
      } catch {
        setEstado("erro");
        setMsg(e instanceof Error ? e.message : "Não foi possível montar o resumo.");
      }
    }
  }

  if (!aberto) {
    return (
      <button type="button" onClick={abrir} className="touch flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block font-bold">📋 Copiar resumo da fase</span>
          <span className="block text-xs text-fg-muted">Para o documento de troca de fase no Montinho Strategy</span>
        </span>
        <span aria-hidden className="text-accent">→</span>
      </button>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-accent/50 bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">📋 Copiar resumo da fase</p>
        <button type="button" onClick={() => setAberto(false)} className="alvo text-sm text-fg-muted" aria-label="Fechar">✕</button>
      </div>
      {trechos === null ? <p className="text-xs text-fg-muted">Buscando as fases…</p> : trechos.length ? (
        <div className="flex flex-wrap gap-2">
          {trechos.slice(0, 4).map((t) => (
            <button
              key={`${t.inicio}-${t.fase}`}
              type="button"
              onClick={() => { setInicio(t.inicio); setFim(t.fim); }}
              className={`rounded-full border px-3 py-1.5 text-xs ${inicio === t.inicio && fim === t.fim ? "border-accent bg-accent/15 font-bold" : "border-border text-fg-muted"}`}
            >
              {t.fase ? ROTULO[t.fase] ?? t.fase : "Sem fase"} · {br(t.inicio).slice(0, 5)} a {br(t.fim).slice(0, 5)}{t.atual ? " (atual)" : ""}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="space-y-1"><span className="text-fg-muted">De</span><input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} className="h-10 w-full rounded-md border border-border bg-bg px-2" /></label>
        <label className="space-y-1"><span className="text-fg-muted">Até</span><input type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} className="h-10 w-full rounded-md border border-border bg-bg px-2" /></label>
      </div>
      <button type="button" onClick={copiar} disabled={estado === "carregando" || !inicio || !fim} className="touch w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg disabled:opacity-50">
        {estado === "carregando" ? "Montando…" : "📋 Copiar resumo"}
      </button>
      {msg ? <p className={`text-xs ${estado === "erro" ? "text-warning" : "text-success"}`}>{msg}</p> : null}
      {texto && estado === "erro" ? <textarea readOnly value={texto} onFocus={(e) => e.currentTarget.select()} className="h-40 w-full rounded-md border border-border bg-bg p-2 font-mono text-[10px]" /> : null}
    </section>
  );
}
