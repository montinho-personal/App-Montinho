"use client";

// Leitura rápida dentro do treino: abre por cima (sem sair do treino), mostra
// só o nível 1 e deixa o resto para depois. Nunca bloqueia o registro.
import Link from "next/link";
import { useEffect } from "react";
import { enviarEvento } from "@/components/chalala/evento";

export type ItemRapido = { id: string; titulo: string; pergunta: string; veredito: string; rapida: string; pratica: string };

const CHAVE = (sessaoId: string) => `montinho-desb-sugestao:${sessaoId}`;

/** Limite de sugestões automáticas por sessão (REGRAS_DESBLOQUEIA.sugestoesPorSessao). */
export function sugestoesDaSessao(sessaoId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE(sessaoId)) ?? "[]") as string[];
  } catch {
    return [];
  }
}
export function marcarSugestao(sessaoId: string, id: string) {
  try {
    localStorage.setItem(CHAVE(sessaoId), JSON.stringify([...sugestoesDaSessao(sessaoId), id]));
  } catch {
    /* ignora */
  }
}

export function LeituraRapida({ item, onFechar }: { item: ItemRapido; onFechar: () => void }) {
  useEffect(() => {
    enviarEvento({ tipo: "sugestao_aberta", modelo: item.id, origem: "treino" });
    void fetch(`/api/conhecimento/${item.id}/explorar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origem: "contexto" }) }).catch(() => undefined);
  }, [item.id]);
  return (
    <div role="dialog" aria-modal="true" aria-label={item.titulo} className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onFechar}>
      <div className="mx-auto w-full max-w-md space-y-3 rounded-t-2xl border border-border bg-card p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Montinho Desbloqueia</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="alvo -mr-1 -mt-1 text-fg-muted hover:text-fg">✕</button>
        </div>
        <p className="text-base font-bold leading-tight">{item.pergunta}</p>
        <p className="text-sm"><strong>{item.veredito}.</strong> {item.rapida}</p>
        <p className="text-sm font-semibold">Na prática: <span className="font-normal">{item.pratica}</span></p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link href={`/aluno/descobertas/${item.id}?o=contexto`} target="_blank" className="alvo text-sm font-semibold text-accent underline-offset-2 hover:underline">Ler completo depois →</Link>
          <button type="button" onClick={onFechar} className="touch rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg">Voltar ao treino</button>
        </div>
      </div>
    </div>
  );
}
