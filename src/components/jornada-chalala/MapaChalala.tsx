"use client";

// ============================================================================
// Mapa vertical de “A Jornada do Chalalá”: cinco regiões (cenários 2.5D em
// camadas), trilha sinuosa, medalhas do motor real, “Você está aqui”,
// personagem-guia por capítulo e detalhes ambientais que acendem com o
// progresso. O estado de cada medalha vem de `Jornada` (lib/conquistas):
// aqui nada é concedido — só desenhado.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import type { Jornada, NoJornada } from "@/lib/conquistas/jornada";
import { CAPITULOS_CHALALA, FALAS_CHALALA, type CapituloChalala, type PersonagemChalala } from "@/lib/jornada-chalala/universo";
import { Cenario2D } from "./Cenarios2D";
import { Personagem, PersonagemBotao } from "./Personagens";

const TOPO = 150;
const PASSO = 128;
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const xDoNo = (i: number) => (i % 2 === 0 ? 118 : 242);
/** Quem aparece em cada capítulo (um por tela). */
const GUIA: Record<number, PersonagemChalala["id"]> = { 1: "montinho", 2: "oogway", 3: "colombo", 4: "fenix", 5: "montinho" };

type Props = {
  jornada: Jornada;
  /** "reduzido" = mapa estático (sem parallax, sem brilho). */
  movimento: "auto" | "reduzido";
  /** Código do nó que acabou de ser conquistado (simulação): toca a revelação. */
  revelar?: string | null;
  onAbrir: (no: NoJornada) => void;
  /** Toque num personagem do mapa: abre a explicação curta dele. */
  onAbrirPersonagem: (id: PersonagemChalala["id"]) => void;
  semTreinos?: boolean;
  /** Ao abrir, rola até “Você está aqui”. */
  rolarAteAqui?: boolean;
};

