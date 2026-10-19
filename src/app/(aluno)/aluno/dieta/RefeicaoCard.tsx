"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import type { Dieta } from "@/lib/supabase/types";

export function RefeicaoCard({ refeicao }: { refeicao: Dieta }) {
  const [expanded, setExpanded] = useState(false);
  const [showSubs, setShowSubs] = useState(false);

  return (
    <Card>
      <CardBody>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
            <span className="text-accent">🍽</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{refeicao.refeicao}</div>
            <div className="text-xs text-fg-subtle">
              {refeicao.horario ?? "horário livre"} · {refeicao.alimentos.length} itens
            </div>
          </div>
          <span className="text-fg-subtle text-lg shrink-0">{expanded ? "▾" : "▸"}</span>
        </button>

        {expanded ? (
          <div className="mt-4 space-y-3">
            <ul className="space-y-2">
              {refeicao.alimentos.map((a, i) => (
                <li key={i} className="flex items-center justify-between bg-card-hover rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{a.nome}</span>
                  <span className="text-xs text-fg-muted font-mono">{a.quantidade}</span>
                </li>
              ))}
            </ul>

            {refeicao.observacoes ? (
              <div className="text-xs text-fg-muted italic px-3">↳ {refeicao.observacoes}</div>
            ) : null}

            {refeicao.substituicoes.length > 0 ? (
              <div>
                <button
                  onClick={() => setShowSubs((v) => !v)}
                  className="text-xs uppercase tracking-wider font-bold text-accent flex items-center gap-1"
                >
                  ↔ Substituições ({refeicao.substituicoes.length}) {showSubs ? "▾" : "▸"}
                </button>
                {showSubs ? (
                  <ul className="mt-2 space-y-1 text-xs text-fg-muted">
                    {refeicao.substituicoes.map((s, i) => (
                      <li key={i} className="flex items-center justify-between px-3 py-1.5 border-l-2 border-accent/40">
                        <span>{s.nome}</span>
                        <span className="font-mono">{s.quantidade}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
