// ============================================================================
// Prescrição — Operação Gallo Maromba (Daniel Galo; na ficha: Daniel Lopes
// Cavalcanti). 4 treinos em sequência A → D (Push / Pull / Legs / Superiores).
// Fonte: prints da ficha do personal (25/10/2026). Mesmas convenções das
// fichas anteriores (ver operacao-mr-arena-18.ts):
//  • Pirâmide: técnica "piramide" + séries detalhadas (20/15/12/10…).
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (decisão do personal em 20/10/2026), no
//    lugar dos da ficha.
//  • Padrão de toda ficha (./regras): até a falha (RIR 0) e aquecimento no 1º
//    exercício (no Treino C, a prancha fica fora e o aquecimento vai na
//    extensora). Prancha por tempo: "60s" (como na Miss Terraços).
// Correspondências: “Crucifixo máquina” = peck deck; “Supino inclinado 45°
// halteres” = Supino inclinado com halteres; “Supino reto articulado” =
// Supino reto na máquina; “Puxada frontal pegada aberta pronada” = Puxada
// frontal aberta (pulley); “Remada baixa pegada aberta” = Remada sentada
// pegada aberta; “Remada halteres banco inclinado” = Remada com halteres
// apoiada no banco inclinado; “Crucifixo inverso máquina pronada” = Crucifixo
// invertido na máquina; “Abdominal prancha” = Prancha frontal; “Flexora
// unilateral” = Flexora em pé unilateral (sinônimo “flexora unilateral”);
// “Panturrilha no leg press 180” = Panturrilha no leg press; “Puxada alta
// triângulo” = Puxada com triângulo (pegada neutra); “Elevação frontal com
// barra pegada pronada” = Elevação frontal com barra; “Rosca direta banco
// 45°” = Rosca inclinada com halteres (sinônimo “rosca direta banco
// inclinado”); “Tríceps francês na polia baixa com corda bilateral” = Tríceps
// francês na polia; “Abdominal infra banco declinado” = Abdominal infra no
// banco declinado; “Abdominal supra na polia” = em pé. Objetivo, nível,
// divisão e prioridades: os que o personal já tinha no programa do Daniel.
// Todos os exercícios têm vídeo na biblioteca.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "operacao-gallo-maromba-v1";
export const NOME_ALUNO = "Daniel Galo";
export const ROTULO = "Operação Gallo Maromba";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Supino inclinado com halteres": { id: "7f380859-dbff-48fd-82e3-e907a461d24e", nome: "Supino inclinado com halteres", grupo: "peito" },
  "Supino reto na máquina": { id: "441e555d-a66d-4546-906a-490a608653d1", nome: "Supino reto na máquina", grupo: "peito" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Tríceps pulley com barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Remada com halteres apoiada no banco inclinado": { id: "052864ca-f355-4632-bcb1-f7981fc968d5", nome: "Remada com halteres apoiada no banco inclinado", grupo: "costas" },
  "Crucifixo invertido na máquina": { id: "79fb46d3-9590-48a5-aeca-e4743d870265", nome: "Crucifixo invertido na máquina", grupo: "ombro_posterior" },
  "Rosca Scott com barra W": { id: "2dddf31a-2adb-4ed2-8ecd-b075d6aa8de2", nome: "Rosca Scott com barra W", grupo: "biceps" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Cadeira adutora": { id: "359bf353-1d05-4258-a3c8-632ab812b43f", nome: "Cadeira adutora", grupo: "adutores" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Flexora em pé unilateral": { id: "54a3fb6e-04cd-4eb2-830e-314a433be13c", nome: "Flexora em pé unilateral", grupo: "posteriores" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Puxada com triângulo (pegada neutra)": { id: "58403221-f1a8-4bf0-9449-7f0601b73abd", nome: "Puxada com triângulo (pegada neutra)", grupo: "costas" },
  "Elevação frontal com barra": { id: "f9cfc31c-0089-427e-98cf-f44c417d25c9", nome: "Elevação frontal com barra", grupo: "ombro_anterior" },
  "Rosca inclinada com halteres": { id: "d4b90aa6-1dd4-4fef-8970-efffaf143b1d", nome: "Rosca inclinada com halteres", grupo: "biceps" },
  "Tríceps francês na polia": { id: "05bba219-dc55-4e17-90ea-5df4bd3fee1f", nome: "Tríceps francês na polia", grupo: "triceps" },
  "Abdominal infra no banco declinado": { id: "b3eb07b6-ce28-454c-a68f-d025cb7daf1e", nome: "Abdominal infra no banco declinado", grupo: "abdomen" },
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
const P15 = ["15", "12", "10", "10"];
const AUMENTAR = "Conforme diminuir as repetições, aumentar o peso!";
const ISO5 = (onde: string) => `Nas 5 primeiras repetições, fazer 5 repetições isométricas (segurando 3 s ${onde}, no pico de contração). As restantes, normal. ${AUMENTAR}`;
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string = AUMENTAR) => ex(nome, reps, null, { tecnica: "piramide", obs });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Recomposição corporal",
    nivel: "Intermediário",
    split: "Push/Pull/Legs/Superiores",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D"], diasPorSemana: 4 },
    metas_volume: {},
    prioridades: ["costas", "peito", "ombros", "quadriceps", "posteriores"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: null,
    fase: null,
  },
  treinos: [
    treino("A", "Push — Peito, ombros e tríceps", [
      pir("Crucifixo na máquina (peck deck)", P20, ISO5("lá na frente")),
      pir("Supino inclinado com halteres", P20, `Banco a 45°. ${AUMENTAR}`),
      pir("Supino reto na máquina", P20, `Supino reto articulado. ${AUMENTAR}`),
      biA("Desenvolvimento Arnold", x(4, "12"), "A1", AUMENTAR),
      biB("Elevação lateral com halteres", x(4, "12"), "A1"),
      pir("Tríceps pulley com barra W", P20),
    ]),
    treino("B", "Pull — Costas e bíceps", [
      pir("Puxada frontal aberta (pulley)", P20, `Pegada aberta pronada. ${AUMENTAR}`),
      pir("Remada sentada pegada aberta", P20, `Remada baixa, pegada aberta. ${ISO5("lá trás")}`),
      ex("Remada com halteres apoiada no banco inclinado", x(4, "12"), null, { obs: `Jogar o cotovelo em direção ao quadril. ${AUMENTAR}` }),
      pir("Crucifixo invertido na máquina", P20, `Pegada pronada. ${AUMENTAR}`),
      ex("Rosca Scott com barra W", P20, 0, { tecnica: "biset", bloco: "B1", descansoApos: 0, obs: AUMENTAR }),
      biB("Rosca martelo", x(4, "12"), "B1"),
    ]),
    treino("C", "Legs — Pernas", [
      ex("Prancha frontal", ["60s", "60s"], null, { tecnica: "isometria", obs: "Abdominal prancha: 60 segundos por série." }),
      pir("Cadeira extensora", P20, ISO5("lá em cima a perna")),
      pir("Cadeira adutora", P20, ISO5("com a perna fechada")),
      pir("Mesa flexora", P20, ISO5("lá em cima a perna")),
      pir("Flexora em pé unilateral", P15),
      pir("Panturrilha no leg press", ["20", "20", "15", "15"], `Leg press 180. ${ISO5("lá em cima")}`),
    ]),
    treino("D", "Superiores", [
      pir("Supino reto na máquina", P20, `Supino reto articulado. ${AUMENTAR}`),
      pir("Puxada com triângulo (pegada neutra)", P15, `Puxada alta com triângulo. ${AUMENTAR}`),
      biA("Elevação lateral com halteres", x(3, "12"), "D1", AUMENTAR),
      biB("Elevação frontal com barra", x(3, "12"), "D1", "Pegada pronada."),
      pir("Rosca inclinada com halteres", P15, `Rosca direta no banco a 45°. ${ISO5("lá em cima o braço")}`),
      pir("Tríceps francês na polia", P20, `Na polia baixa, com corda, bilateral. ${AUMENTAR}`),
      biA("Abdominal infra no banco declinado", x(3, "8"), "D2", AUMENTAR),
      biB("Abdominal supra na polia em pé", x(3, "20"), "D2"),
    ]),
  ],
  motivo: "Cadastro da prescrição Operação Gallo Maromba (Push/Pull/Legs/Superiores em sequência) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
