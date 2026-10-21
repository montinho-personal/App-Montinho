"use client";

// ============================================================================
// Cenários 2.5D de “A Jornada do Chalalá” (SVG em camadas, decorativo).
//
// Cada região tem 4 camadas: céu/luz → longe → meio → perto. As camadas
// recebem deslocamentos diferentes pela variável CSS --p (progresso da seção
// na tela, 0…1), o que dá a sensação de profundidade ao rolar. Com movimento
// reduzido, --p fica fixo e nada se mexe. Vetores originais; paleta do
// universo: grafite #171B21, dourado #BA9E50, floresta #436657, montanha
// #54768A, terracota #C18B61. Nenhum asset externo: tudo é SVG leve.
// ============================================================================

import { createContext, useContext } from "react";
import type { RegiaoChalala } from "@/lib/jornada-chalala/universo";

/** Altura real da seção (px no viewBox). A cena foi desenhada em 360×800: o
 *  longe fica ancorado no topo, o meio no centro e o perto no chão. */
const AlturaCtx = createContext(800);

const OURO = "#BA9E50";
const OURO_CLARO = "#E3CD8A";

type Camada = "longe" | "meio" | "perto";
/** Quanto cada camada desliza (px) com o progresso da rolagem. */
const DESLOCA: Record<Camada, number> = { longe: 10, meio: 26, perto: 46 };

function Camada({ nome, children }: { nome: Camada; children: React.ReactNode }) {
  const altura = useContext(AlturaCtx);
  const extra = Math.max(0, altura - 800);
  const ancora = nome === "longe" ? 0 : nome === "meio" ? extra * 0.5 : extra;
  return (
    <g transform={`translate(0 ${ancora})`}>
      <g style={{ transform: `translateY(calc(var(--p, 0.5) * ${DESLOCA[nome]}px - ${DESLOCA[nome] / 2}px))`, willChange: "transform" }}>{children}</g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Peças reutilizáveis
// ---------------------------------------------------------------------------
function Pinheiro({ x, y, s = 1, cor = "#2d4a3b", escuro = "#223a2e" }: { x: number; y: number; s?: number; cor?: string; escuro?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2.5" y="22" width="5" height="12" rx="1" fill="#3a2a1a" />
      <path d="M0 -26 L15 2 H-15 Z" fill={cor} />
      <path d="M0 -14 L18 14 H-18 Z" fill={cor} />
      <path d="M0 -2 L21 26 H-21 Z" fill={escuro} />
      <path d="M0 -26 L15 2 H0 Z" fill="#000" opacity="0.12" />
      <path d="M0 -14 L18 14 H0 Z" fill="#000" opacity="0.12" />
      <path d="M0 -2 L21 26 H0 Z" fill="#000" opacity="0.12" />
    </g>
  );
}

function ArvoreRedonda({ x, y, s = 1, cor = "#436657" }: { x: number; y: number; s?: number; cor?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2.5" y="8" width="5" height="16" rx="1" fill="#3a2a1a" />
      <circle cx="0" cy="0" r="16" fill={cor} />
      <circle cx="-9" cy="4" r="11" fill={cor} />
      <circle cx="10" cy="3" r="12" fill={cor} />
      <circle cx="-4" cy="-6" r="9" fill="#fff" opacity="0.08" />
      <circle cx="6" cy="6" r="10" fill="#000" opacity="0.14" />
    </g>
  );
}

function Pedra({ x, y, s = 1, cor = "#2c3238" }: { x: number; y: number; s?: number; cor?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-14 8 L-8 -6 L4 -9 L14 0 L12 9 Z" fill={cor} />
      <path d="M-8 -6 L4 -9 L8 -2 L-4 1 Z" fill="#fff" opacity="0.1" />
    </g>
  );
}

function Montanha({ pontos, cor, neve = false, x = 0, y = 0 }: { pontos: string; cor: string; neve?: boolean; x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={pontos} fill={cor} />
      {neve ? <path d={pontos} fill="#e9eef2" opacity="0.55" style={{ clipPath: "inset(0 0 72% 0)" }} /> : null}
    </g>
  );
}

function Nevoa({ y, largura = 360, opacidade = 0.25, cor = "#cfd8dc" }: { y: number; largura?: number; opacidade?: number; cor?: string }) {
  return <ellipse cx={largura / 2} cy={y} rx={largura * 0.7} ry="16" fill={cor} opacity={opacidade} filter="url(#chalala-borrao)" />;
}

function Nuvem({ x, y, s = 1, cor = "#9fb3c1", opacidade = 0.35 }: { x: number; y: number; s?: number; cor?: string; opacidade?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacidade} className="chalala-nuvem">
      <ellipse cx="0" cy="0" rx="26" ry="9" fill={cor} />
      <ellipse cx="-12" cy="-4" rx="12" ry="8" fill={cor} />
      <ellipse cx="10" cy="-5" rx="14" ry="9" fill={cor} />
    </g>
  );
}

function Estrelas({ n = 12, semente = 1, altura = 220 }: { n?: number; semente?: number; altura?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = ((i * 97 + semente * 31) % 350) + 5;
        const y = ((i * 53 + semente * 17) % altura) + 10;
        return <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} fill={OURO_CLARO} opacity={0.35 + ((i * 7) % 5) * 0.1} />;
      })}
    </g>
  );
}

