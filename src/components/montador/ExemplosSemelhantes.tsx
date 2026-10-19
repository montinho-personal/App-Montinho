"use client";

// "Montinho, já montei algo parecido?" — busca estruturada na memória de
// prescrições, com explicação do ranking e ações: visualizar, comparar,
// usar como base, usar só este dia, favoritar e feedback de relevância.
// Funciona sem IA (busca determinística no servidor).

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { GRUPO_LABEL } from "@/lib/grupos";
import type { BibliotecaPrograma, SnapshotPrograma, TreinoLetra } from "@/lib/supabase/types-sessoes";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { calcularVolumeSemanal, type ResultadoVolume } from "@/lib/volume/calcular";
import { dataBR } from "@/lib/format";

type Resultado = { item: BibliotecaPrograma; similaridade: number; motivos: string[]; alertas: string[] };

type Props = {
  criteriosIniciais: { dias: number | null; objetivo: string | null; nivel: string | null; split: string | null; prioridades: string[]; equipamentos: string[] };
  letrasAtuais: string[];
  volumeAtual: ResultadoVolume;
  onUsarComoBase: (snap: SnapshotPrograma) => void;
  onUsarDia: (snap: SnapshotPrograma, letra: TreinoLetra) => void;
  onFechar: () => void;
};

