"use client";

// Álbum (30 espaços numerados) e biblioteca livre (busca, categoria, salvos).
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIAS } from "@/lib/desbloqueia/tipos";
import type { ItemVisao } from "@/components/desbloqueia/visao";
import { AnelPercentual } from "@/components/graficos/AnelPercentual";
import { enviarEvento } from "@/components/chalala/evento";

const corDa = (cat: string) => CATEGORIAS.find((c) => c.id === cat)?.cor ?? "#ba9e50";
const rotuloDa = (cat: string) => CATEGORIAS.find((c) => c.id === cat)?.rotulo ?? cat;

export function DescobertasClient({ itens, explorados, total }: { itens: ItemVisao[]; explorados: number; total: number }) {
  const [aba, setAba] = useState<"album" | "biblioteca">("album");
  const [categoria, setCategoria] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [soSalvos, setSoSalvos] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  useEffect(() => enviarEvento({ tipo: "colecao_vista", origem: "album" }), []);

  const biblioteca = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((i) => (categoria === "todas" || i.categoria === categoria) && (!soSalvos || i.salvo) && (!q || `${i.titulo} ${i.pergunta}`.toLowerCase().includes(q)));
  }, [itens, categoria, busca, soSalvos]);

  const pct = total ? Math.round((explorados / total) * 100) : 0;
  const disponiveis = itens.filter((i) => i.estado === "disponivel").length;

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-4 rounded-xl border border-accent/40 bg-grain-strong p-4">
        <AnelPercentual valor={pct} tamanho={72} rotulo={`Álbum: ${explorados} de ${total}`} />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Seu álbum</p>
          <p className="text-base font-bold leading-tight">Você explorou {explorados} de {total} descobertas</p>
          <p className="text-xs text-fg-muted">{disponiveis ? `${disponiveis} ${disponiveis === 1 ? "descoberta esperando" : "descobertas esperando"} por você.` : "Novas descobertas chegam com suas medalhas e com o tempo."}</p>
        </div>
      </section>

      <div role="tablist" className="flex gap-1 border-b border-border">
        {(["album", "biblioteca"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={aba === k} type="button" onClick={() => setAba(k)} className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold ${aba === k ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg"}`}>
            {k === "album" ? "Álbum" : "Biblioteca livre"}
          </button>
        ))}
      </div>

      {aba === "album" ? (
        <ul className="grid grid-cols-3 gap-2" aria-label="Álbum de descobertas">
          {itens.map((i) => {
            const cor = corDa(i.categoria);
            if (i.estado === "futuro") {
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => setAberto(aberto === i.id ? null : i.id)} aria-expanded={aberto === i.id} className="flex h-full min-h-28 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-card/40 p-2 text-center text-fg-subtle">
                    <span className="font-mono text-xs">#{String(i.numero).padStart(2, "0")}</span>
                    <span aria-hidden className="text-lg">🔒</span>
                    <span className="text-[10px] leading-tight">{aberto === i.id ? i.dica : "Em breve"}</span>
                  </button>
                </li>
              );
            }
            return (
              <li key={i.id}>
                <Link href={`/aluno/descobertas/${i.id}`} className="relative flex h-full min-h-28 flex-col justify-between gap-1 rounded-xl border bg-card p-2 text-left" style={{ borderColor: i.estado === "explorado" ? cor : `${cor}88` }}>
                  <span className="flex items-center justify-between">
                    <span className="font-mono text-[11px]" style={{ color: cor }}>#{String(i.numero).padStart(2, "0")}</span>
                    {i.novo === "disponivel" ? <span className="rounded-full bg-accent px-1.5 text-[9px] font-bold uppercase text-bg">Nova</span> : i.estado === "explorado" ? <span aria-label="Explorada" className="text-[11px] text-success">✓</span> : null}
                  </span>
                  <span className="text-[12px] font-semibold leading-tight">{i.estado === "explorado" ? i.titulo : "Mito ou verdade?"}</span>
                  <span className="text-[9px] uppercase tracking-wider text-fg-subtle">{rotuloDa(i.categoria)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-3">
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar (ex.: creatina, dor, abdominal)" aria-label="Buscar descobertas" className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm" />
          <div className="flex flex-wrap gap-1.5">
            {[{ id: "todas", rotulo: "Todas", cor: "#ba9e50" }, ...CATEGORIAS].map((c) => (
              <button key={c.id} type="button" onClick={() => setCategoria(c.id)} aria-pressed={categoria === c.id} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${categoria === c.id ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted"}`}>
                {c.rotulo}
              </button>
            ))}
            <button type="button" onClick={() => setSoSalvos((v) => !v)} aria-pressed={soSalvos} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${soSalvos ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted"}`}>★ Salvos</button>
          </div>
          <p className="text-xs text-fg-subtle">Tudo aqui pode ser lido a qualquer hora. Ler pela biblioteca também conta no seu álbum.</p>
          <ul className="space-y-2">
            {biblioteca.map((i) => (
              <li key={i.id}>
                <Link href={`/aluno/descobertas/${i.id}?o=biblioteca`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: corDa(i.categoria) }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">{i.pergunta}</span>
                    <span className="block text-[11px] text-fg-subtle">{rotuloDa(i.categoria)}{i.essencial ? " · Orientação essencial" : ""}{i.estado === "explorado" ? " · Explorada ✓" : ""}{i.salvo ? " · ★ Salva" : ""}</span>
                  </span>
                </Link>
              </li>
            ))}
            {!biblioteca.length ? <li className="text-sm text-fg-muted">Nada encontrado com esse filtro.</li> : null}
          </ul>
        </div>
      )}
    </div>
  );
}
