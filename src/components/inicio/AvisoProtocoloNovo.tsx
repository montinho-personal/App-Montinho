"use client";
// Aviso “Seu protocolo mudou” no Início (pedido do Montinho, 10/11/2026): aparece
// depois que o personal salva uma fase nova / dia novo / troca de exercício, até a
// pessoa tocar em “Entendi” (guardado no aparelho por versão). Texto pela regra pura
// src/lib/protocolo/mudanca.ts.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AvisoProtocolo } from "@/lib/protocolo/mudanca";

const chave = (versaoId: string) => `montinho-protocolo-visto:${versaoId}`;

export function AvisoProtocoloNovo({ versaoId, aviso, cor }: { versaoId: string; aviso: AvisoProtocolo; cor?: string | null }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no aparelho
      setVisivel(!localStorage.getItem(chave(versaoId)));
    } catch {
      setVisivel(true);
    }
  }, [versaoId]);
  if (!visivel) return null;
  const fechar = () => {
    try {
      localStorage.setItem(chave(versaoId), new Date().toISOString());
    } catch {}
    setVisivel(false);
  };
  return (
    <section aria-live="polite" className="space-y-3 rounded-2xl border-2 bg-grain-strong p-4" style={{ borderColor: cor ?? "var(--color-accent)" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cor ?? "var(--color-accent)" }}>Recado do Montinho</p>
      <h2 className="text-lg font-black leading-tight">{aviso.titulo}</h2>
      {aviso.linhas.length ? (
        <ul className="space-y-1 text-sm">
          {aviso.linhas.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
      {aviso.meta ? <p className="rounded-lg bg-bg/60 px-3 py-2 text-sm">{aviso.meta}</p> : null}
      <p className="text-xs text-fg-muted">Seus treinos antigos e as suas cargas continuam guardados. Nos exercícios que ficaram, a evolução segue de onde parou. É impossível dar errado!</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/aluno/treinar" onClick={fechar} className="touch inline-flex items-center rounded-xl bg-accent px-4 font-bold text-bg">Ver meus treinos</Link>
        <button type="button" onClick={fechar} className="touch rounded-xl border border-border px-4 text-sm font-semibold">Entendi</button>
      </div>
    </section>
  );
}
