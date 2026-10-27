// ============================================================================
// Prescrição — Projeto Deusa dos Glúteos (Nathalia Berti Cardozo). 5 treinos
// em sequência A → E. Fonte: prints da ficha do personal (28/10/2026). A ordem
// A → E segue a hora dos prints (o 1º print = A); os nomes dos treinos vieram
// cortados na tela e foram completados (ver PENDENCIAS).
// Mesmas convenções da Operação Pernas Poderosas:
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • “Pirâmide + DROP-SET/REST-PAUSE”: o app guarda UMA técnica por exercício —
//    a de finalização (tecnica_config aplicar=finalizacao, 1 série a mais) — e
//    as repetições da pirâmide ficam nas séries detalhadas; a observação diz
//    “pirâmide”.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (decisão do personal em 20/10/2026), no
//    lugar dos da ficha (60/90/180 s).
//  • Padrão de toda ficha (./regras): até a falha (RIR 0, no lugar do RIR 3) e
//    aquecimento no 1º exercício.
// Correspondências: “Agachamento búlgaro halteres” = Agachamento búlgaro;
// “Hip Thrust” = com barra; “Stiff com Halteres” = Stiff com halteres;
// “Panturrilha no leg press 180” = Panturrilha no leg press; “Remada baixa
// pegada aberta” = Remada sentada pegada aberta; “Puxada frontal pegada aberta
// pronada” = Puxada frontal aberta (pulley); “Crucifixo inverso máquina
// pronada” = Crucifixo invertido na máquina; “Abdominal supra na polia” = em
// pé; “Leg press 45” = Leg press 45°; “Panturrilha leg 45°” = Panturrilha no
// leg press 45°; “Crucifixo Máquina” = peck deck; “Remada Unilateral
// Halteres” = Remada unilateral com halter (serrote); “Tríceps francês na
// polia baixa com corda bilateral” = Tríceps francês na polia; “Abdominal
// Infra Banco Declinado” = Abdominal infra no banco declinado; “Leg press
// 180” = Leg press horizontal. Objetivo: o do cadastro dela. Todos os
// exercícios têm vídeo.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "projeto-deusa-dos-gluteos-v1";
export const NOME_ALUNA = "Nathalia Berti Cardozo";
export const ROTULO = "Projeto Deusa dos Glúteos";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Agachamento búlgaro": { id: "d7de52a6-c5d7-4eab-934c-86ad65655015", nome: "Agachamento búlgaro", grupo: "quadriceps" },
  "Hip thrust com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" },
  "Cadeira flexora": { id: "eecf0d46-3d2e-4d2e-a243-5ca7c04c71cf", nome: "Cadeira flexora", grupo: "posteriores" },
  "Stiff com halteres": { id: "6291a3ac-5554-4c4d-a0cb-5d7b114fdda7", nome: "Stiff com halteres", grupo: "posteriores" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Crucifixo invertido na máquina": { id: "79fb46d3-9590-48a5-aeca-e4743d870265", nome: "Crucifixo invertido na máquina", grupo: "ombro_posterior" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Panturrilha no leg press 45°": { id: "8f3c2d71-5a4e-4b9a-9c1d-6e2f7a8b0c45", nome: "Panturrilha no leg press 45°", grupo: "panturrilha" },
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Remada unilateral com halter (serrote)": { id: "3d20d606-7636-4a1b-8553-5875508a72a2", nome: "Remada unilateral com halter (serrote)", grupo: "costas" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Tríceps francês na polia": { id: "05bba219-dc55-4e17-90ea-5df4bd3fee1f", nome: "Tríceps francês na polia", grupo: "triceps" },
  "Abdominal infra no banco declinado": { id: "b3eb07b6-ce28-454c-a68f-d025cb7daf1e", nome: "Abdominal infra no banco declinado", grupo: "abdomen" },
  "Levantamento terra sumô": { id: "24c806bd-ea67-4d37-8791-ba280334ab30", nome: "Levantamento terra sumô", grupo: "gluteo" },
  "Leg press horizontal": { id: "e608ec0b-b0e3-45e7-8306-d60f4c91b85f", nome: "Leg press horizontal", grupo: "quadriceps" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
};

type Opc = { tecnica?: ExercicioInput["tecnica"]; bloco?: string | null; descansoApos?: number | null; obs?: string | null; final?: "dropset" | "rest_pause"; unilateral?: boolean };

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
    grupo_origem: lib.id ? "biblioteca" : "manual",
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
    unilateral: o.unilateral ?? false,
    carga_alvo: null,
    conta_volume: true,
  };
}

