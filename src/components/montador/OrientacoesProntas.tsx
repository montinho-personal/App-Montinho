"use client";

// Orientações prontas de execução: escolher uma acrescenta o texto à nota do
// exercício (o personal pode ajustar o texto ali mesmo). Mostra as que já
// estão na nota, com ✕ para tirar.
import { adicionarOrientacao, LIMITE_NOTA, ORIENTACOES, orientacoesNaNota, removerOrientacao } from "@/lib/orientacoes";

export function OrientacoesProntas({ nota, onChange }: { nota: string; onChange: (nota: string) => void }) {
  const ja = orientacoesNaNota(nota);
  return (
    <div className="mt-1 space-y-1">
      {ja.length ? (
        <div className="flex flex-wrap gap-1">
          {ja.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {ORIENTACOES.find((o) => o.id === id)?.titulo}
              <button type="button" onClick={() => onChange(removerOrientacao(nota, id))} aria-label="Tirar esta orientação" className="text-fg-muted hover:text-fg">
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onChange(adicionarOrientacao(nota, e.target.value).slice(0, LIMITE_NOTA));
        }}
        aria-label="Adicionar orientação pronta"
        className="h-7 w-full rounded border border-accent/40 bg-bg px-1 text-[11px] font-semibold text-accent"
      >
        <option value="">+ Orientação pronta…</option>
        {ORIENTACOES.map((o) => (
          <option key={o.id} value={o.id} disabled={ja.includes(o.id)}>
            {ja.includes(o.id) ? "✓ " : ""}
            {o.titulo}
          </option>
        ))}
      </select>
    </div>
  );
}