function Lanterna({ x, y, acesa = true, s = 1 }: { x: number; y: number; acesa?: boolean; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2" y="0" width="4" height="46" rx="1" fill="#3a3024" />
      <rect x="-7" y="-14" width="14" height="16" rx="2" fill="#2a2420" stroke="#5a4a30" strokeWidth="1.5" />
      <path d="M-8 -14 L0 -22 L8 -14 Z" fill="#5a4a30" />
      {acesa ? (
        <>
          <rect x="-4" y="-11" width="8" height="10" rx="1" fill={OURO_CLARO} className="chalala-lanterna" />
          <circle cx="0" cy="-6" r="22" fill={OURO} opacity="0.14" className="chalala-lanterna" />
        </>
      ) : (
        <rect x="-4" y="-11" width="8" height="10" rx="1" fill="#1b1b1b" />
      )}
    </g>
  );
}

function Bandeira({ x, y, cor = OURO, s = 1 }: { x: number; y: number; cor?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <line x1="0" y1="0" x2="0" y2="-34" stroke="#d9d9d9" strokeWidth="2" />
      <path d="M0 -34 L18 -29 L0 -23 Z" fill={cor} className="chalala-balanco" />
    </g>
  );
}

function Tenda({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-30 20 L0 -22 L30 20 Z" fill="#C18B61" />
      <path d="M0 -22 L30 20 H0 Z" fill="#000" opacity="0.18" />
      <path d="M-9 20 L0 2 L9 20 Z" fill="#3a2a1a" />
      <path d="M-9 20 L0 2 L3 20 Z" fill={OURO} opacity="0.35" className="chalala-lanterna" />
      <circle cx="46" cy="18" r="14" fill={OURO} opacity="0.16" className="chalala-lanterna" />
      <path d="M40 20 L44 10 L48 16 L52 8 L54 20 Z" fill="#e0a052" className="chalala-lanterna" />
      <ellipse cx="46" cy="22" rx="10" ry="3" fill="#2c3238" />
    </g>
  );
}

function Vagalumes({ n = 6, semente = 3 }: { n?: number; semente?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={((i * 83 + semente * 19) % 320) + 20} cy={((i * 61 + semente * 23) % 300) + 300} r="1.8" fill={OURO_CLARO} className="chalala-vagalume" style={{ animationDelay: `${(i * 0.7) % 4}s` }} />
      ))}
    </g>
  );
}

