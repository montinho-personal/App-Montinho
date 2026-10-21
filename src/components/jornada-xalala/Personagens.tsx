// ============================================================================
// Personagens de “A Jornada do Xalalá” — PROPOSTAS CONCEITUAIS em SVG original.
// Montinho (o Guia) é uma representação simbólica provisória: silhueta de
// guia de trilha com o halter “M” da marca; a aparência real só entra com
// referência aprovada. Pingo, Tempo e Vira são companheiros de aventura, com
// proporção de mascote adulto (nada de brinquedo). Um por tela, no máximo.
// ============================================================================

import type { PersonagemXalala } from "@/lib/jornada-xalala/universo";

const OURO = "#BA9E50";
const OURO_CLARO = "#E3CD8A";

export function Montinho({ tamanho = 96 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden>
      {/* Silhueta de guia de trilha, sem rosto definido (provisório). */}
      <ellipse cx="50" cy="94" rx="26" ry="4" fill="#000" opacity="0.3" />
      <path d="M30 92 L34 50 Q50 40 66 50 L70 92 Z" fill="#2a2f36" />
      <path d="M34 50 Q50 40 66 50 L64 70 Q50 64 36 70 Z" fill="#363c45" />
      <circle cx="50" cy="32" r="13" fill="#3b4149" />
      <path d="M33 30 Q50 14 67 30 L64 32 Q50 22 36 32 Z" fill="#4a4034" />
      <path d="M38 24 Q50 17 62 24" stroke={OURO} strokeWidth="2" fill="none" />
      {/* Mochila e bastão */}
      <path d="M68 52 Q80 60 76 80 L68 78 Z" fill="#5a4328" />
      <line x1="24" y1="48" x2="20" y2="94" stroke="#8a6a3c" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="46" r="3.5" fill={OURO} />
      {/* Halter “M” da marca no peito */}
      <g transform="translate(50 60)">
        <rect x="-11" y="-2" width="22" height="4" rx="2" fill={OURO} />
        <rect x="-14" y="-5" width="4" height="10" rx="1" fill={OURO_CLARO} />
        <rect x="10" y="-5" width="4" height="10" rx="1" fill={OURO_CLARO} />
        <path d="M-6 3 L-6 -4 L-2 1 L2 -4 L2 3" stroke="#171B21" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function Pingo({ tamanho = 80 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden>
      <ellipse cx="50" cy="92" rx="22" ry="4" fill="#000" opacity="0.3" />
      {/* Corpo redondo com cachecol e lanterna */}
      <circle cx="50" cy="56" r="28" fill="#54768A" />
      <circle cx="42" cy="48" r="20" fill="#fff" opacity="0.06" />
      <path d="M26 66 Q50 82 74 66 L76 72 Q50 90 24 72 Z" fill="#C18B61" />
      <path d="M62 70 L74 86 L80 80 Z" fill="#C18B61" />
      {/* Olhos grandes e simples */}
      <circle cx="40" cy="52" r="6" fill="#171B21" />
      <circle cx="60" cy="52" r="6" fill="#171B21" />
      <circle cx="42" cy="50" r="2" fill="#fff" />
      <circle cx="62" cy="50" r="2" fill="#fff" />
      <path d="M45 63 Q50 67 55 63" stroke="#171B21" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Gorro de explorador */}
      <path d="M22 44 Q50 18 78 44 L76 40 Q50 22 24 40 Z" fill="#436657" />
      <rect x="22" y="40" width="56" height="6" rx="3" fill="#2f4a3d" />
      {/* Lanterna dourada */}
      <g transform="translate(84 58)">
        <line x1="0" y1="0" x2="-8" y2="-6" stroke="#5a4328" strokeWidth="2.5" />
        <rect x="-5" y="-2" width="10" height="12" rx="2" fill="#2a2420" stroke="#5a4a30" strokeWidth="1.2" />
        <rect x="-3" y="0" width="6" height="8" rx="1" fill={OURO_CLARO} className="xalala-lanterna" />
        <circle cx="0" cy="4" r="12" fill={OURO} opacity="0.18" className="xalala-lanterna" />
      </g>
    </svg>
  );
}

export function Tempo({ tamanho = 80 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden>
      <ellipse cx="50" cy="88" rx="30" ry="4" fill="#000" opacity="0.3" />
      {/* Patas, cabeça, casco com textura discreta */}
      <ellipse cx="28" cy="78" rx="7" ry="5" fill="#3f5a4b" />
      <ellipse cx="72" cy="78" rx="7" ry="5" fill="#3f5a4b" />
      <path d="M78 60 Q96 58 92 70 Q90 76 80 74 Z" fill="#4f6d5c" />
      <circle cx="88" cy="64" r="2.2" fill="#171B21" />
      <path d="M16 72 Q50 30 84 72 Z" fill="#436657" />
      <path d="M22 70 Q50 40 78 70 Z" fill="#2f4a3d" opacity="0.6" />
      {[[50, 48], [36, 58], [64, 58], [50, 64]].map(([x, y], i) => (
        <path key={i} d={`M${x - 8} ${y} L${x} ${y - 7} L${x + 8} ${y} L${x} ${y + 7} Z`} fill="#56795f" stroke="#2f4a3d" strokeWidth="1" />
      ))}
      <path d="M16 72 Q50 82 84 72" stroke={OURO} strokeWidth="2" fill="none" />
      {/* Mochila e bússola */}
      <path d="M30 52 Q22 40 34 36 L42 44 Z" fill="#C18B61" />
      <circle cx="58" cy="78" r="6" fill="#1e2228" stroke={OURO} strokeWidth="1.5" />
      <path d="M58 74 L60 78 L58 82 L56 78 Z" fill={OURO_CLARO} />
    </svg>
  );
}

export function Vira({ tamanho = 80 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden>
      {/* Andorinha estilizada, traço limpo */}
      <path d="M20 54 Q44 40 62 48 L84 42 L70 54 Q60 62 46 60 Z" fill="#54768A" />
      <path d="M44 50 Q30 30 12 34 Q34 36 46 52 Z" fill="#3e5a6c" />
      <path d="M50 52 Q62 28 86 24 Q70 36 58 56 Z" fill="#54768A" />
      <path d="M62 28 L86 24 L78 32 Z" fill={OURO} />
      <path d="M46 60 L30 76 L40 64 L34 78 L46 62 Z" fill="#3e5a6c" />
      <circle cx="68" cy="47" r="2" fill="#171B21" />
      <path d="M84 42 L92 44 L84 46 Z" fill={OURO_CLARO} />
      <path d="M70 54 Q66 60 60 58" stroke="#fff" strokeWidth="1" opacity="0.3" fill="none" />
    </svg>
  );
}

export function Personagem({ id, tamanho }: { id: PersonagemXalala["id"]; tamanho?: number }) {
  if (id === "montinho") return <Montinho tamanho={tamanho} />;
  if (id === "pingo") return <Pingo tamanho={tamanho} />;
  if (id === "tempo") return <Tempo tamanho={tamanho} />;
  return <Vira tamanho={tamanho} />;
}
