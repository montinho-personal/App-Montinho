// ============================================================================
// Prescrição — Hipertrofia, fase de Intensificação (Esther Claro).
// 4 treinos em sequência A → D (Lower / Upper / Lower / Upper). Fonte: prints
// da ficha do personal (30/10/2026). Mesmas convenções das fichas anteriores
// (ver operacao-pernas-poderosas.ts e missao-celtic-queen-intensificacao.ts):
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • “Pirâmide + drop-set/rest-pause”: o app guarda UMA técnica por exercício —
//    a de finalização (tecnica_config aplicar=finalizacao, 1 série a mais) — e
//    as repetições da pirâmide ficam nas séries detalhadas; a observação diz
//    “pirâmide”.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho no lugar dos da ficha (60 s / 90 s).
//  • Padrão de toda ficha (./regras): até a falha (RIR 0) e aquecimento no 1º
//    exercício (nos Treinos A e C a prancha fica fora e o aquecimento vai no
//    seguinte). Prancha por tempo: "60s".
// Correspondências: “Abdominal prancha” = Prancha frontal; “Agachamento com
// Barra Livre” = Agachamento livre com barra; “Leg press 180” = Leg press
// horizontal; “Elevação pélvica” = Hip thrust com barra (como nas outras
// fichas); “Remada baixa pegada aberta” = Remada sentada pegada aberta;
// “Remada Unilateral Halteres” = Remada unilateral com halter (serrote);
// “Puxada Frontal pegada aberta pronada” = Puxada frontal aberta (pulley);
// “Crucifixo inverso com halter banco 30° pegada pronada” = Crucifixo
// invertido com halteres no banco inclinado; “Agachamento búlgaro halteres” =
// Agachamento búlgaro; “Panturrilha no leg press 180” = Panturrilha no leg
// press; “Crucifixo Máquina” = Crucifixo na máquina (peck deck); “Supino
// inclinado 45° halteres” = Supino inclinado com halteres; “Triceps francês na
// polia baixa com corda bilateral” = Tríceps francês na polia; “Abdominal Infra
// Banco Declinado” = Abdominal infra no banco declinado. Todos com vídeo.
// Objetivo e nível do programa como na ficha (Hipertrofia); prioridades em
// branco.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "hipertrofia-esther-intensificacao-v1";
export const NOME_ALUNA = "Esther Claro";
export const ROTULO = "Hipertrofia - Intensificação";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Agachamento livre com barra": { id: "b38e6cf3-019d-4361-b4c0-e1a45245c229", nome: "Agachamento livre com barra", grupo: "quadriceps" },
  "Leg press horizontal": { id: "e608ec0b-b0e3-45e7-8306-d60f4c91b85f", nome: "Leg press horizontal", grupo: "quadriceps" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Hip thrust com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Remada unilateral com halter (serrote)": { id: "3d20d606-7636-4a1b-8553-5875508a72a2", nome: "Remada unilateral com halter (serrote)", grupo: "costas" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Crucifixo invertido com halteres no banco inclinado": { id: "34d10ab8-d4b1-4bfc-911f-902e94eda0ec", nome: "Crucifixo invertido com halteres no banco inclinado", grupo: "ombro_posterior" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Abdominal remador": { id: "ad5e0a1b-8712-4327-b218-3eab38afa918", nome: "Abdominal remador", grupo: "abdomen" },
  "Agachamento búlgaro": { id: "d7de52a6-c5d7-4eab-934c-86ad65655015", nome: "Agachamento búlgaro", grupo: "quadriceps" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Stiff com halteres": { id: "6291a3ac-5554-4c4d-a0cb-5d7b114fdda7", nome: "Stiff com halteres", grupo: "posteriores" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Supino inclinado com halteres": { id: "7f380859-dbff-48fd-82e3-e907a461d24e", nome: "Supino inclinado com halteres", grupo: "peito" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Tríceps francês na polia": { id: "05bba219-dc55-4e17-90ea-5df4bd3fee1f", nome: "Tríceps francês na polia", grupo: "triceps" },
  "Abdominal infra no banco declinado": { id: "b3eb07b6-ce28-454c-a68f-d025cb7daf1e", nome: "Abdominal infra no banco declinado", grupo: "abdomen" },
};

type Opc = { tecnica?: ExercicioInput["tecnica"]; bloco?: string | null; descansoApos?: number | null; obs?: string | null; final?: "dropset" | "rest_pause" };

function ex(nome: string, reps: string[], descansoSeg: number | null, o: Opc = {}): ExercicioInput {
  const lib = BIBLIOTECA[nome];
  if (!lib) throw new Error(`Exercício sem correspondência na biblioteca: ${nome}`);
  const iguais = reps.every((r) => r === reps[0]);
  const detalhado = !iguais || o.tecnica === "piramide" || !!o.final;
  const series_config: SerieConfig = detalhado
    ? { modo: "detalhado", series: reps.map((r, i) => ({ ordem: i + 1, reps: r, ie: null, descanso_seg: descansoSeg })) }
    : { modo: "iguais", series: reps.length, reps: reps[0], ie: null, descanso_seg: descansoSeg };
  return {
    nome: lib.nome,
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
    tecnica: o.final ?? o.tecnica ?? "normal",
    tecnica_extras: null,
    tecnica_series: null,
    tecnica_config: o.final ? { aplicar: "finalizacao", series: 1 } : null,
    descanso_apos_seg: o.descansoApos ?? null,
    cadencia: null,
    prioridade: "normal",
    bloco: o.bloco ?? null,
    unilateral: false,
    carga_alvo: null,
    conta_volume: true,
  };
}

const P20 = ["20", "15", "12", "10"];
const P15 = ["15", "12", "10", "10"];
const AUMENTAR = "Conforme diminuir as repetições, aumentar o peso!";
const ISO5_TODAS = "Em todas as séries, fazer as 5 primeiras repetições isométricas e o restante normal, explodindo!";
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string = AUMENTAR) => ex(nome, reps, null, { tecnica: "piramide", obs });
/** Pirâmide + 1 série de finalização com drop-set ou rest-pause. */
const pirFinal = (nome: string, reps: string[], final: "dropset" | "rest_pause", obs: string) => ex(nome, reps, null, { final, obs: `Pirâmide crescente. ${obs}` });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const prancha = () => ex("Prancha frontal", x(2, "60s"), null, { tecnica: "isometria", obs: "Abdominal prancha: 60 segundos." });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Hipertrofia",
    nivel: null,
    split: "Lower / Upper / Lower / Upper",
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
    treino("A", "Lower — Quadríceps e glúteo", [
      prancha(),
      pir("Agachamento livre com barra", P15),
      pir("Leg press horizontal", P15, `Leg press 180. ${AUMENTAR}`),
      pirFinal("Cadeira extensora", ["20", "15", "12", "10"], "dropset", `Fazer as 4 séries + 1 série de finalização com drop-set. 5 primeiras repetições isométricas e o restante normal, explodindo! ${AUMENTAR}`),
      pir("Cadeira abdutora", P20, `${ISO5_TODAS} ${AUMENTAR}`),
      ex("Hip thrust com barra", x(4, "10"), null, { final: "rest_pause", obs: "Elevação pélvica. Fazer as 4 séries + 1 série de finalização com rest-pause." }),
    ]),
    treino("B", "Upper — Costas, ombro posterior e bíceps", [
      pir("Remada sentada pegada aberta", P20, `Remada baixa, pegada aberta. ${ISO5_TODAS} ${AUMENTAR}`),
      pir("Remada unilateral com halter (serrote)", P20, `Com halter. ${AUMENTAR}`),
      pir("Puxada frontal aberta (pulley)", P20, `Pegada aberta pronada. ${AUMENTAR}`),
      biA("Crucifixo invertido com halteres no banco inclinado", x(4, "10"), "B1", "Banco a 30°, pegada pronada."),
      biB("Rosca martelo", x(4, "10"), "B1"),
      ex("Abdominal remador", x(4, "15"), null),
    ]),
    treino("C", "Lower — Glúteo e posteriores", [
      prancha(),
      pir("Cadeira abdutora", P20, `${ISO5_TODAS} ${AUMENTAR}`),
      pir("Agachamento búlgaro", ["12", "12", "10", "10"], `Com halteres. ${AUMENTAR}`),
      pirFinal("Hip thrust com barra", ["15", "12", "10", "10"], "rest_pause", `Elevação pélvica. Fazer as 4 séries + 1 série de finalização com rest-pause. ${AUMENTAR}`),
      pirFinal("Mesa flexora", P20, "dropset", `Fazer as 4 séries + 1 série de finalização com drop-set. Nas duas primeiras séries, fazer as 5 primeiras repetições isométricas e o restante normal, explodindo! ${AUMENTAR}`),
      biA("Stiff com halteres", x(4, "10"), "C1"),
      biB("Panturrilha no leg press", x(4, "15"), "C1", "Leg press 180."),
    ]),
    treino("D", "Upper — Peito, ombros e tríceps", [
      pir("Crucifixo na máquina (peck deck)", P20, `5 repetições isométricas + o restante normal. ${AUMENTAR}`),
      pir("Supino inclinado com halteres", P20, `Banco a 45°. ${AUMENTAR}`),
      biA("Desenvolvimento Arnold", ["12", "12", "10", "10"], "D1", AUMENTAR),
      biB("Elevação lateral com halteres", ["12", "12", "10", "10"], "D1", AUMENTAR),
      pir("Tríceps francês na polia", P20, `Polia baixa, com corda, bilateral. ${AUMENTAR}`),
      ex("Abdominal infra no banco declinado", x(4, "12"), null),
    ]),
  ],
  motivo: "Cadastro da prescrição Hipertrofia - Intensificação (Lower/Upper/Lower/Upper em sequência) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