function Agua({ y, altura = 60, cor = "#2b4656" }: { y: number; altura?: number; cor?: string }) {
  return (
    <g>
      <rect x="0" y={y} width="360" height={altura} fill={cor} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${20 + i * 90} ${y + 14 + i * 9} q 14 -4 28 0 t 28 0`} fill="none" stroke="#cfe3ee" strokeWidth="1.5" strokeLinecap="round" className="chalala-agua" style={{ animationDelay: `${i * 0.8}s` }} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Regiões
// ---------------------------------------------------------------------------
function Bosque() {
  return (
    <>
      <Camada nome="longe">
        <circle cx="300" cy="150" r="60" fill={OURO} opacity="0.16" />
        <circle cx="300" cy="150" r="28" fill={OURO_CLARO} opacity="0.35" />
        <Estrelas n={8} semente={2} altura={140} />
        <Montanha pontos="M-20 420 L60 300 L130 360 L200 280 L270 350 L340 300 L380 380 V2400 H-20 Z" cor="#2a3a44" />
        <Nuvem x={90} y={200} s={1.1} />
        <Nuvem x={250} y={240} s={0.8} opacidade={0.25} />
      </Camada>
      <Camada nome="meio">
        <path d="M-20 520 C60 470 120 500 180 470 S300 440 380 480 V2400 H-20 Z" fill="#324e43" />
        <path d="M-20 600 C80 560 160 590 240 560 S340 560 380 580 V2400 H-20 Z" fill="#2c4539" />
        <Nevoa y={540} opacidade={0.18} />
        <Pinheiro x={40} y={520} s={1.1} />
        <Pinheiro x={320} y={500} s={1.3} />
        <ArvoreRedonda x={300} y={590} s={1.1} />
        <Pinheiro x={75} y={610} s={0.9} />
      </Camada>
      <Camada nome="perto">
        <path d="M-20 700 C100 660 200 700 380 670 V2400 H-20 Z" fill="#243a30" />
        <ArvoreRedonda x={28} y={700} s={1.4} cor="#3b5a4c" />
        <Pinheiro x={330} y={690} s={1.5} cor="#2b4638" escuro="#203528" />
        <Tenda x={70} y={760} s={0.9} />
        <Pedra x={250} y={770} />
        <Lanterna x={200} y={720} s={0.9} />
        <Vagalumes />
        <Nevoa y={790} opacidade={0.22} />
      </Camada>
    </>
  );
}

function Ponte() {
  return (
    <>
      <Camada nome="longe">
        <Estrelas n={10} semente={5} altura={160} />
        <circle cx="70" cy="120" r="34" fill={OURO_CLARO} opacity="0.22" />
        <Montanha pontos="M-20 380 L50 230 L120 320 L190 200 L260 310 L320 240 L380 340 V2400 H-20 Z" cor="#3b5668" neve />
        <Montanha pontos="M-20 440 L80 340 L160 410 L250 330 L340 420 L380 400 V2400 H-20 Z" cor="#2f4756" />
        <Nuvem x={200} y={170} s={1.2} opacidade={0.3} />
      </Camada>
      <Camada nome="meio">
        <path d="M-20 470 C60 440 140 470 220 440 S320 430 380 450 V2400 H-20 Z" fill="#355246" />
        <Agua y={560} altura={70} />
        <path d="M-20 560 C100 548 220 572 380 556 V566 C220 584 100 560 -20 572 Z" fill="#1d2f3a" opacity="0.8" />
        <Pinheiro x={36} y={520} s={1.2} />
        <Pinheiro x={326} y={515} s={1.1} />
        <ArvoreRedonda x={70} y={545} s={0.9} />
      </Camada>
      <Camada nome="perto">
        {/* Ponte de madeira com cordas */}
        <path d="M30 600 Q180 560 330 600" fill="none" stroke="#5a4328" strokeWidth="10" strokeLinecap="round" />
        <path d="M30 600 Q180 560 330 600" fill="none" stroke="#C18B61" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        {Array.from({ length: 11 }, (_, i) => {
          const t = i / 10;
          const x = 30 + t * 300;
          const y = 600 - Math.sin(t * Math.PI) * 38;
          return <line key={i} x1={x} y1={y - 24} x2={x} y2={y + 4} stroke="#4a3822" strokeWidth="2.5" />;
        })}
        <path d="M30 576 Q180 536 330 576" fill="none" stroke="#8a6a3c" strokeWidth="2" />
        <Lanterna x={36} y={548} s={0.8} />
        <Lanterna x={324} y={548} s={0.8} />
        <path d="M-20 700 C100 670 240 690 380 660 V2400 H-20 Z" fill="#273f34" />
        <Pedra x={300} y={690} s={1.3} />
        <ArvoreRedonda x={30} y={690} s={1.3} cor="#3b5a4c" />
        <Pinheiro x={330} y={720} s={1.4} />
      </Camada>
    </>
  );
}

function Mirante() {
  return (
    <>
      <Camada nome="longe">
        <circle cx="180" cy="110" r="70" fill={OURO} opacity="0.14" />
        <circle cx="180" cy="110" r="30" fill={OURO_CLARO} opacity="0.4" />
        <Montanha pontos="M-20 300 L60 190 L120 260 L200 150 L280 250 L340 200 L380 280 V2400 H-20 Z" cor="#4d6b7c" neve />
        <Montanha pontos="M-20 360 L70 290 L150 340 L230 270 L310 350 L380 330 V2400 H-20 Z" cor="#3e586a" />
        <Nuvem x={60} y={330} s={1.4} opacidade={0.5} cor="#c9d6de" />
        <Nuvem x={290} y={380} s={1.2} opacidade={0.45} cor="#c9d6de" />
        {/* Vale lá embaixo: o caminho percorrido */}
        <path d="M40 470 C120 440 200 500 260 450 S340 420 380 440" fill="none" stroke={OURO} strokeWidth="3" strokeDasharray="6 8" opacity="0.55" />
      </Camada>
      <Camada nome="meio">
        <path d="M-20 520 C80 480 200 520 380 470 V2400 H-20 Z" fill="#355246" />
        <Pinheiro x={40} y={520} s={1.2} />
        <Pinheiro x={320} y={500} s={1.1} />
        <Nevoa y={500} opacidade={0.2} />
      </Camada>
      <Camada nome="perto">
        {/* Deque do mirante com guarda-corpo */}
        <path d="M-20 640 L380 620 V2400 H-20 Z" fill="#2a2420" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={i * 44 - 10} y={626 - i * 2.2} width="44" height="8" fill="#3a2f26" stroke="#1e1a16" strokeWidth="1" />
        ))}
        <path d="M-20 612 L380 592" stroke="#8a6a3c" strokeWidth="4" strokeLinecap="round" />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={10 + i * 48} y1={614 - i * 2.4} x2={10 + i * 48} y2={640 - i * 2.4} stroke="#5a4328" strokeWidth="3" />
        ))}
        <Bandeira x={318} y={600} s={1.4} />
        <Lanterna x={60} y={590} s={0.9} />
        <Pedra x={200} y={760} s={1.2} />
        <ArvoreRedonda x={40} y={740} s={1.2} cor="#3b5a4c" />
      </Camada>
    </>
  );
}

function Montanhas() {
  return (
    <>
      <Camada nome="longe">
        <Estrelas n={14} semente={9} altura={200} />
        <Montanha pontos="M-20 320 L70 120 L150 240 L230 80 L310 230 L380 160 V2400 H-20 Z" cor="#2f4350" neve />
        <Montanha pontos="M-20 400 L60 300 L140 360 L220 290 L300 370 L380 330 V2400 H-20 Z" cor="#263845" />
        {/* Frente de clima: chuva suave num pedaço */}
        <g opacity="0.35">
          <Nuvem x={90} y={230} s={1.6} cor="#7f93a1" opacidade={0.8} />
          {Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1={60 + i * 10} y1={246} x2={56 + i * 10} y2={272} stroke="#9fb3c1" strokeWidth="1.2" strokeLinecap="round" />
          ))}
        </g>
        <Nuvem x={290} y={210} s={1.1} opacidade={0.3} />
      </Camada>
      <Camada nome="meio">
        <path d="M-20 500 C80 460 160 500 240 460 S340 440 380 470 V2400 H-20 Z" fill="#33503f" />
        {/* Trilhas alternativas */}
        <path d="M60 520 C120 500 160 540 220 520 S300 500 340 520" fill="none" stroke="#C18B61" strokeWidth="2" strokeDasharray="4 7" opacity="0.6" />
        <path d="M80 560 C140 540 200 580 260 556" fill="none" stroke="#C18B61" strokeWidth="2" strokeDasharray="4 7" opacity="0.45" />
        <Pinheiro x={40} y={530} s={1.1} />
        <Pinheiro x={330} y={520} s={1.3} />
        <Nevoa y={590} opacidade={0.2} />
      </Camada>
      <Camada nome="perto">
        <path d="M-20 700 C100 660 220 700 380 660 V2400 H-20 Z" fill="#273f34" />
        {/* Área de descanso: abrigo + banco + lanterna */}
        <g transform="translate(250 690)">
          <path d="M-40 10 L0 -24 L40 10 Z" fill="#3a2f26" />
          <rect x="-34" y="10" width="68" height="6" fill="#2a2420" />
          <rect x="-28" y="-2" width="56" height="10" rx="2" fill="#C18B61" opacity="0.85" />
          <rect x="-26" y="8" width="4" height="12" fill="#3a2a1a" />
          <rect x="22" y="8" width="4" height="12" fill="#3a2a1a" />
        </g>
        <Lanterna x={60} y={690} s={0.9} />
        <Pedra x={140} y={760} s={1.4} />
        <Pinheiro x={330} y={740} s={1.3} />
      </Camada>
    </>
  );
}

function Horizonte() {
  return (
    <>
      <Camada nome="longe">
        <circle cx="180" cy="260" r="110" fill={OURO} opacity="0.16" />
        <circle cx="180" cy="260" r="44" fill={OURO_CLARO} opacity="0.5" />
        <Montanha pontos="M-20 330 L30 280 L90 320 L150 270 L210 320 L270 262 L330 310 L380 290 V2400 H-20 Z" cor="#5e7a8c" />
        <Montanha pontos="M-20 370 L60 330 L130 360 L200 320 L280 365 L380 340 V2400 H-20 Z" cor="#4a6577" />
        <Montanha pontos="M-20 420 L80 380 L170 410 L260 375 L380 410 V2400 H-20 Z" cor="#3a5366" />
        <Nuvem x={70} y={300} s={1.2} opacidade={0.25} cor="#e3cd8a" />
        <Nuvem x={290} y={320} s={1} opacidade={0.2} cor="#e3cd8a" />
      </Camada>
      <Camada nome="meio">
        <path d="M-20 500 C80 470 180 500 280 470 S360 470 380 480 V2400 H-20 Z" fill="#3c5a4a" />
        {/* Caminhos que se abrem */}
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M180 560 C${120 + i * 60} 530 ${60 + i * 120} 500 ${30 + i * 150} 470`} fill="none" stroke={OURO} strokeWidth="2.5" strokeDasharray="5 8" opacity="0.5" />
        ))}
        {[40, 180, 320].map((x, i) => (
          <Bandeira key={x} x={x} y={476 + (i === 1 ? -8 : 0)} s={1.1} />
        ))}
        <Nevoa y={540} opacidade={0.18} cor="#e3cd8a" />
      </Camada>
      <Camada nome="perto">
        <path d="M-20 690 C100 650 220 690 380 650 V2400 H-20 Z" fill="#2b4536" />
        <ArvoreRedonda x={36} y={690} s={1.3} cor="#3b5a4c" />
        <Pinheiro x={330} y={700} s={1.3} />
        <Lanterna x={180} y={700} s={0.9} />
        <Pedra x={100} y={760} s={1.1} />
        <Pedra x={270} y={770} s={0.9} />
      </Camada>
    </>
  );
}

