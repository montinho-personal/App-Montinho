// Medalha da vitrine: conquistada = anel dourado cheio; não conquistada =
// anel cinza com o progresso real desenhado por cima.
type Props = { selo: string; conquistada: boolean; atual: number | null; alvo: number | null; tamanho?: number; nova?: boolean };

export function MedalhaIcone({ selo, conquistada, atual, alvo, tamanho = 76, nova = false }: Props) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const fr = !conquistada && alvo ? Math.max(0, Math.min(1, (atual ?? 0) / alvo)) : 0;
  const longo = selo.length > 3;
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
