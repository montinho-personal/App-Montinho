// ============================================================================
// Prescrição — Operação Mr Arena 18 (Guilherme Henrique Senna Parussolo).
// 3 treinos em sequência A → C (Push / Legs / Pull). Fonte: prints da ficha
// do personal (24/10/2026). Mesmas convenções das fichas anteriores:
//  • Pirâmide: técnica "piramide" + séries detalhadas (20/15/12/10…).
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (1min30 entre séries, 2 min após o
//    exercício) — decisão do personal em 20/10/2026, no lugar dos da ficha.
//  • Padrão de toda ficha (./regras): até a falha (RIR 0) e aquecimento no 1º
//    exercício. Cargas nunca preenchidas (a “última carga” vem dos registros).
// Correspondências: “Crucifixo máquina” = peck deck; “Supino inclinado 45°
// halteres” = Supino inclinado com halteres (banco a 45° na observação);
// “Supino reto articulado” = Supino reto na máquina (sinônimo “supino
// articulado”); “Triceps pulley barra W” = Tríceps pulley com barra W;
// “Leg 45°” = Leg press 45°; “Panturrilha no leg press 180” = Panturrilha no
// leg press (horizontal); “Puxada frontal pegada aberta pronada” = Puxada
// frontal aberta (pulley); “Remada baixa pegada aberta” = Remada sentada
// pegada aberta; “Remada unilateral halteres” = Remada unilateral com halter
// (serrote); “Crucifixo inverso máquina pronada” = Crucifixo invertido na
// máquina; “Rosca scott com barra W” = Rosca Scott com barra W; “Abdominal
// supra na polia” = em pé. Objetivo, nível, divisão e fase: os que o personal
// já tinha no programa do Guilherme.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "operacao-mr-arena-18-v1";
export const NOME_ALUNO = "Guilherme Henrique Senna Parussolo";
export const ROTULO = "Operação Mr Arena 18";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Supino inclinado com halteres": { id: "7f380859-dbff-48fd-82e3-e907a461d24e", nome: "Supino inclinado com halteres", grupo: "peito" },
  "Supino reto na máquina": { id: "441e555d-a66d-4546-906a-490a608653d1", nome: "Supino reto na máquina", grupo: "peito" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Tríceps pulley com barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Remada unilateral com halter (serrote)": { id: "3d20d606-7636-4a1b-8553-5875508a72a2", nome: "Remada unilateral com halter (serrote)", grupo: "costas" },
  "Crucifixo invertido na máquina": { id: "79fb46d3-9590-48a5-aeca-e4743d870265", nome: "Crucifixo invertido na máquina", grupo: "ombro_posterior" },
  "Rosca Scott com barra W": { id: "2dddf31a-2adb-4ed2-8ecd-b075d6aa8de2", nome: "Rosca Scott com barra W", grupo: "biceps" },
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
    objetivo: "emagrecimento",
    nivel: "intermediario",
    split: "PPL",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C"], diasPorSemana: 3 },
    metas_volume: {},
    prioridades: [],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: null,
    fase: "adaptacao",
  },
  treinos: [
    treino("A", "Push — Peito, ombro e tríceps", [
      pir("Crucifixo na máquina (peck deck)", P20, ISO5("lá na frente")),
      pir("Supino inclinado com halteres", P20, `Banco a 45°. ${AUMENTAR}`),
      pir("Supino reto na máquina", P20, `Supino reto articulado. ${AUMENTAR}`),
      biA("Desenvolvimento Arnold", x(4, "12"), "A1", AUMENTAR),
      biB("Elevação lateral com halteres", x(4, "12"), "A1"),
      pir("Tríceps pulley com barra W", P20),
    ]),
    treino("B", "Legs — Quadríceps, posterior e panturrilha", [
      pir("Cadeira extensora", P20, ISO5("lá em cima a perna")),
      pir("Agachamento no Smith", P15),
      pir("Leg press 45°", P15),
      pir("Mesa flexora", P20),
      pir("Panturrilha no leg press", ["20", "20", "15", "15"], ISO5("lá em cima")),
    ]),
    treino("C", "Pull — Costas, posterior de ombro, bíceps e abdômen", [
      pir("Puxada frontal aberta (pulley)", P20, `Pegada aberta pronada. ${AUMENTAR}`),
      pir("Remada sentada pegada aberta", P20, `Remada baixa, pegada aberta. ${ISO5("lá trás")}`),
      ex("Remada unilateral com halter (serrote)", x(4, "12"), null, { unilateral: true, obs: `Começar SEMPRE pelo lado mais fraco. Se no outro lado conseguir fazer mais repetições, não faça: deixe sempre igual os dois lados! ${AUMENTAR}` }),
      pir("Crucifixo invertido na máquina", P20, `Pegada pronada. ${AUMENTAR}`),
      pir("Rosca Scott com barra W", P20),
      ex("Abdominal supra na polia em pé", x(4, "15"), null, { obs: AUMENTAR }),
    ]),
  ],
  motivo: "Cadastro da prescrição Operação Mr Arena 18 (Push/Legs/Pull em sequência) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
