// Anel de porcentagem (0–100) com o valor no centro. “—” quando não há dado.
export function AnelPercentual({ valor, tamanho = 56, espessura = 6, rotulo }: { valor: number | null; tamanho?: number; espessura?: number; rotulo: string }) {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const fr = valor == null ? 0 : Math.max(0, Math.min(1, valor / 100));
  const meio = tamanho / 2;
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} role="img" aria-label={`${rotulo}: ${valor == null ? "sem dados" : `${valor}%`}`} className="shrink-0">
      <circle cx={meio} cy={meio} r={r} fill="none" stroke="var(--color-border)" strokeWidth={espessura} />
      {fr > 0 ? <circle cx={meio} cy={meio} r={r} fill="none" stroke="var(--color-accent)" strokeWidth={espessura} strokeLinecap="round" strokeDasharray={`${c * fr} ${c}`} transform={`rotate(-90 ${meio} ${meio})`} /> : null}
      <text x={meio} y={meio + tamanho * 0.08} textAnchor="middle" fontSize={tamanho * 0.24} fontWeight="700" fill="currentColor">
        {valor == null ? "—" : `${valor}%`}
      </text>
    </svg>
  );
}
