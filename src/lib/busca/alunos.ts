// ============================================================================
// Busca do personal (lupa do menu) — pura, sem rede, instantânea.
//
//  • Nome: cada palavra digitada casa com o começo de uma palavra do nome,
//    sem acento e em qualquer ordem (“nat”, “nascimento”, “nat nasc”).
//  • Estrutura do treino: palavras do programa (nome, divisão, objetivo),
//    dos treinos (nome) e dos exercícios (nome e técnica: “pirâmide”,
//    “bi-set”…). Mostra o motivo (“Treino B: Remada cavalinho”).
//  • Parecidos: alunos cujo treino ativo tem os mesmos exercícios
//    (semelhança pelos exercícios em comum).
// ============================================================================

import { normalizarNome } from "@/lib/grupos";

export type ExercicioIndice = { nome: string; tecnica: string | null };
export type TreinoIndice = { letra: string; nome: string; exercicios: ExercicioIndice[] };
export type AlunoIndice = {
  id: string;
  nome: string;
  status: string;
  modalidade: "consultoria" | "visitante";
  programa: { nome: string | null; split: string | null; objetivo: string | null } | null;
  treinos: TreinoIndice[];
};

export type ResultadoBusca = { aluno: AlunoIndice; tipo: "nome" | "estrutura"; motivos: string[]; pontos: number };

const TECNICA_TEXTO: Record<string, string> = {
  piramide: "pirâmide",
  piramide_decrescente: "pirâmide decrescente",
  biset: "bi-set biset",
  triset: "tri-set triset",
  superset: "super-set superset",
  dropset: "drop-set dropset",
  rest_pause: "rest-pause",
  myo_reps: "myo-reps",
  cluster: "cluster",
  isometria: "isometria",
  tres_sete: "3/7",
  super_slow: "super slow",
  negativo: "negativo",
  pre_exaustao: "pré-exaustão",
  combinado: "combinado",
  unilateral: "unilateral",
};

/** Texto em palavras comparáveis: minúsculas, sem acento, sem pontuação. */
export function palavras(s: string | null | undefined): string[] {
  return normalizarNome(s ?? "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

const casaTodas = (tokens: string[], alvo: string[]) => tokens.every((t) => alvo.some((w) => w.startsWith(t)));

export function buscarAlunos(alunos: AlunoIndice[], consulta: string): ResultadoBusca[] {
  const tokens = palavras(consulta);
  if (!tokens.length) return [];
  const out: ResultadoBusca[] = [];
  for (const a of alunos) {
    const nome = palavras(a.nome);
    if (casaTodas(tokens, nome)) {
      // Começo do primeiro nome vale mais (“nat” → Natália antes de “Renata”).
      const pontos = 100 + (nome[0]?.startsWith(tokens[0]) ? 10 : 0);
      out.push({ aluno: a, tipo: "nome", motivos: [], pontos });
      continue;
    }
    const motivos: string[] = [];
    const prog = a.programa;
    const progPalavras = palavras([prog?.nome, prog?.split, prog?.objetivo].filter(Boolean).join(" "));
    if (prog && casaTodas(tokens, progPalavras)) motivos.push(`Programa: ${[prog.nome, prog.split].filter(Boolean).join(" · ")}`);
    for (const t of a.treinos) {
      if (casaTodas(tokens, palavras(t.nome))) motivos.push(`Treino ${t.letra}: ${t.nome}`);
      for (const e of t.exercicios) {
        const alvo = palavras(`${e.nome} ${e.tecnica ? (TECNICA_TEXTO[e.tecnica] ?? "") : ""}`);
        if (casaTodas(tokens, alvo)) motivos.push(`Treino ${t.letra}: ${e.nome}`);
      }
    }
    // Palavras espalhadas pela estrutura toda (ex.: “upper remada”).
    if (!motivos.length) {
      const tudo = [...progPalavras, ...a.treinos.flatMap((t) => [...palavras(t.nome), ...t.exercicios.flatMap((e) => palavras(`${e.nome} ${e.tecnica ? (TECNICA_TEXTO[e.tecnica] ?? "") : ""}`))])];
      if (tokens.length > 1 && casaTodas(tokens, tudo)) motivos.push("Palavras espalhadas pelo programa");
    }
    if (motivos.length) out.push({ aluno: a, tipo: "estrutura", motivos: [...new Set(motivos)], pontos: Math.min(50, motivos.length * 5) });
  }
  return out.sort((x, y) => y.pontos - x.pontos || x.aluno.nome.localeCompare(y.aluno.nome, "pt-BR"));
}

const chaveExercicio = (nome: string) => palavras(nome).join(" ");

/** Alunos com treino parecido: exercícios em comum ÷ exercícios dos dois (Jaccard). */
export function alunosParecidos(alvo: AlunoIndice, alunos: AlunoIndice[], minimo = 0.2): Array<{ aluno: AlunoIndice; semelhanca: number; comuns: string[] }> {
  const deles = (a: AlunoIndice) => new Map(a.treinos.flatMap((t) => t.exercicios.map((e) => [chaveExercicio(e.nome), e.nome] as const)));
  const base = deles(alvo);
  if (!base.size) return [];
  return alunos
    .filter((a) => a.id !== alvo.id)
    .map((a) => {
      const outro = deles(a);
      const comuns = [...base.keys()].filter((k) => outro.has(k));
      const uniao = new Set([...base.keys(), ...outro.keys()]).size;
      return { aluno: a, semelhanca: uniao ? comuns.length / uniao : 0, comuns: comuns.map((k) => base.get(k)!) };
    })
    .filter((r) => r.semelhanca >= minimo)
    .sort((x, y) => y.semelhanca - x.semelhanca);
}
