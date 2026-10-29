"use client";

// Gráficos fáceis da Evolução (pedido do Montinho, 29/10/2026): treino a
// treino (tudo somado), exercício a exercício e peso — tocar para ver o número.
// Contas em src/lib/relatorios/graficos-aluno.ts.
import { useState } from "react";
import Link from "next/link";
import { variacao, type BarraTreino } from "@/lib/relatorios/graficos-aluno";

export type PontoExercicio = { data: string; carga: number | null; volume: number };
type Aba = "treinos" | "exercicios" | "peso";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const kg = (n: number) => (n >= 1000 ? `${fmt(Math.round(n / 100) / 10)} t` : `${fmt(n)} kg`);
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function Variacao({ v, sufixo = "" }: { v: number | null; sufixo?: string }) {
  if (v === null) return null;
  const cor = v > 0 ? "bg-success/15 text-success" : v < 0 ? "bg-white/5 text-fg-subtle" : "bg-white/5 text-fg-muted";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cor}`}>{v > 0 ? "▲ +" : v < 0 ? "▼ " : ""}{v}%{sufixo}</span>;
}

/** Linha com área, pontos e o valor do primeiro e do último. */
function Linha({ valores, datas, rotulo, cor = "var(--color-accent)" }: { valores: number[]; datas: string[]; rotulo: (n: number) => string; cor?: string }) {
  const [sel, setSel] = useState(valores.length - 1);
  const W = 320;
  const H = 150;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const x = (i: number) => (valores.length > 1 ? 16 + (i / (valores.length - 1)) * (W - 32) : W / 2);
  const y = (v: number) => H - 28 - ((v - min) / Math.max(1e-9, max - min || 1)) * (H - 56);
  const linha = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(valores.length - 1)},${H - 20} L${x(0)},${H - 20} Z`;
  const i = Math.min(sel, valores.length - 1);
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={valores.map((v, k) => `${ddmm(datas[k])}: ${rotulo(v)}`).join(", ")}>
        <defs>
          <linearGradient id="g-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#g-area)" />
        <path d={linha} fill="none" stroke={cor} strokeWidth="2.5" strokeLinejoin="round" />
        {valores.map((v, k) => (
          <g key={k} onClick={() => setSel(k)} className="cursor-pointer">
            <circle cx={x(k)} cy={y(v)} r="12" fill="transparent" />
            <circle cx={x(k)} cy={y(v)} r={k === i ? 5 : 3} fill={k === i ? cor : "var(--color-bg)"} stroke={cor} strokeWidth="2" />
          </g>
        ))}
        <text x={x(0)} y={H - 4} fontSize="10" fill="currentColor" opacity="0.6" textAnchor="start">{ddmm(datas[0])}</text>
        <text x={x(valores.length - 1)} y={H - 4} fontSize="10" fill="currentColor" opacity="0.6" textAnchor="end">{ddmm(datas.at(-1)!)}</text>
      </svg>
      <figcaption className="rounded-xl bg-bg px-3 py-2 text-center text-sm">
        <span className="text-fg-muted">{ddmm(datas[i])}: </span>
        <span className="font-bold">{rotulo(valores[i])}</span>
        <span className="block text-[11px] text-fg-subtle">Toque nos pontos para ver cada dia.</span>
      </figcaption>
    </figure>
  );
}

/** “Treino A · Push”: a letra e o nome do treino (o mais recente com essa letra), curtinho. */
function rotuloDoChip(l: string, treinos: BarraTreino[]): string {
  const base = l.length === 1 ? `Treino ${l}` : l;
  const nome = [...treinos].reverse().find((t) => t.rotulo === l)?.nome?.trim() ?? "";
  const resto = nome.replace(new RegExp(`^treino\\s*${l}\\b\\s*[-–—:·]?\\s*`, "i"), "").trim();
  if (!resto || resto.toLowerCase() === base.toLowerCase() || l.length > 1) return base;
  return `${base} · ${resto.length > 16 ? `${resto.slice(0, 15)}…` : resto}`;
}

