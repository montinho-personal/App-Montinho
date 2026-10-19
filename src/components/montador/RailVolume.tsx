"use client";

import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { VOLUME_POR_GRUPO, classificarVolume, VOLUME_STATUS_LABEL } from "@/lib/periodizacao";
import { GRUPO_LABEL } from "@/lib/grupos";

type Modo = "sessao" | "semana";

type Props = {
  volume: Partial<Record<GrupoMuscular, number>>;
  modo: Modo;
  onModo: (m: Modo) => void;
};

const AZUL = "#7aa7ff";
const VERDE = "#2BD46B";
const LARANJA = "var(--color-accent)"; // "pesado/sobrecarga" usa a cor de destaque da marca

// Grupos sem faixa de volume definida (cardio/full body/outro) ficam fora do gráfico.
const SEM_FAIXA: GrupoMuscular[] = ["cardio", "full_body", "outro"];

function leveIdealPesado(grupo: GrupoMuscular, series: number): { palavra: string; cor: string } {
  const st = classificarVolume(grupo, series);
  if (st === "sobrecarga") return { palavra: "pesado", cor: LARANJA };
  if (st === "produtivo" || st === "otimo") return { palavra: "ideal", cor: VERDE };
  return { palavra: "leve", cor: AZUL }; // abaixo_mv | manutencao
}

export function RailVolume({ volume, modo, onModo }: Props) {
  const entries = (Object.entries(volume) as [GrupoMuscular, number][])
    .filter(([g, s]) => s > 0 && !SEM_FAIXA.includes(g))
    .sort((a, b) => b[1] - a[1]);

  const pesados = entries
    .filter(([g, s]) => classificarVolume(g, s) === "sobrecarga")
    .map(([g]) => GRUPO_LABEL[g]);
  const leves = entries
    .filter(([g, s]) => ["abaixo_mv", "manutencao"].includes(classificarVolume(g, s)))
    .map(([g]) => GRUPO_LABEL[g]);

  let insight = "✅ Treino equilibrado — os grupos estão dentro da faixa ideal.";
  if (pesados.length)
    insight = `🔶 ${pesados.join(", ")} ${pesados.length > 1 ? "estão" : "está"} acima do recuperável — "ficou pesado". Dá pra cortar série.`;
  else if (leves.length)
    insight = `🔵 ${leves.join(", ")} ${leves.length > 1 ? "estão" : "está"} abaixo do mínimo — sobra espaço pra subir volume.`;

  return (
    <aside className="xl:sticky xl:top-5 rounded-lg border border-border bg-surface p-4 space-y-1 self-start">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold">Volume</h3>
        <span className="font-mono text-[11px] text-fg-subtle">séries / grupo</span>
      </div>
      <p className="text-[11px] text-fg-muted leading-relaxed pb-2">
        O sistema lê os exercícios e mostra na hora o que ficou{" "}
        <b style={{ color: VERDE }}>ideal</b>, <b style={{ color: AZUL }}>leve</b> ou{" "}
        <b style={{ color: LARANJA }}>pesado</b> — o &quot;olho&quot; da planilha, automático.
      </p>

      {/* Toggle sessão / semana */}
      <div className="flex bg-card border border-border rounded-md overflow-hidden text-[11px] font-bold">
        <button
          onClick={() => onModo("sessao")}
          className={`flex-1 py-1.5 transition-colors ${modo === "sessao" ? "bg-accent text-white" : "text-fg-muted hover:text-fg"}`}
        >
          Este treino
        </button>
        <button
          onClick={() => onModo("semana")}
          className={`flex-1 py-1.5 transition-colors ${modo === "semana" ? "bg-accent text-white" : "text-fg-muted hover:text-fg"}`}
        >
          Semana toda
        </button>
      </div>

      {/* Barras */}
      <div className="pt-3 space-y-3">
        {entries.length === 0 ? (
          <div className="text-[12px] text-fg-subtle text-center py-8 leading-relaxed">
            Comece a digitar os exercícios —<br />o volume aparece aqui na hora.
          </div>
        ) : (
          entries.map(([g, series]) => {
            const r = VOLUME_POR_GRUPO[g];
            const { palavra, cor } = leveIdealPesado(g, series);
            const maxScale = Math.max(r.mrv * 1.25, series);
            const fillPct = Math.min(100, (series / maxScale) * 100);
            const zonaIni = (r.mev / maxScale) * 100;
            const zonaLarg = ((r.mrv - r.mev) / maxScale) * 100;
            return (
              <div key={g}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
                    {GRUPO_LABEL[g]}
                  </span>
                  <span className="text-[12px] font-extrabold">
                    {series}
                    <span
                      className="text-[9.5px] font-bold uppercase tracking-wide ml-1.5"
                      style={{ color: cor }}
                    >
                      {palavra}
                    </span>
                  </span>
                </div>
                <div
                  className="h-2.5 bg-bg rounded-md relative overflow-hidden border border-border"
                  title={`MEV ${r.mev} · MAV ${r.mav} · MRV ${r.mrv} séries/sem — ${VOLUME_STATUS_LABEL[classificarVolume(g, series)]}`}
                >
                  {/* zona produtiva→ótima (MEV–MRV) */}
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `${zonaIni}%`,
                      width: `${zonaLarg}%`,
                      background: "rgba(43,212,107,0.12)",
                      borderLeft: "1px dashed rgba(43,212,107,0.45)",
                      borderRight: "1px dashed rgba(43,212,107,0.45)",
                    }}
                  />
                  <div
                    className="h-full rounded-md relative transition-[width] duration-300"
                    style={{ width: `${fillPct}%`, background: cor }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legenda */}
      <div className="flex gap-3.5 pt-3 mt-1 border-t border-border text-[10.5px] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-sm inline-block" style={{ background: AZUL }} /> Leve
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-sm inline-block" style={{ background: VERDE }} /> Ideal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-sm inline-block" style={{ background: LARANJA }} /> Pesado
        </span>
      </div>

      {/* Insight */}
      {entries.length > 0 && (
        <div className="mt-3 bg-card border border-border border-l-[3px] border-l-accent rounded-r-lg px-3 py-2.5 text-[11.5px] leading-relaxed">
          {insight}
        </div>
      )}

      <p className="text-[10px] text-fg-subtle pt-2 leading-relaxed">
        Faixas MEV/MAV/MRV semanais por grupo — Israetel (RP) · Schoenfeld 2017.
      </p>
    </aside>
  );
}
