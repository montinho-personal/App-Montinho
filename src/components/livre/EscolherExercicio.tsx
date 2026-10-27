"use client";

// Busca da biblioteca para o treino livre: filtro por músculo, miniatura com
// vídeo (toque na imagem vê; toque no nome escolhe) e “usar o meu nome”.
import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { GRUPO_LABEL } from "@/lib/grupos";
import { filtrarExercicios, filtrosComItens } from "@/lib/visitante/busca-exercicios";
import { VerExercicio, type MidiaExercicio } from "@/components/ui/VerExercicio";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { linhaDoGrupo, prioridadeDoGrupo, type LinhaPlacar } from "@/lib/treino/livre-metas";

export type ItemBusca = { id: string; nome: string; grupo: GrupoMuscular; sinonimos: string[]; equipamento: string[]; video: boolean; midia: MidiaExercicio; passos: string[] };

/** Foto reduzida para JPEG (até 1024 px): leve para enviar e suficiente para reconhecer o aparelho. */
async function fotoReduzida(f: File): Promise<string> {
  const bmp = await createImageBitmap(f);
  const escala = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8).split(",")[1] ?? "";
}

type Foto = { fase: "livre" } | { fase: "lendo" } | { fase: "achou"; aparelho: string | null; itens: ItemBusca[] } | { fase: "nada"; motivo: string };

/** Selo do protocolo livre (por metas) ao lado de cada exercício. */
function seloDaMeta(placar: LinhaPlacar[] | undefined, grupo: GrupoMuscular) {
  const l = placar ? linhaDoGrupo(placar, grupo) : null;
  if (!l) return null;
  if (l.status === "limite" || l.status === "acima") return <span className="rounded-full bg-red/15 px-2 py-0.5 text-[10px] font-semibold text-red">🔴 {l.status === "acima" ? "passou do limite" : "no limite"}</span>;
  if (l.status === "na_faixa") return <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">✅ na faixa</span>;
  return <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">faltam {l.faltam}</span>;
}