export function GraficosEvolucao({ treinos, exercicios, pontos, peso, relatorioHref }: { treinos: BarraTreino[]; exercicios: Array<{ chave: string; nome: string; vezes: number }>; pontos: Record<string, PontoExercicio[]>; peso: Array<{ data: string; kg: number }>; relatorioHref: string }) {
  const abas: Array<[Aba, string]> = [["treinos", "🏋️ Treinos"], ["exercicios", "💪 Exercícios"], ...(peso.length >= 2 ? ([["peso", "⚖️ Peso"]] as Array<[Aba, string]>) : [])];
  const [aba, setAba] = useState<Aba>("treinos");
  const letras = [...new Set(treinos.map((t) => t.rotulo))].sort((a, b) => a.length - b.length || a.localeCompare(b));
  // Abre num treino só: treinos diferentes (A × D) não se comparam.
  const [letra, setLetra] = useState<string>(letras.length > 1 ? letras[0] : "");
  const lista = (letra ? treinos.filter((t) => t.rotulo === letra) : treinos).slice(-12);
  const [barra, setBarra] = useState<string | null>(null);
  const atual = lista.find((t) => t.id === barra) ?? lista.at(-1);
  const [chave, setChave] = useState(exercicios[0]?.chave ?? "");
  const [medida, setMedida] = useState<"carga" | "volume">("carga");
  const pts = (pontos[chave] ?? []).filter((p) => (medida === "carga" ? p.carga != null && p.carga > 0 : p.volume > 0));
  const valores = pts.map((p) => (medida === "carga" ? (p.carga as number) : p.volume));
  const maxBarra = Math.max(1, ...lista.map((t) => t.volumeKg));

  return (
    <section aria-label="Seus gráficos" className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-lg font-bold">Seus gráficos</h2>
      <div className="grid gap-1 rounded-xl bg-bg p-1" style={{ gridTemplateColumns: `repeat(${abas.length}, minmax(0, 1fr))` }} role="tablist">
        {abas.map(([id, rot]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)} className={`min-h-10 rounded-lg text-sm font-semibold ${aba === id ? "bg-accent text-bg" : "text-fg-muted"}`}>
            {rot}
          </button>
        ))}
      </div>

      {aba === "treinos" ? (
        lista.length ? (
          <div className="space-y-3">
            <p className="text-xs text-fg-muted">Cada barra é um treino: todos os exercícios, séries e repetições somados (carga × repetições).</p>
            {letras.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {[...letras, ""].map((l) => (
                  <button key={l || "todos"} type="button" aria-pressed={letra === l} onClick={() => { setLetra(l); setBarra(null); }} className={`min-h-8 rounded-full border px-3 text-xs font-bold ${letra === l ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                    {l ? rotuloDoChip(l, treinos) : "Todos"}
                  </button>
                ))}
              </div>
            ) : letras.length === 1 ? (
              <p className="text-xs font-semibold text-fg-muted">{letras[0].length === 1 ? `Treino ${letras[0]}` : `Treino ${letras[0].toLowerCase()}`} · quando você tiver outros treinos (A, B, C…), dá para escolher cada um aqui.</p>
            ) : null}
            {letra === "" && letras.length > 1 ? (
              <p className="rounded-lg bg-bg px-3 py-2 text-xs text-fg-muted">Treinos diferentes têm exercícios diferentes: para ver a evolução, escolha um treino acima.</p>
            ) : lista.length >= 2 ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-fg-muted">1º → último: <b className="text-fg">{kg(lista[0].volumeKg)} → {kg(lista.at(-1)!.volumeKg)}</b></span>
                <Variacao v={variacao(lista[0].volumeKg, lista.at(-1)!.volumeKg)} />
              </div>
            ) : null}
            <div className="flex h-40 items-end gap-1.5" role="list">
              {lista.map((t) => {
                const on = atual?.id === t.id;
                return (
                  <button key={t.id} type="button" role="listitem" onClick={() => setBarra(t.id)} aria-label={`${t.nome}, ${ddmm(t.data)}: ${kg(t.volumeKg)}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className={`w-full rounded-t-md ${on ? "bg-accent" : "bg-accent/40"}`} style={{ height: `${Math.max(4, (t.volumeKg / maxBarra) * 100)}%` }} />
                    <span className={`whitespace-nowrap text-[10px] font-bold ${on ? "text-accent" : "text-fg-subtle"}`}>{letra || letras.length <= 1 ? ddmm(t.data) : t.rotulo.length === 1 ? t.rotulo : t.rotulo[0]}</span>
                  </button>
                );
              })}
            </div>
            {atual ? (
              <div className="rounded-xl bg-bg px-3 py-2 text-sm">
                <p className="font-bold">{atual.nome} · {ddmm(atual.data)}</p>
                <p className="text-fg-muted">{atual.series} séries · {atual.reps} repetições · <b className="text-accent">{kg(atual.volumeKg)}</b> levantados</p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Conclua um treino para ver o primeiro gráfico aqui.</p>
        )
      ) : null}

      {aba === "exercicios" ? (
        exercicios.length ? (
          <div className="space-y-3">
            <select aria-label="Exercício" value={chave} onChange={(e) => setChave(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm font-semibold">
              {exercicios.map((e) => (
                <option key={e.chave} value={e.chave}>{e.nome} ({e.vezes}×)</option>
              ))}
            </select>
            <div className="flex gap-1.5">
              {(["carga", "volume"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={medida === m} onClick={() => setMedida(m)} className={`min-h-8 rounded-full border px-3 text-xs font-bold ${medida === m ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                  {m === "carga" ? "Maior carga" : "Volume do dia"}
                </button>
              ))}
            </div>
            {valores.length >= 2 ? (
              <>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Antes → agora</p>
                    <p className="text-2xl font-black tabular-nums">{kg(valores[0])} → <span className="text-accent">{kg(valores.at(-1)!)}</span></p>
                  </div>
                  <Variacao v={variacao(valores[0], valores.at(-1)!)} />
                </div>
                <Linha key={`${chave}:${medida}`} valores={valores} datas={pts.map((p) => p.data)} rotulo={kg} />
              </>
            ) : (
              <p className="text-sm text-fg-muted">{valores.length ? `Só 1 registro com carga: ${kg(valores[0])}. O gráfico aparece a partir do 2º.` : "Ainda sem carga anotada neste exercício."}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Anote a carga nas séries para ver a evolução de cada exercício.</p>
        )
      ) : null}

      {aba === "peso" ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Primeira → última medida</p>
              <p className="text-2xl font-black tabular-nums">{fmt(peso[0].kg)} → {fmt(peso.at(-1)!.kg)} kg</p>
            </div>
          </div>
          <Linha valores={peso.map((p) => p.kg)} datas={peso.map((p) => p.data)} rotulo={(n) => `${fmt(n)} kg`} cor="#a1a1aa" />
          <p className="text-[11px] text-fg-subtle">O peso sozinho não conta a história toda: músculo e gordura mudam juntos. Veja também as medidas.</p>
        </div>
      ) : null}

      <Link href={relatorioHref} className="touch flex items-center justify-between gap-3 rounded-xl border-2 border-accent bg-[linear-gradient(160deg,#2a2415_0%,#171717_80%)] px-4 py-3">
        <span>
          <span className="block font-bold text-accent">📄 Ver relatório completo</span>
          <span className="block text-xs text-fg-muted">Cada ponto da sua evolução explicado, músculo a músculo. Dá para baixar em PDF.</span>
        </span>
        <span aria-hidden className="text-xl text-accent">→</span>
      </Link>
    </section>
  );
}
