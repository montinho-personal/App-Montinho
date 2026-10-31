"use client";

// Perfil → “O que eu gosto de treinar” (0137): chips que ligam e desligam e
// salvam na hora. Só preferência: o Montinho vê, e o aviso do WOD do dia vai
// só para quem quer.
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { LISTA_MODALIDADES, MODALIDADES_TREINO, type ModalidadeTreino } from "@/lib/modalidades/tipos";

export function EscolherModalidades({ inicial }: { inicial: ModalidadeTreino[] }) {
  const toast = useToast();
  const [marcadas, setMarcadas] = useState<ModalidadeTreino[]>(inicial);
  const [salvando, setSalvando] = useState(false);

  async function alternar(m: ModalidadeTreino) {
    const antes = marcadas;
    const nova = marcadas.includes(m) ? marcadas.filter((x) => x !== m) : [...marcadas, m];
    setMarcadas(nova);
    setSalvando(true);
    const r = await fetch("/api/modalidades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modalidades: nova }) }).catch(() => null);
    setSalvando(false);
    if (!r?.ok) {
      setMarcadas(antes);
      const j = (await r?.json().catch(() => null)) as { error?: string } | null;
      return toast.error(j?.error ?? "Não foi possível salvar agora. Tente de novo.");
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-fg-muted">Marque o que você gosta (ou quer experimentar). O Montinho vê isso para montar o seu treino, e o aviso do WOD do dia só chega para quem marcou algo além da musculação.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Modalidades que eu gosto de treinar">
        {LISTA_MODALIDADES.map((m) => {
          const on = marcadas.includes(m);
          return (
            <button key={m} type="button" aria-pressed={on} disabled={salvando} onClick={() => void alternar(m)} className={`alvo rounded-full border px-3 py-2 text-sm font-bold disabled:opacity-60 ${on ? "border-accent bg-accent text-bg" : "border-border text-fg-muted"}`}>
              {MODALIDADES_TREINO[m].emoji} {MODALIDADES_TREINO[m].nome}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-fg-subtle">{marcadas.length ? "Salvo. Dá para mudar quando quiser." : "Nada marcado: você recebe as novidades de todas."}</p>
    </div>
  );
}
