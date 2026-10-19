"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type CheckInState = {
  energia: number | null;
  sono: number | null;
  dor: number | null;
  motivacao: number | null;
};

const PERGUNTAS: Array<{ key: keyof CheckInState; label: string; icon: string; baixo: string; alto: string }> = [
  { key: "energia",   label: "Energia",   icon: "⚡", baixo: "exausto", alto: "no pico" },
  { key: "sono",      label: "Sono",      icon: "😴", baixo: "péssimo", alto: "ótimo" },
  { key: "dor",       label: "Dor / desconforto", icon: "🩹", baixo: "nenhuma", alto: "muita" },
  { key: "motivacao", label: "Motivação", icon: "🔥", baixo: "zero",    alto: "máxima" },
];

type CheckInDiarioProps = {
  jaRespondido?: boolean;
};

export function CheckInDiario({ jaRespondido = false }: CheckInDiarioProps) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<CheckInState>({
    energia: null,
    sono: null,
    dor: null,
    motivacao: null,
  });
  const [enviado, setEnviado] = useState(jaRespondido);

  const completo = (Object.values(valores) as Array<number | null>).every((v) => v !== null);

  async function salvar() {
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valores),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.warn(`Check-in não foi salvo: ${err.error ?? res.status}`);
      }
    } catch {
      toast.error("Sem conexão — check-in não foi salvo.");
    }
    setEnviado(true);
    setAberto(false);
  }

  if (enviado && !aberto) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardBody className="flex items-center gap-3 py-3">
          <span className="text-xl">✓</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Check-in de hoje completo</div>
            <div className="text-[11px] text-fg-subtle">Pedro recebeu seu status.</div>
          </div>
          <button
            onClick={() => setAberto(true)}
            className="text-xs text-accent hover:underline"
          >
            editar
          </button>
        </CardBody>
      </Card>
    );
  }

  if (!aberto) {
    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardBody className="py-3">
          <button onClick={() => setAberto(true)} className="w-full flex items-center gap-3 text-left">
            <span className="text-2xl">📊</span>
            <div className="flex-1">
              <div className="font-bold text-sm">Como você tá hoje?</div>
              <div className="text-[11px] text-fg-subtle">30 segundos · 4 perguntas</div>
            </div>
            <span className="text-accent font-bold">→</span>
          </button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border-accent/30">
      <CardBody className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">Check-in diário</div>
            <div className="text-[11px] text-fg-subtle">Toque na nota de 1 a 10</div>
          </div>
          <button onClick={() => setAberto(false)} className="text-fg-subtle text-lg">✕</button>
        </div>

        {PERGUNTAS.map((p) => (
          <div key={p.key}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </div>
              {valores[p.key] !== null ? (
                <span className="text-accent font-bold font-mono">{valores[p.key]}/10</span>
              ) : null}
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }).map((_, i) => {
                const n = i + 1;
                const ativo = valores[p.key] !== null && n <= (valores[p.key] ?? 0);
                return (
                  <button
                    key={n}
                    onClick={() => setValores((v) => ({ ...v, [p.key]: n }))}
                    className={`h-9 rounded-md text-[11px] font-bold transition-colors ${
                      ativo
                        ? "bg-accent text-fg"
                        : "bg-card border border-border text-fg-muted hover:border-accent/40"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-fg-subtle mt-1">
              <span>{p.baixo}</span>
              <span>{p.alto}</span>
            </div>
          </div>
        ))}

        <Button variant="primary" size="lg" className="w-full" disabled={!completo} onClick={() => { void salvar(); }}>
          Enviar check-in
        </Button>
      </CardBody>
    </Card>
  );
}
