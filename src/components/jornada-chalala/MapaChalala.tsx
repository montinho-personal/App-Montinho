"use client";

// ============================================================================
// Mapa vertical de “A Jornada do Chalalá”: cinco regiões (cenários 2.5D em
// camadas), a ESTRADA com as medalhas do caminho (acesas atrás, cadeados na
// frente, sem buracos), as PARADAS 🎁 com as medalhas paralelas presas ao
// ponto em que foram ganhas, o Montinho na abertura de cada capítulo (os
// portões) e o Colombo junto do “Você está aqui”, apontando a próxima. O
// estado de cada medalha vem de `Jornada` (lib/conquistas): aqui nada é
// concedido — só desenhado.
// ============================================================================

import { LENDARIAS } from "@/lib/conquistas/regras";
import { useEffect, useMemo, useRef, useState } from "react";
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import type { ItemParada, Jornada, NoJornada } from "@/lib/conquistas/jornada";
import { CAPITULOS_CHALALA, FALAS_CHALALA, type CapituloChalala, type PersonagemChalala } from "@/lib/jornada-chalala/universo";
import { Cenario2D } from "./Cenarios2D";
import { Personagem, PersonagemBotao } from "./Personagens";

const TOPO = 150;
const PASSO = 128;
/** Altura de cada etiqueta 🎁 de parada (etiqueta de 26 px + 4 de espaço). */
const LINHA_PARADA = 30;
/** Mais do que isso no mesmo ponto vira UMA etiqueta “🎁 N troféus aqui” que abre a lista (não empilha no mapa). */
const MAX_PARADAS_ABERTAS = 3;
const linhasDe = (n: number) => (n > MAX_PARADAS_ABERTAS ? 1 : n);
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const xDoNo = (i: number) => (i % 2 === 0 ? 118 : 242);

type Props = {
  jornada: Jornada;
  /** "reduzido" = mapa estático (sem parallax, sem brilho). */
  movimento: "auto" | "reduzido";
  /** Código do nó que acabou de ser conquistado (simulação): toca a revelação. */
  revelar?: string | null;
  onAbrir: (no: NoJornada) => void;
  /** Toque numa parada 🎁 (medalha paralela, recorde ou retomada). */
  onAbrirParada: (item: ItemParada) => void;
  /** Toque num personagem do mapa: abre a explicação curta dele. */
  onAbrirPersonagem: (id: PersonagemChalala["id"]) => void;
  semTreinos?: boolean;
  /** Ao abrir, rola até “Você está aqui”. */
  rolarAteAqui?: boolean;
};

