"use client";

// Blocos do WOD/HYROX/circuito na tela do treino (Multimodalidade, fase 3).
// Fica DENTRO da tela de treino de sempre: começar, terminar, troféus e card
// continuam iguais. Cada bloco mostra o que fazer, o relógio do formato e o
// resultado (RX / Scaled / Adaptado). Aquecimento, técnica e volta à calma só
// pedem “feito”. HYROX: “▶ Começar a prova” marca o tempo de cada trecho.
import { useEffect, useMemo, useState } from "react";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { RelogioWod } from "./RelogioWod";
import { resumoBloco, ehSimuladoCompleto } from "@/lib/modalidades/blocos";
import { camposDoResultado, pedeResultado, textoResultado, type ResultadoBloco } from "@/lib/modalidades/resultado";
import { relogioTexto } from "@/lib/modalidades/relogio";
import { CONDICOES, FORMATOS, TIPOS_BLOCO, type BlocoTreino, type Condicao } from "@/lib/modalidades/tipos";

type Props = {
  sessaoId: string;
  blocos: BlocoTreino[];
  ativo: boolean;
  /** Avisa a tela do treino quando um resultado entra (atualiza o “feito”). */
  onSalvo?: (feitas: number) => void;
};

/** Hora do aparelho fora do render (só em toques). */
const agoraMs = () => Date.now();
const COM_RELOGIO = new Set(["amrap", "emom", "intervalo", "for_time", "rounds_for_time", "chipper", "tabata", "death_by", "ladder", "circuito"]);
const ehCorridaOuEstacao = (b: BlocoTreino) => b.tipo === "corrida" || b.tipo === "estacao";

