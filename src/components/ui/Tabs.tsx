"use client";

import { useEffect, useState } from "react";

type Tab = {
  key: string;
  label: string;
  content: React.ReactNode;
};

type TabsProps = {
  tabs: Tab[];
  initial?: string;
  className?: string;
};

export function Tabs({ tabs, initial, className = "" }: TabsProps) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  // Abre a aba indicada no endereço (#chave) — links diretos, ex.: …#acompanhamento.
  useEffect(() => {
    const chave = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o endereço só existe no navegador
    if (chave && tabs.some((t) => t.key === chave)) setActive(chave);
  }, [tabs]);
  const current = tabs.find((t) => t.key === active);
  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActive(tab.key);
              window.history.replaceState(null, "", `#${tab.key}`);
            }}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
              active === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">{current?.content}</div>
    </div>
  );
}
