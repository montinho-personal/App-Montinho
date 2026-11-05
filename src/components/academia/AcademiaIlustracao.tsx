// Academia da Tribo — a obra desenhada em isométrico (SVG puro, leve no celular).
// É SEMPRE o mesmo prédio: cada etapa acrescenta o que a obra de verdade ganha
// (terreno → fundação → estrutura → paredes/cobertura → fachada → equipamentos →
// acabamentos → inauguração). Animações só em CSS, desligadas com
// “reduzir movimento” e quando animar=false (cards pequenos).
import { useId } from "react";

const C = Math.cos(Math.PI / 6);
const S = 0.5;
const U = 13; // px por metro do desenho

type Pt = [number, number];
const P = (x: number, y: number, z: number): Pt => [(x - y) * C * U, (x + y) * S * U - z * U];
const pts = (...p: Pt[]) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

type Cores = { topo: string; esq: string; dir: string };
function Caixa({ x, y, z, w, d, h, c, op = 1 }: { x: number; y: number; z: number; w: number; d: number; h: number; c: Cores; op?: number }) {
  return (
    <g opacity={op}>
      <polygon points={pts(P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h))} fill={c.esq} />
      <polygon points={pts(P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h))} fill={c.dir} />
      <polygon points={pts(P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h))} fill={c.topo} />
    </g>
  );
}

/** Grupo desenhado “na parede da frente” (plano y = yf), em px locais: u para a direita, v para baixo (v negativo = para cima). */
const naFrente = (x0: number, yf: number) => {
  const [a, b] = P(x0, yf, 0);
  return `matrix(${C},${S},0,1,${a.toFixed(1)},${b.toFixed(1)})`;
};
/** Na parede da direita (plano x = xd), lendo da frente para o fundo. */
const naDireita = (xd: number, yFrente: number) => {
  const [a, b] = P(xd, yFrente, 0);
  return `matrix(${C},${-S},0,1,${a.toFixed(1)},${b.toFixed(1)})`;
};

function Pessoa({ x, y, z = 0, cor = "#f59e0b", classe }: { x: number; y: number; z?: number; cor?: string; classe?: string }) {
  const [a, b] = P(x, y, z);
  return (
    <g className={classe} transform={`translate(${a.toFixed(1)},${b.toFixed(1)})`}>
      <rect x={-2.2} y={-9} width={4.4} height={7} rx={1.6} fill="#2563eb" />
      <circle cx={0} cy={-11.2} r={2.4} fill="#f2c7a5" />
      <path d="M-2.8 -12.2 a2.8 2.8 0 0 1 5.6 0 z" fill={cor} />
      <rect x={-1.6} y={-2.2} width={1.2} height={2.4} fill="#1f2937" />
      <rect x={0.4} y={-2.2} width={1.2} height={2.4} fill="#1f2937" />
    </g>
  );
}

