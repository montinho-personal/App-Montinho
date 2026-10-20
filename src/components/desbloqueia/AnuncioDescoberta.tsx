"use client";

// “Novo conhecimento desbloqueado!” — convite, nunca obrigação. “Ver depois”
// guarda a dispensa neste aparelho; a descoberta continua no álbum.
import Link from "next/link";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ItemVisao } from "./visao";
import { CATEGORIAS } from "@/lib/desbloqueia/tipos";
import { enviarEvento } from "@/components/chalala/evento";

const CHAVE = "montinho-desbloqueia-dispensados-v1";
const ouvintes = new Set<() => void>();
let cache: { raw: string | null; v: string[] } | null = null;
const VAZIO: string[] = [];

function ler(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
  if (cache && cache.raw === raw) return cache.v;
  let v: string[] = [];
  try {
    v = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    v = [];
  }
  cache = { raw, v };
  return v;
}

export function useDispensados(): [string[], (id: string) => void] {
  const lista = useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    ler,
    () => VAZIO,
  );
  const dispensar = useCallback((id: string) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify([...ler().filter((x) => x !== id), id].slice(-60)));
    } catch {
      /* ignora */
    }
    ouvintes.forEach((f) => f());
  }, []);
  return [lista, dispensar];
}

/** Recebe as candidatas (mais recente primeiro) e mostra a primeira não dispensada. */
export function AnuncioDescoberta({ candidatas, explorados, total, origem }: { candidatas: ItemVisao[]; explorados: number; total: number; origem: "inicio" | "conquistas" }) {
  const [dispensados, dispensar] = useDispensados();
  const item = candidatas.find((c) => !dispensados.includes(c.id)) ?? null;
  useEffect(() => {
    if (item) enviarEvento({ tipo: "sugestao_vista", modelo: item.id, origem });
  }, [item, origem]);

  if (!item) {
    return (
      <Link href="/aluno/descobertas" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-accent/40">
        <span>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">Montinho Desbloqueia</span>
          <span className="block text-sm font-semibold">Mitos e verdades do treino · {explorados} de {total} exploradas</span>
        </span>
        <span aria-hidden className="text-accent">→</span>
      </Link>
    );
  }
  const cor = CATEGORIAS.find((c) => c.id === item.categoria)?.cor ?? "#ba9e50";
  const o = item.origem === "personal" ? "personal" : item.origem === "conquista" ? "conquista" : "periodo";
  return (
    <section className="space-y-3 rounded-xl border bg-grain-strong p-4" style={{ borderColor: cor }} aria-label="Novo conhecimento desbloqueado">
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cor }}>
        Novo conhecimento desbloqueado!{item.origem === "personal" ? " · Recomendado pelo Montinho" : ""}
      </p>
      <p className="text-base font-bold leading-tight">{item.pergunta}</p>
      <div className="flex gap-2">
        <Link href={`/aluno/descobertas/${item.id}?o=${o}`} onClick={() => enviarEvento({ tipo: "sugestao_aberta", modelo: item.id, origem })} className="touch inline-flex flex-1 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-bg hover:bg-accent-hover">
          Descobrir agora
        </Link>
        <button type="button" onClick={() => dispensar(item.id)} className="touch rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-fg-muted hover:text-fg">
          Ver depois
        </button>
      </div>
    </section>
  );
}
