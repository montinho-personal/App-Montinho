// ============================================================================
// Prescrição — Miss Terraços Tamboré (Upper / Lower / Upper / Lower, 4×/semana).
// Fonte de verdade: prescrição do personal (não alterar ordem, séries,
// repetições, descansos, RIR nem técnicas sem autorização).
//
// Como o app representa cada coisa:
//  • Pirâmide: técnica "piramide" + séries detalhadas (reps e descanso por série).
//  • Bi-set: técnica "biset" + mesmo "bloco" → um agrupamento na tela; cada
//    exercício segue independente para carga, reps e histórico. Descanso 0 s no
//    1º exercício (execução imediata do 2º) e o descanso da rodada no 2º.
//  • Exercício por tempo: repetições "60s" (o cálculo de tempo usa 60 s).
//  • Descansos: o PADRÃO do Montinho (1min30 entre séries, 2 min após o
//    exercício) — decisão do personal em 20/10/2026, no lugar dos descansos
//    individuais da ficha. Por isso ficam sem definição (null = padrão).
//  • RIR não informado fica sem definição (null).
//  • RIR 0 = zero repetições em reserva (não é “sem RIR”).
//  • Cargas: nunca preenchidas.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";

export const ID_PRESCRICAO = "miss-terracos-tambore-v1";
/** Nome real da aluna no app; “Miss Terraços Tamboré” é o rótulo da ficha. */
export const NOME_ALUNA = "Adriana Nascimento";
export const ROTULO = "Miss Terraços Tamboré";

type Lib = { id: string; nome: string; grupo: GrupoMuscular } | null;

/** Correspondência com a biblioteca (produção). null = sem correspondência confiável. */
export const BIBLIOTECA: Record<string, Lib> = {
  "Abdominal prancha": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" as GrupoMuscular },
  "Elevação pélvica com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" }, // confirmado: com barra
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press horizontal (180°)": { id: "e608ec0b-b0e3-45e7-8306-d60f4c91b85f", nome: "Leg press horizontal", grupo: "quadriceps" }, // confirmado
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Remada baixa pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Remada unilateral halteres": { id: "3d20d606-7636-4a1b-8553-5875508a72a2", nome: "Remada unilateral com halter (serrote)", grupo: "costas" },
  "Puxada frontal pegada aberta pronada": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Crucifixo inverso máquina pronada": { id: "79fb46d3-9590-48a5-aeca-e4743d870265", nome: "Crucifixo invertido na máquina", grupo: "ombro_posterior" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Agachamento búlgaro halteres": { id: "d7de52a6-c5d7-4eab-934c-86ad65655015", nome: "Agachamento búlgaro", grupo: "quadriceps" },
  "Levantamento terra sumô": { id: "24c806bd-ea67-4d37-8791-ba280334ab30", nome: "Levantamento terra sumô", grupo: "gluteo" },
  "Cadeira flexora": { id: "eecf0d46-3d2e-4d2e-a243-5ca7c04c71cf", nome: "Cadeira flexora", grupo: "posteriores" },
  "Stiff com halteres": { id: "6291a3ac-5554-4c4d-a0cb-5d7b114fdda7", nome: "Stiff com halteres", grupo: "posteriores" },
  "Panturrilha no leg press horizontal (180°)": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Crucifixo máquina": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Supino inclinado 45° halteres": { id: "7f380859-dbff-48fd-82e3-e907a461d24e", nome: "Supino inclinado com halteres", grupo: "peito" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Tríceps pulley barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" }, // criado na biblioteca (0023)
};

/** Grupo muscular quando não há correspondência na biblioteca (o grupo é inequívoco). */
const GRUPO_SEM_BIBLIOTECA: Record<string, GrupoMuscular> = {};

type Opc = { tecnica?: ExercicioInput["tecnica"]; rir?: number | null; bloco?: string | null; descansoApos?: number | null };

