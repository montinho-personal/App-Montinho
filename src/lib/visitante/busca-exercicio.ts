// Montador do visitante: filtros por grupo e busca na biblioteca.
// Todo grupo da biblioteca precisa cair em algum filtro (busca-exercicio.test.ts),
// senão o exercício só aparece digitando o nome: foi o que escondeu a cadeira adutora.
import { normalizarNome } from "@/lib/grupos";

export const FILTROS_MONTADOR: Array<{ valor: string; rotulo: string; grupos: string[] }> = [
  { valor: "peito", rotulo: "Peito", grupos: ["peito"] },
  { valor: "costas", rotulo: "Costas", grupos: ["costas", "lombar"] },
  { valor: "ombro", rotulo: "Ombros", grupos: ["ombros", "ombro_anterior", "ombro_lateral", "ombro_posterior", "trapezio"] },
  { valor: "biceps", rotulo: "Bíceps", grupos: ["biceps", "antebraco"] },
  { valor: "triceps", rotulo: "Tríceps", grupos: ["triceps"] },
  { valor: "quadriceps", rotulo: "Quadríceps", grupos: ["quadriceps"] },
  { valor: "posteriores", rotulo: "Posteriores", grupos: ["posteriores"] },
  { valor: "gluteo", rotulo: "Glúteos", grupos: ["gluteo", "abdutores"] },
  { valor: "adutores", rotulo: "Adutores", grupos: ["adutores"] },
  { valor: "panturrilha", rotulo: "Panturrilha", grupos: ["panturrilha"] },
  { valor: "abdomen", rotulo: "Abdômen e core", grupos: ["abdomen", "core"] },
  { valor: "outros", rotulo: "Outros", grupos: ["cardio", "full_body", "pernas", "nao_classificado", "outro"] },
];

type Item = { nome: string; grupo: string; sinonimos: string[] };

/** Filtra pelo grupo e pela busca: cada palavra digitada precisa estar no nome ou num sinônimo. */
export function buscarExercicios<T extends Item>(itens: T[], busca: string, filtro: string | null): T[] {
  const grupos = filtro ? FILTROS_MONTADOR.find((f) => f.valor === filtro)?.grupos ?? [] : null;
  const palavras = normalizarNome(busca).split(" ").filter(Boolean);
  return itens.filter((i) => {
    if (grupos && !grupos.includes(i.grupo)) return false;
    if (!palavras.length) return true;
    const textos = [i.nome, ...i.sinonimos].map(normalizarNome);
    return palavras.every((p) => textos.some((t) => t.includes(p))) || textos.some((t) => t.includes(palavras.join(" ")));
  });
}