export function MapaChalala({ jornada, movimento, revelar, onAbrir, onAbrirParada, onAbrirPersonagem, semTreinos = false, rolarAteAqui = false }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const aqui = useRef<HTMLDivElement>(null);
  const indice = useMemo(() => new Map(jornada.nos.map((n, i) => [n.id, i])), [jornada.nos]);
  const paradaDe = useMemo(() => new Map(jornada.paradas.map((p) => [p.apos, p.itens])), [jornada.paradas]);
  const proximaNo = jornada.nos[jornada.posicao] ?? null;

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

  return (
    <div ref={raiz} className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl sm:border sm:border-border" aria-label="Mapa de A Jornada do Chalalá">
      {jornada.capitulos.map((cap) => {
        const cx = CAPITULOS_CHALALA.find((c) => c.numero === cap.numero) ?? CAPITULOS_CHALALA[0];
        // Paradas do começo da trilha (antes da 1ª medalha) ficam no capítulo 1.
        const inicio = cap.numero === 1 ? paradaDe.get(null) ?? [] : [];
        // Posição de cada nó: a estrada desce; as paradas abrem espaço embaixo do nó.
        const aquiNoCap = cap.numero === jornada.capituloAtual;
        const semAcesas = !cap.nos.some((n) => (indice.get(n.id) ?? 0) < jornada.posicao);
        // Ninguém aceso ainda neste capítulo: o “Você está aqui” vai antes do 1º nó, com espaço próprio.
        const espacoAqui = aquiNoCap && semAcesas ? 96 : 0;
        let y = TOPO + 60 + linhasDe(inicio.length) * LINHA_PARADA + (inicio.length ? 20 : 0) + espacoAqui;
        const pts = cap.nos.map((n, i) => {
          const itens = paradaDe.get(n.id) ?? [];
          const p = { n, x: xDoNo(i), y, itens };
          y += PASSO + (itens.length ? linhasDe(itens.length) * LINHA_PARADA + 24 : 0) + (indice.get(n.id) === jornada.posicao - 1 ? 46 : 0);
          return p;
        });
        const altura = Math.max(y + 10, TOPO + 140);
        const caminho = [`M180 0`, ...pts.map((p, i) => { const ant = i ? pts[i - 1] : { x: 180, y: 0 }; const meio = (ant.y + p.y) / 2; return `C${ant.x} ${meio} ${p.x} ${meio} ${p.x} ${p.y}`; }), pts.length ? `C${pts.at(-1)!.x} ${altura - 30} 180 ${altura - 40} 180 ${altura}` : `L180 ${altura}`].join(" ");
        const acesasAqui = pts.filter((p) => (indice.get(p.n.id) ?? 0) < jornada.posicao);
        const todasAcesas = pts.length > 0 && acesasAqui.length === pts.length && cap.numero < jornada.capituloAtual;
        const ultimaAcesa = acesasAqui.at(-1);
        // “Você está aqui” logo depois da última medalha acesa da estrada (ou no começo do capítulo atual).
        const yAqui = ultimaAcesa ? ultimaAcesa.y + 46 + linhasDe(ultimaAcesa.itens.length) * LINHA_PARADA + (ultimaAcesa.itens.length ? 24 : 0) : TOPO + 50 + linhasDe(inicio.length) * LINHA_PARADA + (inicio.length ? 20 : 0);
        const yOuro = todasAcesas ? altura : aquiNoCap ? yAqui : ultimaAcesa ? ultimaAcesa.y : 0;
        const aceso = cap.numero <= jornada.capituloAtual;
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

            <Abertura cap={cx} alcancados={cap.alcancados} total={cap.total} semTreinos={cap.numero === 1 && semTreinos} onAbrirPersonagem={onAbrirPersonagem} />

            {inicio.length ? <Paradas itens={inicio} x={180} y={TOPO + 20} lado="centro" onAbrir={onAbrirParada} /> : null}

            {pts.map((p, i) => (
              <div key={p.n.id}>
                <No no={p.n} x={p.x} y={p.y} lado={i % 2 === 0 ? "dir" : "esq"} revelado={revelar === p.n.id} onAbrir={() => onAbrir(p.n)} />
                {p.itens.length ? <Paradas itens={p.itens} x={p.x} y={p.y + 40} lado={i % 2 === 0 ? "dir" : "esq"} onAbrir={onAbrirParada} /> : null}
              </div>
            ))}

            {aquiNoCap ? <Aqui ref={aqui} y={yAqui} proxima={proximaNo} onAbrirPersonagem={onAbrirPersonagem} /> : null}
          </section>
        );
      })}
    </div>
  );
}

