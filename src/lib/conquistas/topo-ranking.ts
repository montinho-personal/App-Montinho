// ============================================================================
// Topo do Ranking (pedido do Montinho, 01/11/2026). O BANCO (0138) anota o 1º
// lugar do ranking oficial de cada dia de Brasília (ranking_topo; a cada 5 min
// pelo cron e ao abrir o Ranking) e concede os troféus.
//  • Chegar ao 1º lugar NÃO dá troféu: só avisa o personal — aparece no
//    Celebrar para ele mandar os parabéns (`chegadasAoTopo`).
//  • Segurar o topo dá troféu: Topo Firme (5 dias seguidos), Topo Inabalável
//    (10) e Lenda do Topo (30, lendário). Cada um vale uma vez e fica FORA da
//    contagem do ranking (senão quem lidera ganha ponto por liderar).
// Aqui ficam as mesmas regras em código puro (testes, demo e telas).
// ============================================================================
export type CodigoTopo = "topo_5_dias" | "topo_10_dias" | "topo_30_dias";
export const CODIGOS_TOPO: CodigoTopo[] = ["topo_5_dias", "topo_10_dias", "topo_30_dias"];
export const MARCOS_TOPO: Array<{ dias: number; codigo: CodigoTopo; titulo: string }> = [
  { dias: 5, codigo: "topo_5_dias", titulo: "Topo Firme" },
  { dias: 10, codigo: "topo_10_dias", titulo: "Topo Inabalável" },
  { dias: 30, codigo: "topo_30_dias", titulo: "Lenda do Topo" },
];

/** Um dia (AAAA-MM-DD, Brasília) e quem terminou em 1º. */
export type DiaTopo = { dia: string; alunoId: string };
/** Uma passagem pelo topo: quem, desde quando e quantos dias seguidos (até o último dia anotado). */
export type ChegadaTopo = { alunoId: string; desde: string; dias: number };

const DIA = 86_400_000;
const mais = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DIA).toISOString().slice(0, 10);

/** Cada vez que alguém chegou ao 1º lugar (um dia faltando ou outra pessoa no meio = nova chegada). */
export function chegadasAoTopo(dias: DiaTopo[]): ChegadaTopo[] {
  const ord = [...dias].sort((a, b) => (a.dia < b.dia ? -1 : 1));
  const out: ChegadaTopo[] = [];
  for (let i = 0; i < ord.length; i++) {
    const d = ord[i];
    const atual = out[out.length - 1];
    const seguido = i > 0 && ord[i - 1].alunoId === d.alunoId && mais(ord[i - 1].dia, 1) === d.dia;
    if (seguido && atual) atual.dias++;
    else out.push({ alunoId: d.alunoId, desde: d.dia, dias: 1 });
  }
  return out;
}

/** Dias seguidos no topo terminando em `hoje` (0 se hoje não é o líder) e o 1º dia da sequência. */
export function sequenciaNoTopo(dias: DiaTopo[], alunoId: string, hoje: string): { dias: number; desde: string | null } {
  const porDia = new Map(dias.map((d) => [d.dia, d.alunoId]));
  let n = 0;
  while (porDia.get(mais(hoje, -n)) === alunoId) n++;
  return { dias: n, desde: n ? mais(hoje, -(n - 1)) : null };
}

/** Os troféus que essa história de líderes daria a uma pessoa (mesma conta do banco). */
export function trofeusDoTopo(dias: DiaTopo[], alunoId: string): Array<{ codigo: CodigoTopo; dia: string }> {
  const out: Array<{ codigo: CodigoTopo; dia: string }> = [];
  for (const c of chegadasAoTopo(dias).filter((x) => x.alunoId === alunoId))
    for (const m of MARCOS_TOPO) if (c.dias >= m.dias && !out.some((t) => t.codigo === m.codigo)) out.push({ codigo: m.codigo, dia: mais(c.desde, m.dias - 1) });
  return out;
}

/** O próximo troféu de quem está no topo e quantos dias faltam. */
export function proximoDoTopo(diasSeguidos: number, ganhos: ReadonlySet<string>): { titulo: string; faltam: number } | null {
  const m = MARCOS_TOPO.find((x) => !ganhos.has(x.codigo) && x.dias > diasSeguidos);
  return m ? { titulo: m.titulo, faltam: m.dias - diasSeguidos } : null;
}