export function ExemplosSemelhantes({ criteriosIniciais, volumeAtual, onUsarComoBase, onUsarDia, onFechar }: Props) {
  const [texto, setTexto] = useState("");
  const [usarContexto, setUsarContexto] = useState(true);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [comparando, setComparando] = useState<string | null>(null);

  async function buscar() {
    setLoading(true);
    setErro(null);
    try {
      const body = usarContexto ? { q: texto || null, dias: criteriosIniciais.dias, objetivo: criteriosIniciais.objetivo, nivel: criteriosIniciais.nivel, split: criteriosIniciais.split, prioridades: criteriosIniciais.prioridades, equipamentos: criteriosIniciais.equipamentos.length ? criteriosIniciais.equipamentos : undefined } : { q: texto || null };
      const res = await fetch("/api/memoria", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha na busca");
      setResultados(data.resultados ?? []);
      setTotal(data.total_acervo ?? 0);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na busca");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    // busca inicial fora do corpo do efeito (rede = sistema externo)
    const id = window.setTimeout(() => void buscar(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/memoria/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const m = (await res.json()) as BibliotecaPrograma;
      setResultados((cur) => cur.map((r) => (r.item.id === id ? { ...r, item: m } : r)));
    }
  }

  return (
    <section className="rounded-xl border border-accent/30 bg-card" aria-label="Exemplos semelhantes da memória de prescrições">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div>
          <h2 className="font-bold text-sm inline-flex items-center gap-1.5"><Icon name="sparkles" size={16} className="text-accent" /> Exemplos semelhantes</h2>
          <p className="text-[11px] text-fg-subtle">Busca estruturada no seu acervo (sem IA): programas desidentificados que você já montou. {total ? `${total} no acervo.` : ""}</p>
        </div>
        <button type="button" onClick={onFechar} className="touch text-fg-muted hover:text-fg" aria-label="Fechar exemplos"><Icon name="x" /></button>
      </div>
      <div className="px-4 py-3 space-y-3">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void buscar(); }}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='ex.: "4 dias, glúteos, upper/lower, academia"' aria-label="Buscar na memória" className="h-10 flex-1 min-w-[220px] rounded-md border border-border bg-bg px-3 text-sm" />
          <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted"><input type="checkbox" checked={usarContexto} onChange={(e) => setUsarContexto(e.target.checked)} /> usar contexto deste aluno</label>
          <button type="submit" className="touch rounded-md bg-accent px-4 text-sm font-bold text-bg" disabled={loading}>{loading ? "Buscando…" : "Buscar"}</button>
        </form>
        {erro ? <p className="text-xs text-danger" role="alert">{erro}</p> : null}
        {!loading && resultados.length === 0 ? <p className="text-sm text-fg-muted">Nenhum exemplo compatível. Cada plano salvo entra no acervo automaticamente (sem dados do aluno).</p> : null}
        <ul className="space-y-2">
          {resultados.map((r) => {
            const m = r.item.metadados;
            const snap = r.item.estrutura;
            const vol = calcularVolumeSemanal(
              snap.treinos.filter((t) => t.ativo !== false).map((t) => ({ letra: t.letra, exercicios: t.exercicios.map((e) => ({ id: e.id, nome: e.nome, grupo: e.grupo_muscular ?? "nao_classificado", series: e.series, seriesAquecimento: e.series_aquecimento, tecnica: e.tecnica })) })),
              { frequencia: snap.programa.frequencia ?? Object.fromEntries(snap.treinos.map((t) => [t.letra, 1])) }
            );
            return (
              <li key={r.item.id} className="rounded-lg border border-border bg-bg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm">{r.item.nome}</p>
                    <p className="text-xs text-fg-muted">{r.item.resumo}</p>
                    <p className="text-[11px] text-fg-subtle mt-0.5">
                      Por que apareceu: {r.motivos.join(" · ") || "critérios parciais"} · similaridade {r.similaridade}% · {dataBR(r.item.updated_at)} · usado {r.item.uso_count}×
                    </p>
                    {r.alertas.length ? <p className="text-[11px] text-warning">{r.alertas.join(" · ")}</p> : null}
                  </div>
                  <span className="rounded-full bg-accent/10 border border-accent/30 px-2 py-0.5 text-xs font-bold text-accent">{r.similaridade}%</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button type="button" onClick={() => setAberto(aberto === r.item.id ? null : r.item.id)} className="rounded-md border border-border px-2 py-1 text-fg-muted hover:text-fg">{aberto === r.item.id ? "Ocultar" : "Visualizar"}</button>
                  <button type="button" onClick={() => setComparando(comparando === r.item.id ? null : r.item.id)} className="rounded-md border border-border px-2 py-1 text-fg-muted hover:text-fg">Comparar volume</button>
                  <button type="button" onClick={() => { if (confirm("Usar este programa como base? Os treinos atuais serão desativados (histórico preservado) e você pode adaptar tudo antes de salvar.")) { onUsarComoBase(snap); void patch(r.item.id, { feedback: "usei_adaptei" }); } }} className="rounded-md border border-accent/40 px-2 py-1 font-semibold text-accent hover:bg-accent/10">Usar como base</button>
                  <select aria-label="Usar só um dia" value="" onChange={(e) => { if (e.target.value) { onUsarDia(snap, e.target.value as TreinoLetra); void patch(r.item.id, { feedback: "usei_adaptei" }); } }} className="rounded-md border border-border bg-bg px-1 py-1 text-fg-muted">
                    <option value="">Usar só este dia…</option>
                    {snap.treinos.map((t) => <option key={t.letra} value={t.letra}>{t.letra} · {t.nome}</option>)}
                  </select>
                  <button type="button" onClick={() => void patch(r.item.id, { favorito: !r.item.favorito })} className={`rounded-md border px-2 py-1 inline-flex items-center gap-1 ${r.item.favorito ? "border-accent text-accent" : "border-border text-fg-muted"}`} aria-pressed={r.item.favorito}><Icon name="star" size={11} /> {r.item.favorito ? "Favorito" : "Favoritar"}</button>
                  <span className="ml-auto inline-flex items-center gap-1 text-fg-subtle">
                    útil?
                    <button type="button" onClick={() => void patch(r.item.id, { feedback: "util" })} className="rounded border border-border px-1.5 py-0.5 hover:text-success" aria-label="Marcar como útil">👍 {m ? r.item.feedback?.util ?? 0 : 0}</button>
                    <button type="button" onClick={() => void patch(r.item.id, { feedback: "nao_util" })} className="rounded border border-border px-1.5 py-0.5 hover:text-danger" aria-label="Marcar como não útil">👎 {r.item.feedback?.nao_util ?? 0}</button>
                  </span>
                </div>
                {aberto === r.item.id ? (
                  <div className="grid gap-2 md:grid-cols-2 text-xs">
                    {snap.treinos.map((t) => (
                      <div key={t.letra} className="rounded-md border border-border p-2">
                        <p className="font-bold">{t.letra} · {t.nome}</p>
                        <ul className="mt-1 space-y-0.5 text-fg-muted">
                          {t.exercicios.map((e) => <li key={e.id}>{e.nome} — {e.series}×{e.reps}{e.grupo_muscular ? ` · ${GRUPO_LABEL[e.grupo_muscular]}` : ""}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
                {comparando === r.item.id ? (
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase tracking-wider text-fg-subtle"><tr><th className="text-left py-1">Grupo</th><th className="text-right py-1">Este exemplo</th><th className="text-right py-1">Plano atual</th></tr></thead>
                    <tbody>
                      {[...new Set([...vol.linhas.map((l) => l.grupo), ...volumeAtual.linhas.map((l) => l.grupo)])].map((g) => (
                        <tr key={g} className="border-t border-border"><td className="py-1">{GRUPO_LABEL[g as GrupoMuscular] ?? g}</td><td className="py-1 text-right font-mono">{vol.linhas.find((l) => l.grupo === g)?.total ?? 0}</td><td className="py-1 text-right font-mono">{volumeAtual.linhas.find((l) => l.grupo === g)?.total ?? 0}</td></tr>
                      ))}
                      <tr className="border-t-2 border-border-strong font-bold"><td className="py-1">Total</td><td className="py-1 text-right font-mono">{vol.subtotais.total}</td><td className="py-1 text-right font-mono">{volumeAtual.subtotais.total}</td></tr>
                    </tbody>
                  </table>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
