// ============================================================================
// Prescrição — Projeto Ex-Merendeira (Natália). Upper/Lower em sequência
// (A Lower → B Upper → C Lower → D Upper → recomeça), sem dias fixos:
// “não existe treino perdido, existe o próximo treino”. Prioridade nas pernas
// (quadríceps e posteriores, com glúteos e panturrilhas).
// Fonte: ficha do personal (prints de 22/10/2026). Mesmas convenções das
// fichas anteriores (padrão do Montinho):
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (1min30 entre séries, 2 min após o
//    exercício), no lugar dos descansos da ficha.
//  • RIR “-” fica sem definição (null); RIR 0 = zero repetições em reserva.
//  • Cargas nunca preenchidas.
// Correspondências: “Leg press 45” = Leg press 45°; “Remada polia baixa
// triângulo” = Remada sentada na polia (triângulo); “Rosca direta banco 45°”
// = Rosca inclinada com halteres (sinônimo “rosca direta banco inclinado”);
// “Bom dia” = Bom dia no hack (0060, nome pedido pelo personal); “Elevação frontal alternada” = Elevação frontal
// com halteres (alternada fica na observação); “Panturrilha leg 45°” =
// Panturrilha no leg press 45° (criada em 0056); “Abdominal supra na polia”
// = em pé (como na ficha do Denis); “Elevação pélvica” = Hip thrust com barra
// (como na ficha da Adriana).
//  • Padrão de toda ficha (./regras, 22/10/2026): até a falha (RIR 0) e
//    aquecimento no 1º exercício de cada treino.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "projeto-ex-merendeira-v1";
export const NOME_ALUNA = "Natalia Cristina Nascimento";
export const ROTULO = "Projeto Ex-Merendeira";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Abdominal infra no banco declinado": { id: "b3eb07b6-ce28-454c-a68f-d025cb7daf1e", nome: "Abdominal infra no banco declinado", grupo: "abdomen" },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
  "Remada cavalinho": { id: "36e38a20-0695-4a54-8da3-84e9109b1cc3", nome: "Remada cavalinho", grupo: "costas" },
  "Remada sentada na polia (triângulo)": { id: "cc8733da-aae1-4661-9fbb-ef1182fcee6e", nome: "Remada sentada na polia (triângulo)", grupo: "costas" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Crucifixo invertido com halteres": { id: "e5b30bcf-fa11-42aa-9a21-bdba639a0821", nome: "Crucifixo invertido com halteres", grupo: "ombro_posterior" },
  "Rosca inclinada com halteres": { id: "d4b90aa6-1dd4-4fef-8970-efffaf143b1d", nome: "Rosca inclinada com halteres", grupo: "biceps" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Levantamento terra sumô": { id: "24c806bd-ea67-4d37-8791-ba280334ab30", nome: "Levantamento terra sumô", grupo: "gluteo" },
  "Hip thrust com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" },
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Bom dia no hack": { id: "5b1e8c3a-7d2f-4e6a-9b0c-2f4d6a8e1c60", nome: "Bom dia no hack", grupo: "posteriores" },
  "Panturrilha no leg press 45°": { id: "8f3c2d71-5a4e-4b9a-9c1d-6e2f7a8b0c45", nome: "Panturrilha no leg press 45°", grupo: "panturrilha" },
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Elevação frontal com halteres": { id: "79cc36a3-b65e-44e0-9b10-5ce393a0c167", nome: "Elevação frontal com halteres", grupo: "ombro_anterior" },
  "Face pull": { id: "fb2e0476-069a-4d41-b929-0eb1186c423d", nome: "Face pull", grupo: "ombro_posterior" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Tríceps pulley com barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" },
};

type Opc = { tecnica?: ExercicioInput["tecnica"]; rir?: number | null; bloco?: string | null; descansoApos?: number | null; obs?: string | null };

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
    rir: o.rir ?? null,
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
    unilateral: false,
    carga_alvo: null,
    conta_volume: true,
  };
}

const P20 = ["20", "15", "12", "10"];
const P20_12 = ["20", "15", "12", "12"];
const P15 = ["15", "12", "10", "10"];
const x4 = (r: string) => [r, r, r, r];
const pir = (nome: string, reps: string[], rir: number | null, obs: string | null = null) => ex(nome, reps, null, { tecnica: "piramide", rir, obs });
const biA = (nome: string, reps: string[], bloco: string, rir: number | null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, rir });
const biB = (nome: string, reps: string[], bloco: string, rir: number | null) => ex(nome, reps, null, { tecnica: "biset", bloco, rir });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Hipertrofia com prioridade nas pernas",
    nivel: null,
    split: "Upper/Lower",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D"], diasPorSemana: 4 },
    metas_volume: {},
    prioridades: ["quadriceps", "posteriores", "gluteo", "panturrilha"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes:
      "Upper/Lower em sequência, sem dias fixos: A Lower → B Upper → C Lower → D Upper e recomeça. Perdeu um dia, faz o próximo treino da sequência (não existe treino perdido, existe o próximo treino). Prioridade: quadríceps e posteriores, com glúteos e panturrilhas; parte de cima sem exagero de volume para não tirar recuperação das pernas.",
  },
  treinos: [
    treino("A", "Lower — Quadríceps e abdômen", [
      pir("Agachamento no Smith", P15, 3),
      pir("Leg press 45°", P20, 0),
      pir("Cadeira extensora", P20, 0),
      pir("Abdominal infra no banco declinado", ["12", "10", "8", "6"], 0),
      pir("Abdominal supra na polia em pé", P20, 0),
    ]),
    treino("B", "Upper — Costas, ombros e bíceps", [
      ex("Remada cavalinho", x4("15"), null),
      pir("Remada sentada na polia (triângulo)", P20, 3),
      pir("Puxada frontal aberta (pulley)", P20, 0),
      biA("Desenvolvimento Arnold", x4("15"), "B1", 3),
      biB("Crucifixo invertido com halteres", x4("15"), "B1", null),
      pir("Rosca inclinada com halteres", P20_12, 3),
    ]),
    treino("C", "Lower — Posteriores, glúteos e panturrilha", [
      pir("Mesa flexora", P20, 0),
      ex("Levantamento terra sumô", x4("15"), null),
      biA("Hip thrust com barra", x4("10"), "C1", 3),
      biB("Cadeira abdutora", x4("20"), "C1", 3),
      pir("Bom dia no hack", P20_12, 3),
      ex("Panturrilha no leg press 45°", x4("20"), null, { rir: 3 }),
    ]),
    treino("D", "Upper — Peito, ombros, tríceps e panturrilha", [
      ex("Crucifixo na máquina (peck deck)", x4("20"), null, { rir: 3 }),
      pir("Elevação frontal com halteres", P15, 0, "Alternada (um braço de cada vez)."),
      biA("Face pull", x4("15"), "D1", 3),
      biB("Elevação lateral com halteres", x4("15"), "D1", null),
      pir("Panturrilha no leg press", P20, 0),
      pir("Tríceps pulley com barra W", P20_12, 0),
    ]),
  ],
  motivo: "Cadastro da prescrição Projeto Ex-Merendeira (Upper/Lower em sequência) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
