"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Anamnese, GrupoMuscular } from "@/lib/supabase/types-extended";
import { detectarGrupo, GRUPO_LABEL, GRUPO_COR, GRUPOS_CICLO } from "@/lib/grupos";
import { alertasDoExercicio, regioesLesionadas } from "@/lib/restricoes";
import { RailVolume } from "@/components/montador/RailVolume";
import { CartaoAnamnese } from "@/components/montador/CartaoAnamnese";
import {
  type SerieConfig,
  configIgual,
  detalhar,
  repsResumo,
  totalSeries,
} from "@/lib/series";

type Letra = "A" | "B" | "C" | "D" | "E";
const LETRAS: Letra[] = ["A", "B", "C", "D", "E"];

type Row = {
  key: string;
  nome: string;
  seriesConfig: SerieConfig;
  observacoes: string;
  grupo: GrupoMuscular | null;
};

type TreinoVM = {
  id: string | null;
  letra: Letra;
  nome: string;
  ativo: boolean;
  observacoes: string;
  rows: Row[];
};

type ExInicial = {
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  descanso_seg: number | null;
  observacoes: string | null;
  series_config?: SerieConfig | null;
};

type Props = {
  alunoId: string;
  alunoNome: string;
  treinosIniciais: Array<{
    id: string;
    letra: Letra;
    nome: string;
    ativo: boolean;
    observacoes: string | null;
    exercicios: ExInicial[];
  }>;
  biblioteca: { nome: string }[];
  anamnese: Anamnese | null;
};

let seq = 0;
const novaKey = () => `r-${seq++}`;
const emptyRow = (): Row => ({ key: novaKey(), nome: "", seriesConfig: configIgual(), observacoes: "", grupo: null });
const cloneSeriesConfig = (cfg: SerieConfig): SerieConfig => JSON.parse(JSON.stringify(cfg)) as SerieConfig;
const cloneRows = (rows: Row[]): Row[] =>
  rows.map((row) => ({
    ...row,
    key: novaKey(),
    seriesConfig: cloneSeriesConfig(row.seriesConfig),
  }));
const emptyTreino = (letra: Letra): TreinoVM => ({
  id: null,
  letra,
  nome: `Treino ${letra}`,
  ativo: true,
  observacoes: "",
  rows: [emptyRow()],
});