export function MapaChalala({ jornada, movimento, revelar, onAbrir, onAbrirPersonagem, semTreinos = false, rolarAteAqui = false }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const aqui = useRef<HTMLDivElement>(null);
  const indice = useMemo(() => new Map(jornada.nos.map((n, i) => [n.id, i])), [jornada.nos]);

  // Parallax leve: --p = progresso da seção na janela (0…1). Só com movimento.
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const secoes = Array.from(el.querySelectorAll<HTMLElement>("[data-regiao]"));
    if (movimento === "reduzido") {
      for (const s of secoes) s.style.setProperty("--p", "0.5");
      return;
    }
    let pedido = 0;
    const medir = () => {
      pedido = 0;
      const h = window.innerHeight;
      for (const s of secoes) {
        const r = s.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (h - r.top) / (h + r.height)));
        s.style.setProperty("--p", p.toFixed(3));
      }
    };
    const onScroll = () => {
      if (!pedido) pedido = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, [movimento, jornada]);

  // Primeira abertura: rola até “Você está aqui” (só na montagem).
  const rolou = useRef(!rolarAteAqui);
  useEffect(() => {
    if (rolou.current) return;
    rolou.current = true;
    const t = setTimeout(() => aqui.current?.scrollIntoView({ behavior: movimento === "reduzido" ? "auto" : "smooth", block: "center" }), 250);
    return () => clearTimeout(t);
  }, [movimento]);

  // Nó revelado: rola até ele e mostra o Colombo comemorando.
  useEffect(() => {
    if (!revelar) return;
    const alvo = raiz.current?.querySelector<HTMLElement>(`[data-no="${revelar}"]`);
    alvo?.scrollIntoView({ behavior: movimento === "reduzido" ? "auto" : "smooth", block: "center" });
  }, [revelar, movimento]);

  const ultimoCap = Math.max(...jornada.capitulos.map((c) => c.numero));

  return (
    <div ref={raiz} className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl sm:border sm:border-border" aria-label="Mapa de A Jornada do Chalalá">
      {jornada.capitulos.map((cap) => {
        const cx = CAPITULOS_CHALALA.find((c) => c.numero === cap.numero) ?? CAPITULOS_CHALALA[0];
        const altura = TOPO + cap.nos.length * PASSO + 80;
        const pts = cap.nos.map((n, i) => ({ n, x: xDoNo(i), y: TOPO + i * PASSO + 60 }));
        const caminho = [`M180 0`, ...pts.map((p, i) => { const ant = i ? pts[i - 1] : { x: 180, y: 0 }; const meio = (ant.y + p.y) / 2; return `C${ant.x} ${meio} ${p.x} ${meio} ${p.x} ${p.y}`; }), `C${pts.at(-1)!.x} ${altura - 30} 180 ${altura - 40} 180 ${altura}`].join(" ");
        const alcancadosAqui = pts.filter((p) => (indice.get(p.n.id) ?? 0) < jornada.posicao);
        const yOuro = jornada.posicao >= (indice.get(cap.nos.at(-1)!.id) ?? 0) + 1 ? altura : alcancadosAqui.length ? alcancadosAqui.at(-1)!.y : 0;
        const aceso = cap.alcancados > 0 || (indice.get(cap.nos[0].id) ?? 0) <= jornada.posicao;
        const posLocal = pts.findIndex((p) => indice.get(p.n.id) === jornada.posicao);
        const aquiNoFim = cap.numero === ultimoCap && jornada.posicao >= jornada.nos.length;
        return (
          <section key={cap.numero} data-regiao={cx.regiao} className="relative" style={{ height: altura, ["--p" as string]: 0.5 }} aria-label={`Capítulo ${cap.numero}: ${cx.titulo} — ${cx.lugar}`}>
            <Cenario2D regiao={cx.regiao} atenuado={!aceso} altura={altura} />
            {/* Trilha */}
            <svg viewBox={`0 0 360 ${altura}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <clipPath id={`chalala-ouro-${cap.numero}`}><rect x="0" y="0" width="360" height={yOuro} /></clipPath>
              </defs>
              <path d={caminho} fill="none" stroke="#0d1013" strokeWidth="16" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.55" />
              <path d={caminho} fill="none" stroke="#3b3a36" strokeWidth="11" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={caminho} fill="none" stroke="#6b665a" strokeWidth="2" strokeDasharray="3 11" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={caminho} fill="none" stroke="#8a7232" strokeWidth="11" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath={`url(#chalala-ouro-${cap.numero})`} />
              <path d={caminho} fill="none" stroke="#e3cd8a" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath={`url(#chalala-ouro-${cap.numero})`} opacity="0.9" />
            </svg>

            <Abertura cap={cx} alcancados={cap.alcancados} total={cap.total} guia={GUIA[cap.numero] ?? "montinho"} semTreinos={cap.numero === 1 && semTreinos} onAbrirPersonagem={onAbrirPersonagem} />

            {pts.map((p, i) => (
              <No key={p.n.id} no={p.n} x={p.x} y={p.y} lado={i % 2 === 0 ? "dir" : "esq"} revelado={revelar === p.n.id} onAbrir={() => onAbrir(p.n)} />
            ))}

            {posLocal >= 0 || (cap.numero === 1 && jornada.posicao === 0) ? (
              <Aqui ref={aqui} x={posLocal >= 0 ? pts[posLocal].x : 180} y={posLocal >= 0 ? pts[posLocal].y - 70 : TOPO - 10} />
            ) : aquiNoFim ? (
              <Aqui ref={aqui} x={180} y={altura - 70} />
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function Abertura({ cap, alcancados, total, guia, semTreinos, onAbrirPersonagem }: { cap: CapituloChalala; alcancados: number; total: number; guia: PersonagemChalala["id"]; semTreinos: boolean; onAbrirPersonagem: (id: PersonagemChalala["id"]) => void }) {
  return (
    <div className="absolute inset-x-3 top-3 flex items-end gap-2">
      <PersonagemBotao id={guia} tamanho={64} onAbrir={onAbrirPersonagem} />
      <div className="min-w-0 flex-1 rounded-2xl border border-accent/40 bg-[#171B21]/85 px-3.5 py-2.5 backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{cap.numero <= 4 ? `Capítulo ${cap.numero}` : "Depois do capítulo 4"} · {cap.lugar}</p>
        <p className="text-base font-black leading-tight">{cap.titulo}</p>
        <p className="mt-1 text-[12px] leading-snug text-fg-muted">“{cap.narrativa}”</p>
        <p className="mt-1 text-[10px] text-fg-subtle">{semTreinos ? "Os marcos se preenchem conforme seus treinos registrados." : `${cap.tema} ${alcancados}/${total}`}</p>
      </div>
    </div>
  );
}

function No({ no, x, y, lado, revelado, onAbrir }: { no: NoJornada; x: number; y: number; lado: "dir" | "esq"; revelado: boolean; onAbrir: () => void }) {
  const titulo = no.tipo === "medalha" ? no.medalha.titulo : no.titulo;
  const status =
    no.tipo === "medalha"
      ? no.medalha.conquistada && no.medalha.data
        ? fmt.format(new Date(no.medalha.data))
        : no.medalha.alvo
          ? `${no.medalha.atual ?? 0}/${no.medalha.alvo}`
          : no.medalha.disponivel ? "a conquistar" : "momento próprio"
      : no.tipo === "recorrente"
        ? no.total ? `${no.total}× · última ${fmt.format(new Date(no.ultima!)).slice(0, 5)}` : "acontece ao longo do caminho"
        : no.data ? fmt.format(new Date(`${no.data}T15:00:00Z`)) : "próximo marco";
  return (
    <div className="absolute" style={{ left: `${(x / 360) * 100}%`, top: y, transform: "translate(-50%, -50%)" }} data-no={no.id}>
      {revelado ? (
        <div className="pointer-events-none absolute -top-24 left-1/2 z-20 w-44 -translate-x-1/2 chalala-fala">
          <div className="flex items-end gap-1">
            <Personagem id="colombo" tamanho={44} />
            <p className="rounded-2xl rounded-bl-sm border border-accent/60 bg-[#171B21]/95 px-2.5 py-1.5 text-[11px] font-semibold leading-snug">{FALAS_CHALALA.recorde}</p>
          </div>
        </div>
      ) : null}
      <button type="button" onClick={onAbrir} aria-label={`${titulo}: ${no.alcancado ? "conquistado" : "ainda não"} — ${status}`} className={`relative block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${revelado ? "chalala-revelar" : ""}`}>
        {no.alcancado ? <span className="absolute inset-0 -m-3 rounded-full bg-accent/30 blur-md" aria-hidden /> : null}
        {no.tipo === "medalha" && no.proxima ? <span className="absolute inset-0 -m-1.5 rounded-full border-2 border-accent/70 motion-safe:animate-pulse" aria-hidden /> : null}
        <span className="block drop-shadow-[0_6px_8px_rgba(0,0,0,0.55)]">
          {no.tipo === "medalha" ? (
            <MedalhaIcone selo={no.medalha.selo} conquistada={no.medalha.conquistada} atual={no.medalha.atual} alvo={no.medalha.alvo} tamanho={66} />
          ) : no.tipo === "recorrente" ? (
            <MedalhaIcone selo={no.codigo === "recorde" ? "Rec" : "↺"} conquistada={no.alcancado} atual={null} alvo={null} tamanho={58} />
          ) : (
            <Marco acesa={no.alcancado} />
          )}
        </span>
      </button>
      <div className={`pointer-events-none absolute top-1/2 w-28 -translate-y-1/2 ${lado === "dir" ? "left-full ml-2 text-left" : "right-full mr-2 text-right"}`}>
        <p className={`text-[11px] font-bold leading-tight [text-shadow:0_1px_4px_#000,0_0_12px_#000] ${no.alcancado ? "text-fg" : "text-fg-muted"}`}>{titulo}</p>
        <p className="text-[10px] text-fg-subtle [text-shadow:0_1px_4px_#000,0_0_10px_#000]">{status}</p>
      </div>
    </div>
  );
}

function Marco({ acesa }: { acesa: boolean }) {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden>
      <circle cx="27" cy="27" r="25" fill="#171B21" stroke={acesa ? "#BA9E50" : "#2e2e2e"} strokeWidth="3" />
      <line x1="20" y1="40" x2="20" y2="13" stroke={acesa ? "#E3CD8A" : "#777"} strokeWidth="2.5" />
      <path d="M20 13 L38 18 L20 24 Z" fill={acesa ? "#BA9E50" : "#555"} />
    </svg>
  );
}

const Aqui = ({ ref, x, y }: { ref: React.Ref<HTMLDivElement>; x: number; y: number }) => (
  <div ref={ref} className="pointer-events-none absolute z-10 flex flex-col items-center" style={{ left: `${(x / 360) * 100}%`, top: y, transform: "translateX(-50%)" }} aria-label="Você está aqui" role="img">
    <span className="whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-wider text-bg shadow-[0_6px_16px_rgba(0,0,0,0.6)]">Você está aqui</span>
    <span className="mt-0.5 h-0 w-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-accent" aria-hidden />
  </div>
);

export function useMovimentoPermitido(): boolean {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setOk(!mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return ok;
}
