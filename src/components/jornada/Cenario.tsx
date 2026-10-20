// Cenários do mapa (SVG leve, decorativo): cada capítulo tem a sua paisagem.
// Paleta: noite elegante, verdes e pedras dessaturados e o dourado da marca.
// `aceso` = capítulo com conquistas (paisagem iluminada); senão, discreta.
import type { Capitulo } from "@/lib/conquistas/jornada";

const OURO = "#ba9e50";

export function Cenario({ tipo, aceso }: { tipo: Capitulo["cenario"]; aceso: boolean }) {
  return (
    <svg viewBox="0 0 360 600" preserveAspectRatio="xMidYMid slice" aria-hidden className={`absolute inset-0 h-full w-full transition-[filter,opacity] duration-700 motion-reduce:transition-none ${aceso ? "" : "opacity-50 [filter:grayscale(0.7)_brightness(0.8)]"}`}>
      <defs>
        <linearGradient id={`ceu-${tipo}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tipo === "horizonte" ? "#1d1a12" : "#101410"} />
          <stop offset="1" stopColor="#0b0c0b" />
        </linearGradient>
        <radialGradient id={`luz-${tipo}`} cx="0.5" cy="0.15" r="0.6">
          <stop offset="0" stopColor={OURO} stopOpacity={aceso ? 0.18 : 0.05} />
          <stop offset="1" stopColor={OURO} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="600" fill={`url(#ceu-${tipo})`} />
      <rect width="360" height="600" fill={`url(#luz-${tipo})`} />
      {tipo === "trilha" ? <Trilha /> : tipo === "ponte" ? <Ponte /> : tipo === "mirante" ? <Mirante /> : tipo === "montanha" ? <Montanha /> : <Horizonte />}
    </svg>
  );
}

function Arvore({ x, y, s = 1, cor = "#22301f" }: { x: number; y: number; s?: number; cor?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2" y="18" width="4" height="10" fill="#2a2016" />
      <path d="M0 -14 L13 10 H-13 Z" fill={cor} />
      <path d="M0 -4 L15 20 H-15 Z" fill={cor} />
    </g>
  );
}

function Colinas({ cor1 = "#162015", cor2 = "#1c2a1a" }: { cor1?: string; cor2?: string }) {
  return (
    <>
      <path d="M0 420 C70 380 130 400 200 370 S320 350 360 380 V600 H0 Z" fill={cor1} />
      <path d="M0 500 C90 470 160 500 240 470 S340 470 360 480 V600 H0 Z" fill={cor2} />
    </>
  );
}

function Trilha() {
  return (
    <>
      <Colinas />
      <Arvore x={40} y={120} s={1.2} />
      <Arvore x={318} y={200} s={1.4} />
      <Arvore x={30} y={330} />
      <Arvore x={330} y={420} s={1.1} />
      <Arvore x={60} y={470} s={1.3} cor="#263623" />
      <circle cx="300" cy="80" r="2" fill="#e3cd8a" opacity="0.6" />
      <circle cx="70" cy="40" r="1.5" fill="#e3cd8a" opacity="0.5" />
    </>
  );
}

function Ponte() {
  return (
    <>
      <path d="M0 260 C80 250 120 300 180 290 S300 260 360 280 V330 C300 320 240 350 180 340 S60 310 0 320 Z" fill="#132029" opacity="0.9" />
      <path d="M40 285 Q180 220 320 285" fill="none" stroke="#5b4a2c" strokeWidth="4" />
      {Array.from({ length: 9 }, (_, i) => <line key={i} x1={60 + i * 30} y1={276 - Math.sin((i / 8) * Math.PI) * 30} x2={60 + i * 30} y2="300" stroke="#4a3c24" strokeWidth="2" />)}
      <Colinas cor1="#172216" cor2="#1d2b1b" />
      <Arvore x={36} y={150} s={1.3} />
      <Arvore x={326} y={140} s={1.1} />
      <Arvore x={320} y={470} s={1.2} />
    </>
  );
}

function Mirante() {
  return (
    <>
      <path d="M0 300 L70 200 L120 250 L190 150 L260 240 L310 190 L360 260 V600 H0 Z" fill="#1a1d1a" />
      <path d="M190 150 L172 176 L186 172 L196 182 L208 170 Z" fill="#cfcfcf" opacity="0.25" />
      <g transform="translate(300 330)">
        <rect x="-3" y="0" width="6" height="60" fill="#3a3122" />
        <rect x="-18" y="-10" width="36" height="12" rx="2" fill="#4d3f27" />
        <path d="M-20 -10 L0 -26 L20 -10 Z" fill={OURO} opacity="0.7" />
      </g>
      <Colinas cor1="#171d16" cor2="#1e271c" />
      <Arvore x={40} y={430} s={1.2} />
    </>
  );
}

function Montanha() {
  return (
    <>
      <path d="M-20 360 L90 140 L170 260 L250 90 L380 330 V600 H-20 Z" fill="#1b1c1f" />
      <path d="M250 90 L226 134 L244 128 L256 140 L272 126 Z" fill="#e8e8e8" opacity="0.35" />
      <path d="M90 140 L72 176 L88 170 L102 178 Z" fill="#e8e8e8" opacity="0.25" />
      <g transform="translate(250 90)">
        <line x1="0" y1="0" x2="0" y2="-34" stroke="#cfcfcf" strokeWidth="2" />
        <path d="M0 -34 L20 -28 L0 -22 Z" fill={OURO} />
      </g>
      <Colinas cor1="#161a17" cor2="#1b221b" />
      <Arvore x={330} y={460} s={1.2} />
    </>
  );
}

function Horizonte() {
  return (
    <>
      <circle cx="180" cy="300" r="70" fill={OURO} opacity="0.12" />
      <path d="M0 330 C90 310 270 310 360 330 V600 H0 Z" fill="#17150f" />
      <path d="M0 420 C120 390 240 430 360 400 V600 H0 Z" fill="#1c1a13" />
      {[60, 140, 220, 300].map((x, i) => (
        <g key={x} transform={`translate(${x} ${470 - (i % 2) * 20})`}>
          <line x1="0" y1="0" x2="0" y2="-26" stroke="#8a7a52" strokeWidth="2" />
          <path d="M0 -26 L14 -21 L0 -16 Z" fill={OURO} opacity="0.55" />
        </g>
      ))}
    </>
  );
}
