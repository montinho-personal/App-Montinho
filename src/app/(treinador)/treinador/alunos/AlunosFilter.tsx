"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/Input";

type Counts = {
  todos: number;
  ativo: number;
  pendente: number;
  inadimplente: number;
};

const FILTERS: Array<{ key: string; label: string; statusKey: keyof Counts }> = [
  { key: "", label: "Todos", statusKey: "todos" },
  { key: "ativo", label: "Ativos", statusKey: "ativo" },
  { key: "pendente", label: "Pendentes", statusKey: "pendente" },
  { key: "inadimplente", label: "Inadimplentes", statusKey: "inadimplente" },
];

export function AlunosFilter({ counts }: { counts: Counts }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeStatus = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";

  function update(key: "status" | "q", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <Input
          type="search"
          placeholder="Buscar por nome, e-mail ou telefone..."
          defaultValue={q}
          onChange={(e) => update("q", e.target.value)}
        />
      </div>
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = activeStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => update("status", f.key)}
              disabled={pending}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                active ? "bg-accent text-fg" : "text-fg-muted hover:text-fg"
              }`}
            >
              {f.label} <span className="opacity-60">({counts[f.statusKey]})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