const CEU: Record<RegiaoChalala, [string, string]> = {
  bosque: ["#2a2622", "#171B21"],
  ponte: ["#1b2a36", "#171B21"],
  mirante: ["#2c3a46", "#171B21"],
  montanhas: ["#1a222b", "#171B21"],
  horizonte: ["#3a2f1f", "#171B21"],
};

/**
 * Cenário de uma região. `atenuado` = região ainda não alcançada (dessaturada
 * e mais escura, sem apagar a paisagem). Preenche o contêiner (slice).
 */
export function Cenario2D({ regiao, atenuado = false, altura = 800 }: { regiao: RegiaoChalala; atenuado?: boolean; altura?: number }) {
  const [c1, c2] = CEU[regiao];
  return (
    <svg viewBox={`0 0 360 ${altura}`} preserveAspectRatio="xMidYMid slice" aria-hidden className={`absolute inset-0 h-full w-full transition-[filter,opacity] duration-700 motion-reduce:transition-none ${atenuado ? "opacity-70 [filter:saturate(0.45)_brightness(0.75)]" : ""}`}>
      <defs>
        <linearGradient id={`chalala-ceu-${regiao}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.6" stopColor={c2} />
        </linearGradient>
        <filter id="chalala-borrao" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <linearGradient id="chalala-vinheta" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.92" stopColor="#171B21" stopOpacity="0" />
          <stop offset="1" stopColor="#171B21" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="360" height={altura} fill={`url(#chalala-ceu-${regiao})`} />
      <AlturaCtx.Provider value={altura}>{regiao === "bosque" ? <Bosque /> : regiao === "ponte" ? <Ponte /> : regiao === "mirante" ? <Mirante /> : regiao === "montanhas" ? <Montanhas /> : <Horizonte />}</AlturaCtx.Provider>
      <rect width="360" height={altura} fill="url(#chalala-vinheta)" />
    </svg>
  );
}