const P20 = ["20", "15", "12", "10"];
const P15 = ["15", "12", "10", "10"];
const P12 = ["12", "12", "10", "10"];
const ISO5 = "Em todas as séries, fazer as 5 primeiras repetições isométricas (segurando 3 s no pico de contração) e o restante explodindo (normal).";
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string | null = null, unilateral = false) => ex(nome, reps, null, { tecnica: "piramide", obs, unilateral });
/** Pirâmide + 1 série de finalização com drop-set ou rest-pause. */
const pirFinal = (nome: string, reps: string[], final: "dropset" | "rest_pause", obs: string) => ex(nome, reps, null, { final, obs: `Pirâmide crescente + 1 série de finalização com ${final === "dropset" ? "drop-set" : "rest-pause"}. ${obs}`.trim() });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Recomposição corporal",
    nivel: null,
    split: "Glúteo/Costas/Quadríceps/Upper/Lower",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1, E: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D", "E"], diasPorSemana: 5 },
    metas_volume: {},
    prioridades: ["gluteo", "posteriores", "quadriceps"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: null,
    fase: null,
  },
  treinos: [
    treino("A", "Glúteos + Posterior de coxa", [
      pir("Cadeira abdutora", P20, ISO5),
      pir("Agachamento búlgaro", P12, "Com halteres."),
      pirFinal("Hip thrust com barra", P15, "rest_pause", "Em TODAS as séries e repetições, segurar 3 s no pico de contração (com o glúteo lá em cima, apertando ele mesmo e contraindo)."),
      pirFinal("Cadeira flexora", P20, "dropset", "Nas duas primeiras séries, fazer as 5 primeiras repetições isométricas e o restante explodindo (normal). Nas outras duas séries, pode fazer normal, sem a isometria nas primeiras repetições!"),
      biA("Stiff com halteres", x(4, "10"), "A1"),
      biB("Panturrilha no leg press", x(4, "15"), "A1", "Leg press 180."),
    ]),
    treino("B", "Costas + ombros + bíceps", [
      pir("Remada sentada pegada aberta", P20, `Remada baixa, pegada aberta. ${ISO5}`),
      pir("Puxada frontal aberta (pulley)", P20, "Pegada aberta pronada."),
      pir("Elevação lateral com halteres", P20),
      biA("Crucifixo invertido na máquina", x(4, "10"), "B1", "Pegada pronada."),
      biB("Rosca martelo", x(4, "10"), "B1"),
      ex("Abdominal supra na polia em pé", x(4, "15"), null),
    ]),
    treino("C", "Quadríceps + glúteos", [
      pir("Agachamento no Smith", P15, "Fazer 2 séries de aquecimento antes, bem levinho. Longe da falha!"),
      pirFinal("Leg press 45°", P15, "rest_pause", ""),
      pirFinal("Cadeira extensora", P20, "dropset", ""),
      pir("Cadeira abdutora", P20, ISO5),
      pir("Panturrilha no leg press 45°", ["20", "20", "15", "12"], "Em TODAS as séries, fazer as 5 primeiras repetições isométricas (segurando 3 s no pico de contração, calcanhar lá em cima) e o restante explodindo (normal)."),
    ]),
    treino("D", "Upper completo + abdômen", [
      pir("Crucifixo na máquina (peck deck)", P20, ISO5),
      pir("Remada unilateral com halter (serrote)", P20, null, true),
      biA("Desenvolvimento Arnold", P12, "D1", "Conforme diminuir as repetições, aumentar o peso."),
      biB("Elevação lateral com halteres", P12, "D1"),
      pir("Tríceps francês na polia", P20, "Na polia baixa, com corda, bilateral."),
      ex("Abdominal infra no banco declinado", x(4, "12"), null),
    ]),
    treino("E", "Lower completo", [
      pir("Cadeira abdutora", P20, ISO5),
      pir("Levantamento terra sumô", P12),
      pirFinal("Leg press horizontal", P15, "dropset", "Leg press 180."),
      pirFinal("Mesa flexora", P20, "rest_pause", "Nas duas primeiras séries, fazer as 5 primeiras repetições isométricas e o restante explodindo (normal)."),
      biA("Stiff com halteres", x(4, "10"), "E1"),
      biB("Panturrilha no leg press", x(4, "15"), "E1", "Leg press 180."),
    ]),
  ],
  motivo: "Cadastro da prescrição Projeto Deusa dos Glúteos (5 treinos em sequência, A → E) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [
  "Ordem A → E pela hora dos prints (A = Glúteos + Posterior, B = Costas + ombros, C = Quadríceps, D = Upper completo, E = Lower completo).",
  "Nomes dos treinos B, C e D estavam cortados na tela (“Costas + ombros +…”, “Quadríceps +…”, “Upper Completo +…”): completei como “+ bíceps”, “+ glúteos” e “+ abdômen”.",
];
