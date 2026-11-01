// Gráfico das conquistas da turma no Celebrar (pedido do Montinho, 01/11/2026:
// “ver mensalmente, semanalmente, a cada 15 dias, quanto teve” — mais troféus =
// mais gente treinando com aderência). Conta pura, sempre no dia de Brasília.
import { dataLocal, inicioDaSemana, somarDias } from "@/lib/aderencia/calcular";

export type Agrupamento = "semana" | "quinzena" | "mes";
export type Barra = { inicio: string; rotulo: string; total: number; pessoas: number; atual: boolean };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const QUANTAS: Record<Agrupamento, number> = { semana: 12, quinzena: 12, mes: 12 };
export const NOME_AGRUPAMENTO: Record<Agrupamento, { aba: string; atual: string; anterior: string }> = {
  semana: { aba: "Semanal", atual: "esta semana", anterior: "a semana passada" },
  quinzena: { aba: "A cada 15 dias", atual: "esta quinzena", anterior: "a quinzena passada" },
  mes: { aba: "Mensal", atual: "este mês", anterior: "o mês passado" },
};

/** Começo do período (AAAA-MM-DD) em que o dia `d` cai. */
export function inicioDoPeriodo(d: string, a: Agrupamento): string {
  if (a === "semana") return inicioDaSemana(d);
  if (a === "mes") return `${d.slice(0, 8)}01`;
  return `${d.slice(0, 8)}${Number(d.slice(8, 10)) <= 15 ? "01" : "16"}`;
}

/** Começo do período anterior ao que começa em `inicio`. */
function anterior(inicio: string, a: Agrupamento): string {
  if (a === "semana") return somarDias(inicio, -7);
  const ano = Number(inicio.slice(0, 4));
  const mes = Number(inicio.slice(5, 7));
  const voltaMes = () => (mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, "0")}`);
  if (a === "mes") return `${voltaMes()}-01`;
  return inicio.endsWith("-16") ? `${inicio.slice(0, 8)}01` : `${voltaMes()}-16`;
}

export function rotuloDoPeriodo(inicio: string, a: Agrupamento): string {
  const dia = inicio.slice(8, 10);
  const mes = MESES[Number(inicio.slice(5, 7)) - 1];
  if (a === "mes") return `${mes}/${inicio.slice(2, 4)}`;
  if (a === "quinzena") return `${dia === "01" ? "1ª" : "2ª"} ${mes}`;
  return `${dia}/${inicio.slice(5, 7)}`;
}

/** Barras do mais antigo ao atual (o atual ainda está em andamento). */
export function barrasDeConquistas(itens: Array<{ em: string; alunoId: string }>, a: Agrupamento, hoje: string = dataLocal(new Date()), n = QUANTAS[a]): Barra[] {
  const inicios: string[] = [inicioDoPeriodo(hoje, a)];
  while (inicios.length < n) inicios.unshift(anterior(inicios[0], a));
  const mapa = new Map(inicios.map((i) => [i, { total: 0, pessoas: new Set<string>() }]));
  for (const it of itens) {
    const p = mapa.get(inicioDoPeriodo(dataLocal(it.em), a));
    if (!p) continue;
    p.total += 1;
    p.pessoas.add(it.alunoId);
  }
  return inicios.map((i, k) => ({ inicio: i, rotulo: rotuloDoPeriodo(i, a), total: mapa.get(i)!.total, pessoas: mapa.get(i)!.pessoas.size, atual: k === inicios.length - 1 }));
}

/** Frase neutra comparando o último período FECHADO com o anterior. */
export function fraseDaTendencia(barras: Barra[], a: Agrupamento): string | null {
  const fechados = barras.filter((b) => !b.atual);
  if (fechados.length < 2) return null;
  const [ant, ult] = fechados.slice(-2);
  const nome = a === "semana" ? "Na semana passada" : a === "quinzena" ? "Na última quinzena fechada" : "No mês passado";
  const base = a === "semana" ? "a semana anterior" : a === "quinzena" ? "a quinzena anterior" : "o mês anterior";
  if (ant.total === 0) return ult.total ? `${nome}: ${ult.total} conquistas (${base} não teve nenhuma).` : null;
  const pct = Math.round(((ult.total - ant.total) / ant.total) * 100);
  if (pct === 0) return `${nome}: ${ult.total} conquistas, igual ${base}.`;
  return `${nome}: ${ult.total} conquistas, ${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% em relação ${base === "o mês anterior" ? "ao mês anterior" : `à ${base.slice(2)}`}.`;
}
