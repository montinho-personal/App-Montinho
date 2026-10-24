// ============================================================================
// Prescrição — Operação Pernas Poderosas · Intensificação (Brigida Cibelle
// Pereira). 4 treinos em sequência A → D: Quadríceps e glúteo / Upper em
// bi-sets / Posterior e glúteo / Abdômen e core. Fonte: prints da ficha do
// personal (24/10/2026). Mesmas convenções das fichas anteriores:
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • “Pirâmide + 1 série de finalização com drop-set/rest-pause”: o app guarda
//    UMA técnica por exercício — a de finalização (tecnica_config
//    aplicar=finalizacao, 1 série a mais) — e as repetições da pirâmide ficam
//    nas séries detalhadas (20/15/12/10…); a observação diz “pirâmide”.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Exercício por tempo: reps com a unidade (“60s”).
//  • Descansos: o PADRÃO do Montinho (1min30 entre séries, 2 min após o
//    exercício) — decisão do personal em 20/10/2026, no lugar dos da ficha.
//  • Padrão de toda ficha (./regras): até a falha (RIR 0) e aquecimento no 1º
//    exercício (a prancha fica fora; o aquecimento vai no seguinte).
// Correspondências: “Leg 45°” = Leg press 45°; “Hip thrust” = com barra;
// “Remada baixa pegada aberta” = Remada sentada pegada aberta; “Crucifixo
// inverso com halter banco 30° pegada supinada” = Crucifixo invertido com
// halteres no banco inclinado (banco 30° e pegada supinada na observação);
// “Puxada frontal pegada aberta pronada” = Puxada frontal aberta (pulley);
// “Supino inclinado 45° halteres” = Supino inclinado com halteres (banco 45°);
// “Triceps pulley barra W” = Tríceps pulley com barra W; “Agachamento búlgaro
// halteres” = Agachamento búlgaro; “Abdominal infra joelho estendido” =
// Abdominal infra (elevação de pernas deitado). “Abdominal remador banco” não
// existe na biblioteca: entra com o nome da ficha (nome livre, conta abdômen).
// Programa: nome, objetivo, nível, prioridades, observações e fase que o
// personal já tinha no app; 4 treinos em sequência (o D, de abdômen, no dia
// do aeróbico de quinta).
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "operacao-pernas-poderosas-intensificacao-v1";
export const NOME_ALUNA = "Brigida Cibelle Pereira";
export const ROTULO = "Operação Pernas Poderosas - Intensificação";

type Lib = { id: string | null; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). id null = nome livre (fora da biblioteca). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Hip thrust com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" },
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Crucifixo invertido com halteres no banco inclinado": { id: "34d10ab8-d4b1-4bfc-911f-902e94eda0ec", nome: "Crucifixo invertido com halteres no banco inclinado", grupo: "ombro_posterior" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Supino inclinado com halteres": { id: "7f380859-dbff-48fd-82e3-e907a461d24e", nome: "Supino inclinado com halteres", grupo: "peito" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Tríceps pulley com barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" },
  "Tríceps testa na polia com barra reta": { id: "a3c51e7d-2b84-4f6a-9d10-7e2b5c8f4a62", nome: "Tríceps testa na polia com barra reta", grupo: "triceps" },
  "Cadeira flexora": { id: "eecf0d46-3d2e-4d2e-a243-5ca7c04c71cf", nome: "Cadeira flexora", grupo: "posteriores" },
  "Stiff com barra": { id: "61d06eb7-f050-44a0-9e6a-3ab58cb216a3", nome: "Stiff com barra", grupo: "posteriores" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Agachamento búlgaro": { id: "d7de52a6-c5d7-4eab-934c-86ad65655015", nome: "Agachamento búlgaro", grupo: "quadriceps" },
  "Prancha lateral": { id: "49ae9226-3874-4826-8b1a-c6aae626a98b", nome: "Prancha lateral", grupo: "core" },
  "Abdominal remador": { id: "ad5e0a1b-8712-4327-b218-3eab38afa918", nome: "Abdominal remador", grupo: "abdomen" },
  "Abdominal remador no banco": { id: null, nome: "Abdominal remador no banco", grupo: "abdomen" },
  "Abdominal infra (elevação de pernas deitado)": { id: "b8fdda54-5d23-4365-9360-1a87c36767ed", nome: "Abdominal infra (elevação de pernas deitado)", grupo: "abdomen" },
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
    unilateral: false,
    carga_alvo: null,
    conta_volume: true,
  };
}

