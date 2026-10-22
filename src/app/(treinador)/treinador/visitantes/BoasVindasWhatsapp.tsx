"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { whatsappBR } from "@/lib/visitante/whatsapp";

/** Botão de boas-vindas pelo WhatsApp (mensagem pronta) + copiar o texto. */
export function BoasVindasWhatsapp({ id, telefone, mensagem }: { id: string; telefone: string | null; mensagem: string }) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  async function salvarNumero() {
    const digitado = window.prompt("WhatsApp com DDD (ex.: 11 98765-4321):", telefone ?? "");
    if (digitado == null) return;
    if (!whatsappBR(digitado)) return window.alert("Número inválido. Use o DDD, ex.: 11 98765-4321.");
    setSalvando(true);
    const r = await fetch(`/api/treinador/visitantes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "whatsapp", whatsapp: digitado }) }).catch(() => null);
    setSalvando(false);
    if (!r?.ok) window.alert("Não foi possível salvar agora. Tente de novo.");
    router.refresh();
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copie a mensagem:", mensagem);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={linkWhatsApp(telefone, mensagem)}
        target="_blank"
        rel="noopener noreferrer"
        className="alvo inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-black"
      >
        Boas-vindas no WhatsApp
      </a>
      <button type="button" onClick={() => void copiar()} className="alvo min-h-11 rounded-lg border border-border px-3 text-sm hover:border-white/40">
        {copiado ? "Copiado ✓" : "Copiar mensagem"}
      </button>
      <button type="button" disabled={salvando} onClick={() => void salvarNumero()} className="alvo min-h-11 rounded-lg border border-border px-3 text-sm hover:border-white/40 disabled:opacity-50">
        {telefone ? `📱 ${telefone}` : "Salvar WhatsApp"}
      </button>
      {!telefone ? <span className="text-xs text-fg-subtle">Sem WhatsApp salvo: o WhatsApp vai pedir para você escolher o contato.</span> : null}
    </div>
  );
}