export function EscolherExercicio({ itens, onEscolher, onMeuNome, onFechar, placar }: { itens: ItemBusca[]; onEscolher: (i: ItemBusca) => void; onMeuNome: (nome: string) => void; onFechar: () => void; /** Protocolo livre (por metas): o que mais falta primeiro, os do limite por último. */ placar?: LinhaPlacar[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string | null>(null);
  const resultados = useMemo(() => {
    const r = filtrarExercicios(itens, busca, filtro);
    return placar?.length && !busca.trim() ? [...r].sort((a, b) => prioridadeDoGrupo(placar, a.grupo) - prioridadeDoGrupo(placar, b.grupo)) : r;
  }, [itens, busca, filtro, placar]);
  const filtros = useMemo(() => filtrosComItens(itens), [itens]);
  const meuNome = busca.trim().slice(0, 60);
  // “Não sei o nome”: foto do aparelho → a IA sugere até 3 exercícios da biblioteca.
  const camera = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<Foto>({ fase: "livre" });
  async function reconhecer(f: File | undefined) {
    if (!f) return;
    setFoto({ fase: "lendo" });
    try {
      const base64 = await fotoReduzida(f);
      const r = await fetch("/api/livre/reconhecer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64 }) });
      const j = (await r.json().catch(() => ({}))) as { ia?: boolean; aparelho?: string | null; opcoes?: Array<{ id: string }>; error?: string };
      if (!r.ok) return setFoto({ fase: "nada", motivo: j.error ?? "Não foi possível reconhecer agora." });
      if (j.ia === false) return setFoto({ fase: "nada", motivo: "O reconhecimento por foto não está ligado agora. Busque pelo nome ou escreva o nome que você usa." });
      const achados = (j.opcoes ?? []).map((o) => itens.find((i) => i.id === o.id)).filter((x): x is ItemBusca => !!x);
      if (!achados.length) return setFoto({ fase: "nada", motivo: "Não reconheci esse aparelho. Tente outra foto, com o aparelho inteiro aparecendo, ou busque pelo músculo." });
      setFoto({ fase: "achou", aparelho: j.aparelho ?? null, itens: achados });
    } catch {
      setFoto({ fase: "nada", motivo: "Sem conexão. Confira a internet e tente de novo." });
    } finally {
      if (camera.current) camera.current.value = "";
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-accent/40 bg-card p-3" aria-label="Escolher exercício">
      <div className="flex items-center gap-2">
        <Input value={busca} onChange={(e) => { setBusca(e.target.value); setFiltro(null); }} placeholder="Qual exercício agora? Ex.: supino, leg…" aria-label="Buscar exercício" autoFocus />
        <button type="button" className="alvo grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border text-fg-muted" onClick={onFechar} aria-label="Fechar busca">
          <Icon name="x" size={16} />
        </button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void reconhecer(e.target.files?.[0])} aria-hidden tabIndex={-1} />
      {foto.fase === "livre" ? (
        <button type="button" onClick={() => camera.current?.click()} className="alvo flex w-full items-center gap-3 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2.5 text-left">
          <span className="text-2xl" aria-hidden>📷</span>
          <span><span className="block text-sm font-semibold text-accent">Não sabe o nome? Tire uma foto do aparelho</span><span className="block text-xs text-fg-muted">O app reconhece e mostra os exercícios que se fazem nele.</span></span>
        </button>
      ) : foto.fase === "lendo" ? (
        <p className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-3 text-sm" aria-live="polite">📷 Reconhecendo o aparelho…</p>
      ) : foto.fase === "achou" ? (
        <div className="space-y-2 rounded-xl border border-accent/50 bg-accent/10 p-3" aria-live="polite">
          <p className="text-sm font-semibold">{foto.aparelho ? `Parece ser: ${foto.aparelho}` : "Encontrei estes exercícios"}</p>
          <p className="text-xs text-fg-muted">Toque no exercício que você vai fazer:</p>
          <ul className="space-y-1.5">
            {foto.itens.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <VerExercicio nome={r.nome} midia={r.midia} passos={r.passos} />
                <button type="button" onClick={() => onEscolher(r)} className="alvo flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{r.nome}</span><span className="block text-xs text-fg-subtle">{GRUPO_LABEL[r.grupo]}</span></span>
                  <Icon name="plus" size={18} className="shrink-0 text-accent" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 text-xs">
            <button type="button" onClick={() => camera.current?.click()} className="alvo text-accent underline underline-offset-4">Tirar outra foto</button>
            <button type="button" onClick={() => setFoto({ fase: "livre" })} className="alvo text-fg-muted underline underline-offset-4">Nenhum desses</button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 rounded-xl border border-border bg-bg/40 px-3 py-2.5 text-sm" aria-live="polite">
          <p>{foto.motivo}</p>
          <button type="button" onClick={() => camera.current?.click()} className="alvo text-xs text-accent underline underline-offset-4">Tentar outra foto</button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button key={f.valor} type="button" onClick={() => { setFiltro(filtro === f.valor ? null : f.valor); setBusca(""); }} aria-pressed={filtro === f.valor} className={`min-h-9 rounded-full border px-3 text-xs ${filtro === f.valor ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted"}`}>
            {f.rotulo}
          </button>
        ))}
      </div>
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
      <button type="button" disabled={meuNome.length < 2} onClick={() => onMeuNome(meuNome)} className="alvo flex w-full items-start gap-3 rounded-xl border border-dashed border-accent/60 px-3 py-3 text-left disabled:opacity-50">
        <Icon name="plus" size={18} className="mt-0.5 shrink-0 text-accent" />
        <span>
          <span className="block text-sm font-semibold text-accent">{meuNome.length >= 2 ? `Usar “${meuNome}” com esse nome` : "Não achou? Escreva o nome que você usa"}</span>
          <span className="block text-xs text-fg-muted">Fica salvo para acompanhar sua evolução nesse exercício.</span>
        </span>
      </button>
    </section>
  );
}
