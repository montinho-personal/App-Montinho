// ============================================================================
// Prescrição — Missão Musa do Green Valley (Carol Zorzi; na ficha: Carolina
// Zorzi). 4 treinos em sequência A → D (Lower / Upper / Lower / Full Body).
// Fonte: prints da ficha do personal (26/10/2026). Mesmas convenções das
// fichas anteriores (ver operacao-mr-arena-18.ts):
//  • Pirâmide: técnica "piramide" + séries detalhadas (20/15/12/10…).
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (decisão do personal em 20/10/2026), no
//    lugar dos da ficha.
//  • Padrão de toda ficha (./regras): até a falha (RIR 0) e aquecimento no 1º
//    exercício (no Treino A, a prancha fica fora e o aquecimento vai na
//    elevação pélvica). Prancha por tempo: "60s".
// v2 (26/10/2026): o personal confirmou que a elevação pélvica é NA MÁQUINA.
// Correspondências: “Abdominal prancha” = Prancha frontal; “Elevação pélvica”
// = Hip thrust na máquina (sinônimo “elevação pélvica máquina”); “Remada baixa pegada aberta” = Remada sentada pegada
// aberta; “Puxada frontal pegada aberta pronada” = Puxada frontal aberta
// (pulley); “Crucifixo máquina” = peck deck; “Elevação frontal com halter
// pegada pronada” = Elevação frontal com halteres; “Tríceps francês com halter
// bilateral” = Tríceps francês com halter; “Flexora unilateral” = Flexora em
// pé unilateral (sinônimo “flexora unilateral”); “Abdominal supra na polia” =
// em pé; “Triceps pulley barra W” = Tríceps pulley com barra W; “Panturrilha
// no leg press 180” = Panturrilha no leg press. Objetivo, nível, divisão e
// prioridades: os que o personal já tinha no programa da Carol.
// Todos os exercícios têm vídeo na biblioteca.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "missao-musa-green-valley-v2";
export const NOME_ALUNA = "Carol Zorzi (Carolina)";
export const ROTULO = "Missão Musa do Green Valley";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Hip thrust na máquina": { id: "9c4fa6e6-b6d2-4516-b9e4-a87cda088150", nome: "Hip thrust na máquina", grupo: "gluteo" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Elevação frontal com halteres": { id: "79cc36a3-b65e-44e0-9b10-5ce393a0c167", nome: "Elevação frontal com halteres", grupo: "ombro_anterior" },
  "Tríceps francês com halter": { id: "8646caa6-2db5-4be3-82f6-d38add8e00eb", nome: "Tríceps francês com halter", grupo: "triceps" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Flexora em pé unilateral": { id: "54a3fb6e-04cd-4eb2-830e-314a433be13c", nome: "Flexora em pé unilateral", grupo: "posteriores" },
  "Cadeira adutora": { id: "359bf353-1d05-4258-a3c8-632ab812b43f", nome: "Cadeira adutora", grupo: "adutores" },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Tríceps pulley com barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" },
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
const P15 = ["15", "12", "10", "10"];
const AUMENTAR = "Conforme diminuir as repetições, aumentar o peso!";
const ISO_TODAS = `Em todas as séries, as 5 primeiras repetições isométricas e o restante explodindo (cadência normal). ${AUMENTAR}`;
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string = AUMENTAR) => ex(nome, reps, null, { tecnica: "piramide", obs });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Emagrecimento",
    nivel: "Iniciante",
    split: "Lower / Upper / Lower / Full Body",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D"], diasPorSemana: 4 },
    metas_volume: {},
    prioridades: ["quadriceps", "posteriores", "gluteo"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: null,
    fase: null,
  },
  treinos: [
    treino("A", "Lower — Glúteo, quadríceps e panturrilha", [
      ex("Prancha frontal", ["60s"], null, { tecnica: "isometria", obs: "Abdominal prancha: 60 segundos." }),
      pir("Hip thrust na máquina", P20, `Elevação pélvica na máquina. ${ISO_TODAS}`),
      pir("Leg press 45°", P15),
      pir("Cadeira extensora", P20, ISO_TODAS),
      pir("Cadeira abdutora", P20, ISO_TODAS),
      pir("Panturrilha no leg press", ["20", "20", "15", "15"], `Leg press 180. ${ISO_TODAS}`),
    ]),
    treino("B", "Upper — Costas, peito, ombros e tríceps", [
      pir("Remada sentada pegada aberta", P20, `Remada baixa, pegada aberta. ${ISO_TODAS}`),
      pir("Puxada frontal aberta (pulley)", P20, `Pegada aberta pronada. ${AUMENTAR}`),
      pir("Crucifixo na máquina (peck deck)", P20),
      pir("Elevação lateral com halteres", P20),
      biA("Elevação frontal com halteres", x(4, "15"), "B1", `Pegada pronada. ${AUMENTAR}`),
      biB("Tríceps francês com halter", x(4, "15"), "B1", "Bilateral (com as duas mãos)."),
    ]),
    treino("C", "Lower — Posteriores, quadríceps e adutores", [
      pir("Mesa flexora", P20, ISO_TODAS),
      pir("Flexora em pé unilateral", P15),
      pir("Leg press 45°", P15),
      pir("Cadeira adutora", ["20", "20", "15", "12"], `Nas duas primeiras séries, as 5 primeiras repetições isométricas e o restante explodindo (cadência normal). ${AUMENTAR}`),
      ex("Abdominal supra na polia em pé", x(4, "20"), null, { obs: AUMENTAR }),
    ]),
    treino("D", "Full Body", [
      pir("Cadeira extensora", P20),
      biA("Desenvolvimento Arnold", ["12", "12", "10", "10"], "D1", AUMENTAR),
      biB("Rosca martelo", ["12", "12", "10", "10"], "D1"),
      pir("Tríceps pulley com barra W", P20),
      ex("Panturrilha no leg press", x(4, "20"), null, { obs: `Leg press 180. 10 repetições isométricas e o restante normal. ${AUMENTAR}` }),
    ]),
  ],
  motivo: "Cadastro da prescrição Missão Musa do Green Valley (Lower/Upper/Lower/Full Body em sequência) a partir da ficha do personal; elevação pélvica na máquina",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
