// ============================================================================
// Topo do Ranking (pedido do Montinho, 01/11/2026). Quem gera os troféus é o
// BANCO (0138: registrar_topo_ranking*, a cada 5 min pelo cron e ao abrir o
// Ranking), olhando o 1º lugar do ranking oficial de cada dia de Brasília.
// Aqui ficam as mesmas regras em código puro (testes, demo e telas):
//  • Topo do Ranking: chegou ao 1º lugar. Repete a cada vez que volta ao topo
//    (referência = o dia em que a sequência começou) → aparece no Celebrar.
//  • Topo Firme (5 dias seguidos), Topo Inabalável (10) e Lenda do Topo (30,
//    lendário): seguraram o 1º lugar. Cada um vale uma vez.
// Os 4 ficam FORA da contagem do ranking (senão quem lidera ganha troféu por
// liderar e ninguém mais alcança).
// ============================================================================
export type CodigoTopo = "topo_ranking" | "topo_5_dias" | "topo_10_dias" | "topo_30_dias";
export const CODIGOS_TOPO: CodigoTopo[] = ["topo_ranking", "topo_5_dias", "topo_10_dias", "topo_30_dias"];
export const MARCOS_TOPO: Array<{ dias: number; codigo: CodigoTopo; titulo: string }> = [
  { dias: 5, codigo: "topo_5_dias", titulo: "Topo Firme" },
  { dias: 10, codigo: "topo_10_dias", titulo: "Topo Inabalável" },
  { dias: 30, codigo: "topo_30_dias", titulo: "Lenda do Topo" },
];

/** Um dia (AAAA-MM-DD, Brasília) e quem terminou em 1º. */
export type DiaTopo = { dia: string; alunoId: string };

const menosUm = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Dias seguidos no topo terminando em `hoje` (0 se hoje não é o líder) e o 1º dia da sequência. */
export function sequenciaNoTopo(dias: DiaTopo[], alunoId: string, hoje: string): { dias: number; desde: string | null } {
  const porDia = new Map(dias.map((d) => [d.dia, d.alunoId]));
  let n = 0;
  let d = hoje;
  while (porDia.get(d) === alunoId) {
    n++;
    d = menosUm(d);
  }
  return { dias: n, desde: n ? (n === 1 ? hoje : new Date(Date.parse(`${hoje}T12:00:00Z`) - (n - 1) * 86_400_000).toISOString().slice(0, 10)) : null };
}

/** Os troféus que essa história de líderes daria a uma pessoa (mesma conta do banco). */
export function trofeusDoTopo(dias: DiaTopo[], alunoId: string): Array<{ codigo: CodigoTopo; referencia: string; dia: string }> {
  const ord = [...dias].sort((a, b) => (a.dia < b.dia ? -1 : 1));
  const out: Array<{ codigo: CodigoTopo; referencia: string; dia: string }> = [];
  let inicio: string | null = null;
  let n = 0;
  let anterior: string | null = null;
  for (const d of ord) {
    const seguido = anterior !== null && menosUm(d.dia) === anterior;
    if (d.alunoId !== alunoId) {
      inicio = null;
      n = 0;
    } else {
      if (!inicio || !seguido) {
        inicio = d.dia;
        n = 0;
        out.push({ codigo: "topo_ranking", referencia: d.dia, dia: d.dia });
      }
      n++;
      for (const m of MARCOS_TOPO) if (n === m.dias && !out.some((t) => t.codigo === m.codigo)) out.push({ codigo: m.codigo, referencia: "1", dia: d.dia });
    }
    anterior = d.dia;
  }
  return out;
}

/** Frase do quanto falta para o próximo troféu de quem está no topo. */
export function proximoDoTopo(diasSeguidos: number, ganhos: ReadonlySet<string>): { titulo: string; faltam: number } | null {
  const m = MARCOS_TOPO.find((x) => !ganhos.has(x.codigo) && x.dias > diasSeguidos);
  return m ? { titulo: m.titulo, faltam: m.dias - diasSeguidos } : null;
}
