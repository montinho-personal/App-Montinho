// ============================================================================
// Prescrição — Operação Força Bruta (Leandro Perez). 5 treinos em sequência
// A → E (Peito/ombro/tríceps · Costas/bíceps · Pernas · Peito/ombro/tríceps ·
// Costas/bíceps). Fonte: prints da ficha do personal (27/10/2026), lá chamada
// “Treino do Hulk” — o nome foi trocado (sem marcas de terceiros, regra do app).
// Mesmas convenções da Operação Gallo Maromba:
//  • Pirâmide: técnica "piramide" + séries detalhadas (20/15/12/10 · 15/12/10/10).
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (decisão do personal em 20/10/2026), no
//    lugar dos da ficha (90 s, 75 s, 180 s…).
//  • Padrão de toda ficha (./regras): até a falha (RIR 0, no lugar do RIR 3 da
//    ficha) e aquecimento no 1º exercício (com prancha no começo, o
//    aquecimento vai no 2º). Prancha por tempo: "60s".
// Correspondências: “Crucifixo máquina” = peck deck; “Supino inclinado 45°
// halteres” = Supino inclinado com halteres; “Supino máquina vertical” =
// Supino reto na máquina; “Tríceps francês na polia baixa com corda
// bilateral” = Tríceps francês na polia; “Abdominal supra na polia” = em pé;
// “Abdominal prancha” = Prancha frontal; “Puxada frontal pegada aberta
// pronada” = Puxada frontal aberta (pulley); “Puxada frontal triângulo” =
// Puxada com triângulo (pegada neutra); “Remada unilateral halteres” = Remada
// unilateral com halter (serrote); “Crucifixo inverso máquina pronada” =
// Crucifixo invertido na máquina; “Leg 45°” = Leg press 45°; “Panturrilha no
// leg press 180” = Panturrilha no leg press; “Crucifixo no cross polia alta” =
// Crossover na polia alta; “Remada baixa pegada aberta” = Remada sentada
// pegada aberta; “Remada baixa com triângulo” = Remada sentada na polia
// (triângulo); “Face pull na polia” = Face pull; “Rosca direta barra” = Rosca
// direta com barra reta; “Rosca inversa na polia baixa barra W” = Rosca
// inversa na polia com barra W; “Abdominal infra banco declinado” = Abdominal
// infra no banco declinado (10/10/10/10 = 4 × 10). Objetivo e nível: os que o
// personal já tinha no programa do Leandro. Todos os exercícios têm vídeo.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "operacao-forca-bruta-v1";
export const NOME_ALUNO = "Leandro Perez";
export const ROTULO = "Operação Força Bruta";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Supino inclinado com halteres": { id: "7f380859-dbff-48fd-82e3-e907a461d24e", nome: "Supino inclinado com halteres", grupo: "peito" },
  "Supino reto na máquina": { id: "441e555d-a66d-4546-906a-490a608653d1", nome: "Supino reto na máquina", grupo: "peito" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Tríceps francês na polia": { id: "05bba219-dc55-4e17-90ea-5df4bd3fee1f", nome: "Tríceps francês na polia", grupo: "triceps" },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Puxada com triângulo (pegada neutra)": { id: "58403221-f1a8-4bf0-9449-7f0601b73abd", nome: "Puxada com triângulo (pegada neutra)", grupo: "costas" },
  "Remada unilateral com halter (serrote)": { id: "3d20d606-7636-4a1b-8553-5875508a72a2", nome: "Remada unilateral com halter (serrote)", grupo: "costas" },
  "Crucifixo invertido na máquina": { id: "79fb46d3-9590-48a5-aeca-e4743d870265", nome: "Crucifixo invertido na máquina", grupo: "ombro_posterior" },
  "Rosca Scott com barra W": { id: "2dddf31a-2adb-4ed2-8ecd-b075d6aa8de2", nome: "Rosca Scott com barra W", grupo: "biceps" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Cadeira flexora": { id: "eecf0d46-3d2e-4d2e-a243-5ca7c04c71cf", nome: "Cadeira flexora", grupo: "posteriores" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Crossover na polia alta": { id: "5ce68a77-1b3c-4ace-8a28-e184df56e080", nome: "Crossover na polia alta", grupo: "peito" },
  "Supino reto com halteres": { id: "8dd6c638-1899-4e23-a481-d50224fab49e", nome: "Supino reto com halteres", grupo: "peito" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Tríceps pulley com barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" },
  "Abdominal infra no banco declinado": { id: "b3eb07b6-ce28-454c-a68f-d025cb7daf1e", nome: "Abdominal infra no banco declinado", grupo: "abdomen" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Remada sentada na polia (triângulo)": { id: "cc8733da-aae1-4661-9fbb-ef1182fcee6e", nome: "Remada sentada na polia (triângulo)", grupo: "costas" },
  "Face pull": { id: "fb2e0476-069a-4d41-b929-0eb1186c423d", nome: "Face pull", grupo: "ombro_posterior" },
  "Rosca direta com barra reta": { id: "f2f117f1-f158-43e4-b3fb-1d4e5ed852a4", nome: "Rosca direta com barra reta", grupo: "biceps" },
  "Rosca inversa na polia com barra W": { id: "76ffc05a-adb1-46fd-b97b-864e9023834b", nome: "Rosca inversa na polia com barra W", grupo: "biceps" },
  "Abdominal remador": { id: "ad5e0a1b-8712-4327-b218-3eab38afa918", nome: "Abdominal remador", grupo: "abdomen" },
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
/** Texto da ficha: isometria nas 5 primeiras repetições de TODAS as séries. */
const ISO5 = "Em TODAS as séries, fazer 5 repetições isométricas (segurando 3 s no pico de contração) e o restante normal, explodindo!";
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string = AUMENTAR) => ex(nome, reps, null, { tecnica: "piramide", obs });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const prancha = () => ex("Prancha frontal", ["60s", "60s"], null, { tecnica: "isometria", obs: "Abdominal prancha: 60 segundos por série." });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "emagrecimento",
    nivel: "intermediario",
    split: "Peito/Costas/Pernas/Peito/Costas",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1, E: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D", "E"], diasPorSemana: 5 },
    metas_volume: {},
    prioridades: [],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: null,
    fase: null,
  },
  treinos: [
    treino("A", "Peito, ombros e tríceps", [
      pir("Crucifixo na máquina (peck deck)", P20, `${ISO5} ${AUMENTAR}`),
      pir("Supino inclinado com halteres", P20, `Banco a 45°. ${AUMENTAR}`),
      pir("Supino reto na máquina", P20, `Supino máquina vertical. ${AUMENTAR}`),
      pir("Elevação lateral com halteres", P20, `${ISO5} ${AUMENTAR}`),
      ex("Tríceps francês na polia", x(4, "12"), null, { obs: "Na polia baixa, com corda, bilateral." }),
      ex("Abdominal supra na polia em pé", x(4, "20"), null),
    ]),
    treino("B", "Costas e bíceps", [
      prancha(),
      pir("Puxada frontal aberta (pulley)", P20, `Pegada aberta pronada. ${ISO5} ${AUMENTAR}`),
      pir("Puxada com triângulo (pegada neutra)", P20, `Puxada frontal com triângulo. ${AUMENTAR}`),
      ex("Remada unilateral com halter (serrote)", x(4, "12"), null, { unilateral: true }),
      pir("Crucifixo invertido na máquina", P20, `Pegada pronada. ${AUMENTAR}`),
      pir("Rosca Scott com barra W", P20),
      ex("Rosca martelo", x(4, "12"), null),
    ]),
    treino("C", "Pernas", [
      prancha(),
      pir("Cadeira extensora", P20, `${ISO5} Conforme diminuir as repetições, aumentar a carga. Deixar descer o máximo a perna para alongar totalmente o quadríceps e contrair o máximo possível lá em cima. Ponta dos pés para cima.`),
      pir("Leg press 45°", P15, `Descer o máximo que conseguir, que sua amplitude deixar. Ponta dos pés e joelhos apontados para fora. Jogar a força e o peso no calcanhar. ${AUMENTAR}`),
      pir("Cadeira flexora", P20, `${ISO5} Conforme diminuir as repetições, aumentar a carga.`),
      pir("Mesa flexora", P15),
      ex("Cadeira abdutora", x(4, "20"), null, { obs: "Fazer 10 repetições isométricas + 10 explodindo!" }),
      ex("Panturrilha no leg press", x(4, "20"), null, { obs: `Leg press 180. Em TODAS as séries, fazer 10 repetições isométricas (segurando 3 s no pico de contração) e o restante normal, explodindo!` }),
    ]),
    treino("D", "Peito, ombros e tríceps", [
      pir("Crossover na polia alta", P20, `Crucifixo no cross, polia alta. ${AUMENTAR}`),
      pir("Supino reto com halteres", P20),
      biA("Desenvolvimento Arnold", x(4, "12"), "D1"),
      biB("Elevação lateral com halteres", x(4, "12"), "D1"),
      pir("Tríceps pulley com barra W", P20, `${ISO5} ${AUMENTAR}`),
      ex("Abdominal infra no banco declinado", x(4, "10"), null),
    ]),
    treino("E", "Costas e bíceps", [
      prancha(),
      pir("Remada sentada pegada aberta", P20, `Remada baixa, pegada aberta. ${ISO5} ${AUMENTAR}`),
      pir("Remada sentada na polia (triângulo)", P20, `Remada baixa com triângulo. ${AUMENTAR}`),
      pir("Face pull", P20, `Na polia. ${AUMENTAR}`),
      ex("Rosca direta com barra reta", x(4, "12"), null),
      biA("Rosca inversa na polia com barra W", x(4, "15"), "E1", "Na polia baixa."),
      biB("Rosca martelo", x(4, "15"), "E1"),
      ex("Abdominal remador", x(4, "15"), null),
    ]),
  ],
  motivo: "Cadastro da prescrição Operação Força Bruta (5 treinos em sequência, A → E) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
