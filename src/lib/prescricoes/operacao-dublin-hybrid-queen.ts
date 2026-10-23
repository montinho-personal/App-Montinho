// ============================================================================
// Prescrição — Operação Dublin Hybrid Queen (Ana Santos). 4 treinos em
// sequência A → D, musculação com os exercícios de HYROX em bi-set nos blocos
// finais. Fonte: prints da ficha do personal (23/10/2026).
// Mesmas convenções das fichas anteriores:
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Exercício por tempo: reps com a unidade (“30s”, “60s”).
//  • Descansos: o PADRÃO do Montinho (1min30 entre séries, 2 min após o
//    exercício) — decisão do personal em 20/10/2026, no lugar dos da ficha.
//  • Padrão de toda ficha (./regras): até a falha (RIR 0) e aquecimento no 1º
//    exercício. A prancha e os de condicionamento (trenó, corda naval, remo,
//    caminhada do fazendeiro) ficam fora: são por tempo e não contam volume.
//    Cargas nunca preenchidas.
// Correspondências: “Supino inclinado 45° halteres” = Supino inclinado com
// halteres (banco a 45° na observação); “Puxada frontal pegada aberta
// pronada” = Puxada frontal aberta (pulley); “Battle rope” = Corda naval;
// “Farmers carry” = Caminhada do fazendeiro; “Leg press 45” = Leg press 45°;
// “Walking lunges” = Passada andando; “Sled push/pull” = Empurrar/Puxar o
// trenó; “Abdominal supra na polia” = em pé; “Crucifixo máquina” = peck
// deck; “Remada baixa pegada aberta” = Remada sentada pegada aberta; “Rower”
// = Remo ergômetro; “Sandbag box step-up” = Subida no banco com sandbag, na
// caixa; “Hip thrust” = com barra. A observação “No sandbag, fazer 10 cada
// perna!” estava no agachamento sumô da ficha e vai para o step-up, que é o
// exercício com sandbag. Os exercícios de HYROX entraram na biblioteca pela
// migração 0081. Objetivo, nível, divisão, prioridades e observações do
// programa: os que o personal já tinha no app para a Ana.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "operacao-dublin-hybrid-queen-v1";
export const NOME_ALUNA = "Ana Santos";
export const ROTULO = "Operação Dublin Hybrid Queen";

type Lib = { id: string; nome: string; grupo: GrupoMuscular; volume?: false };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Passada andando": { id: "8f262cae-d754-4225-9251-97215f96afc7", nome: "Passada andando", grupo: "quadriceps" },
  "Stiff com halteres": { id: "6291a3ac-5554-4c4d-a0cb-5d7b114fdda7", nome: "Stiff com halteres", grupo: "posteriores" },
  "Empurrar o trenó (sled push)": { id: "5d2a7c41-8e3b-4f19-a6d2-0c9e1b7f3a51", nome: "Empurrar o trenó (sled push)", grupo: "quadriceps", volume: false },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
  "Supino inclinado com halteres": { id: "7f380859-dbff-48fd-82e3-e907a461d24e", nome: "Supino inclinado com halteres", grupo: "peito" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Corda naval (battle rope)": { id: "2f9c4a16-d73e-4b85-8a0f-3e6b2d91c7a4", nome: "Corda naval (battle rope)", grupo: "cardio", volume: false },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Caminhada do fazendeiro": { id: "27282508-735a-470b-a55b-b5805d37777b", nome: "Caminhada do fazendeiro", grupo: "trapezio", volume: false },
  "Cadeira flexora": { id: "eecf0d46-3d2e-4d2e-a243-5ca7c04c71cf", nome: "Cadeira flexora", grupo: "posteriores" },
  "Stiff com barra": { id: "61d06eb7-f050-44a0-9e6a-3ab58cb216a3", nome: "Stiff com barra", grupo: "posteriores" },
  "Hip thrust com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" },
  "Puxar o trenó (sled pull)": { id: "8b6e0f92-3c47-4d1a-9e25-71a4c8d0b2e6", nome: "Puxar o trenó (sled pull)", grupo: "costas", volume: false },
  "Agachamento sumô": { id: "139b56d7-4eea-4449-8f7e-8ff82be170ae", nome: "Agachamento sumô", grupo: "gluteo" },
  "Subida no banco (step-up)": { id: "f0db8abe-da37-480f-b247-6d2f73637816", nome: "Subida no banco (step-up)", grupo: "quadriceps" },
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Tríceps francês com halter": { id: "8646caa6-2db5-4be3-82f6-d38add8e00eb", nome: "Tríceps francês com halter", grupo: "triceps" },
  "Remo ergômetro (rower)": { id: "6a1d8e53-0b29-4c7f-b4e1-9d5f2a8c6b30", nome: "Remo ergômetro (rower)", grupo: "cardio", volume: false },
  "Crucifixo inclinado com halteres": { id: "b8aae15b-0581-4720-b518-21026367cf80", nome: "Crucifixo inclinado com halteres", grupo: "peito" },
  "Thruster": { id: "9e4b7d20-a51c-4f63-8d97-2b0c6e3a1f85", nome: "Thruster", grupo: "quadriceps" },
};