/** Etiquetas 🎁 das medalhas paralelas, ao lado do ponto da estrada em que foram ganhas. */
function Paradas({ itens, x, y, lado, onAbrir }: { itens: ItemParada[]; x: number; y: number; lado: "dir" | "esq" | "centro"; onAbrir: (i: ItemParada) => void }) {
  const pos = lado === "centro" ? { left: "50%", transform: "translateX(-50%)" } : lado === "dir" ? { left: `${(x / 360) * 100}%`, transform: "translateX(-20%)" } : { right: `${100 - (x / 360) * 100}%`, transform: "translateX(20%)" };
  const [lista, setLista] = useState(false);
  if (itens.length > MAX_PARADAS_ABERTAS) {
    const total = itens.reduce((n, it) => n + Math.max(1, it.total), 0);
    return (
      <div className={`absolute ${lista ? "z-30" : "z-[5]"}`} style={{ top: y, ...pos }}>
        <button type="button" onClick={() => setLista((v) => !v)} aria-expanded={lista} className="flex items-center gap-1 rounded-full border border-accent/70 bg-[#2a2416]/95 px-3 py-0.5 text-[11px] font-bold leading-5 text-[#f0dfa8] shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          <span aria-hidden>🎁</span> {total} troféus neste trecho <span aria-hidden>{lista ? "▴" : "▾"}</span>
        </button>
        {lista ? (
          <ul className="mt-1 max-h-72 w-60 space-y-1 overflow-y-auto rounded-2xl border border-[#7c6a3a] bg-[#1b1810]/97 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)]" aria-label="Troféus ganhos neste trecho">
            {itens.map((it) => (
              <li key={`${it.codigo}-${it.data}`}>
                <button type="button" onClick={() => onAbrir(it)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-[#e8d8a8] hover:bg-white/5">
                  <span aria-hidden>🎁</span>
                  <span className="min-w-0 flex-1">{it.titulo}{it.total > 1 ? ` ×${it.total}` : ""}</span>
                  <span className="shrink-0 text-[10px] font-normal text-fg-subtle">{fmt.format(new Date(it.data))}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  return (
    <ul className="absolute z-[5] flex flex-col gap-1" style={{ top: y, ...pos }} aria-label="Paradas: medalhas paralelas ganhas neste ponto">
      {itens.map((it) => (
        <li key={`${it.codigo}-${it.data}`}>
          <button type="button" onClick={() => onAbrir(it)} className="flex max-w-[11.5rem] items-center gap-1 rounded-full border border-[#7c6a3a] bg-[#2a2416]/95 px-2.5 py-0.5 text-left text-[11px] font-semibold leading-5 text-[#e8d8a8] shadow-[0_2px_8px_rgba(0,0,0,0.5)] hover:border-accent">
            <span aria-hidden>🎁</span>
            <span className="truncate">{it.titulo}{it.total > 1 ? ` ×${it.total}` : ""}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Abertura({ cap, alcancados, total, semTreinos, onAbrirPersonagem }: { cap: CapituloChalala; alcancados: number; total: number; semTreinos: boolean; onAbrirPersonagem: (id: PersonagemChalala["id"]) => void }) {
  // O Montinho recebe o aluno em cada portão (abertura de capítulo).
  return (
    <div className="absolute inset-x-3 top-3 flex items-end gap-2">
      <PersonagemBotao id="montinho" tamanho={64} onAbrir={onAbrirPersonagem} />
      <div className="min-w-0 flex-1 rounded-2xl border border-accent/40 bg-[#171B21]/85 px-3.5 py-2.5 backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{cap.numero <= 4 ? `Capítulo ${cap.numero}` : "Depois do capítulo 4"} · {cap.lugar}</p>
        <p className="text-base font-black leading-tight">{cap.titulo}</p>
        <p className="mt-1 text-[12px] leading-snug text-fg-muted">“{cap.narrativa}”</p>
        <p className="mt-1 text-[10px] text-fg-subtle">{semTreinos ? "As medalhas da estrada acendem conforme seus treinos registrados." : `${PORTAO_TEXTO[cap.numero]} ${alcancados}/${total}`}</p>
      </div>
    </div>
  );
}

const PORTAO_TEXTO: Record<number, string> = { 1: "O começo da caminhada.", 2: "Portão: 10 treinos.", 3: "Portão: 25 treinos.", 4: "Portão: 50 treinos ou 12 semanas de acompanhamento.", 5: "Portão: 6 meses de acompanhamento." };

function No({ no, x, y, lado, revelado, onAbrir }: { no: NoJornada; x: number; y: number; lado: "dir" | "esq"; revelado: boolean; onAbrir: () => void }) {
  const titulo = no.tipo === "medalha" ? no.medalha.titulo : no.titulo;
  const status =
    no.tipo === "medalha"
      ? no.medalha.conquistada && no.medalha.data
        ? fmt.format(new Date(no.medalha.data))
        : no.medalha.alvo
          ? `${no.medalha.atual ?? 0}/${no.medalha.alvo}`
          : no.medalha.disponivel ? "a conquistar" : "momento próprio"
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
            <MedalhaIcone selo={no.medalha.selo} conquistada={no.medalha.conquistada} atual={no.medalha.atual} alvo={no.medalha.alvo} tamanho={66} lendaria={LENDARIAS.has(no.medalha.codigo)} />
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

/** “Você está aqui”, com o Colombo apontando a próxima medalha da estrada. */
const Aqui = ({ ref, y, proxima, onAbrirPersonagem }: { ref: React.Ref<HTMLDivElement>; y: number; proxima: NoJornada | null; onAbrirPersonagem: (id: PersonagemChalala["id"]) => void }) => {
  const titulo = proxima ? (proxima.tipo === "medalha" ? proxima.medalha.titulo : proxima.titulo) : null;
  const falta = proxima?.tipo === "medalha" ? proxima.medalha.falta : null;
  return (
    <div ref={ref} className="absolute inset-x-0 z-10 flex justify-center" style={{ top: y - 14 }} aria-label="Você está aqui" role="group">
      <div className="flex items-center gap-1.5">
        <PersonagemBotao id="colombo" tamanho={40} onAbrir={onAbrirPersonagem} />
        <div className="flex flex-col items-start">
          <span className="whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-wider text-bg shadow-[0_6px_16px_rgba(0,0,0,0.6)]">Você está aqui</span>
          {titulo ? <span className="mt-0.5 max-w-[14rem] rounded-xl border border-accent/50 bg-[#171B21]/95 px-2 py-0.5 text-[10px] leading-snug text-fg-muted">Próxima: <strong className="text-fg">{titulo}</strong>{falta ? ` · ${falta}` : ""}</span> : null}
        </div>
      </div>
    </div>
  );
};

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
