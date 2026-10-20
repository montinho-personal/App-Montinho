"use client";

// “Por que esse exercício está no meu treino?” — texto curto do personal que o
// aluno vê no treino. Só para exercícios já salvos (precisa do id).
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function PorqueExercicio({ exercicioId, inicial }: { exercicioId: string; inicial: string }) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);

  async function salvar() {
    setOcupado(true);
    const res = await fetch(`/api/exercicios/${exercicioId}/porque`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setOcupado(false);
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível salvar.");
    setSalvo(texto.trim());
    toast.success(texto.trim() ? "O aluno verá esse porquê no treino." : "Porquê removido.");
    setAberto(false);
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="mt-1 text-[10px] font-semibold text-fg-subtle hover:text-accent" title="Explique ao aluno por que este exercício está no treino">
        {salvo ? "✓ Por quê (aluno vê)" : "+ Por quê (para o aluno)"}
      </button>
    );
  }
  return (
    <div className="mt-1 space-y-1">
      <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 600))} rows={3} placeholder="Ex.: Para fortalecer os glúteos sem sobrecarregar a lombar." aria-label="Por que esse exercício está no treino" className="w-full min-w-[200px] rounded border border-border bg-bg px-2 py-1 text-[12px]" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={salvar} disabled={ocupado} className="rounded bg-accent px-2 py-1 text-[11px] font-bold text-bg disabled:opacity-50">Salvar</button>
        <button type="button" onClick={() => { setTexto(salvo); setAberto(false); }} className="text-[11px] text-fg-muted">Cancelar</button>
        <span className="ml-auto font-mono text-[10px] text-fg-subtle">{texto.length}/600</span>
      </div>
    </div>
  );
}
