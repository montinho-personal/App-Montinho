"use client";

// “Comparar com:” no relatório da avaliação (06/11/2026, pedido do Montinho:
// “não consigo fazer comparação entre elas”). Troca a avaliação de comparação
// pela URL (?com=<id>); o servidor remonta o relatório.
import { useRouter } from "next/navigation";
import { dataBR } from "@/lib/format";

export function EscolherComparacao({ id, opcoes, atual }: { id: string; opcoes: Array<{ id: string; data: string; gordura_pct: number | null }>; atual: string | null }) {
  const router = useRouter();
  if (opcoes.length < 2) return null;
  const pct = (v: number | null) => (v == null ? "" : ` · ${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
      <span>📊 Comparar com:</span>
      <select
        value={atual ?? opcoes[0].id}
        onChange={(e) => router.replace(`/avaliacao/${id}${e.target.value === opcoes[0].id ? "" : `?com=${e.target.value}`}`, { scroll: false })}
        className="h-10 rounded-full border border-[#1a1814]/30 bg-white px-3 font-semibold"
      >
        {opcoes.map((o, i) => (
          <option key={o.id} value={o.id}>
            {dataBR(o.data)}{pct(o.gordura_pct)}{i === 0 ? " (a anterior)" : i === opcoes.length - 1 ? " (a primeira)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
