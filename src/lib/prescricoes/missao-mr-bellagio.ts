// ============================================================================
// Prescrição — Missão Mr. Bellagio (Denis Cruz). Push / Pull / Legs / Push /
// Pull, 5×/semana, segunda a sexta. Fonte: ficha do personal (prints de
// 20/10/2026). Mesmas convenções da Miss Terraços Tamboré:
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (1min30 entre séries, 2 min após o
//    exercício) — decisão do personal, no lugar dos descansos da ficha.
//  • RIR não informado fica sem definição (null). Cargas nunca preenchidas.
// Decisões do personal: abdominal supra = em pé; supino 45° = inclinado na
// máquina; hip thrust = com barra; rosca direta = barra reta; sexta sem
// panturrilha (como na ficha); rosca inversa na polia conta como bíceps.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";

export const ID_PRESCRICAO = "missao-mr-bellagio-v1";
export const NOME_ALUNO = "Denis Cruz";
export const ROTULO = "Missão Mr. Bellagio";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Supino reto com barra": { id: "6bcec612-f016-4644-ba88-9bf07615995f", nome: "Supino reto com barra", grupo: "peito" },
  "Supino inclinado na máquina": { id: "e9eb48f3-3674-41e7-9e19-8dac06a12f2d", nome: "Supino inclinado na máquina", grupo: "peito" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Tríceps francês na polia": { id: "05bba219-dc55-4e17-90ea-5df4bd3fee1f", nome: "Tríceps francês na polia", grupo: "triceps" },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Puxada frontal supinada": { id: "e4cbefb1-5d99-47ba-90fb-6b742d7a4ec4", nome: "Puxada frontal supinada", grupo: "costas" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Remada com halteres apoiada no banco inclinado": { id: "052864ca-f355-4632-bcb1-f7981fc968d5", nome: "Remada com halteres apoiada no banco inclinado", grupo: "costas" },
  "Crucifixo invertido com halteres no banco inclinado": { id: "34d10ab8-d4b1-4bfc-911f-902e94eda0ec", nome: "Crucifixo invertido com halteres no banco inclinado", grupo: "ombro_posterior" },
  "Rosca direta com barra reta": { id: "f2f117f1-f158-43e4-b3fb-1d4e5ed852a4", nome: "Rosca direta com barra reta", grupo: "biceps" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Hip thrust com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Leg press horizontal": { id: "e608ec0b-b0e3-45e7-8306-d60f4c91b85f", nome: "Leg press horizontal", grupo: "quadriceps" },
  "Cadeira flexora": { id: "eecf0d46-3d2e-4d2e-a243-5ca7c04c71cf", nome: "Cadeira flexora", grupo: "posteriores" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Supino reto com halteres": { id: "8dd6c638-1899-4e23-a481-d50224fab49e", nome: "Supino reto com halteres", grupo: "peito" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Tríceps pulley com barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" },
  "Abdominal infra no banco declinado": { id: "b3eb07b6-ce28-454c-a68f-d025cb7daf1e", nome: "Abdominal infra no banco declinado", grupo: "abdomen" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  // criados na biblioteca em 20/10/2026 para esta ficha
  "Remada sentada na polia pegada supinada": { id: "4758918a-0043-4f14-b7da-0396bb585791", nome: "Remada sentada na polia pegada supinada", grupo: "costas" },
  "Face pull": { id: "fb2e0476-069a-4d41-b929-0eb1186c423d", nome: "Face pull", grupo: "ombro_posterior" },
  "Rosca inclinada com halteres": { id: "d4b90aa6-1dd4-4fef-8970-efffaf143b1d", nome: "Rosca inclinada com halteres", grupo: "biceps" },
  "Rosca inversa na polia com barra W": { id: "76ffc05a-adb1-46fd-b97b-864e9023834b", nome: "Rosca inversa na polia com barra W", grupo: "biceps" },
  "Abdominal remador": { id: "ad5e0a1b-8712-4327-b218-3eab38afa918", nome: "Abdominal remador", grupo: "abdomen" },
};

type Opc = { tecnica?: ExercicioInput["tecnica"]; rir?: number | null; bloco?: string | null; descansoApos?: number | null };

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
    observacoes: null,
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
const x4 = (r: string) => [r, r, r, r];
const pir = (nome: string, reps: string[] = P20, rir: number | null = 3) => ex(nome, reps, null, { tecnica: "piramide", rir });
const prancha = () => ex("Prancha frontal", ["60s", "60s"], null, { tecnica: "isometria" });
const biA = (nome: string, reps: string[], bloco: string, rir: number | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, rir });
const biB = (nome: string, reps: string[], bloco: string, rir: number | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, rir });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => ({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Hipertrofia",
    nivel: null,
    split: "Push/Pull/Legs/Push/Pull",
    modo_semana: "fixa",
    frequencia: { A: 1, B: 1, C: 1, D: 1, E: 1 },
    calendario: { modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 2, letra: "B" }, { dia: 3, letra: "C" }, { dia: 4, letra: "D" }, { dia: 5, letra: "E" }] },
    metas_volume: {},
    prioridades: [],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: "Push / Pull / Legs / Push / Pull — segunda a sexta.",
  },
  treinos: [
    treino("A", "Push — Peito, ombro e tríceps", [
      pir("Crucifixo na máquina (peck deck)"),
      pir("Supino reto com barra"),
      pir("Supino inclinado na máquina"),
      pir("Elevação lateral com halteres"),
      ex("Tríceps francês na polia", x4("12"), null),
      ex("Abdominal supra na polia em pé", x4("20"), null),
    ]),
    treino("B", "Pull — Costas, posterior de ombro e bíceps", [
      prancha(),
      pir("Puxada frontal supinada"),
      pir("Puxada frontal aberta (pulley)"),
      ex("Remada com halteres apoiada no banco inclinado", x4("12"), null),
      pir("Crucifixo invertido com halteres no banco inclinado"),
      pir("Rosca direta com barra reta"),
      ex("Rosca martelo", x4("12"), null),
    ]),
    treino("C", "Legs — Quadríceps e posterior", [
      prancha(),
      biA("Cadeira abdutora", ["15", "12", "10", "10"], "C1", 3),
      biB("Hip thrust com barra", x4("12"), "C1", 3),
      pir("Cadeira extensora"),
      pir("Leg press horizontal", ["15", "12", "10", "10"]),
      pir("Cadeira flexora"),
      ex("Panturrilha no leg press", x4("20"), null, { rir: 3 }),
    ]),
    treino("D", "Push — Peito, ombro e abdômen", [
      pir("Crucifixo na máquina (peck deck)"),
      pir("Supino reto com halteres"),
      biA("Desenvolvimento Arnold", x4("12"), "D1"),
      biB("Elevação lateral com halteres", x4("12"), "D1"),
      pir("Tríceps pulley com barra W"),
      ex("Abdominal infra no banco declinado", x4("10"), null, { rir: 3 }),
    ]),
    treino("E", "Pull — Costas, posterior de ombro e bíceps", [
      prancha(),
      pir("Remada sentada pegada aberta"),
      pir("Remada sentada na polia pegada supinada"),
      pir("Face pull"),
      ex("Rosca inclinada com halteres", x4("12"), null),
      biA("Rosca inversa na polia com barra W", x4("15"), "E1"),
      biB("Rosca martelo", x4("15"), "E1"),
      ex("Abdominal remador", x4("15"), null),
    ]),
  ],
  motivo: "Cadastro da prescrição Missão Mr. Bellagio (Push/Pull/Legs/Push/Pull 5×/semana) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
