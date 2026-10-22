"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function ArquivarTreino({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  async function arquivar() {
    if (!window.confirm(`Tirar “${nome}” da sua lista? O que você já treinou continua no histórico.`)) return;
    const r = await fetch(`/api/visitante/treinos/${id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) window.alert("Não foi possível agora. Tente de novo.");
    router.refresh();
  }
  return (
    <button type="button" onClick={() => void arquivar()} aria-label={`Tirar ${nome} da lista`} className="alvo grid h-11 w-11 place-items-center rounded-lg border border-border text-fg-muted">
      <Icon name="x" size={18} />
    </button>
  );
}
