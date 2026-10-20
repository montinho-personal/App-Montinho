// Motor de restrições: cruza a anamnese (lesões/dores/cirurgias) com o nome
// do exercício e devolve alertas acionáveis pro treinador no Montador.
//
// Como funciona: cada regra tem um GATILHO (regex que detecta a lesão no texto
// da anamnese) e um padrão de EXERCÍCIOS de risco. Se a anamnese dispara o
// gatilho E o exercício casa com o padrão, o alerta aparece.

import type { Anamnese } from "@/lib/supabase/types-extended";

export type Severidade = "alto" | "atencao";

export type Alerta = {
  regiao: string;
  severidade: Severidade;
  mensagem: string;
};

type Regra = {
  regiao: string;
  gatilho: RegExp; // detecta a lesão no texto da anamnese
  exercicios: RegExp; // exercícios de risco pra essa lesão
  severidade: Severidade;
  mensagem: string;
};

// Normaliza: minúsculas, sem acento — pra casar "agachamento" com "Agachamento".
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const REGRAS: Regra[] = [
  {
    regiao: "Joelho",
    gatilho: /joelho|patel|condromalacia|menisc|lca|lcp|ligamento cruzado|tendinite patelar/,
    exercicios:
      /agachamento|agacho|leg press|hack|afundo|avanco|passada|cadeira extensora|extensora|bulgaro|pistol/,
    severidade: "alto",
    mensagem:
      "Lesão de joelho — evite carga máxima e amplitude profunda. Prefira máquina guiada (hack/leg) com amplitude controlada.",
  },
  {
    regiao: "Ombro",
    gatilho: /ombro|manguito|rotador|deltoide|labrum|subacromial|impacto/,
    exercicios:
      /desenvolvimento|militar|elevacao lateral|elevacao frontal|arnold|supino atras|crucifixo invertido|remada alta/,
    severidade: "atencao",
    mensagem:
      "Lesão de ombro — cuidado com amplitude acima do paralelo e carga alta no desenvolvimento. Considere pegada neutra.",
  },
  {
    regiao: "Lombar / Coluna",
    gatilho: /lombar|coluna|hernia|disco|ciat|protrus|espondil|escoliose/,
    exercicios:
      /terra|stiff|agachamento livre|remada curvada|good morning|hiperextensao|levantamento terra|barra livre/,
    severidade: "alto",
    mensagem:
      "Lesão lombar — evite sobrecarga axial e flexão de coluna sob carga. Prefira apoio/máquina com tronco estabilizado.",
  },
  {
    regiao: "Cotovelo / Punho",
    gatilho: /cotovelo|punho|epicondil|tendinite|tunel do carpo/,
    exercicios:
      /rosca|triceps testa|frances|barra w|mergulho|paralela|extensao de triceps/,
    severidade: "atencao",
    mensagem:
      "Dor de cotovelo/punho — reduza carga em roscas e extensões de tríceps; prefira pegada neutra e barra W.",
  },
  {
    regiao: "Quadril",
    gatilho: /quadril|labrum do quadril|impacto femoroacetabular|piriforme/,
    exercicios: /agachamento|afundo|avanco|leg press|stiff|terra|abducao/,
    severidade: "atencao",
    mensagem:
      "Lesão de quadril — limite amplitude profunda e abdução com carga alta.",
  },
];

/** Texto da anamnese relevante pra detecção de lesão. */
function textoLesoes(a: Anamnese): string {
  return norm([a.lesoes, a.dores_atuais, a.cirurgias, a.doencas_cronicas].filter(Boolean).join(" · "));
}

/** Regras ativas pra este aluno (lesões que a anamnese realmente menciona). */
export function regrasAtivas(anamnese: Anamnese | null): Regra[] {
  if (!anamnese) return [];
  const txt = textoLesoes(anamnese);
  if (!txt) return [];
  return REGRAS.filter((r) => r.gatilho.test(txt));
}

/** Alertas pra um exercício específico, dado o quadro de lesões do aluno. */
export function alertasDoExercicio(nomeExercicio: string, anamnese: Anamnese | null): Alerta[] {
  if (!anamnese || !nomeExercicio.trim()) return [];
  const nome = norm(nomeExercicio);
  return regrasAtivas(anamnese)
    .filter((r) => r.exercicios.test(nome))
    .map((r) => ({ regiao: r.regiao, severidade: r.severidade, mensagem: r.mensagem }));
}

/** Lista de regiões lesionadas (pra exibir no cartão de anamnese). */
export function regioesLesionadas(anamnese: Anamnese | null): string[] {
  return regrasAtivas(anamnese).map((r) => r.regiao);
}

/** Regiões com restrição na anamnese, no formato usado pela biblioteca (substituições). */
const REGIAO_PARA_ESTRESSE: Record<string, "joelho" | "ombro" | "lombar" | "cotovelo_punho" | "quadril"> = {
  Joelho: "joelho",
  Ombro: "ombro",
  "Lombar / Coluna": "lombar",
  "Cotovelo / Punho": "cotovelo_punho",
  Quadril: "quadril",
};

export function regioesDaAnamnese(anamnese: Anamnese | null): Array<"joelho" | "ombro" | "lombar" | "cotovelo_punho" | "quadril"> {
  return regrasAtivas(anamnese)
    .map((r) => REGIAO_PARA_ESTRESSE[r.regiao])
    .filter((r): r is NonNullable<typeof r> => !!r);
}