type Opc = { tecnica?: ExercicioInput["tecnica"]; bloco?: string | null; descansoApos?: number | null; obs?: string | null };

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
    unilateral: false,
    carga_alvo: null,
    conta_volume: lib.volume !== false,
  };
}

const P158 = ["15", "12", "10", "8"];
const P1510 = ["15", "12", "10", "10"];
const P20 = ["20", "15", "12", "10"];
const ISO5 = (onde: string) => `Em todas as séries, fazer 5 repetições isométricas (segurando 3 s no pico de contração, ${onde}) e o restante normal, explodindo!`;
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string | null = null) => ex(nome, reps, null, { tecnica: "piramide", obs });
const prancha = () => ex("Prancha frontal", x(2, "60s"), null, { tecnica: "isometria" });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Recomposição corporal",
    nivel: "Intermediário",
    split: "Upper / Lower",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D"], diasPorSemana: 4 },
    metas_volume: {},
    prioridades: ["quadriceps", "posteriores", "gluteo", "abdomen"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    // Texto que o personal já tinha escrito no programa da Ana (sem mudança).
    observacoes:
      "Intensidade: Pirâmide crescente.\nAdaptações: O treino será adaptado ao desconforto nos punhos, evitando inicialmente movimentos que forcem muita extensão, como burpees tradicionais. Também haverá controle de amplitude nos agachamentos e trabalho de mobilidade para cadeia posterior, quadril e tornozelo. Além disso, os exercícios de HYROX entrarão nos blocos finais em bi-set, sempre de acordo com os equipamentos disponíveis na academia.\nAntes de cada treino: Aquecimento, Mobilidade, Alongamentos, Core.\nAeróbico: 4x ou mais/semana, Após a musculação.\nFases: 1 · Adaptação (4 sem); 2 · Intensificação (4 sem); 3 · Consolidação (4 sem).",
    fase: "adaptacao",
  },
  treinos: [
    treino("A", "Inferiores — Quadríceps e glúteo", [
      prancha(),
      pir("Agachamento no Smith", P158),
      pir("Leg press 45°", P158),
      biA("Cadeira extensora", P20, "A1", ISO5("perna em cima")),
      biB("Passada andando", x(4, "20"), "A1", "Ir aumentando o peso a cada série."),
      biA("Stiff com halteres", x(4, "10"), "A2"),
      biB("Empurrar o trenó (sled push)", x(4, "30s"), "A2"),
      pir("Abdominal supra na polia em pé", P20),
    ]),
    treino("B", "Superiores — Peito, costas, ombro e bíceps", [
      pir("Supino inclinado com halteres", P158, "Banco a 45°."),
      pir("Puxada frontal aberta (pulley)", P158, `Pegada aberta pronada. ${ISO5("com a barra no peito")}`),
      biA("Elevação lateral com halteres", x(4, "15"), "B1"),
      biB("Corda naval (battle rope)", x(4, "30s"), "B1"),
      biA("Rosca martelo", x(4, "10"), "B2"),
      biB("Caminhada do fazendeiro", x(4, "30s"), "B2"),
    ]),
    treino("C", "Inferiores — Posterior e glúteo", [
      prancha(),
      pir("Cadeira flexora", P1510, ISO5("calcanhar lá embaixo")),
      ex("Stiff com barra", ["12", "12", "10", "10"], null),
      biA("Hip thrust com barra", x(4, "12"), "C1", "Fazer TODAS as repetições isométricas (segurando 3 s no pico de contração, quadril lá no alto)."),
      biB("Puxar o trenó (sled pull)", x(4, "30s"), "C1"),
      biA("Agachamento sumô", P158, "C2", "Com halter."),
      biB("Subida no banco (step-up)", x(4, "10"), "C2", "Com sandbag, na caixa. Fazer 10 em cada perna!"),
    ]),
    treino("D", "Superiores — Peito, costas e tríceps", [
      pir("Crucifixo na máquina (peck deck)", P1510),
      pir("Remada sentada pegada aberta", P1510, "Remada baixa, pegada aberta."),
      biA("Tríceps francês com halter", x(4, "12"), "D1", "Bilateral: um halter segurado com as duas mãos."),
      biB("Remo ergômetro (rower)", x(4, "30s"), "D1"),
      biA("Crucifixo inclinado com halteres", x(4, "10"), "D2"),
      biB("Thruster", x(4, "10"), "D2", "Ram thrusters, como na ficha."),
    ]),
  ],
  motivo: "Cadastro da prescrição Operação Dublin Hybrid Queen a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [
  "Thruster: a ficha diz “Ram thrusters”. Com qual implemento (halteres, barra, sandbag)? A Ana tem desconforto nos punhos, e apoiar o peso nos ombros força a extensão do punho.",
];
