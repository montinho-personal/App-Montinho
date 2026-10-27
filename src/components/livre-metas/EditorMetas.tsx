"use client";
// Editor do protocolo livre (por metas): faixa de séries por semana de cada músculo.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GRUPO_LABEL, GRUPOS_SELECIONAVEIS } from "@/lib/grupos";
import { referenciasPorNivel, type NivelReferencia } from "@/lib/volume/referencias";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { LINK_CALCULADORA_VOLUME, lerVolumeColado } from "@/lib/treino/volume-colado";

type Faixa = { min: string; max: string };
const PRINCIPAIS = new Set<GrupoMuscular>(["peito", "costas", "ombros", "biceps", "triceps", "quadriceps", "posteriores", "gluteo", "panturrilha", "abdomen"]);

export function EditorMetas({ alunoId, inicial, ligadoInicial, voltar, treinar, visitante = false }: { alunoId: string; inicial: Partial<Record<GrupoMuscular, { min: number; max: number }>>; ligadoInicial: boolean; voltar?: string; /** “Meu treino” ou o visitante: link para já começar o treino livre de hoje. */ treinar?: string; /** O próprio visitante monta o protocolo dele (api/protocolo-livre). */ visitante?: boolean }) {
  const router = useRouter();
  const paraForm = (m: typeof inicial) => Object.fromEntries(GRUPOS_SELECIONAVEIS.map((g) => [g, { min: m[g] ? String(m[g]!.min) : "", max: m[g] ? String(m[g]!.max) : "" }])) as Record<GrupoMuscular, Faixa>;
  const [faixas, setFaixas] = useState(() => paraForm(inicial));
  const [ligado, setLigado] = useState(ligadoInicial || !Object.keys(inicial).length);
  const [todos, setTodos] = useState(() => Object.keys(inicial).some((g) => !PRINCIPAIS.has(g as GrupoMuscular)));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvoLigado, setSalvoLigado] = useState(ligadoInicial);
  const [colando, setColando] = useState(false);
  const [textoColado, setTextoColado] = useState("");

  /** “Colar do site”: lê a área de transferência (ou o texto colado na caixa) e preenche as faixas. */
  function aplicarColado(texto: string) {
    const r = lerVolumeColado(texto);
    const n = Object.keys(r.metas).length;
    if (!n) return setMsg({ ok: false, texto: "Não achei nenhum músculo com séries no texto. Confira se copiou o resultado da calculadora." });
    setFaixas({ ...paraForm({}), ...Object.fromEntries(Object.entries(r.metas).map(([g, m]) => [g, { min: String(m!.min), max: String(m!.max) }])) } as Record<GrupoMuscular, Faixa>);
    if (Object.keys(r.metas).some((g) => !PRINCIPAIS.has(g as GrupoMuscular))) setTodos(true);
    setColando(false);
    setTextoColado("");
    setMsg({ ok: true, texto: `✅ ${n} ${n === 1 ? "músculo preenchido" : "músculos preenchidos"} com o volume do site.${r.naoEntendi.length ? ` Não entendi: ${r.naoEntendi.slice(0, 3).join(" · ")}.` : ""} Confira e toque em “Salvar metas”.` });
  }
  async function colarDoSite() {
    // Abre a caixa já; se o celular deixar ler a área de transferência (até 2 s), preenche sozinho.
    setColando(true);
    try {
      const t = await Promise.race([navigator.clipboard.readText(), new Promise<string>((r) => setTimeout(() => r(""), 2000))]);
      if (t.trim()) aplicarColado(t);
    } catch {
      /* sem permissão para ler: a pessoa cola na caixa */
    }
  }

  const usarReferencia = (n: NivelReferencia) => {
    const r = referenciasPorNivel(n);
    setFaixas(paraForm(Object.fromEntries(Object.entries(r).filter(([g]) => PRINCIPAIS.has(g as GrupoMuscular)))));
  };
  const muda = (g: GrupoMuscular, k: keyof Faixa, v: string) => setFaixas((f) => ({ ...f, [g]: { ...f[g], [k]: v.replace(/\D/g, "").slice(0, 2) } }));

  async function salvar() {
    const metas: Record<string, { min: number; max: number }> = {};
    for (const g of GRUPOS_SELECIONAVEIS) {
      const f = faixas[g];
      if (!f.min && !f.max) continue;
      const min = Number(f.min || f.max), max = Number(f.max || f.min);
      if (max < min) return setMsg({ ok: false, texto: `${GRUPO_LABEL[g]}: o máximo precisa ser maior ou igual ao mínimo.` });
      if (max > 0) metas[g] = { min, max };
    }
    setSalvando(true);
    setMsg(null);
    const r = await fetch(visitante ? "/api/protocolo-livre" : `/api/alunos/${alunoId}/livre-metas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metas, ligado }) }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    setSalvando(false);
    if (!r?.ok) return setMsg({ ok: false, texto: j?.error ?? "Sem internet. Tente de novo." });
    setSalvoLigado(ligado);
    setMsg({ ok: true, texto: ligado ? "Salvo! O protocolo livre (por metas) está ligado." : "Salvo. O protocolo livre (por metas) está desligado (vale a ficha A/B/C)." });
    router.refresh();
  }

  const lista = GRUPOS_SELECIONAVEIS.filter((g) => todos || PRINCIPAIS.has(g) || faixas[g].min || faixas[g].max);
  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-accent)]" checked={ligado} onChange={(e) => setLigado(e.target.checked)} />
        <span>
          <span className="block font-semibold">Ligar o protocolo livre (por metas)</span>
          <span className="block text-xs text-fg-muted">{visitante ? "Sem treino A/B/C: você escolhe cada exercício na hora e o app conta as séries da semana (segunda a domingo) de cada músculo, mostrando o que falta e o que já chegou no limite." : "Sem treino A/B/C: o aluno escolhe cada exercício na hora e o app conta as séries da semana (segunda a domingo) de cada músculo, mostrando o que falta e o que já chegou no limite."}</span>
        </span>
      </label>

      {/* Não sabe por onde começar? Calcula no site e cola aqui. */}
      <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 p-4">
        <p className="text-sm font-semibold">🧮 Não sabe quantas séries fazer por músculo?</p>
        <p className="text-xs text-fg-muted">
          {LINK_CALCULADORA_VOLUME ? (
            <>Calcule no site do Montinho, toque em “Copiar para o app” e volte aqui para colar: </>
          ) : (
            <>Copiou o volume de algum lugar (site, planilha, mensagem)? Cole aqui e o app preenche sozinho. </>
          )}
          {LINK_CALCULADORA_VOLUME ? (
            <a href={LINK_CALCULADORA_VOLUME} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">abrir a calculadora de volume ↗</a>
          ) : null}
        </p>
        <button type="button" onClick={() => void colarDoSite()} className="touch inline-flex items-center gap-2 rounded-lg border border-accent bg-card px-4 text-sm font-bold text-accent">📋 Colar do site</button>
        {colando ? (
          <div className="space-y-2">
            <textarea value={textoColado} onChange={(e) => setTextoColado(e.target.value)} rows={5} placeholder={"Cole aqui. Ex.:\nPeito: 10-14\nCostas: 12-16"} className="w-full rounded-lg border border-border bg-bg p-2 text-sm" aria-label="Volume copiado" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => aplicarColado(textoColado)}>Preencher</Button>
              <button type="button" onClick={() => setColando(false)} className="text-sm text-fg-muted underline">Cancelar</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-semibold">Séries por semana (mínimo – máximo)</p>
          <span className="text-xs text-fg-muted">Preencher com a referência:</span>
          {(["iniciante", "intermediario", "avancado"] as const).map((n) => (
            <button key={n} type="button" onClick={() => usarReferencia(n)} className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent">
              {n === "intermediario" ? "intermediário" : n === "avancado" ? "avançado" : n}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {lista.map((g) => (
            <div key={g} className="flex items-center gap-2 rounded-lg bg-surface/50 px-3 py-2">
              <span className="mr-auto text-sm">{GRUPO_LABEL[g]}</span>
              <input inputMode="numeric" aria-label={`${GRUPO_LABEL[g]} mínimo`} placeholder="mín" value={faixas[g].min} onChange={(e) => muda(g, "min", e.target.value)} className="h-9 w-14 rounded-md border border-border bg-bg text-center text-sm" />
              <span className="text-fg-subtle">–</span>
              <input inputMode="numeric" aria-label={`${GRUPO_LABEL[g]} máximo`} placeholder="máx" value={faixas[g].max} onChange={(e) => muda(g, "max", e.target.value)} className="h-9 w-14 rounded-md border border-border bg-bg text-center text-sm" />
            </div>
          ))}
        </div>
        {!todos ? (
          <button type="button" onClick={() => setTodos(true)} className="mt-2 text-xs text-accent hover:underline">+ Mostrar todos os músculos (trapézio, antebraço, adutores…)</button>
        ) : null}
        <p className="mt-2 text-[11px] text-fg-subtle">Deixe em branco o músculo que não quer contar. Passar do máximo só avisa, nunca trava. Faixas de referência são heurísticas: ajuste para cada pessoa.</p>
      </div>

      {msg ? <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-red"}`}>{msg.texto}{msg.ok && salvoLigado && !treinar && !visitante ? " O aluno já vê “Começar treino livre” no início do app." : ""}</p> : null}
      {treinar && salvoLigado && msg?.ok ? (
        <a href={treinar} className="touch flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-bold text-bg hover:bg-accent-hover">▶ Começar meu treino de hoje</a>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={salvar} loading={salvando} variant={treinar && salvoLigado ? "secondary" : "primary"}>Salvar metas</Button>
        {voltar ? <a href={voltar} className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold hover:bg-card">Voltar</a> : null}
      </div>
    </div>
  );
}
