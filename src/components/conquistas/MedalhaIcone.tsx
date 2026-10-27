// Medalha da vitrine: conquistada = anel dourado cheio; não conquistada =
// anel cinza com o progresso real desenhado por cima.
// Lendária (ex.: Guerreiro das 12 semanas): anel de fogo, louros, coroa e um
// anel de brilho girando (só com movimento permitido).
type Props = { selo: string; conquistada: boolean; atual: number | null; alvo: number | null; tamanho?: number; nova?: boolean; lendaria?: boolean };

// Louros: folhas ao longo de um arco de cada lado (posições fixas).
const FOLHAS = [200, 182, 164, 146, 128].map((g) => (g * Math.PI) / 180);

function Louros({ cor }: { cor: string }) {
  return (
    <g fill={cor}>
      {FOLHAS.flatMap((a, k) => {
        const r = 30;
        const x = 40 + r * Math.cos(a);
        const y = 44 + r * Math.sin(a);
        const rot = (a * 180) / Math.PI + 90;
        return [
          <ellipse key={`e${k}`} cx={x} cy={y} rx="2.4" ry="5" transform={`rotate(${rot - 25} ${x} ${y})`} />,
          <ellipse key={`d${k}`} cx={80 - x} cy={y} rx="2.4" ry="5" transform={`rotate(${-(rot - 25)} ${80 - x} ${y})`} />,
        ];
      })}
    </g>
  );
}

export function MedalhaIcone({ selo, conquistada, atual, alvo, tamanho = 76, nova = false, lendaria = false }: Props) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const fr = !conquistada && alvo ? Math.max(0, Math.min(1, (atual ?? 0) / alvo)) : 0;
  const longo = selo.length > 3;
  if (lendaria) {
    return (
      <svg viewBox="0 0 80 80" width={tamanho} height={tamanho} aria-hidden className={nova ? "motion-safe:animate-[pulse_2s_ease-in-out_2]" : undefined}>
        <defs>
          <linearGradient id="medalha-fogo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9a8" />
            <stop offset="0.45" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#b91c1c" />
          </linearGradient>
          <radialGradient id="medalha-fogo-fundo" cx="0.5" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#3a1d08" />
            <stop offset="1" stopColor="#140a04" />
          </radialGradient>
        </defs>
        {conquistada ? (
          <>
            <circle cx="40" cy="40" r="39" fill="#f59e0b" opacity="0.18" />
            <circle cx="40" cy="40" r={r} fill="url(#medalha-fogo-fundo)" stroke="url(#medalha-fogo)" strokeWidth="5" />
            <circle cx="40" cy="40" r={r - 6} fill="none" stroke="#ffe9a8" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="3 5" className="origin-center motion-safe:animate-[spin_9s_linear_infinite]" style={{ transformBox: "fill-box" }} />
            <Louros cor="#f5c451" />
            <path d="M31 17 L34 11 L37 15 L40 9 L43 15 L46 11 L49 17 Z" fill="#ffe9a8" stroke="#b45309" strokeWidth="0.6" />
          </>
        ) : (
          <>
            <circle cx="40" cy="40" r={r} fill="#141414" stroke="#2e2e2e" strokeWidth="5" />
            {fr > 0 ? <circle cx="40" cy="40" r={r} fill="none" stroke="#b7791f" strokeOpacity="0.8" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${fr * c} ${c}`} transform="rotate(-90 40 40)" /> : null}
            <Louros cor="#3a3a3a" />
            <path d="M31 17 L34 11 L37 15 L40 9 L43 15 L46 11 L49 17 Z" fill="#3a3a3a" />
          </>
        )}
        <text x="40" y="47" textAnchor="middle" fontWeight="900" fontSize={longo ? 14 : 21} fill={conquistada ? "#fff4d6" : "#8f8f8f"} fontFamily="inherit">
          {selo}
        </text>
        <text x="40" y="57" textAnchor="middle" fontWeight="800" fontSize="5.5" letterSpacing="0.8" fill={conquistada ? "#f5c451" : "#6b6b6b"} fontFamily="inherit">
          {/* Guerreiro (selo “12”) = semanas; Lenda do Fôlego (selo “250”) = cardios. */}
          {selo === "250" ? "CARDIOS" : "SEMANAS"}
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" width={tamanho} height={tamanho} aria-hidden className={nova ? "motion-safe:animate-[pulse_2s_ease-in-out_2]" : undefined}>
      <defs>
        <linearGradient id="medalha-ouro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3cd8a" />
          <stop offset="0.5" stopColor="#ba9e50" />
          <stop offset="1" stopColor="#8a7232" />
        </linearGradient>
      </defs>
      {conquistada ? (
        <>
          <circle cx="40" cy="40" r={r} fill="#1c1810" stroke="url(#medalha-ouro)" strokeWidth="5" />
          <circle cx="40" cy="40" r={r - 7} fill="none" stroke="#ba9e50" strokeOpacity="0.35" strokeWidth="1" />
        </>
      ) : (
        <>
          <circle cx="40" cy="40" r={r} fill="#141414" stroke="#2e2e2e" strokeWidth="5" />
          {fr > 0 ? <circle cx="40" cy="40" r={r} fill="none" stroke="#8f8f8f" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${fr * c} ${c}`} transform="rotate(-90 40 40)" /> : null}
        </>
      )}
      <text x="40" y={longo ? 44 : 46} textAnchor="middle" fontWeight="800" fontSize={longo ? 13 : 19} fill={conquistada ? "#f3e6bd" : "#8f8f8f"} fontFamily="inherit">
        {selo}
      </text>
    </svg>
  );
}
