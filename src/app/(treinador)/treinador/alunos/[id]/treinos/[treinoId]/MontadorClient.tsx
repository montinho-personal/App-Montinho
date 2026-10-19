"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Anamnese, GrupoMuscular } from "@/lib/supabase/types-extended";
import { detectarGrupo, GRUPO_LABEL, GRUPO_COR, GRUPOS_CICLO } from "@/lib/grupos";
import { alertasDoExercicio, regioesLesionadas } from "@/lib/restricoes";
import { RailVolume } from "@/components/montador/RailVolume";
import { CartaoAnamnese } from "@/components/montador/CartaoAnamnese";

// ── Tipos ───────────────────────────────────────────────────────────────────
type Row = {
  _key: string;
  id: string | null; // id real (Supabase) ou null se ainda não salvo
  nome: string;
  series: string; // string na edição; vira int na persistência (Fase 3)
  reps: string;
  ie: string;
  observacoes: string;
  grupo: GrupoMuscular | null; // override manual; null = detecção automática
};

type ExercicioInicial = {
  id: string;
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  descanso_seg: number | null;
  observacoes: string | null;
};

type Props = {
  alunoId: string;
  alunoNome: string;
  treino: { id: string; letra: string; nome: string; observacoes: string | null };
  exerciciosIniciais: ExercicioInicial[];
  biblioteca: { nome: string }[];
  volumeOutros: Partial<Record<GrupoMuscular, number>>; // séries/grupo dos OUTROS treinos do aluno
  anamnese: Anamnese | null;
};

type Col = "nome" | "series" | "reps" | "ie" | "observacoes";

let _seq = 0;
const novaKey = () => `r${_seq++}`;

