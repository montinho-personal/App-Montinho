"use client";

import { useState } from "react";
import type { Anamnese } from "@/lib/supabase/types-extended";
import { regioesLesionadas } from "@/lib/restricoes";

export function CartaoAnamnese({ anamnese }: { anamnese: Anamnese | null }) {
  const [aberto, setAberto] = useState(true);

  if (!anamnese) {
    return (
      <aside className="rounded-lg border border-dashed border-border bg-surface p-4 text-center">
        <div className="text-2xl mb-1 opacity-50">📋</div>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Sem anamnese registrada.
          <br />O cartão de contexto e os alertas de lesão aparecem aqui depois do preenchimento.
        </p>
      </aside>
    );
  }

  const regioes = regioesLesionadas(anamnese);
  const temRisco = regioes.length > 0;

  return (
    <aside className="rounded-lg border border-border bg-surface overflow-hidden self-start">
      {/* Header */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover/40 transition-colors"
      >
        <span className="text-sm font-extrabold inline-flex items-center gap-2">
          📋 Anamnese
          {temRisco && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-red/15 text-red border border-red/30 rounded px-1.5 py-0.5">
              {regioes.length} {regioes.length === 1 ? "restrição" : "restrições"}
            </span>
          )}
        </span>
        <span className="text-fg-subtle text-xs">{aberto ? "▲" : "▼"}</span>
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Objetivo */}
          {anamnese.objetivo_principal && (
            <div>
              <Rotulo>Objetivo</Rotulo>
              <p className="text-[12.5px] leading-relaxed">{anamnese.objetivo_principal}</p>
            </div>
          )}

          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Freq." valor={anamnese.frequencia_semanal ? `${anamnese.frequencia_semanal}x/sem` : "—"} />
            <Mini label="Prazo" valor={anamnese.prazo_meses ? `${anamnese.prazo_meses} meses` : "—"} />
            <Mini label="Meta" valor={anamnese.meta_peso_kg ? `${anamnese.meta_peso_kg}kg` : "—"} />
          </div>

          {/* Lesões / dores — destaque */}
          {(anamnese.lesoes || anamnese.dores_atuais) && (
            <div className="bg-red/5 border border-red/25 border-l-[3px] border-l-red rounded-r-lg px-3 py-2.5 space-y-2">
              {temRisco && (
                <div className="flex flex-wrap gap-1.5">
                  {regioes.map((r) => (
                    <span
                      key={r}
                      className="text-[10px] font-bold bg-red/15 text-red border border-red/30 rounded px-1.5 py-0.5"
                    >
                      ⚠ {r}
                    </span>
                  ))}
                </div>
              )}
              {anamnese.lesoes && (
                <div>
                  <Rotulo tone="red">Lesões</Rotulo>
                  <p className="text-[12px] leading-relaxed text-fg">{anamnese.lesoes}</p>
                </div>
              )}
              {anamnese.dores_atuais && (
                <div>
                  <Rotulo tone="red">Dores atuais</Rotulo>
                  <p className="text-[12px] leading-relaxed text-fg">{anamnese.dores_atuais}</p>
                </div>
              )}
              <p className="text-[10.5px] text-fg-muted leading-relaxed pt-1 border-t border-red/15">
                O Montador marca com ⚠ os exercícios de risco pra essas regiões.
              </p>
            </div>
          )}

          {/* Equipamentos */}
          {anamnese.equipamentos_disponiveis?.length > 0 && (
            <div>
              <Rotulo>Equipamento disponível</Rotulo>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {anamnese.equipamentos_disponiveis.map((e) => (
                  <span
                    key={e}
                    className="text-[10.5px] capitalize bg-card border border-border rounded px-1.5 py-0.5 text-fg-muted"
                  >
                    {e.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function Rotulo({ children, tone }: { children: React.ReactNode; tone?: "red" }) {
  return (
    <div
      className={`text-[9.5px] uppercase tracking-wider font-bold mb-0.5 ${
        tone === "red" ? "text-red" : "text-fg-subtle"
      }`}
    >
      {children}
    </div>
  );
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-card border border-border rounded-md px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wider text-fg-subtle font-semibold">{label}</div>
      <div className="text-[12px] font-bold mt-0.5">{valor}</div>
    </div>
  );
}