export function MontadorMultiClient({ alunoId, alunoNome, treinosIniciais, biblioteca, anamnese }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showFinalizados, setShowFinalizados] = useState(false);
  const [volMode, setVolMode] = useState<"sessao" | "semana">("semana");

  const [treinos, setTreinos] = useState<TreinoVM[]>(() =>
    LETRAS.map((letra) => {
      const found =
        treinosIniciais.find((t) => t.letra === letra && t.ativo) ??
        treinosIniciais.find((t) => t.letra === letra);
      if (!found) return emptyTreino(letra);
      return {
        id: found.id,
        letra,
        nome: found.nome,
        ativo: found.ativo,
        observacoes: found.observacoes ?? "",
        rows: found.exercicios.length
          ? found.exercicios.map((e) => ({
              key: novaKey(),
              nome: e.nome,
              seriesConfig: e.series_config ?? configIgual(e.series, e.reps, e.ie),
              observacoes: e.observacoes ?? "",
              grupo: null,
            }))
          : [emptyRow()],
      };
    })
  );

  const finalizados = useMemo(() => treinosIniciais.filter((t) => !t.ativo), [treinosIniciais]);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2800);
  };

  const grupoDe = (r: Row): GrupoMuscular => r.grupo ?? detectarGrupo(r.nome);

  // ── Volume semanal (soma TODOS os treinos) — o "olho da planilha" ───────────
  const volumeSemana = useMemo(() => {
    const acc: Partial<Record<GrupoMuscular, number>> = {};
    for (const t of treinos) {
      for (const r of t.rows) {
        if (!r.nome.trim()) continue;
        const s = totalSeries(r.seriesConfig);
        if (s <= 0) continue;
        const g = grupoDe(r);
        acc[g] = (acc[g] ?? 0) + s;
      }
    }
    return acc;
  }, [treinos]);

  // ── Alertas de lesão ────────────────────────────────────────────────────────
  const regioesLesao = useMemo(() => regioesLesionadas(anamnese), [anamnese]);
  const linhasComAlerta = useMemo(
    () =>
      treinos.reduce(
        (n, t) => n + t.rows.filter((r) => alertasDoExercicio(r.nome, anamnese).length > 0).length,
        0
      ),
    [treinos, anamnese]
  );

  // ── Mutações ────────────────────────────────────────────────────────────────
  const updTreino = (letra: Letra, patch: Partial<TreinoVM>) => {
    setTreinos((c) => c.map((t) => (t.letra === letra ? { ...t, ...patch } : t)));
    setDirty(true);
  };
  const updRow = (letra: Letra, rk: string, patch: Partial<Row>) => {
    setTreinos((c) =>
      c.map((t) =>
        t.letra === letra ? { ...t, rows: t.rows.map((r) => (r.key === rk ? { ...r, ...patch } : r)) } : t
      )
    );
    setDirty(true);
  };
  const addRow = (letra: Letra) => {
    setTreinos((c) => c.map((t) => (t.letra === letra ? { ...t, rows: [...t.rows, emptyRow()] } : t)));
    setDirty(true);
  };
  const removeRow = (letra: Letra, rk: string) => {
    setTreinos((c) =>
      c.map((t) => {
        if (t.letra !== letra) return t;
        const rows = t.rows.filter((r) => r.key !== rk);
        return { ...t, rows: rows.length ? rows : [emptyRow()] };
      })
    );
    setDirty(true);
  };
  const cicloGrupo = (letra: Letra, rk: string) => {
    setTreinos((c) =>
      c.map((t) => {
        if (t.letra !== letra) return t;
        return {
          ...t,
          rows: t.rows.map((r) => {
            if (r.key !== rk) return r;
            const atual = r.grupo ?? detectarGrupo(r.nome);
            const i = GRUPOS_CICLO.indexOf(atual);
            return { ...r, grupo: GRUPOS_CICLO[(i + 1) % GRUPOS_CICLO.length] };
          }),
        };
      })
    );
    setDirty(true);
  };

  const copiarTreino = (origem: Letra, destino: Letra) => {
    if (origem === destino) return;
    setTreinos((current) => {
      const source = current.find((t) => t.letra === origem);
      if (!source) return current;
      return current.map((treino) =>
        treino.letra === destino
          ? {
              ...treino,
              observacoes: source.observacoes,
              rows: cloneRows(source.rows),
            }
          : treino
      );
    });
    setDirty(true);
    flash(`Treino ${origem} copiado para ${destino}.`);
  };

  const copiarAnterior = (destino: Letra) => {
    const index = LETRAS.indexOf(destino);
    if (index <= 0) return;
    copiarTreino(LETRAS[index - 1], destino);
  };

  const preencherVaziosComA = () => {
    setTreinos((current) => {
      const treinoA = current.find((t) => t.letra === "A");
      if (!treinoA) return current;
      return current.map((treino) => {
        const vazio = treino.rows.every((row) => !row.nome.trim());
        if (treino.letra === "A" || !vazio) return treino;
        return { ...treino, rows: cloneRows(treinoA.rows), observacoes: treinoA.observacoes };
      });
    });
    setDirty(true);
    flash("Treinos vazios preenchidos com a estrutura do A.");
  };

  async function finalizarTreino(t: TreinoVM) {
    if (!t.id) return;
    if (!confirm(`Finalizar ${t.nome}? Sai dos treinos em andamento (vira histórico).`)) return;
    const res = await fetch(`/api/treinos/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: false }),
    });
    if (res.ok) router.refresh();
    else flash("⚠ Falha ao finalizar.");
  }

  async function deletarTreino(t: TreinoVM) {
    if (!t.id) {
      updTreino(t.letra, emptyTreino(t.letra));
      return;
    }
    if (!confirm(`Deletar ${t.nome}? Remove o treino e os exercícios.`)) return;
    const res = await fetch(`/api/treinos/${t.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else flash("⚠ Falha ao deletar.");
  }

  async function salvarTudo() {
    setSaving(true);
    const payload = {
      treinos: treinos.map((t) => ({
        id: t.id,
        letra: t.letra,
        nome: t.nome,
        ativo: t.ativo,
        observacoes: t.observacoes || null,
        exercicios: t.rows
          .filter((r) => r.nome.trim())
          .map((r) => ({
            nome: r.nome.trim(),
            series: totalSeries(r.seriesConfig),
            reps: repsResumo(r.seriesConfig),
            ie:
              r.seriesConfig.modo === "iguais"
                ? r.seriesConfig.ie
                : r.seriesConfig.series.at(-1)?.ie ?? null,
            descanso_seg:
              r.seriesConfig.modo === "iguais"
                ? r.seriesConfig.descanso_seg
                : r.seriesConfig.series.at(-1)?.descanso_seg ?? null,
            observacoes: r.observacoes || null,
            series_config: r.seriesConfig,
          })),
      })),
    };
    try {
      const res = await fetch(`/api/alunos/${alunoId}/treinos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      flash("Treinos salvos ✓");
      router.refresh();
    } catch (e) {
      flash("⚠ " + (e instanceof Error ? e.message : "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const totalSeriesGeral = useMemo(
    () =>
      treinos.reduce(
        (n, t) => n + t.rows.reduce((s, r) => s + (r.nome.trim() ? totalSeries(r.seriesConfig) : 0), 0),
        0
      ),
    [treinos]
  );

  return (
    <div className="space-y-5">
      <Link href={`/treinador/alunos/${alunoId}`} className="text-fg-muted text-sm hover:text-fg inline-flex items-center gap-1">
        ← Voltar para {alunoNome}
      </Link>

      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Montador A–E</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            Todos os treinos na mesma página · <span className="font-mono">{totalSeriesGeral}</span> séries no total
            {saving ? (
              <span className="text-fg-subtle ml-2">salvando…</span>
            ) : dirty ? (
              <span className="text-gold ml-2">● não salvo</span>
            ) : savedAt ? (
              <span className="text-success ml-2">✓ salvo {savedAt}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={preencherVaziosComA}
            className="rounded-md border border-border px-4 py-2.5 text-[12.5px] font-bold text-fg-muted hover:text-fg hover:border-border-strong"
          >
            Preencher vazios com A
          </button>
          <button
            onClick={salvarTudo}
            disabled={saving}
            className="rounded-md bg-accent px-5 py-2.5 text-[12.5px] font-bold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar tudo"}
          </button>
        </div>
      </header>

      {/* Banner de lesão (todos os treinos) */}
      {regioesLesao.length > 0 && (
        <div className="rounded-lg border border-red/30 bg-red/5 px-4 py-2.5 flex items-center gap-3 text-[12.5px]">
          <span className="text-red text-base">⚠</span>
          <span className="text-fg-muted">
            Aluno com lesão em <b className="text-fg">{regioesLesao.join(", ")}</b>.{" "}
            {linhasComAlerta > 0 ? (
              <>
                <b className="text-red">{linhasComAlerta} exercício{linhasComAlerta > 1 ? "s" : ""}</b> em A–E{" "}
                {linhasComAlerta > 1 ? "exigem" : "exige"} atenção (⚠).
              </>
            ) : (
              <span className="text-success">Nenhum exercício de risco nos treinos ✓</span>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Treinos A–E empilhados */}
        <div className="space-y-4 min-w-0">
          {treinos.map((t) => {
            const totalT = t.rows.reduce((s, r) => s + (r.nome.trim() ? totalSeries(r.seriesConfig) : 0), 0);
            return (
              <section key={t.letra} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/30 text-lg font-black text-accent shrink-0">
                    {t.letra}
                  </div>
                  <input
                    value={t.nome}
                    onChange={(e) => updTreino(t.letra, { nome: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none focus:border-b focus:border-border-strong"
                    aria-label={`Nome do treino ${t.letra}`}
                  />
                  <span className="text-[11px] text-fg-subtle font-mono shrink-0">{totalT} séries</span>
                  {t.letra !== "A" ? (
                    <button onClick={() => copiarAnterior(t.letra)} className="rounded-md border border-border px-2 py-1 text-[11px] text-fg-muted hover:text-fg shrink-0">
                      Copiar anterior
                    </button>
                  ) : null}
                  <button onClick={() => finalizarTreino(t)} className="rounded-md border border-border px-2 py-1 text-[11px] text-fg-muted hover:text-fg shrink-0">
                    Finalizar
                  </button>
                  <button onClick={() => deletarTreino(t)} className="rounded-md border border-red/30 px-2 py-1 text-[11px] text-red shrink-0" title="Deletar treino">
                    ✕
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-surface text-fg-subtle text-[10px] uppercase tracking-wider">
                        <th className="text-left font-semibold px-3 py-2">Exercício</th>
                        <th className="text-left font-semibold px-2 py-2 w-24">Grupo</th>
                        <th className="text-center font-semibold px-2 py-2 w-14">Séries</th>
                        <th className="text-left font-semibold px-2 py-2 w-32">Reps</th>
                        <th className="text-center font-semibold px-2 py-2 w-12">IE</th>
                        <th className="w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((r, i) => {
                        const g = grupoDe(r);
                        const cor = GRUPO_COR[g];
                        const alertas = alertasDoExercicio(r.nome, anamnese);
                        const altoRisco = alertas.some((a) => a.severidade === "alto");
                        const det = r.seriesConfig.modo === "detalhado";
                        return (
                          <tr
                            key={r.key}
                            className={`group border-t border-border align-top hover:bg-card-hover/40 ${
                              alertas.length ? (altoRisco ? "bg-red/[0.06]" : "bg-gold/[0.05]") : ""
                            }`}
                          >
                            <td className="p-0">
                              <input
                                list="ex-lib-multi"
                                value={r.nome}
                                onChange={(e) => updRow(t.letra, r.key, { nome: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (i === t.rows.length - 1) addRow(t.letra);
                                  }
                                }}
                                placeholder={`exercício ${i + 1}…`}
                                className="w-full bg-transparent px-3 py-2.5 text-[13px] font-medium outline-none focus:bg-accent/5"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => cicloGrupo(t.letra, r.key)}
                                  title="Clique para trocar o grupo"
                                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap border"
                                  style={{ background: `${cor}22`, color: cor, borderColor: `${cor}55` }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
                                  {GRUPO_LABEL[g]}
                                </button>
                                {alertas.length > 0 && (
                                  <span
                                    className="cursor-help text-[12px] leading-none shrink-0"
                                    style={{ color: altoRisco ? "#ef4444" : "#f5b800" }}
                                    title={alertas.map((a) => `⚠ ${a.regiao}: ${a.mensagem}`).join("\n\n")}
                                  >
                                    ⚠
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <input
                                inputMode="numeric"
                                value={totalSeries(r.seriesConfig)}
                                disabled={det}
                                onChange={(e) =>
                                  updRow(t.letra, r.key, {
                                    seriesConfig: configIgual(
                                      parseInt(e.target.value) || 0,
                                      repsResumo(r.seriesConfig),
                                      r.seriesConfig.modo === "iguais" ? r.seriesConfig.ie : null
                                    ),
                                  })
                                }
                                className="w-12 rounded border border-border bg-bg px-1 py-1 text-center font-mono text-[12px] disabled:opacity-50"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              {det ? (
                                <span className="text-[11px] text-fg-subtle font-mono">{repsResumo(r.seriesConfig)}</span>
                              ) : (
                                <input
                                  value={repsResumo(r.seriesConfig)}
                                  onChange={(e) =>
                                    updRow(t.letra, r.key, {
                                      seriesConfig: { ...(r.seriesConfig as Extract<SerieConfig, { modo: "iguais" }>), reps: e.target.value },
                                    })
                                  }
                                  placeholder="10-12"
                                  className="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-[12px]"
                                />
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {!det && (
                                <input
                                  inputMode="numeric"
                                  value={r.seriesConfig.modo === "iguais" ? r.seriesConfig.ie ?? "" : ""}
                                  onChange={(e) =>
                                    updRow(t.letra, r.key, {
                                      seriesConfig: {
                                        ...(r.seriesConfig as Extract<SerieConfig, { modo: "iguais" }>),
                                        ie: e.target.value ? parseInt(e.target.value) : null,
                                      },
                                    })
                                  }
                                  className="w-10 rounded border border-border bg-bg px-1 py-1 text-center font-mono text-[12px] text-accent font-bold"
                                />
                              )}
                            </td>
                            <td className="px-1 py-1.5 text-right whitespace-nowrap">
                              <button
                                onClick={() =>
                                  updRow(t.letra, r.key, {
                                    seriesConfig: det
                                      ? configIgual(totalSeries(r.seriesConfig), repsResumo(r.seriesConfig), null)
                                      : detalhar(r.seriesConfig),
                                  })
                                }
                                className="rounded border border-border px-1.5 py-1 text-[10px] font-semibold text-fg-muted hover:text-accent"
                                title="Séries iguais ou pirâmide (série a série)"
                              >
                                {det ? "Iguais" : "Pirâmide"}
                              </button>
                              <button
                                onClick={() => removeRow(t.letra, r.key)}
                                className="ml-1 text-fg-subtle hover:text-red opacity-0 group-hover:opacity-100 px-1"
                                title="Remover"
                              >
                                ✕
                              </button>
                              {r.seriesConfig.modo === "detalhado" && (
                                <div className="mt-2 space-y-1 text-left">
                                  {r.seriesConfig.series.map((s, si) => (
                                    <div key={s.ordem} className="grid grid-cols-[16px_1fr_40px] gap-1 items-center">
                                      <span className="text-[10px] text-fg-subtle">{si + 1}</span>
                                      <input
                                        value={s.reps}
                                        onChange={(e) => {
                                          const cfg = r.seriesConfig as Extract<SerieConfig, { modo: "detalhado" }>;
                                          const next: SerieConfig = {
                                            modo: "detalhado",
                                            series: cfg.series.map((x, j) =>
                                              j === si ? { ...x, reps: e.target.value } : x
                                            ),
                                          };
                                          updRow(t.letra, r.key, { seriesConfig: next });
                                        }}
                                        placeholder="reps"
                                        className="rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px]"
                                      />
                                      <input
                                        value={s.ie ?? ""}
                                        onChange={(e) => {
                                          const cfg = r.seriesConfig as Extract<SerieConfig, { modo: "detalhado" }>;
                                          const next: SerieConfig = {
                                            modo: "detalhado",
                                            series: cfg.series.map((x, j) =>
                                              j === si ? { ...x, ie: e.target.value ? Number(e.target.value) : null } : x
                                            ),
                                          };
                                          updRow(t.letra, r.key, { seriesConfig: next });
                                        }}
                                        placeholder="IE"
                                        className="rounded border border-border bg-bg px-1 py-0.5 text-center font-mono text-[11px]"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => addRow(t.letra)}
                  className="w-full text-left px-3 py-2 text-fg-muted hover:text-accent hover:bg-accent/5 text-[12.5px] font-semibold border-t border-dashed border-border-strong"
                >
                  + Adicionar exercício
                </button>
              </section>
            );
          })}

          {/* Finalizados */}
          <section className="rounded-lg border border-border bg-card">
            <button onClick={() => setShowFinalizados((v) => !v)} className="w-full px-4 py-3 text-left text-sm font-bold flex items-center justify-between">
              <span>Treinos finalizados ({finalizados.length})</span>
              <span className="text-fg-subtle text-xs">{showFinalizados ? "▲" : "▼"}</span>
            </button>
            {showFinalizados && (
              <ul className="divide-y divide-border">
                {finalizados.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-fg-subtle">Nenhum treino finalizado.</li>
                ) : (
                  finalizados.map((t) => (
                    <li key={t.id} className="px-4 py-3 text-sm text-fg-muted flex items-center gap-2">
                      <span className="font-bold text-fg">{t.letra}</span> · {t.nome}
                      <span className="text-fg-subtle text-xs">({t.exercicios.length} exercícios)</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar: anamnese + volume semanal */}
        <div className="space-y-4 xl:sticky xl:top-5 self-start">
          <CartaoAnamnese anamnese={anamnese} />
          <RailVolume volume={volumeSemana} modo={volMode} onModo={setVolMode} />
        </div>
      </div>

      <datalist id="ex-lib-multi">
        {biblioteca.map((b, i) => (
          <option key={i} value={b.nome} />
        ))}
      </datalist>

      {toast && (
        <div className="fixed bottom-5 right-5 z-40 bg-card-hover border border-border-strong border-l-[3px] border-l-success rounded-lg px-4 py-3 text-[12.5px] shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
