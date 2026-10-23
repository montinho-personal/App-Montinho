"use client";

import { NotaDoPersonal } from "@/components/aluno/NotaDoPersonal";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Card, CardBody } from "@/components/ui/Card";
import { RestTimer } from "@/components/ui/RestTimer";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { VideoThumb } from "@/components/ui/VideoThumb";
import type { Exercicio } from "@/lib/supabase/types";
import type { ExercicioBiblioteca } from "@/lib/supabase/types-extended";
import type { VideoSource } from "@/lib/video";

type SerieLog = {
  carga_kg: number | null;
  reps: number | null;
  ie: number | null;
};

type ExercicioCardProps = {
  exercicio: Exercicio & { biblioteca?: ExercicioBiblioteca | null };
  index: number;
  ultimo: Map<number, SerieLog>;
};

export function ExercicioCard({ exercicio, index, ultimo }: ExercicioCardProps) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [series, setSeries] = useState<SerieLog[]>(() =>
    Array.from({ length: exercicio.series }, () => ({
      carga_kg: null,
      reps: null,
      ie: null,
    }))
  );
  const [timerKey, setTimerKey] = useState(0);
  const [timerOn, setTimerOn] = useState(false);

  const completedCount = series.filter((s) => s.reps !== null).length;
  const totalCount = series.length;
  const isComplete = completedCount === totalCount;

  function updateSerie(idx: number, patch: Partial<SerieLog>) {
    setSeries((s) => s.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }

  async function concluirSerie(idx: number) {
    if (series[idx].reps === null) return;
    if (exercicio.descanso_seg) {
      setTimerKey((k) => k + 1);
      setTimerOn(true);
    }
    // Persiste no logbook
    const s = series[idx];
    if (exercicio.id && s.reps !== null) {
      try {
        const res = await fetch("/api/logbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exercicio_id: exercicio.id,
            serie: idx + 1,
            carga_kg: s.carga_kg,
            reps: s.reps,
            ie: s.ie,
            data: new Date().toISOString().slice(0, 10),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.warn(`Série não salva: ${err.error ?? res.status}`);
        }
      } catch {
        toast.error("Sem conexão — série não foi salva no histórico.");
      }
    }
  }

  function comparacao(serieIdx: number): { delta: number; tipo: "carga" | "reps" } | null {
    const atual = series[serieIdx];
    const referencia = ultimo.get(serieIdx + 1);
    if (!referencia || atual.carga_kg === null) return null;
    if (referencia.carga_kg !== null && atual.carga_kg !== referencia.carga_kg) {
      return { delta: atual.carga_kg - referencia.carga_kg, tipo: "carga" };
    }
    if (referencia.reps !== null && atual.reps !== null && atual.reps !== referencia.reps) {
      return { delta: atual.reps - referencia.reps, tipo: "reps" };
    }
    return null;
  }

  const videoSource: VideoSource | null =
    exercicio.biblioteca?.video_provider && exercicio.biblioteca?.video_id
      ? { provider: exercicio.biblioteca.video_provider, id: exercicio.biblioteca.video_id }
      : null;

  return (
    <Card className={isComplete ? "border-success/40 bg-success/5" : ""}>
      <CardBody>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 text-left"
        >
          {videoSource ? (
            <VideoThumb source={videoSource} size="sm" />
          ) : (
            <div
              className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                isComplete
                  ? "bg-success border-success text-bg"
                  : "bg-bg border-border text-fg-muted"
              }`}
            >
              {isComplete ? "✓" : index}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{exercicio.nome}</div>
            <div className="text-xs text-fg-subtle mt-0.5">
              {exercicio.series} {exercicio.series === 1 ? "série" : "séries"} · {exercicio.reps}
              {exercicio.ie ? ` · IE ${exercicio.ie}` : ""}
            </div>
          </div>
          <div className="text-xs text-fg-subtle font-mono shrink-0">
            {completedCount}/{totalCount}
          </div>
          <span className="text-fg-subtle text-lg shrink-0">{expanded ? "▾" : "▸"}</span>
        </button>

        {expanded && videoSource ? (
          <div className="mt-4">
            <VideoPlayer source={videoSource} lazy />
          </div>
        ) : null}

        {exercicio.observacoes && expanded ? (
          <div className="mt-3">
            <NotaDoPersonal nota={exercicio.observacoes} />
          </div>
        ) : null}

        {expanded ? (
          <div className="mt-4 space-y-3">
            {timerOn && exercicio.descanso_seg ? (
              <RestTimer
                key={timerKey}
                duracaoSeg={exercicio.descanso_seg}
                autoStart
                onComplete={() => setTimerOn(false)}
              />
            ) : null}

            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-fg-subtle font-semibold px-1">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Carga (kg)</div>
              <div className="col-span-3">Reps</div>
              <div className="col-span-2">IE</div>
              <div className="col-span-3 text-right">Última</div>
            </div>
            {series.map((s, i) => {
              const ref = ultimo.get(i + 1);
              const cmp = comparacao(i);
              const concluida = s.reps !== null && s.carga_kg !== null;
              return (
                <div key={i} className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-xs text-fg-muted font-mono">{i + 1}</div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.5"
                        inputMode="decimal"
                        value={s.carga_kg ?? ""}
                        onChange={(e) =>
                          updateSerie(i, { carga_kg: e.target.value ? Number(e.target.value) : null })
                        }
                        onBlur={() => { void concluirSerie(i); }}
                        className={`w-full h-10 bg-bg border rounded-md px-2 text-sm text-center font-mono focus:outline-none focus:border-accent ${
                          concluida ? "border-success/40" : "border-border"
                        }`}
                        placeholder={ref?.carga_kg ? String(ref.carga_kg) : "—"}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={s.reps ?? ""}
                        onChange={(e) =>
                          updateSerie(i, { reps: e.target.value ? Number(e.target.value) : null })
                        }
                        onBlur={() => { void concluirSerie(i); }}
                        className={`w-full h-10 bg-bg border rounded-md px-2 text-sm text-center font-mono focus:outline-none focus:border-accent ${
                          concluida ? "border-success/40" : "border-border"
                        }`}
                        placeholder={ref?.reps ? String(ref.reps) : "—"}
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={s.ie ?? ""}
                        onChange={(e) =>
                          updateSerie(i, { ie: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full h-10 bg-bg border border-border rounded-md px-1 text-sm text-center font-mono focus:outline-none focus:border-accent"
                      >
                        <option value="">—</option>
                        {[5, 6, 7, 8, 9, 10].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3 text-right text-[10px] text-fg-subtle font-mono">
                      {ref ? `${ref.carga_kg ?? "—"}kg · ${ref.reps ?? "—"}` : "—"}
                    </div>
                  </div>
                  {cmp ? (
                    <div className="text-[10px] font-bold text-right pr-1">
                      <span
                        className={
                          cmp.delta > 0
                            ? "text-success"
                            : cmp.delta < 0
                              ? "text-warning"
                              : "text-fg-subtle"
                        }
                      >
                        {cmp.delta > 0 ? "▲" : "▼"} {Math.abs(cmp.delta)}
                        {cmp.tipo === "carga" ? "kg" : " reps"} vs última
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
