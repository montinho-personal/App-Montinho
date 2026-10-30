// Busca e filtros do montador do visitante (/aluno/meus-treinos).
// Regras: todo exercício da biblioteca precisa ser alcançável por um botão de
// músculo ou pela busca; sem limite de resultados (a lista rola).
// Busca sem acento, por palavras, no nome, nos sinônimos e no nome do músculo,
// e tolera plural/variação no fim da palavra (“adutores” acha “cadeira adutora”).

import { GRUPO_LABEL, normalizarNome } from "@/lib/grupos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export type FiltroMusculo = { valor: string; rotulo: string; grupos: GrupoMuscular[] };

export const FILTROS_VISITANTE: FiltroMusculo[] = [
  { valor: "peito", rotulo: "Peito", grupos: ["peito"] },
  { valor: "costas", rotulo: "Costas", grupos: ["costas"] },
  { valor: "ombros", rotulo: "Ombros", grupos: ["ombros", "ombro_anterior", "ombro_lateral", "ombro_posterior"] },
  { valor: "trapezio", rotulo: "Trapézio", grupos: ["trapezio"] },
  { valor: "biceps", rotulo: "Bíceps", grupos: ["biceps"] },
  { valor: "triceps", rotulo: "Tríceps", grupos: ["triceps"] },
  { valor: "antebraco", rotulo: "Antebraço", grupos: ["antebraco"] },
  { valor: "quadriceps", rotulo: "Quadríceps", grupos: ["quadriceps", "pernas"] },
  { valor: "posteriores", rotulo: "Posteriores", grupos: ["posteriores"] },
  { valor: "gluteo", rotulo: "Glúteos", grupos: ["gluteo", "abdutores"] },
  { valor: "adutores", rotulo: "Adutores", grupos: ["adutores"] },
  { valor: "panturrilha", rotulo: "Panturrilha", grupos: ["panturrilha"] },
  { valor: "abdomen", rotulo: "Abdômen", grupos: ["abdomen", "abdomen_supra", "abdomen_infra"] },
  { valor: "core", rotulo: "Core", grupos: ["core"] },
  { valor: "lombar", rotulo: "Lombar", grupos: ["lombar"] },
  { valor: "outros", rotulo: "Outros", grupos: ["cardio", "full_body", "nao_classificado", "outro"] },
];

type Item = { nome: string; grupo: GrupoMuscular; sinonimos: string[] };

/** Só os botões que têm exercício (não mostra botão vazio). */
export function filtrosComItens<T extends Item>(itens: T[]): FiltroMusculo[] {
  const tem = new Set(itens.map((i) => i.grupo));
  return FILTROS_VISITANTE.filter((f) => f.grupos.some((g) => tem.has(g)));
}

const raiz = (p: string) => (p.length >= 5 ? p.slice(0, p.length - 2) : p);

export function filtrarExercicios<T extends Item>(itens: T[], busca: string, filtro: string | null): T[] {
  const f = filtro ? FILTROS_VISITANTE.find((x) => x.valor === filtro) : null;
  const palavras = normalizarNome(busca).split(" ").filter(Boolean);
  return itens.filter((i) => {
    if (f && !f.grupos.includes(i.grupo)) return false;
    if (!palavras.length) return true;
    const texto = normalizarNome([i.nome, ...i.sinonimos, GRUPO_LABEL[i.grupo] ?? ""].join(" | "));
    return palavras.every((p) => texto.includes(p) || texto.includes(raiz(p)));
  });
}