async function enviar(sessaoId: string, corpo: Record<string, unknown>): Promise<{ ok: boolean; feitas?: number; error?: string }> {
  const r = await fetch(`/api/sessoes/${sessaoId}/blocos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
  const d = (await r?.json().catch(() => null)) as { feitas?: number; error?: string } | null;
  return { ok: !!r?.ok, feitas: d?.feitas, error: d?.error ?? (r ? undefined : "Sem internet agora. Tente de novo em instantes.") };
}

export function BlocosWod({ sessaoId, blocos, ativo, onSalvo }: Props) {
  const [feitos, setFeitos] = useState<Record<string, ResultadoBloco>>({});
  const [relogio, setRelogio] = useState<string | null>(null);
  const [anotar, setAnotar] = useState<{ id: string; tempo?: number } | null>(null);
  const [prova, setProva] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const completo = useMemo(() => ehSimuladoCompleto(blocos), [blocos]);
  const trechos = blocos.filter(ehCorridaOuEstacao);

  useEffect(() => {
    if (!sessaoId) return;
    let vivo = true;
    void fetch(`/api/sessoes/${sessaoId}/blocos`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { blocos?: ResultadoBloco[] } | null) => {
        if (vivo && d?.blocos) setFeitos(Object.fromEntries(d.blocos.map((b) => [b.bloco_id, b])));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [sessaoId]);

  async function salvar(b: BlocoTreino, r: Omit<ResultadoBloco, "bloco_id" | "tipo">) {
    setErro(null);
    const corpo = { ...r, bloco_id: b.id, tipo: b.tipo, formato: b.formato ?? null, ordem: blocos.indexOf(b), client_key: `${sessaoId}:${b.id}`, benchmark: b.benchmark ?? null, ...(ehCorridaOuEstacao(b) ? { completo } : {}) };
    const d = await enviar(sessaoId, corpo);
    if (!d.ok) {
      setErro(d.error ?? "Não foi possível salvar.");
      return false;
    }
    setFeitos((f) => ({ ...f, [b.id]: { ...corpo } as ResultadoBloco }));
    if (d.feitas != null) onSalvo?.(d.feitas);
    return true;
  }

  const bRelogio = relogio ? blocos.find((b) => b.id === relogio) : null;
  const bAnotar = anotar ? blocos.find((b) => b.id === anotar.id) : null;

  return (
    <section aria-label="Blocos do treino" className="space-y-2">
      {trechos.length && ativo ? (
        <button type="button" onClick={() => setProva(true)} className="alvo w-full rounded-xl bg-accent px-4 py-3 text-base font-black text-bg">
          ▶ {Object.keys(feitos).some((id) => trechos.some((t) => t.id === id)) ? "Continuar a prova" : "Começar a prova"} ({completo ? "simulado completo" : `${trechos.length} trechos`})
        </button>
      ) : null}
      {erro ? <p role="alert" className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
      <ol className="space-y-2">
        {blocos.map((b) => {
          const info = TIPOS_BLOCO[b.tipo];
          const r = feitos[b.id];
          const comResultado = pedeResultado(b.tipo);
          if (b.tipo === "forca") {
            return (
              <li key={b.id} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
                <span className="font-bold">{info.emoji} {info.nome}</span>
                <span className="block text-xs text-fg-muted">Logo abaixo: séries, repetições e carga, como sempre.</span>
              </li>
            );
          }
          return (
            <li key={b.id} className={`rounded-xl border bg-card p-3 ${r ? "border-success/50" : "border-border"}`}>
              <div className="flex items-start gap-2">
                <span className="text-lg" aria-hidden>{info.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{ehCorridaOuEstacao(b) ? resumoBloco(b) : b.formato ? `${info.nome} · ${resumoBloco(b)}` : b.titulo || info.nome}</p>
                  {b.formato && FORMATOS[b.formato] && !ehCorridaOuEstacao(b) ? <p className="text-[11px] text-fg-subtle">{FORMATOS[b.formato].explica}</p> : null}
                </div>
                {r ? <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">✓ {comResultado ? textoResultado({ ...r, tipo: b.tipo }) : "Feito"}</span> : null}
              </div>
              {b.texto ? <p className="mt-1.5 whitespace-pre-line text-sm text-fg-muted">{b.texto}</p> : null}
              {b.movimentos.length && !ehCorridaOuEstacao(b) ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {b.movimentos.map((m, i) => (
                    <li key={i} className="flex flex-wrap gap-x-2">
                      <span className="font-semibold">{m.reps ? `${m.reps} ` : ""}{m.nome}</span>
                      {m.carga ? <span className="text-fg-muted">{m.carga}</span> : null}
                      {m.distancia_m ? <span className="text-fg-muted">{m.distancia_m} m</span> : null}
                      {m.calorias ? <span className="text-fg-muted">{m.calorias} cal</span> : null}
                      {m.scaled ? <span className="w-full text-xs text-fg-subtle">Scaled: {m.scaled}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {ativo ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {comResultado && b.formato && COM_RELOGIO.has(b.formato) ? (
                    <button type="button" onClick={() => setRelogio(b.id)} className="alvo rounded-lg bg-accent px-3 py-2 text-sm font-bold text-bg">⏱ Relógio</button>
                  ) : null}
                  {comResultado ? (
                    <button type="button" onClick={() => setAnotar({ id: b.id })} className="alvo rounded-lg border border-accent/60 px-3 py-2 text-sm font-bold text-accent">{r ? "✏️ Corrigir resultado" : "📝 Anotar resultado"}</button>
                  ) : !r ? (
                    <button type="button" onClick={() => void salvar(b, { concluido: true })} className="alvo rounded-lg border border-border px-3 py-2 text-sm font-semibold">✓ Feito</button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {bRelogio ? (
        <RelogioWod
          sessaoId={sessaoId}
          bloco={bRelogio}
          onFechar={() => setRelogio(null)}
          onTerminar={(seg, noTempo) => {
            setRelogio(null);
            setAnotar({ id: bRelogio.id, tempo: noTempo && bRelogio.formato !== "for_time" && bRelogio.formato !== "rounds_for_time" && bRelogio.formato !== "chipper" && bRelogio.formato !== "ladder" ? undefined : seg });
          }}
        />
      ) : null}
      {bAnotar ? <AnotarResultado bloco={bAnotar} tempoInicial={anotar?.tempo} anterior={feitos[bAnotar.id]} onFechar={() => setAnotar(null)} onSalvar={async (r) => { if (await salvar(bAnotar, r)) setAnotar(null); }} /> : null}
      {prova ? <ProvaHyrox sessaoId={sessaoId} trechos={trechos} feitos={feitos} onFechar={() => setProva(false)} onTrecho={(b, seg) => salvar(b, { concluido: true, tempo_seg: seg, distancia_m: b.movimentos[0]?.distancia_m ?? null, condicao: "rx" })} /> : null}
    </section>
  );
}

function CampoTempo({ seg, onChange }: { seg: number | null; onChange: (s: number | null) => void }) {
  const m = seg != null ? Math.floor(seg / 60) : null;
  const s = seg != null ? seg % 60 : null;
  return (
    <span className="flex items-center gap-1">
      <CampoNumero valor={m} min={0} max={600} onChange={(v) => onChange(v * 60 + (s ?? 0))} onVazio={() => onChange(s ? s : null)} aria-label="Minutos" className="h-11 w-16 rounded-lg border border-border bg-bg px-2 text-center text-lg" />
      <span className="font-bold">:</span>
      <CampoNumero valor={s} min={0} max={59} onChange={(v) => onChange((m ?? 0) * 60 + v)} onVazio={() => onChange(m ? m * 60 : null)} aria-label="Segundos" className="h-11 w-16 rounded-lg border border-border bg-bg px-2 text-center text-lg" />
    </span>
  );
}

function AnotarResultado({ bloco, tempoInicial, anterior, onFechar, onSalvar }: { bloco: BlocoTreino; tempoInicial?: number; anterior?: ResultadoBloco; onFechar: () => void; onSalvar: (r: Omit<ResultadoBloco, "bloco_id" | "tipo">) => Promise<void> }) {
  const campos = camposDoResultado(bloco.tipo, bloco.formato);
  const ehForTime = bloco.formato === "for_time" || bloco.formato === "rounds_for_time" || bloco.formato === "chipper" || bloco.formato === "ladder";
  const nIntervalos = bloco.formato === "emom" ? Math.ceil(((bloco.minutos ?? 10) * 60) / (bloco.intervalo_seg || 60)) : bloco.formato === "tabata" || bloco.formato === "intervalo" ? bloco.rounds ?? 8 : 0;
  const [condicao, setCondicao] = useState<Condicao>(anterior?.condicao ?? "rx");
  const [concluido, setConcluido] = useState(anterior?.concluido ?? true);
  const [tempo, setTempo] = useState<number | null>(anterior?.tempo_seg ?? tempoInicial ?? null);
  const [rounds, setRounds] = useState<number | null>(anterior?.rounds ?? null);
  const [reps, setReps] = useState<number | null>(anterior?.reps ?? null);
  const [carga, setCarga] = useState<number | null>(anterior?.carga_kg ?? null);
  const [distancia, setDistancia] = useState<number | null>(anterior?.distancia_m ?? bloco.movimentos[0]?.distancia_m ?? null);
  const [intervalos, setIntervalos] = useState<number[]>(anterior?.intervalos ?? Array.from({ length: nIntervalos }, () => (bloco.formato === "emom" ? 1 : 0)));
  const [mods, setMods] = useState(anterior?.modificacoes ?? "");
  const [salvando, setSalvando] = useState(false);
  const temCondicao = bloco.tipo === "metcon" || bloco.tipo === "circuito";

  async function confirmar() {
    setSalvando(true);
    await onSalvar({
      formato: bloco.formato ?? null,
      condicao: temCondicao ? condicao : "rx",
      concluido: ehForTime ? concluido : true,
      tempo_seg: campos.includes("tempo") && (!ehForTime || concluido) ? tempo : null,
      time_cap_seg: ehForTime && !concluido ? bloco.time_cap_seg ?? null : null,
      rounds: campos.includes("rounds") ? rounds : null,
      reps: campos.includes("reps") && (!ehForTime || !concluido || bloco.formato === "tabata") ? reps : null,
      carga_kg: campos.includes("carga") ? carga : null,
      distancia_m: campos.includes("distancia") ? distancia : null,
      intervalos: campos.includes("intervalos") || ((bloco.formato === "tabata" || bloco.formato === "intervalo") && intervalos.some((x) => x > 0)) ? intervalos : null,
      modificacoes: mods.trim() || null,
    });
    setSalvando(false);
  }

  const linha = "flex flex-wrap items-center justify-between gap-2 text-sm font-semibold";
  return (
    <div role="dialog" aria-modal="true" aria-label="Anotar resultado" className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center" onClick={onFechar}>
      <div className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-black">📝 {resumoBloco(bloco)}</p>
        {temCondicao ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-fg-muted">Como você fez?</p>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup">
              {(Object.keys(CONDICOES) as Condicao[]).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={condicao === c} onClick={() => setCondicao(c)} className={`alvo rounded-lg border px-2 py-2 text-sm font-bold ${condicao === c ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>
                  {CONDICOES[c].nome}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-fg-subtle">{CONDICOES[condicao].explica} Adaptar também é evolução.</p>
          </div>
        ) : null}
        {ehForTime ? (
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => setConcluido(true)} className={`alvo rounded-lg border py-2 text-sm font-bold ${concluido ? "border-success bg-success/15 text-success" : "border-border"}`}>🏁 Terminei</button>
            <button type="button" onClick={() => setConcluido(false)} className={`alvo rounded-lg border py-2 text-sm font-bold ${!concluido ? "border-warning bg-warning/15 text-warning" : "border-border"}`}>⏰ Estourou o tempo</button>
          </div>
        ) : null}
        {campos.includes("tempo") && (!ehForTime || concluido) ? <label className={linha}>Tempo <CampoTempo seg={tempo} onChange={setTempo} /></label> : null}
        {campos.includes("rounds") ? <label className={linha}>{bloco.formato === "death_by" ? "Até qual minuto chegou" : "Rounds completos"} <CampoNumero valor={rounds} min={0} max={1000} onChange={setRounds} onVazio={() => setRounds(null)} className="h-11 w-24 rounded-lg border border-border bg-bg px-2 text-center text-lg" /></label> : null}
        {campos.includes("reps") && (!ehForTime || !concluido) ? <label className={linha}>{bloco.formato === "amrap" ? "Repetições a mais" : ehForTime ? "Repetições feitas até o limite" : "Repetições no total"} <CampoNumero valor={reps} min={0} max={100000} onChange={setReps} onVazio={() => setReps(null)} className="h-11 w-24 rounded-lg border border-border bg-bg px-2 text-center text-lg" /></label> : null}
        {campos.includes("distancia") ? <label className={linha}>Distância (m) <CampoNumero valor={distancia} min={0} max={200000} onChange={setDistancia} onVazio={() => setDistancia(null)} className="h-11 w-24 rounded-lg border border-border bg-bg px-2 text-center text-lg" /></label> : null}
        {campos.includes("carga") ? <label className={linha}>Carga (kg, opcional) <CampoNumero valor={carga} min={0} max={1000} decimal onChange={setCarga} onVazio={() => setCarga(null)} className="h-11 w-24 rounded-lg border border-border bg-bg px-2 text-center text-lg" /></label> : null}
        {bloco.formato === "emom" ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-fg-muted">Toque nos minutos em que não deu para completar:</p>
            <div className="flex flex-wrap gap-1.5">
              {intervalos.map((v, i) => (
                <button key={i} type="button" onClick={() => setIntervalos((x) => x.map((y, j) => (j === i ? (y ? 0 : 1) : y)))} className={`h-10 w-10 rounded-lg border text-sm font-bold ${v ? "border-success bg-success/15 text-success" : "border-danger bg-danger/10 text-danger"}`} aria-label={`Minuto ${i + 1}: ${v ? "completo" : "não completou"}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        ) : null}
        {bloco.formato === "tabata" || bloco.formato === "intervalo" ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-fg-muted">Repetições em cada round (opcional):</p>
            <div className="grid grid-cols-4 gap-1.5">
              {intervalos.map((v, i) => (
                <CampoNumero key={i} valor={v || null} min={0} max={1000} onChange={(n) => setIntervalos((x) => x.map((y, j) => (j === i ? n : y)))} onVazio={() => setIntervalos((x) => x.map((y, j) => (j === i ? 0 : y)))} aria-label={`Round ${i + 1}`} placeholder={`R${i + 1}`} className="h-10 rounded-lg border border-border bg-bg px-1 text-center" />
              ))}
            </div>
          </div>
        ) : null}
        {temCondicao && condicao !== "rx" ? (
          <label className="block space-y-1 text-xs font-semibold text-fg-muted">O que você mudou? (movimento, carga, equipamento)
            <input value={mods} onChange={(e) => setMods(e.target.value.slice(0, 500))} placeholder="Ex.: pull-up com elástico, thruster com 25 kg" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg" />
          </label>
        ) : null}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={onFechar} className="alvo rounded-xl border border-border py-3 text-sm font-semibold">Cancelar</button>
          <button type="button" disabled={salvando} onClick={() => void confirmar()} className="alvo rounded-xl bg-accent py-3 text-sm font-black text-bg disabled:opacity-60">{salvando ? "Salvando…" : "Salvar resultado"}</button>
        </div>
      </div>
    </div>
  );
}

/** HYROX: um toque por trecho; o app marca o tempo de cada corrida e estação. */
function ProvaHyrox({ sessaoId, trechos, feitos, onFechar, onTrecho }: { sessaoId: string; trechos: BlocoTreino[]; feitos: Record<string, ResultadoBloco>; onFechar: () => void; onTrecho: (b: BlocoTreino, seg: number) => Promise<boolean> }) {
  const chave = `montinho-prova:${sessaoId}`;
  const [marca, setMarca] = useState<number | null>(() => {
    try {
      return Number(sessionStorage.getItem(chave)) || null;
    } catch {
      return null;
    }
  });
  const [agora, setAgora] = useState(() => Date.now());
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);
  const atual = trechos.find((t) => !feitos[t.id]) ?? null;
  const total = trechos.reduce((s, t) => s + (feitos[t.id]?.tempo_seg ?? 0), 0) + (marca ? Math.floor((agora - marca) / 1000) : 0);
  const noTrecho = marca ? Math.floor((agora - marca) / 1000) : 0;

  function iniciar() {
    const m = Date.now();
    try {
      sessionStorage.setItem(chave, String(m));
    } catch {
      // segue só na tela
    }
    setMarca(m);
  }
  async function proximo() {
    if (!atual || !marca || salvando) return;
    setSalvando(true);
    const seg = Math.max(1, Math.floor((agoraMs() - marca) / 1000));
    if (await onTrecho(atual, seg)) {
      const m = agoraMs();
      try {
        sessionStorage.setItem(chave, String(m));
      } catch {
        // segue só na tela
      }
      setMarca(m);
    }
    setSalvando(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Prova HYROX" className="fixed inset-0 z-[90] flex flex-col bg-bg">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onFechar} className="alvo text-sm text-fg-muted">← Voltar</button>
        <p className="text-sm font-bold">Tempo total {relogioTexto(total)}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        {atual ? (
          <>
            <p className="text-sm font-bold uppercase tracking-wider text-fg-muted">Trecho {trechos.indexOf(atual) + 1} de {trechos.length}</p>
            <p className="text-3xl font-black">{atual.tipo === "corrida" ? "🏃" : "🛷"} {resumoBloco(atual)}</p>
            <p className="font-mono text-7xl font-black tabular-nums">{relogioTexto(noTrecho)}</p>
            {!marca ? <button type="button" onClick={iniciar} className="alvo rounded-2xl bg-accent px-10 py-5 text-2xl font-black text-bg">▶ Valendo!</button> : null}
          </>
        ) : (
          <>
            <p className="text-3xl font-black">🏁 Prova completa!</p>
            <p className="font-mono text-6xl font-black tabular-nums text-accent">{relogioTexto(trechos.reduce((s, t) => s + (feitos[t.id]?.tempo_seg ?? 0), 0))}</p>
            <button type="button" onClick={onFechar} className="alvo rounded-xl border border-border px-6 py-3 font-bold">Voltar ao treino</button>
          </>
        )}
        <ol className="mt-2 grid w-full max-w-sm grid-cols-2 gap-1 text-left text-xs">
          {trechos.map((t) => (
            <li key={t.id} className={`truncate rounded px-2 py-1 ${feitos[t.id] ? "bg-success/10 text-success" : t === atual ? "bg-accent/15 font-bold" : "text-fg-subtle"}`}>
              {feitos[t.id]?.tempo_seg ? relogioTexto(feitos[t.id].tempo_seg) : "—"} · {t.titulo || t.movimentos[0]?.nome}
            </li>
          ))}
        </ol>
      </div>
      {atual && marca ? (
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" disabled={salvando} onClick={() => void proximo()} className="alvo w-full rounded-xl bg-accent py-5 text-xl font-black text-bg disabled:opacity-60">
            {salvando ? "Salvando…" : `✓ Terminei ${atual.tipo === "corrida" ? "a corrida" : "a estação"}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
