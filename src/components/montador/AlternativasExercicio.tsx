"use client";

// Painel de alternativas de um exercício no montador. Considera o perfil
// ATUAL do aluno (equipamentos do programa, nível, restrições da anamnese,
// objetivo e prioridades). A troca só acontece quando o personal escolhe.

import { useMemo } from "react";
import { sugerirSubstituicoes, ORIGEM_SUGESTAO_LABEL, type ContextoAluno } from "@/lib/biblioteca/substituicao";
import type { Equivalencia, ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { Icon } from "@/components/ui/Icon";

type Props = {
  origem: ItemBiblioteca | null;
  nomeDigitado: string;
  itens: ItemBiblioteca[];
  equivalencias: Equivalencia[];
  contexto: ContextoAluno;
  onTrocar: (item: ItemBiblioteca) => void;
  onFechar: () => void;
};

export function AlternativasExercicio({ origem, nomeDigitado, itens, equivalencias, contexto, onTrocar, onFechar }: Props) {
  const r = useMemo(() => (origem ? sugerirSubstituicoes(origem, itens, equivalencias, contexto, 6) : null), [origem, itens, equivalencias, contexto]);
  return (
    <div className="mx-2 mb-2 rounded-lg border border-accent/30 bg-surface p-3 text-[12px]" role="region" aria-label="Alternativas ao exercício">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold">Alternativas {origem ? `a ${origem.nome}` : ""}</span>
        <button type="button" onClick={onFechar} className="text-fg-muted hover:text-fg" aria-label="Fechar alternativas">
          <Icon name="x" size={14} />
        </button>
      </div>
      {!origem ? (
        <p className="text-fg-muted">“{nomeDigitado || "—"}” não está na biblioteca. Escolha um exercício da lista para ver alternativas.</p>
      ) : r && r.sugestoes.length ? (
        <ul className="space-y-1.5">
          {r.sugestoes.map((s) => (
            <li key={s.item.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {s.item.nome} <span className={`ml-1 text-[10px] uppercase tracking-wider ${s.origem === "aprovada" ? "text-success" : "text-fg-subtle"}`}>{ORIGEM_SUGESTAO_LABEL[s.origem]}</span>
                </p>
                <p className="text-fg-muted">{s.motivos.join(" · ")}</p>
                {s.alertas.length ? <p className="text-warning">{s.alertas.join(" · ")}</p> : null}
              </div>
              <button type="button" onClick={() => onTrocar(s.item)} className="shrink-0 rounded-md border border-accent/50 px-2 py-1 font-semibold text-accent hover:bg-accent/10">
                Trocar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-muted">Nenhuma alternativa compatível com o perfil atual do aluno.</p>
      )}
      {r?.descartadas.length ? <p className="mt-2 text-[11px] text-fg-subtle">{r.descartadas.length} opção(ões) ocultada(s) por equipamento indisponível no programa.</p> : null}
      <p className="mt-2 text-[11px] text-fg-subtle">Sugestões por regras (padrão de movimento, músculo, equipamento, nível e restrições da anamnese). Revise equivalências na Biblioteca.</p>
    </div>
  );
}