function ex(nome: string, reps: string[], descansoSeg: number | null, o: Opc = {}): ExercicioInput {
  const lib = BIBLIOTECA[nome];
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
    biblioteca_id: lib?.id ?? null,
    grupo_muscular: lib?.grupo ?? GRUPO_SEM_BIBLIOTECA[nome] ?? null,
    grupos_secundarios: [],
    grupo_origem: lib ? "biblioteca" : "manual",
    grupo_confianca: lib ? "alta" : "media",
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
const pir = (nome: string, reps: string[], desc: number | null, rir: number | null) => ex(nome, reps, desc, { tecnica: "piramide", rir });
const prancha = () => ex("Abdominal prancha", ["60s"], null, { tecnica: "isometria" });
/** 1º exercício do bi-set: sem descanso entre os movimentos. */
const biA = (nome: string, reps: string[], bloco: string) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0 });
/** 2º exercício do bi-set: descanso da rodada = padrão entre séries. */
const biB = (nome: string, reps: string[], bloco: string) => ex(nome, reps, null, { tecnica: "biset", bloco });
const x4 = (r: string) => [r, r, r, r];

const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[], observacoes: string | null = null): TreinoInput => ({ letra, nome, ativo: true, observacoes, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Glúteos e membros inferiores",
    nivel: null,
    split: "Upper/Lower/Upper/Lower",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D"], diasPorSemana: 4 },
    metas_volume: {},
    prioridades: ["gluteo", "quadriceps", "posteriores", "panturrilha"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: "Prioridades: glúteos, membros inferiores e fortalecimento de panturrilhas (pratica corrida). Treinos A e C prioritariamente acompanhados presencialmente pelo personal.",
  },
  treinos: [
    treino("A", "Lower — Quadríceps e glúteos", [
      prancha(),
      pir("Elevação pélvica com barra", P20, null, 0),
      pir("Agachamento no Smith", ["15", "12", "10", "10"], null, 3),
      pir("Leg press horizontal (180°)", P20, null, 3),
      pir("Cadeira extensora", P20, null, 3),
      pir("Cadeira abdutora", P20, null, 3),
    ], "Acompanhado presencialmente pelo personal."),
    treino("B", "Upper — Costas, bíceps e glúteos", [
      pir("Remada baixa pegada aberta", P20, null, null),
      pir("Remada unilateral halteres", P20, null, 3),
      pir("Puxada frontal pegada aberta pronada", P20, null, 3),
      biA("Crucifixo inverso máquina pronada", x4("10"), "B1"),
      biB("Rosca martelo", x4("10"), "B1"),
      ex("Cadeira abdutora", x4("15"), null),
    ]),
    treino("C", "Lower — Posteriores, glúteos e panturrilhas", [
      prancha(),
      pir("Cadeira abdutora", P20, null, 3),
      pir("Agachamento búlgaro halteres", ["12", "12", "10", "10"], null, 3),
      pir("Levantamento terra sumô", ["15", "12", "10", "10"], null, 0),
      pir("Cadeira flexora", P20, null, 3),
      biA("Stiff com halteres", x4("10"), "C1"),
      biB("Panturrilha no leg press horizontal (180°)", x4("15"), "C1"),
    ], "Acompanhado presencialmente pelo personal."),
    treino("D", "Upper — Peitoral, ombros e tríceps", [
      pir("Crucifixo máquina", P20, null, null),
      pir("Supino inclinado 45° halteres", P20, null, 3),
      biA("Desenvolvimento Arnold", ["12", "12", "10", "10"], "D1"),
      biB("Elevação lateral com halteres", ["12", "12", "10", "10"], "D1"),
      pir("Tríceps pulley barra W", P20, null, 3),
      ex("Panturrilha no leg press horizontal (180°)", x4("20"), null),
    ]),
  ],
  motivo: "Cadastro da prescrição (Upper/Lower 4×/semana) a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