const P20 = ["20", "15", "12", "10"];
const P158 = ["15", "12", "10", "8"];
const ISO5 = "Fazer em todas as séries: 5 repetições isométricas (segurando 3 s no pico de contração) e o restante das repetições normais, explodindo.";
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string | null = null) => ex(nome, reps, null, { tecnica: "piramide", obs });
/** Pirâmide + 1 série de finalização com drop-set ou rest-pause. */
const pirFinal = (nome: string, reps: string[], final: "dropset" | "rest_pause", obs: string) => ex(nome, reps, null, { final, obs: `Pirâmide crescente. ${obs}` });
const prancha = (nome: string, n: number, obs: string | null = null) => ex(nome, x(n, "60s"), null, { tecnica: "isometria", obs });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Hipertrofia",
    nivel: "Intermediário",
    split: "Quadríceps / Upper / Posterior / Abdômen",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D"], diasPorSemana: 4 },
    metas_volume: {},
    prioridades: ["quadriceps", "posteriores", "gluteo"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    // Texto que o personal já tinha escrito no programa da Brigida (sem mudança).
    observacoes:
      "Intensidade: Pirâmide crescente, Bi-set.\nAdaptações: Trabalhar bastante mobilidade de tornozelo. Trabalhar bastante mobilidade de ombro. Rolo/liberação miofascial: Redondo maior, levantador de escapula, panturrilhas, quadríceps, posterior de coxa. Colocar anilha no calcanhar para fazer agachamento.\nAntes de cada treino: Aquecimento, Mobilidade, Alongamentos, Ativação, Core.\nAeróbico: 20–30 min, 1x por semana (quinta-feira), Intensidade moderada-alta.\nFases: 1 · Fase 1: Adaptação (4 sem); 2 · Fase 2: Intensificação (4 sem); 3 · Fase 3: Manutenção. (4 sem).",
    fase: "intensificacao",
  },
  treinos: [
    treino("A", "Quadríceps e glúteo", [
      prancha("Prancha frontal", 1),
      pir("Cadeira extensora", P20, ISO5),
      pir("Agachamento no Smith", P158, "Colocar duas anilhas no chão (as de 1 kg) ou alguma plataforma para apoiar o calcanhar. Descer o máximo que sua amplitude deixar. Abrir um pouco as pernas (mais ou menos um pouco mais da linha do ombro) e apontar as pontas dos pés para fora (joelho acompanha a linha dos pés)."),
      pir("Leg press 45°", P158, "Igual no agachamento: abrir um pouco mais as pernas, pontas dos pés e joelhos apontados para fora. Descer o máximo que sua amplitude deixar."),
      pirFinal("Hip thrust com barra", P20, "rest_pause", `Fazer as 4 séries normais + a última, de finalização, com rest-pause. ${ISO5}`),
      pirFinal("Cadeira abdutora", ["15", "12", "10", "10"], "dropset", `Fazer 4 séries normais + 1 série de finalização com drop-set! ${ISO5}`),
    ]),
    treino("B", "Upper completo — costas, ombro, bíceps, peito e tríceps", [
      biA("Remada sentada pegada aberta", P20, "B1", `Remada baixa, pegada aberta. ${ISO5}`),
      biB("Crucifixo invertido com halteres no banco inclinado", x(4, "12"), "B1", "Banco a 30°, pegada supinada."),
      biA("Puxada frontal aberta (pulley)", ["15", "15", "12", "12"], "B2", "Pegada aberta pronada."),
      biB("Rosca martelo", ["15", "15", "12", "12"], "B2"),
      biA("Supino inclinado com halteres", x(4, "15"), "B3", "Banco a 45°."),
      biB("Elevação lateral com halteres", x(4, "15"), "B3"),
      biA("Tríceps pulley com barra W", x(4, "12"), "B4"),
      biB("Tríceps testa na polia com barra reta", x(4, "12"), "B4"),
    ]),
    treino("C", "Posterior de coxa e glúteo", [
      prancha("Prancha frontal", 1),
      pir("Cadeira flexora", P20, ISO5),
      pir("Stiff com barra", ["12", "12", "10", "8"]),
      pirFinal("Mesa flexora", P20, "dropset", "Fazer as 4 séries + 1 série de finalização com drop-set."),
      pir("Agachamento búlgaro", ["12", "10", "8", "8"], "Com halteres."),
      pirFinal("Cadeira abdutora", P20, "rest_pause", `Fazer as 4 séries + 1 série de finalização com rest-pause! ${ISO5}`),
    ]),
    treino("D", "Abdômen e core", [
      prancha("Prancha frontal", 2),
      prancha("Prancha lateral", 2, "1 série de cada lado."),
      ex("Abdominal remador", x(4, "20"), null),
      ex("Abdominal remador no banco", x(4, "20"), null),
      ex("Abdominal infra (elevação de pernas deitado)", x(4, "15"), null, { obs: "Joelho estendido." }),
    ]),
  ],
  motivo: "Cadastro da prescrição Operação Pernas Poderosas - Intensificação a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [
  "“Abdominal remador banco” não existe na biblioteca: entrou com esse nome (sem vídeo). Se for outro exercício da biblioteca, me diga qual.",
  "“Abdominal infra joelho estendido”: usei o deitado (elevação de pernas). Se for o da máquina (pernas estendidas), eu troco.",
];