function Arvore({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const [a, b] = P(x, y, 0);
  return (
    <g transform={`translate(${a.toFixed(1)},${b.toFixed(1)}) scale(${s})`}>
      <rect x={-1.3} y={-12} width={2.6} height={12} fill="#7c5a3a" />
      <circle cx={0} cy={-17} r={8} fill="#4d9a5b" />
      <circle cx={-4} cy={-13.5} r={5.5} fill="#5fb06c" />
      <circle cx={4} cy={-14} r={5} fill="#3f8a4d" />
    </g>
  );
}

export type IlustracaoProps = {
  /** 0 = terreno … 7 = inaugurada. */
  etapa: number;
  /** Andares do prédio (as academias maiores têm mais). */
  pavimentos?: number;
  animar?: boolean;
  className?: string;
  titulo?: string;
};

export function AcademiaIlustracao({ etapa, pavimentos = 1, animar = true, className, titulo }: IlustracaoProps) {
  const id = useId().replace(/:/g, "");
  const e = Math.max(0, Math.min(7, Math.round(etapa)));
  const nAnd = Math.max(1, Math.min(3, pavimentos));
  // Terreno 18 × 13; prédio 10 × 6 no fundo, quintal na frente.
  const BX = 4, BY = 1.5, W = 10, D = 6;
  const HA = 3.4; // altura de cada andar
  const H = HA * nAnd;
  const YF = BY + D; // plano da fachada
  const acabado = e >= 6;
  const parede: Cores = e >= 4 ? { topo: "#3b3b3b", esq: "#262626", dir: "#1c1c1c" } : { topo: "#d6d0c4", esq: "#c9c2b4", dir: "#b3ab9b" };
  const concreto: Cores = { topo: "#bcb8b0", esq: "#a19c92", dir: "#8c877d" };
  const pilar: Cores = { topo: "#9d9890", esq: "#8a857b", dir: "#77726a" };
  const telhado: Cores = e >= 4 ? { topo: "#4a4a4a", esq: "#333", dir: "#2a2a2a" } : { topo: "#9a958b", esq: "#86817a", dir: "#77726a" };
  const vidro = `url(#vidro-${id})`;
  const fx = (u: number) => u * U; // metros → px no plano da parede
  const anima = animar ? "" : " sem-animacao";
  const larguraVB = 372, alturaVB = 300 + (nAnd - 1) * 44;
  const topoVB = -88 - (nAnd - 1) * 44;
  return (
    <svg viewBox={`-158 ${topoVB} ${larguraVB} ${alturaVB}`} className={`${className ?? ""}${anima}`} role="img" aria-label={titulo ?? "Ilustração da academia em construção"}>
      <defs>
        <linearGradient id={`ceu-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={e === 7 ? "#fde7b0" : "#cfe4f5"} />
          <stop offset="1" stopColor={e === 7 ? "#fff6e0" : "#eef5fb"} />
        </linearGradient>
        <linearGradient id={`vidro-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={acabado ? "#ffe9a8" : "#a8cfe0"} stopOpacity={acabado ? 0.95 : 0.85} />
          <stop offset="1" stopColor={acabado ? "#e7b84f" : "#5f93ad"} stopOpacity={0.9} />
        </linearGradient>
        <radialGradient id={`luz-${id}`}>
          <stop offset="0" stopColor="#ffe59a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe59a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <style>{`
        .sem-animacao * { animation: none !important; }
        @media (prefers-reduced-motion: reduce) { svg * { animation: none !important; } }
        @keyframes guindaste { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(5deg); } }
        @keyframes balanca { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
        @keyframes pisca { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        @keyframes cai { from { transform: translateY(-60px); opacity: 0; } 15% { opacity: 1; } to { transform: translateY(120px); opacity: 0; } }
        @keyframes sobe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .gd-braco { transform-box: fill-box; transform-origin: 0% 50%; animation: guindaste 7s ease-in-out infinite; }
        .gd-pessoa { animation: balanca 1.8s ease-in-out infinite; }
        .gd-luz { animation: pisca 3s ease-in-out infinite; }
        .gd-confete { animation: cai 3.4s linear infinite; }
        .gd-balao { animation: sobe 3s ease-in-out infinite; }
      `}</style>
      <rect x={-158} y={topoVB} width={larguraVB} height={alturaVB} fill={`url(#ceu-${id})`} />
      {/* nuvens */}
      <g fill="#fff" opacity="0.8">
        <ellipse cx={-110} cy={topoVB + 26} rx={22} ry={7} />
        <ellipse cx={-96} cy={topoVB + 21} rx={13} ry={7} />
        <ellipse cx={150} cy={topoVB + 40} rx={18} ry={6} />
      </g>

      {/* Terreno */}
      <polygon points={pts(P(0, 0, 0), P(18, 0, 0), P(18, 13, 0), P(0, 13, 0))} fill={e >= 6 ? "#7cc47f" : "#9ccf86"} />
      <polygon points={pts(P(0, 13, 0), P(18, 13, 0), P(18, 13, -1), P(0, 13, -1))} fill="#7a5c3f" />
      <polygon points={pts(P(18, 0, 0), P(18, 13, 0), P(18, 13, -1), P(18, 0, -1))} fill="#5f4630" />
      {e < 6 ? <polygon points={pts(P(BX - 0.8, BY - 0.5, 0.01), P(BX + W + 0.8, BY - 0.5, 0.01), P(BX + W + 0.8, YF + 1.2, 0.01), P(BX - 0.8, YF + 1.2, 0.01))} fill="#c8a777" /> : null}
      {/* calçada e entrada */}
      {e >= 6 ? (
        <>
          <polygon points={pts(P(0, 11, 0.02), P(18, 11, 0.02), P(18, 13, 0.02), P(0, 13, 0.02))} fill="#d9d4c9" />
          <polygon points={pts(P(BX + 3.8, YF, 0.03), P(BX + 6.2, YF, 0.03), P(BX + 6.2, 11, 0.03), P(BX + 3.8, 11, 0.03))} fill="#e8e2d4" />
          {[0, 1, 2].map((i) => (
            <polygon key={i} points={pts(P(BX + W + 1 + 0, 3 + i * 2.6, 0.03), P(BX + W + 3.5, 3 + i * 2.6, 0.03), P(BX + W + 3.5, 3.15 + i * 2.6, 0.03), P(BX + W + 1, 3.15 + i * 2.6, 0.03))} fill="#fff" />
          ))}
        </>
      ) : null}

      {/* Árvore do fundo (atrás do prédio, desenhada antes) */}
      {e >= 6 ? <Arvore x={1.6} y={2.2} /> : null}

      {/* Etapa 0: estacas, placa e árvore */}
      {e === 0 ? (
        <>
          {[[BX - 0.8, BY - 0.5], [BX + W + 0.8, BY - 0.5], [BX + W + 0.8, YF + 1.2], [BX - 0.8, YF + 1.2]].map(([x, y], i) => (
            <Caixa key={i} x={x - 0.1} y={y - 0.1} z={0} w={0.2} d={0.2} h={0.9} c={{ topo: "#f4a261", esq: "#e76f51", dir: "#c65a3f" }} />
          ))}
          <g transform={naFrente(BX + 3, YF + 3)}>
            <rect x={fx(0.4)} y={-fx(2.4)} width={3} height={fx(2.4)} fill="#7c5a3a" />
            <rect x={fx(3.2)} y={-fx(2.4)} width={3} height={fx(2.4)} fill="#7c5a3a" />
            <rect x={0} y={-fx(3.6)} width={fx(4)} height={fx(1.5)} rx={2} fill="#111" />
            <text x={fx(2)} y={-fx(3.0)} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="#ba9e50">EM BREVE</text>
            <text x={fx(2)} y={-fx(2.45)} textAnchor="middle" fontSize={6} fontWeight={700} fill="#fff">ACADEMIA DA TRIBO</text>
          </g>
        </>
      ) : null}

      {/* Etapa 1+: fundação */}
      {e >= 1 ? <Caixa x={BX} y={BY} z={0} w={W} d={D} h={0.45} c={concreto} /> : null}
      {e === 1
        ? Array.from({ length: 6 }, (_, i) => Array.from({ length: 3 }, (_, j) => <Caixa key={`${i}-${j}`} x={BX + 0.8 + i * 1.7} y={BY + 0.9 + j * 2} z={0.45} w={0.12} d={0.12} h={0.9} c={{ topo: "#8b5e34", esq: "#6d4a29", dir: "#5a3d22" }} />))
        : null}

      {/* Etapa 2+: pilares e vigas (atrás das paredes) */}
      {e >= 2 && e < 3
        ? (() => {
            const xs = [BX, BX + W / 2 - 0.2, BX + W - 0.4];
            const ys = [BY, BY + D - 0.4];
            return (
              <>
                {ys.map((y) => xs.map((x) => <Caixa key={`${x}-${y}`} x={x} y={y} z={0.45} w={0.4} d={0.4} h={H} c={pilar} />))}
                {ys.map((y) => <Caixa key={`v${y}`} x={BX} y={y} z={H + 0.05} w={W} d={0.4} h={0.45} c={pilar} />)}
                {xs.map((x) => <Caixa key={`t${x}`} x={x} y={BY} z={H + 0.05} w={0.4} d={D} h={0.45} c={pilar} />)}
              </>
            );
          })()
        : null}

      {/* Etapa 3+: paredes e cobertura */}
      {e >= 3 ? (
        <>
          <Caixa x={BX} y={BY} z={0.45} w={W} d={D} h={H} c={parede} />
          <Caixa x={BX - 0.25} y={BY - 0.25} z={H + 0.45} w={W + 0.5} d={D + 0.5} h={0.4} c={telhado} op={e === 3 ? 0.9 : 1} />
          {e === 3 ? <polygon points={pts(P(BX + 6, BY - 0.25, H + 0.86), P(BX + W + 0.25, BY - 0.25, H + 0.86), P(BX + W + 0.25, BY + 2.5, H + 0.86), P(BX + 6, BY + 2.5, H + 0.86))} fill="#cfc9bd" /> : null}
          {/* janelas laterais */}
          <g transform={naDireita(BX + W, YF)}>
            {Array.from({ length: nAnd }, (_, a) =>
              [0.8, 2.6, 4.4].map((u) => <rect key={`${a}-${u}`} x={fx(u)} y={-fx(0.45 + a * HA + 2.6)} width={fx(1.2)} height={fx(1.6)} fill={e >= 4 ? vidro : "#8d877c"} stroke={e >= 4 ? "#ba9e50" : "none"} strokeWidth={0.8} />),
            )}
          </g>
          {/* fachada */}
          <g transform={naFrente(BX, YF)}>
            {e >= 4 ? (
              <>
                {/* grande vitrine com o salão por dentro */}
                <rect x={fx(0.7)} y={-fx(0.45 + 2.7)} width={fx(3.6)} height={fx(2.4)} fill={vidro} stroke="#ba9e50" strokeWidth={1} />
                <rect x={fx(6.2)} y={-fx(0.45 + 2.7)} width={fx(3.1)} height={fx(2.4)} fill={vidro} stroke="#ba9e50" strokeWidth={1} />
                {e >= 5 ? (
                  <g fill="#1b1b1b" opacity={0.75}>
                    {/* rack, banco, halteres, esteira */}
                    <rect x={fx(1)} y={-fx(2.6)} width={2.2} height={fx(2)} />
                    <rect x={fx(1.9)} y={-fx(2.6)} width={2.2} height={fx(2)} />
                    <rect x={fx(0.9)} y={-fx(2.1)} width={fx(1.4)} height={1.6} />
                    <rect x={fx(2.6)} y={-fx(1.1)} width={fx(1.2)} height={3} />
                    {[0, 1, 2, 3].map((i) => <circle key={i} cx={fx(2.75 + i * 0.32)} cy={-fx(1.35)} r={1.6} />)}
                    <polygon points={`${fx(6.5)},${-fx(0.6)} ${fx(8.1)},${-fx(0.6)} ${fx(8.1)},${-fx(0.85)} ${fx(6.5)},${-fx(0.95)}`} />
                    <rect x={fx(7.9)} y={-fx(2)} width={1.6} height={fx(1.4)} />
                  </g>
                ) : null}
                {/* porta */}
                <rect x={fx(4.6)} y={-fx(0.45 + 2.3)} width={fx(1.3)} height={fx(2.3)} fill={e >= 6 ? "#ba9e50" : "#6b6b6b"} />
                <rect x={fx(5.2)} y={-fx(0.45 + 2.3)} width={0.8} height={fx(2.3)} fill="#111" opacity={0.5} />
                {/* letreiro */}
                <rect x={fx(1.2)} y={-fx(H + 0.45 - 0.15)} width={fx(7.6)} height={fx(0.75)} rx={1.5} fill="#0a0a0a" />
                <text x={fx(5)} y={-fx(H + 0.45 - 0.68)} textAnchor="middle" fontSize={8} fontWeight={900} letterSpacing={2} fill="#ba9e50" className={e >= 6 ? "gd-luz" : undefined}>
                  MONTINHO
                </text>
                {/* andares de cima */}
                {Array.from({ length: nAnd - 1 }, (_, a) => (
                  <rect key={a} x={fx(0.7)} y={-fx(0.45 + (a + 1) * HA + 2.5)} width={fx(8.6)} height={fx(1.6)} fill={vidro} stroke="#ba9e50" strokeWidth={0.8} />
                ))}
              </>
            ) : (
              <>
                {[0.8, 3.2, 6.6].map((u) => <rect key={u} x={fx(u)} y={-fx(0.45 + 2.6)} width={fx(2)} height={fx(1.7)} fill="#8d877c" />)}
                <rect x={fx(4.6)} y={-fx(0.45 + 2.3)} width={fx(1.3)} height={fx(2.3)} fill="#6d675d" />
              </>
            )}
          </g>
          {/* andaime na etapa das paredes */}
          {e === 3 ? (
            <g stroke="#b45309" strokeWidth={1.2}>
              {[0.5, 3, 5.5, 8].map((u) => {
                const a = P(BX + u, YF + 0.5, 0), b = P(BX + u, YF + 0.5, H + 0.4);
                return <line key={u} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
              })}
              {[1.2, 2.4].map((z) => {
                const a = P(BX + 0.5, YF + 0.5, z), b = P(BX + 8, YF + 0.5, z);
                return <line key={z} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
              })}
            </g>
          ) : null}
        </>
      ) : null}

      {/* Etapa 4: instalações (poste e fiação) */}
      {e >= 4 ? (
        (() => {
          const base = P(BX + W + 2, YF + 2.5, 0), topo = P(BX + W + 2, YF + 2.5, 4.5), casa = P(BX + W, YF - 1, H);
          return (
            <g>
              <line x1={base[0]} y1={base[1]} x2={topo[0]} y2={topo[1]} stroke="#4b5563" strokeWidth={2} />
              <path d={`M${topo[0]} ${topo[1]} Q ${(topo[0] + casa[0]) / 2} ${(topo[1] + casa[1]) / 2 + 10} ${casa[0]} ${casa[1]}`} stroke="#374151" strokeWidth={0.8} fill="none" />
              {e >= 6 ? <circle cx={topo[0]} cy={topo[1]} r={9} fill={`url(#luz-${id})`} className="gd-luz" /> : null}
            </g>
          );
        })()
      ) : null}

      {/* Etapa 5: caminhão com os equipamentos */}
      {e === 5 ? (
        <>
          <Caixa x={1} y={9} z={0.3} w={3.2} d={1.7} h={1.9} c={{ topo: "#f1f5f9", esq: "#e2e8f0", dir: "#cbd5e1" }} />
          <Caixa x={4.2} y={9.15} z={0.3} w={1.2} d={1.4} h={1.4} c={{ topo: "#ba9e50", esq: "#a68a3c", dir: "#8f762f" }} />
          <Caixa x={6.3} y={9.4} z={0} w={0.9} d={0.9} h={0.8} c={{ topo: "#d6a96b", esq: "#c28f4e", dir: "#a87a40" }} />
          <Caixa x={7.4} y={9.3} z={0} w={0.8} d={0.8} h={0.6} c={{ topo: "#d6a96b", esq: "#c28f4e", dir: "#a87a40" }} />
        </>
      ) : null}

      {/* Etapa 6+: acabamento — árvores, bancos e luzes */}
      {e >= 6 ? (
        <>
          <Arvore x={2} y={9.5} s={0.85} />
          <Arvore x={16.5} y={10} s={0.9} />
          {[BX + 1, BX + 8.6].map((x) => {
            const p = P(x, YF + 0.2, 2.9);
            return <circle key={x} cx={p[0]} cy={p[1]} r={7} fill={`url(#luz-${id})`} className="gd-luz" />;
          })}
        </>
      ) : (
        <Arvore x={1.5} y={11.5} s={0.8} />
      )}

      {/* Guindaste (estrutura → fachada) */}
      {e >= 2 && e <= 4
        ? (() => {
            const base = P(BX + W + 2.2, BY + 0.5, 0);
            const altura = (H + 6) * U;
            return (
              <g>
                <rect x={base[0] - 2.5} y={base[1] - altura} width={5} height={altura} fill="#f59e0b" />
                {Array.from({ length: Math.floor(altura / 10) }, (_, i) => (
                  <line key={i} x1={base[0] - 2.5} y1={base[1] - i * 10} x2={base[0] + 2.5} y2={base[1] - i * 10 - 10} stroke="#b45309" strokeWidth={0.8} />
                ))}
                <g className="gd-braco" style={{ transformOrigin: `${base[0]}px ${base[1] - altura}px` }}>
                  <rect x={base[0] - 70} y={base[1] - altura - 3} width={95} height={4} fill="#f59e0b" />
                  <line x1={base[0] - 55} y1={base[1] - altura + 1} x2={base[0] - 55} y2={base[1] - altura + 34} stroke="#374151" strokeWidth={0.8} />
                  <rect x={base[0] - 60} y={base[1] - altura + 34} width={10} height={6} fill="#6b7280" />
                  <rect x={base[0] + 14} y={base[1] - altura - 6} width={9} height={9} fill="#374151" />
                </g>
              </g>
            );
          })()
        : null}

      {/* Pessoas trabalhando (fundação → acabamento) */}
      {e >= 1 && e <= 6 ? (
        <>
          <Pessoa x={BX + 2} y={YF + 1.6} classe="gd-pessoa" />
          <Pessoa x={BX + 7.5} y={YF + 2.2} cor="#facc15" classe="gd-pessoa" />
          {e <= 3 ? <Pessoa x={BX + W + 0.9} y={BY + 3} cor="#fb923c" classe="gd-pessoa" /> : null}
        </>
      ) : null}
      {/* Betoneira na fundação */}
      {e === 1 ? (
        <g>
          <Caixa x={14.5} y={9} z={0} w={1.4} d={1} h={0.5} c={{ topo: "#64748b", esq: "#475569", dir: "#334155" }} />
          {(() => {
            const p = P(15.2, 9.5, 1.3);
            return <ellipse cx={p[0]} cy={p[1]} rx={9} ry={7} fill="#f97316" stroke="#c2410c" />;
          })()}
        </g>
      ) : null}

      {/* Etapa 7: inauguração */}
      {e === 7 ? (
        <>
          {(() => {
            const a = P(BX + 3.8, YF + 1.2, 1.1), b = P(BX + 6.2, YF + 1.2, 1.1);
            return (
              <>
                <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#dc2626" strokeWidth={2.4} />
                <circle cx={(a[0] + b[0]) / 2} cy={(a[1] + b[1]) / 2} r={3.5} fill="#dc2626" />
              </>
            );
          })()}
          {[
            [BX + 2.6, YF + 1.3, "#ba9e50"],
            [BX + 7.2, YF + 1.3, "#ef4444"],
            [BX + 8, YF + 1.6, "#3b82f6"],
          ].map(([x, y, cor], i) => {
            const p = P(x as number, y as number, 0);
            return (
              <g key={i} className="gd-balao" style={{ animationDelay: `${i * 0.6}s` }}>
                <line x1={p[0]} y1={p[1]} x2={p[0]} y2={p[1] - 34} stroke="#6b7280" strokeWidth={0.6} />
                <ellipse cx={p[0]} cy={p[1] - 40} rx={5.5} ry={7} fill={cor as string} />
              </g>
            );
          })}
          <Pessoa x={BX + 4.5} y={YF + 2.6} cor="#ba9e50" />
          <Pessoa x={BX + 5.6} y={YF + 2.8} cor="#ba9e50" />
          <Pessoa x={BX + 3.2} y={YF + 3.4} cor="#ef4444" />
          <Pessoa x={BX + 6.9} y={YF + 3.6} cor="#3b82f6" />
          {Array.from({ length: 22 }, (_, i) => (
            <rect
              key={i}
              className="gd-confete"
              x={-150 + ((i * 53) % 360)}
              y={topoVB + 10 + ((i * 29) % 50)}
              width={3}
              height={5}
              fill={["#ba9e50", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b"][i % 5]}
              style={{ animationDelay: `${(i % 7) * 0.45}s` }}
            />
          ))}
        </>
      ) : null}
    </svg>
  );
}
