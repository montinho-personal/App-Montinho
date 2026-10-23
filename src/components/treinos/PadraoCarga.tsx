"use client";

// Como anotar o peso (anilhas/halteres: total ou por lado) e o lembrete do
// “mesmo aparelho”. Usado no treino (aluno e aula presencial) e no perfil.

import { useState } from "react";
import { LEMBRETE_APARELHO, OPCOES_CARGA, type ModoCarga, type PadraoCarga, type TipoPeso } from "@/lib/treino/padrao-carga";

export async function salvarPadraoCarga(mudanca: Partial<PadraoCarga>, cabecalhos: Record<string, string> = {}): Promise<PadraoCarga | null> {
  try {
    const r = await fetch("/api/preferencias/carga", { method: "PUT", headers: { "content-type": "application/json", ...cabecalhos }, body: JSON.stringify(mudanca) });
    if (!r.ok) return null;
    return ((await r.json()) as { padrao: PadraoCarga }).padrao;
  } catch {
    return null;
  }
}

/** Pergunta (ou troca) o padrão de um tipo de peso. */
export function EscolherPadraoCarga({ tipo, atual, onEscolher, onCancelar, compacto = false }: { tipo: TipoPeso; atual: ModoCarga | null; onEscolher: (m: ModoCarga) => void; onCancelar?: () => void; compacto?: boolean }) {
  const o = OPCOES_CARGA[tipo];
  return (
    <div className={compacto ? "space-y-2" : "space-y-2 rounded-md border border-accent/50 bg-accent/10 px-3 py-2.5"}>
      <p className="text-sm font-bold">{o.pergunta}</p>
      <div className="grid grid-cols-2 gap-2">
        {(["total", "por_lado"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onEscolher(m)}
            aria-pressed={atual === m}
            className={`alvo flex flex-col items-start rounded-md border px-2.5 py-2 text-left ${atual === m ? "border-accent bg-accent/20" : "border-border bg-bg hover:border-accent/60"}`}
          >
            <span className="block text-[13px] font-semibold">{o[m].titulo}</span>
            <span className="block text-[11px] text-fg-muted">{o[m].exemplo}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-fg-subtle">
        {atual ? "As cargas antigas ficam como foram anotadas; daqui para frente, anote do novo jeito." : "Escolha uma vez: vale para todos os exercícios com " + (tipo === "anilhas" ? "anilhas" : "halteres") + ". Dá para mudar depois."}
        {onCancelar ? (
          <>
            {" "}
            <button type="button" onClick={onCancelar} className="font-semibold text-accent underline-offset-2 hover:underline">
              Cancelar
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}

/** Lembrete do aparelho + “Outro aparelho hoje” (a carga não é anotada). */
export function LembreteAparelho({ outro, onOutro }: { outro: boolean; onOutro: (v: boolean) => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${outro ? "border-warning/60 bg-warning/10" : "border-border bg-bg/40"}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="alvo text-left font-semibold text-fg-muted">
          📍 {LEMBRETE_APARELHO.titulo}{" "}<span className="text-fg-subtle">{aberto ? "▴" : "ⓘ"}</span>
        </button>
        <label className="alvo flex cursor-pointer items-center gap-1.5 font-semibold">
          <input type="checkbox" checked={outro} onChange={(e) => onOutro(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Outro aparelho hoje
        </label>
      </div>
      {aberto ? <p className="mt-1 text-fg-muted">{LEMBRETE_APARELHO.texto}</p> : null}
      {outro ? <p className="mt-1 text-fg">Certo! Hoje anote só as repetições. A carga fica em branco e a sua referência continua a do aparelho de sempre.</p> : null}
    </div>
  );
}

/** Perfil do aluno: as duas escolhas + o lembrete do aparelho. */
export function PadraoCargaPerfil({ inicial }: { inicial: PadraoCarga }) {
  const [padrao, setPadrao] = useState(inicial);
  const [aviso, setAviso] = useState<string | null>(null);
  async function escolher(tipo: TipoPeso, m: ModoCarga) {
    const antes = padrao;
    setPadrao((p) => ({ ...p, [tipo]: m }));
    const salvo = await salvarPadraoCarga({ [tipo]: m });
    if (salvo) setAviso("Salvo!");
    else {
      setPadrao(antes);
      setAviso("Não deu para salvar agora. Tente de novo.");
    }
  }
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-base font-bold">Como eu anoto o peso</h2>
      <EscolherPadraoCarga tipo="anilhas" atual={padrao.anilhas} onEscolher={(m) => escolher("anilhas", m)} compacto />
      <EscolherPadraoCarga tipo="halteres" atual={padrao.halteres} onEscolher={(m) => escolher("halteres", m)} compacto />
      <p className="rounded-md border border-border bg-bg/40 px-3 py-2 text-xs text-fg-muted">
        <span className="font-semibold text-fg">📍 {LEMBRETE_APARELHO.titulo}.</span> {LEMBRETE_APARELHO.texto}
      </p>
      {aviso ? <p role="status" className="text-xs text-fg-subtle">{aviso}</p> : null}
    </section>
  );
}
