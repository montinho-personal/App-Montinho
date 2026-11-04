"use client";

// Busca da biblioteca para o treino livre: filtro por músculo, miniatura com
// vídeo (toque na imagem vê; toque no nome escolhe) e “usar o meu nome”.
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { GRUPO_LABEL } from "@/lib/grupos";
import { filtrarExercicios, filtrosComItens } from "@/lib/visitante/busca-exercicios";
import { VerExercicio, type MidiaExercicio } from "@/components/ui/VerExercicio";
import { FotoDoAparelho } from "@/components/exercicios/FotoDoAparelho";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { linhaDoGrupo, prioridadeDoGrupo, type LinhaPlacar } from "@/lib/treino/livre-metas";

export type ItemBusca = { id: string; nome: string; grupo: GrupoMuscular; sinonimos: string[]; equipamento: string[]; video: boolean; midia: MidiaExercicio; passos: string[] };

/** Selo do protocolo livre (por metas) ao lado de cada exercício. */
function seloDaMeta(placar: LinhaPlacar[] | undefined, grupo: GrupoMuscular) {
  const l = placar ? linhaDoGrupo(placar, grupo) : null;
  if (!l) return null;
  if (l.status === "limite" || l.status === "acima") return <span className="rounded-full bg-red/15 px-2 py-0.5 text-[10px] font-semibold text-red">🔴 {l.status === "acima" ? "passou do limite" : "no limite"}</span>;
  if (l.status === "na_faixa") return <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">✅ na faixa</span>;
  return <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">faltam {l.faltam}</span>;
}

export function EscolherExercicio({ itens, onEscolher, onMeuNome, onFechar, placar }: { itens: ItemBusca[]; onEscolher: (i: ItemBusca) => void; /** Sem ela (exercício extra do treino da ficha), não aparece o “usar o meu nome”. */ onMeuNome?: (nome: string) => void; onFechar: () => void; /** Protocolo livre (por metas): o que mais falta primeiro, os do limite por último. */ placar?: LinhaPlacar[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string | null>(null);
  const resultados = useMemo(() => {
    const r = filtrarExercicios(itens, busca, filtro);
    return placar?.length && !busca.trim() ? [...r].sort((a, b) => prioridadeDoGrupo(placar, a.grupo) - prioridadeDoGrupo(placar, b.grupo)) : r;
  }, [itens, busca, filtro, placar]);
  const filtros = useMemo(() => filtrosComItens(itens), [itens]);
  const meuNome = busca.trim().slice(0, 60);
  const digitando = busca.trim().length > 0;
  const lista = (
    <>
      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {resultados.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-1.5">
            <VerExercicio nome={r.nome} midia={r.midia} passos={r.passos} />
            <button type="button" onClick={() => onEscolher(r)} className="alvo flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{r.nome}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">{GRUPO_LABEL[r.grupo]} {seloDaMeta(placar, r.grupo)}</span>
              </span>
              <Icon name="plus" size={18} className="shrink-0 text-accent" />
            </button>
          </li>
        ))}
        {resultados.length === 0 ? <li className="py-3 text-center text-sm text-fg-muted">Nada encontrado com esse nome.</li> : null}
      </ul>
      {onMeuNome ? <button type="button" disabled={meuNome.length < 2} onClick={() => onMeuNome(meuNome)} className="alvo flex w-full items-start gap-3 rounded-xl border border-dashed border-accent/60 px-3 py-3 text-left disabled:opacity-50">
        <Icon name="plus" size={18} className="mt-0.5 shrink-0 text-accent" />
        <span>
          <span className="block text-sm font-semibold text-accent">{meuNome.length >= 2 ? `Usar “${meuNome}” com esse nome` : "Não achou? Escreva o nome que você usa"}</span>
          <span className="block text-xs text-fg-muted">Fica salvo para acompanhar sua evolução nesse exercício.</span>
        </span>
      </button> : null}
    </>
  );

  return (
    <section className="space-y-3 rounded-xl border border-accent/40 bg-card p-3" aria-label="Escolher exercício">
      <div className="flex items-center gap-2">
        <Input value={busca} onChange={(e) => { setBusca(e.target.value); setFiltro(null); }} placeholder="Qual exercício agora? Ex.: supino, leg…" aria-label="Buscar exercício" autoFocus />
        <button type="button" className="alvo grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border text-fg-muted" onClick={onFechar} aria-label="Fechar busca">
          <Icon name="x" size={16} />
        </button>
      </div>
      {/* Digitou o nome: a lista aparece logo abaixo da busca (sem rolar). */}
      {digitando ? lista : null}
      <FotoDoAparelho itens={itens} onEscolher={(i) => onEscolher(i as ItemBusca)} />
      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button key={f.valor} type="button" onClick={() => { setFiltro(filtro === f.valor ? null : f.valor); setBusca(""); }} aria-pressed={filtro === f.valor} className={`min-h-9 rounded-full border px-3 text-xs ${filtro === f.valor ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted"}`}>
            {f.rotulo}
          </button>
        ))}
      </div>
      {!digitando ? lista : null}
    </section>
  );
}
