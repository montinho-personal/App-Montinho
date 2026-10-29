// ============================================================================
// Prescrição — Missão Celtic Queen, fase de Intensificação (Camilla L Valentim).
// 4 treinos em sequência A → D (Lower / Upper / Lower / Full Body). Fonte:
// prints da ficha do personal (29/10/2026). Mesmas convenções das fichas
// anteriores (ver missao-musa-green-valley.ts):
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho no lugar dos da ficha (60 s / 90 s).
//  • Padrão de toda ficha (./regras): até a falha (RIR 0) e aquecimento no 1º
//    exercício (nos Treinos A e C a prancha fica fora e o aquecimento vai no
//    seguinte). Prancha por tempo: "60s".
//  • O sprint não faz parte do Treino D: na ficha ele é separado e não foi
//    cadastrado.
// Correspondências: “Abdominal prancha” = Prancha frontal; “Elevação pélvica”
// = Hip thrust na máquina (como na ficha da Carol; confirmar); “Abdominal
// Infra Banco Declinado” = Abdominal infra no banco declinado; “Abdominal
// Remador” = Abdominal remador; “Remada curvada pegada pronada” = Remada
// curvada com barra; “Remada Polia Baixa Triângulo” = Remada sentada na polia
// (triângulo); “Puxada Frontal pegada aberta pronada” = Puxada frontal aberta
// (pulley); “Crucifixo invertido com halteres”; “Rosca Direta Barra W” =
// Rosca direta com barra W; “Levantamento terra” = barra reta; “Passada” =
// Walking Lunges; “Agachamento búlgaro halteres” = Agachamento búlgaro;
// “Bom Dia” = Good morning (confirmar); “Face pull na polia” = Face pull;
// “Triceps francês com halter bilateral” = Tríceps francês com halter;
// “Abdominal supra na polia” = em pé. Todos têm vídeo na biblioteca, menos
// Good morning e Rosca direta com barra W (sem vídeo validado ainda).
// Objetivo, nível e prioridades ficam em branco: a Camilla ainda não tem
// ficha de avaliação no app.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "missao-celtic-queen-intensificacao-v1";
export const NOME_ALUNA = "Camilla L Valentim";
export const ROTULO = "Missão Celtic Queen - Intensificação";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Hip thrust na máquina": { id: "9c4fa6e6-b6d2-4516-b9e4-a87cda088150", nome: "Hip thrust na máquina", grupo: "gluteo" },
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Abdominal infra no banco declinado": { id: "b3eb07b6-ce28-454c-a68f-d025cb7daf1e", nome: "Abdominal infra no banco declinado", grupo: "abdomen" },
  "Abdominal remador": { id: "ad5e0a1b-8712-4327-b218-3eab38afa918", nome: "Abdominal remador", grupo: "abdomen" },
  "Remada curvada com barra": { id: "332ccacf-e09a-401c-adeb-958865c53b3f", nome: "Remada curvada com barra", grupo: "costas" },
  "Remada sentada na polia (triângulo)": { id: "cc8733da-aae1-4661-9fbb-ef1182fcee6e", nome: "Remada sentada na polia (triângulo)", grupo: "costas" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Crucifixo invertido com halteres": { id: "e5b30bcf-fa11-42aa-9a21-bdba639a0821", nome: "Crucifixo invertido com halteres", grupo: "ombro_posterior" },
  "Rosca direta com barra W": { id: "f2ec1e10-5c7e-46f8-abe9-d2b43d156559", nome: "Rosca direta com barra W", grupo: "biceps" },
  "Stiff com barra": { id: "61d06eb7-f050-44a0-9e6a-3ab58cb216a3", nome: "Stiff com barra", grupo: "posteriores" },
  "Levantamento terra barra reta": { id: "5573b5a5-e52d-4d73-a9a7-ad481ed3f662", nome: "Levantamento terra barra reta", grupo: "posteriores" },
  "Walking Lunges": { id: "8f262cae-d754-4225-9251-97215f96afc7", nome: "Walking Lunges", grupo: "quadriceps" },
  "Agachamento búlgaro": { id: "d7de52a6-c5d7-4eab-934c-86ad65655015", nome: "Agachamento búlgaro", grupo: "quadriceps" },
  "Good morning": { id: "d76feef9-19ce-435c-ad2a-af5a7715bd25", nome: "Good morning", grupo: "posteriores" },
  "Face pull": { id: "fb2e0476-069a-4d41-b929-0eb1186c423d", nome: "Face pull", grupo: "ombro_posterior" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Supino reto com halteres": { id: "8dd6c638-1899-4e23-a481-d50224fab49e", nome: "Supino reto com halteres", grupo: "peito" },
  "Tríceps francês com halter": { id: "8646caa6-2db5-4be3-82f6-d38add8e00eb", nome: "Tríceps francês com halter", grupo: "triceps" },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
};

type Opc = { tecnica?: ExercicioInput["tecnica"]; bloco?: string | null; descansoApos?: number | null; obs?: string | null; unilateral?: boolean };

function ex(nome: string, reps: string[], descansoSeg: number | null, o: Opc = {}): ExercicioInput {
  const lib = BIBLIOTECA[nome];
  if (!lib) throw new Error(`Exercício sem correspondência na biblioteca: ${nome}`);
  const iguais = reps.every((r) => r === reps[0]);
  const series_config: SerieConfig =
    iguais && o.tecnica !== "piramide"
      ? { modo: "iguais", series: reps.length, reps: reps[0], ie: null, descanso_seg: descansoSeg }
      : { modo: "detalhado", series: reps.map((r, i) => ({ ordem: i + 1, reps: r, ie: null, descanso_seg: descansoSeg })) };
  return {
    nome,
    series: reps.length,
    reps: iguais ? reps[0] : reps.join("/"),
    ie: null,
    rir: null,
    descanso_seg: descansoSeg,
    observacoes: o.obs ?? null,
    series_config,
    biblioteca_id: lib.id,
    grupo_muscular: lib.grupo,
    grupos_secundarios: [],
    grupo_origem: "biblioteca",
    grupo_confianca: "alta",
    series_aquecimento: 0,
    tecnica: o.tecnica ?? "normal",
    tecnica_extras: null,
    tecnica_series: null,
    descanso_apos_seg: o.descansoApos ?? null,
    cadencia: null,
    prioridade: "normal",
    bloco: o.bloco ?? null,
    unilateral: o.unilateral ?? false,
    carga_alvo: null,
    conta_volume: true,
  };
}

const P20 = ["20", "15", "12", "10"];
const P5 = ["20", "15", "12", "10", "8"];
const P15_5 = ["15", "12", "10", "10", "8"];
const AUMENTAR = "Conforme diminuir as repetições, aumentar o peso!";
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string = AUMENTAR) => ex(nome, reps, null, { tecnica: "piramide", obs });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const prancha = () => ex("Prancha frontal", ["60s"], null, { tecnica: "isometria", obs: "Abdominal prancha: 60 segundos." });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: null,
    nivel: null,
    split: "Lower / Upper / Lower / Full Body",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D"], diasPorSemana: 4 },
    metas_volume: {},
    prioridades: [],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: null,
    fase: "intensificacao",
  },
  treinos: [
    treino("A", "Lower — Glúteo, quadríceps e abdômen", [
      prancha(),
      pir("Hip thrust na máquina", P5, `Elevação pélvica. ${AUMENTAR}`),
      pir("Agachamento no Smith", P15_5),
      pir("Leg press 45°", P5),
      biA("Abdominal infra no banco declinado", x(4, "20"), "A1"),
      biB("Abdominal remador", x(4, "20"), "A1"),
    ]),
    treino("B", "Upper — Costas, ombros e bíceps", [
      ex("Remada curvada com barra", x(4, "20"), null, { obs: "Pegada pronada." }),
      pir("Remada sentada na polia (triângulo)", P20, `Remada polia baixa, triângulo. ${AUMENTAR}`),
      pir("Puxada frontal aberta (pulley)", P20, `Pegada aberta pronada. ${AUMENTAR}`),
      biA("Desenvolvimento Arnold", x(4, "15"), "B1"),
      biB("Crucifixo invertido com halteres", x(4, "15"), "B1"),
      pir("Rosca direta com barra W", ["20", "15", "12", "12"], `Rosca direta na barra W. ${AUMENTAR}`),
    ]),
    treino("C", "Lower — Posteriores, quadríceps e glúteo", [
      prancha(),
      ex("Stiff com barra", x(5, "15"), null),
      ex("Levantamento terra barra reta", x(5, "15"), null),
      biA("Hip thrust na máquina", x(4, "15"), "C1", "Elevação pélvica."),
      biB("Walking Lunges", x(4, "20"), "C1", "Passada."),
      pir("Agachamento búlgaro", ["20", "15", "12", "12", "10"], `Com halteres. ${AUMENTAR}`),
    ]),
    treino("D", "Full Body", [
      pir("Agachamento no Smith", P15_5),
      pir("Good morning", ["15", "12", "10", "10", "10"], `Bom dia. ${AUMENTAR}`),
      pir("Puxada frontal aberta (pulley)", P20, `Pegada aberta pronada. ${AUMENTAR}`),
      biA("Face pull", x(4, "15"), "D1", "Na polia."),
      biB("Elevação lateral com halteres", x(4, "15"), "D1"),
      biA("Supino reto com halteres", x(4, "12"), "D2"),
      biB("Tríceps francês com halter", x(4, "12"), "D2", "Bilateral (com as duas mãos)."),
      biA("Abdominal remador", x(4, "20"), "D3"),
      biB("Abdominal supra na polia em pé", x(4, "60s"), "D3", "Por tempo: 60 segundos em cada série."),
    ]),
  ],
  motivo: "Cadastro da prescrição Missão Celtic Queen - Intensificação (Lower/Upper/Lower/Full Body em sequência) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [
  "Treino D, Agachamento no Smith: o print corta antes das séries. Foram usadas as mesmas do Smith do Treino A (15/12/10/10/8, 5 séries, que bate com as 5 séries de quadríceps do volume da ficha). Confirmar repetições.",
  "Elevação pélvica (Treinos A e C): a ficha não diz o equipamento. Foi cadastrada na máquina, como na ficha da Carol. É na máquina, no solo ou com barra?",
  "“Bom Dia” (Treino D): na biblioteca há o Good morning (com barra, sem vídeo ainda) e o Bom dia no hack (máquina). Foi cadastrado o Good morning. Confirmar qual.",
  "Abdominal supra na polia (Treino D) está com 60 s por série, como na ficha (as outras fichas usam repetições). Confirmar se é por tempo mesmo.",
];