// ── Componente ────────────────────────────────────────────────────────────────
export function MontadorClient({
  alunoId,
  alunoNome,
  treino,
  exerciciosIniciais,
  biblioteca,
  volumeOutros,
  anamnese,
}: Props) {
  const [nome, setNome] = useState(treino.nome);
  const [rows, setRows] = useState<Row[]>(() =>
    exerciciosIniciais.map((e) => ({
      _key: novaKey(),
      id: e.id,
      nome: e.nome,
      series: e.series != null ? String(e.series) : "",
      reps: e.reps ?? "",
      ie: e.ie != null ? String(e.ie) : "",
      observacoes: e.observacoes ?? "",
      grupo: null,
    }))
  );
  const [excel, setExcel] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [volMode, setVolMode] = useState<"sessao" | "semana">("sessao");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [autosave, setAutosave] = useState(false);

  const gridRef = useRef<HTMLTableSectionElement>(null);
  const dragFrom = useRef<number | null>(null);

  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const grupoDe = (r: Row): GrupoMuscular => r.grupo ?? detectarGrupo(r.nome);

  // ── Volume ao vivo ──────────────────────────────────────────────────────────
  const volumeSessao = useMemo(() => {
    const acc: Partial<Record<GrupoMuscular, number>> = {};
    for (const r of rows) {
      if (!r.nome.trim()) continue;
      const g = r.grupo ?? detectarGrupo(r.nome);
      const s = parseInt(r.series) || 0;
      if (s <= 0) continue;
      acc[g] = (acc[g] ?? 0) + s;
    }
    return acc;
  }, [rows]);

  const volumeExibido = useMemo(() => {
    if (volMode === "sessao") return volumeSessao;
    const merged: Partial<Record<GrupoMuscular, number>> = { ...volumeOutros };
    for (const [g, s] of Object.entries(volumeSessao) as [GrupoMuscular, number][]) {
      merged[g] = (merged[g] ?? 0) + s;
    }
    return merged;
  }, [volMode, volumeSessao, volumeOutros]);

  // ── Alertas de lesão (Fase 4) ────────────────────────────────────────────
  const regioesLesao = useMemo(() => regioesLesionadas(anamnese), [anamnese]);
  const linhasComAlerta = useMemo(
    () => rows.filter((r) => alertasDoExercicio(r.nome, anamnese).length > 0).length,
    [rows, anamnese]
  );

  // ── Mutações de estado ──────────────────────────────────────────────────────
  const update = (key: string, col: Col, val: string) => {
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, [col]: val } : r)));
    setDirty(true);
  };

  const cicloGrupo = (key: string) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r._key !== key) return r;
        const atual = r.grupo ?? detectarGrupo(r.nome);
        const i = GRUPOS_CICLO.indexOf(atual);
        return { ...r, grupo: GRUPOS_CICLO[(i + 1) % GRUPOS_CICLO.length] };
      })
    );
    setDirty(true);
  };

  const novaRow = (): Row => ({
    _key: novaKey(),
    id: null,
    nome: "",
    series: "",
    reps: "",
    ie: "",
    observacoes: "",
    grupo: null,
  });

  const addRow = () => {
    const idx = rows.length;
    setRows((rs) => [...rs, novaRow()]);
    setDirty(true);
    foca(idx, "nome");
  };

  const removeRow = (key: string) => {
    setRows((rs) => rs.filter((r) => r._key !== key));
    setDirty(true);
  };

  const moveRow = (from: number | null, to: number) => {
    if (from == null || from === to) return;
    setRows((rs) => {
      const c = [...rs];
      const [m] = c.splice(from, 1);
      c.splice(to, 0, m);
      return c;
    });
    setDirty(true);
  };

  // ── Navegação tipo Excel ────────────────────────────────────────────────────
  const foca = (rowIdx: number, col: Col) => {
    window.setTimeout(() => {
      const el = gridRef.current?.querySelector<HTMLInputElement>(
        `input[data-r="${rowIdx}"][data-c="${col}"]`
      );
      if (el) {
        el.focus();
        el.select();
      }
    }, 0);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, i: number, col: Col) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (i + 1 >= rows.length) addRow();
      else foca(i + 1, col);
    } else if (e.key === "Tab" && !e.shiftKey && col === "observacoes" && i === rows.length - 1) {
      e.preventDefault();
      addRow();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (i + 1 < rows.length) foca(i + 1, col);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i > 0) foca(i - 1, col);
    }
  };

  const buildPayload = useCallback(() => {
    return {
      nome,
      exercicios: rows
        .filter((r) => r.nome.trim())
        .map((r) => ({
          nome: r.nome.trim(),
          series: parseInt(r.series) || 0,
          reps: r.reps.trim(),
          ie: r.ie.trim() ? parseInt(r.ie) : null,
          descanso_seg: null,
          observacoes: r.observacoes.trim() || null,
        })),
    };
  }, [nome, rows]);

  const salvar = useCallback(
    async (silencioso = false) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/treinos/${treino.id}/exercicios`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Falha ao salvar");
        setDirty(false);
        setSavedAt(
          new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        );
        if (!silencioso)
          flash(data.mock ? "Salvo ✓ — modo demo (sem banco conectado)" : "Treino salvo ✓");
      } catch (e) {
        flash("⚠ " + (e instanceof Error ? e.message : "Erro ao salvar"));
      } finally {
        setSaving(false);
      }
    },
    [treino.id, flash, buildPayload]
  );

  // Autosave: 2s após a última alteração (debounced), só com toggle ligado.
  useEffect(() => {
    if (!autosave || !dirty || saving) return;
    const t = window.setTimeout(() => {
      void salvar(true);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [autosave, dirty, saving, salvar]);

  // Aviso de saída com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const totalSeries = rows.reduce((s, r) => s + (parseInt(r.series) || 0), 0);
  const inputCls =
    "w-full bg-transparent px-3 py-2.5 outline-none transition-colors focus:bg-accent/5 focus:shadow-[inset_0_0_0_1.5px_var(--color-accent)]";
  const numCls = inputCls.replace("px-3", "px-2") + " text-center font-mono text-[12.5px]";

  return (
    <div className="space-y-5">
      <Link
        href={`/treinador/alunos/${alunoId}`}
        className="text-fg-muted text-sm hover:text-fg inline-flex items-center gap-1"
      >
        ← Voltar para {alunoNome}
      </Link>

      {/* Cabeçalho */}
      <header className="flex items-center gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-accent">{treino.letra}</span>
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setDirty(true);
            }}
            className="bg-transparent text-2xl font-bold w-full outline-none focus:border-b focus:border-border-strong"
            aria-label="Nome do treino"
          />
          <p className="text-sm text-fg-muted mt-0.5">
            {alunoNome} · {rows.length} {rows.length === 1 ? "exercício" : "exercícios"} ·{" "}
            <span className="font-mono">{totalSeries}</span> séries
            {saving ? (
              <span className="text-fg-subtle ml-2 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-pulse" /> salvando…
              </span>
            ) : dirty ? (
              <span className="text-gold ml-2">● não salvo</span>
            ) : savedAt ? (
              <span className="text-success ml-2">✓ salvo {savedAt}</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            className={`text-[12px] font-semibold px-2.5 py-2 rounded-md border cursor-pointer transition-colors inline-flex items-center gap-1.5 select-none ${
              autosave
                ? "bg-success/10 text-success border-success/40"
                : "bg-card text-fg-muted border-border hover:text-fg hover:border-border-strong"
            }`}
            title="Salva sozinho 2s após a última alteração"
          >
            <input
              type="checkbox"
              checked={autosave}
              onChange={(e) => setAutosave(e.target.checked)}
              className="accent-success w-3.5 h-3.5"
            />
            Autosave
          </label>
          <button
            onClick={() => setExcel((v) => !v)}
            className={`text-[12.5px] font-semibold px-3 py-2 rounded-md border transition-colors ${
              excel
                ? "bg-accent text-white border-accent"
                : "bg-card text-fg-muted border-border hover:text-fg hover:border-border-strong"
            }`}
          >
            ▦ Modo Excel
          </button>
          <button
            onClick={() => salvar(false)}
            disabled={saving || (!dirty && savedAt !== null)}
            className="text-[12.5px] font-semibold px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando…" : dirty || !savedAt ? "Salvar" : "Salvo ✓"}
          </button>
        </div>
      </header>

      {/* Grade + Rail de volume */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          {/* Banner de restrição por lesão */}
          {regioesLesao.length > 0 && (
            <div className="rounded-lg border border-red/30 bg-red/5 px-4 py-2.5 flex items-center gap-3 text-[12.5px]">
              <span className="text-red text-base">⚠</span>
              <span className="text-fg-muted">
                Aluno com lesão em <b className="text-fg">{regioesLesao.join(", ")}</b>.
                {linhasComAlerta > 0 ? (
                  <>
                    {" "}
                    <b className="text-red">
                      {linhasComAlerta} exercício{linhasComAlerta > 1 ? "s" : ""}
                    </b>{" "}
                    deste treino {linhasComAlerta > 1 ? "exigem" : "exige"} atenção (marcados com ⚠).
                  </>
                ) : (
                  <span className="text-success"> Nenhum exercício de risco neste treino ✓</span>
                )}
              </span>
            </div>
          )}

          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table
                className={`w-full text-sm border-collapse ${
                  excel
                    ? "[&_td]:border-r [&_td]:border-border [&_th]:border-r [&_th]:border-border-strong"
                    : ""
                }`}
              >
                <thead>
                  <tr className="bg-surface text-fg-subtle text-[10.5px] uppercase tracking-wider">
                    <th className="w-8" />
                    <th className="text-left font-semibold px-3 py-2.5">Exercício</th>
                    <th className="text-left font-semibold px-3 py-2.5 w-28">Grupo</th>
                    <th className="text-center font-semibold px-2 py-2.5 w-16">Séries</th>
                    <th className="text-left font-semibold px-3 py-2.5 w-36">Reps (por série)</th>
                    <th className="text-center font-semibold px-2 py-2.5 w-14">IE</th>
                    <th className="text-left font-semibold px-3 py-2.5 w-40">Técnica / Obs</th>
                    <th className="w-9" />
                  </tr>
                </thead>
                <tbody ref={gridRef}>
                  {rows.map((row, i) => {
                    const g = grupoDe(row);
                    const cor = GRUPO_COR[g];
                    const alertas = alertasDoExercicio(row.nome, anamnese);
                    const altoRisco = alertas.some((a) => a.severidade === "alto");
                    return (
                      <tr
                        key={row._key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add("bg-accent/5");
                        }}
                        onDragLeave={(e) => e.currentTarget.classList.remove("bg-accent/5")}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("bg-accent/5");
                          moveRow(dragFrom.current, i);
                          dragFrom.current = null;
                        }}
                        className={`group border-t border-border hover:bg-card-hover/40 ${
                          alertas.length ? (altoRisco ? "bg-red/[0.06]" : "bg-gold/[0.05]") : ""
                        }`}
                      >
                        <td
                          className="text-center text-fg-subtle/60 cursor-grab select-none active:cursor-grabbing"
                          draggable
                          onDragStart={() => {
                            dragFrom.current = i;
                          }}
                          title="Arraste para reordenar"
                        >
                          ⠿
                        </td>
                        <td className="p-0">
                          <input
                            data-r={i}
                            data-c="nome"
                            list="ex-lib"
                            defaultValue={row.nome}
                            placeholder="nome do exercício…"
                            onChange={(e) => update(row._key, "nome", e.target.value)}
                            onKeyDown={(e) => onKey(e, i, "nome")}
                            className={inputCls}
                          />
                        </td>
                        <td className="px-2 align-middle">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => cicloGrupo(row._key)}
                              title="Clique para trocar o grupo"
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10.5px] font-bold whitespace-nowrap border transition-transform hover:scale-[1.03]"
                              style={{ background: `${cor}22`, color: cor, borderColor: `${cor}55` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
                              {GRUPO_LABEL[g]}
                            </button>
                            {alertas.length > 0 && (
                              <span
                                className="cursor-help text-[13px] leading-none shrink-0"
                                style={{ color: altoRisco ? "#ef4444" : "#f5b800" }}
                                title={alertas.map((a) => `⚠ ${a.regiao}: ${a.mensagem}`).join("\n\n")}
                              >
                                ⚠
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-0">
                          <input
                            data-r={i}
                            data-c="series"
                            inputMode="numeric"
                            defaultValue={row.series}
                            placeholder="–"
                            onChange={(e) => update(row._key, "series", e.target.value)}
                            onKeyDown={(e) => onKey(e, i, "series")}
                            className={numCls}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            data-r={i}
                            data-c="reps"
                            defaultValue={row.reps}
                            placeholder="12 / 10 / 8"
                            onChange={(e) => update(row._key, "reps", e.target.value)}
                            onKeyDown={(e) => onKey(e, i, "reps")}
                            className={inputCls + " font-mono text-[12.5px]"}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            data-r={i}
                            data-c="ie"
                            inputMode="numeric"
                            defaultValue={row.ie}
                            placeholder="–"
                            onChange={(e) => update(row._key, "ie", e.target.value)}
                            onKeyDown={(e) => onKey(e, i, "ie")}
                            className={numCls + " text-accent font-bold"}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            data-r={i}
                            data-c="observacoes"
                            defaultValue={row.observacoes}
                            placeholder="—"
                            onChange={(e) => update(row._key, "observacoes", e.target.value)}
                            onKeyDown={(e) => onKey(e, i, "observacoes")}
                            className={inputCls + " text-fg-muted italic"}
                          />
                        </td>
                        <td className="px-1 text-center">
                          <button
                            onClick={() => removeRow(row._key)}
                            className="text-fg-subtle hover:text-red opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1"
                            title="Remover exercício"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-fg-subtle py-10 text-sm">
                        Treino vazio — clique em <b className="text-fg-muted">+ Adicionar exercício</b> ou comece a digitar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={addRow}
              className="w-full text-left px-3 py-2.5 text-fg-muted hover:text-accent hover:bg-accent/5 text-sm font-semibold border-t border-dashed border-border-strong transition-colors"
            >
              + Adicionar exercício
            </button>
          </div>

          {/* Dica de teclado */}
          <div className="flex items-center gap-4 text-xs text-fg-subtle px-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="font-mono text-[10.5px] bg-card-hover border border-border-strong rounded px-1.5 py-0.5">Enter</kbd>
              próxima linha
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="font-mono text-[10.5px] bg-card-hover border border-border-strong rounded px-1.5 py-0.5">Tab</kbd>
              próximo campo
            </span>
            <span>⠿ arraste para reordenar</span>
            <span>
              clique no <b className="text-fg-muted">grupo</b> para trocar
            </span>
          </div>
        </div>

        {/* Sidebar: anamnese + volume ao vivo */}
        <div className="space-y-4">
          <CartaoAnamnese anamnese={anamnese} />
          <RailVolume volume={volumeExibido} modo={volMode} onModo={setVolMode} />
        </div>
      </div>

      {/* Autocomplete (biblioteca real) */}
      <datalist id="ex-lib">
        {biblioteca.map((b, i) => (
          <option key={i} value={b.nome} />
        ))}
      </datalist>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-40 bg-card-hover border border-border-strong border-l-[3px] border-l-success rounded-lg px-4 py-3 text-[12.5px] shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
