// Linha mínima de tendência (sem eixos): o número ao lado carrega o valor.
export function Sparkline({ valores, largura = 96, altura = 28, className = "" }: { valores: number[]; largura?: number; altura?: number; className?: string }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const faixa = max - min || 1;
  const pad = 4;
  const pts = valores.map((v, i) => [pad + (i / (valores.length - 1)) * (largura - pad * 2), altura - pad - ((v - min) / faixa) * (altura - pad * 2)] as const);
  const linha = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [ux, uy] = pts.at(-1)!;
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} aria-hidden className={`shrink-0 overflow-visible ${className}`}>
      <path d={`${linha} L${ux.toFixed(1)},${altura} L${pts[0][0].toFixed(1)},${altura} Z`} fill="var(--color-accent)" fillOpacity="0.12" />
      <path d={linha} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ux} cy={uy} r="3.5" fill="var(--color-accent)" stroke="var(--color-card)" strokeWidth="2" />
    </svg>
  );
}
