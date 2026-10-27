"use client";

// Modelos de mensagem do WhatsApp do personal: trocar o rascunho por um modelo
// e editar os modelos (Central de aderência e Montinho Pulso).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { MODELO_IDS, MODELOS_INFO, MODELOS_PADRAO, marcadoresInvalidos, preencherModelo, type ModeloId, type ModelosMensagem } from "@/lib/acompanhamento/modelos";

export function EscolherModelo({ modelos, nome, dias, semanas, onEscolher }: { modelos: ModelosMensagem; nome: string; dias?: number | null; semanas?: number | null; onEscolher: (texto: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-fg-muted">
      Usar modelo:
      <select
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value as ModeloId | "";
          if (id) onEscolher(preencherModelo(modelos[id], { nome, dias, semanas }));
          e.target.value = "";
        }}
        className="h-8 rounded-md border border-border bg-bg px-2 text-xs"
      >
        <option value="">escolher…</option>
        {MODELO_IDS.map((id) => <option key={id} value={id}>{MODELOS_INFO[id].titulo}</option>)}
      </select>
    </label>
  );
}

export function EditorModelos({ modelos }: { modelos: ModelosMensagem }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState<ModelosMensagem>(modelos);
  const [salvando, setSalvando] = useState(false);
  const erros = MODELO_IDS.flatMap((id) => marcadoresInvalidos(v[id]).map((m) => `${MODELOS_INFO[id].titulo}: ${m}`));

  async function salvar() {
    setSalvando(true);
    const res = await fetch("/api/preferencias/modelos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) }).catch(() => null);
    setSalvando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível salvar.");
    toast.success("Modelos salvos.");
    router.refresh();
  }

  return (
    <details className="rounded-xl border border-border p-3 text-sm">
      <summary className="cursor-pointer font-semibold">💬 Modelos de mensagem do WhatsApp (editáveis)</summary>
      <p className="mt-2 text-xs text-fg-muted">
        Os rascunhos da Central e do Pulso usam estes textos. Use <code>{"{nome}"}</code> (primeiro nome), <code>{"{dias}"}</code> (dias sem treinar) e <code>{"{semanas}"}</code> (semanas seguidas com a meta). Nada é enviado sozinho. Dica: evite falar de dor ou saúde na mensagem.
      </p>
      <div className="mt-3 space-y-3">
        {MODELO_IDS.map((id) => (
          <div key={id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`modelo-${id}`} className="text-xs font-semibold">{MODELOS_INFO[id].titulo} <span className="font-normal text-fg-subtle">· {MODELOS_INFO[id].quando}</span></label>
              {v[id] !== MODELOS_PADRAO[id] ? <button type="button" onClick={() => setV({ ...v, [id]: MODELOS_PADRAO[id] })} className="text-[11px] text-accent underline-offset-2 hover:underline">voltar ao padrão</button> : null}
            </div>
            <textarea id={`modelo-${id}`} rows={2} value={v[id]} onChange={(e) => setV({ ...v, [id]: e.target.value.slice(0, 500) })} className="w-full rounded-md border border-border bg-card p-2 text-sm" />
            <p className="text-[11px] text-fg-subtle">Exemplo: {preencherModelo(v[id], { nome: "Ana", dias: 12, semanas: 4 })}</p>
          </div>
        ))}
      </div>
      {erros.length ? <p className="mt-2 text-xs text-warning">Marcador desconhecido: {erros.join("; ")}</p> : null}
      <button type="button" disabled={salvando || erros.length > 0} onClick={() => void salvar()} className="touch mt-3 rounded-lg bg-accent px-4 py-2 font-bold text-bg disabled:opacity-60">Salvar modelos</button>
    </details>
  );
}
