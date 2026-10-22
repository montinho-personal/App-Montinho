// ============================================================================
// Prescrição — Missão Corpo Esculpido & Punhos de Aço (Naya). 6 treinos de
// musculação na semana (Seg a Sáb) + cardio no domingo, em sequência A → F.
// Fonte: ficha do personal (prints de 22/10/2026) e estratégia do Montinho
// Strategy (22/10/2026). Mesmas convenções das fichas anteriores:
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (1min30 entre séries, 2 min após o
//    exercício) — decisão do personal em 20/10/2026, no lugar dos descansos
//    da ficha.
//  • RIR “-” fica sem definição (null). Cargas nunca preenchidas.
// Correspondências: “Leg press 180” = Leg press horizontal; “Hip thrust” =
// com barra; “Remada baixa pegada aberta” = Remada sentada pegada aberta;
// “Puxada frontal pegada aberta pronada” = Puxada frontal aberta (pulley);
// “Supino inclinado 45° halteres” = Supino inclinado com halteres;
// “Crucifixo inverso máquina pronada” = Crucifixo invertido na máquina;
// “Rosca direta banco 45°” = Rosca inclinada com halteres; “Abdominal supra
// na polia” = em pé; “Tríceps testa na polia com barra reta” criado em 0062.
// Pontos a confirmar ficam em PENDENCIAS (nada inventado no lugar).
// Atualização (22/10/2026, prints da ficha com as observações):
//  • Técnicas avançadas da ficha nas observações (repetições isométricas de 3 s
//    no pico de contração, ajustes de execução).
//  • Padrão de toda ficha (./regras): até a falha e aquecimento no 1º exercício.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "missao-corpo-esculpido-v1";
export const NOME_ALUNA = "Naya Martins Ribeiro de Oliveira";
export const ROTULO = "Missão Corpo Esculpido & Punhos de Aço";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press 45°": { id: "7c787c53-d34f-44a6-bed7-8873f3766db1", nome: "Leg press 45°", grupo: "quadriceps" },
  "Cadeira abdutora": { id: "ffd14873-53a6-48f9-afc3-a743531ab9d0", nome: "Cadeira abdutora", grupo: "gluteo" },
  "Hip thrust com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Remada sentada na polia (triângulo)": { id: "cc8733da-aae1-4661-9fbb-ef1182fcee6e", nome: "Remada sentada na polia (triângulo)", grupo: "costas" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Cadeira flexora": { id: "eecf0d46-3d2e-4d2e-a243-5ca7c04c71cf", nome: "Cadeira flexora", grupo: "posteriores" },
  "Stiff com barra": { id: "61d06eb7-f050-44a0-9e6a-3ab58cb216a3", nome: "Stiff com barra", grupo: "posteriores" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Glúteo coice na polia": { id: "1cdcd583-8a70-4dd4-a403-f73d6c4c96d5", nome: "Glúteo coice na polia", grupo: "gluteo" },
  "Agachamento búlgaro": { id: "d7de52a6-c5d7-4eab-934c-86ad65655015", nome: "Agachamento búlgaro", grupo: "quadriceps" },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
  "Supino inclinado com halteres": { id: "7f380859-dbff-48fd-82e3-e907a461d24e", nome: "Supino inclinado com halteres", grupo: "peito" },
  "Pulldown com braços estendidos": { id: "8c68c0b7-c856-4407-9e52-d3b4edecb9e6", nome: "Pulldown com braços estendidos", grupo: "costas" },
  "Crucifixo invertido na máquina": { id: "79fb46d3-9590-48a5-aeca-e4743d870265", nome: "Crucifixo invertido na máquina", grupo: "ombro_posterior" },
  "Tríceps pulley com barra W": { id: "b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e", nome: "Tríceps pulley com barra W", grupo: "triceps" },
  "Tríceps testa na polia com barra reta": { id: "a3c51e7d-2b84-4f6a-9d10-7e2b5c8f4a62", nome: "Tríceps testa na polia com barra reta", grupo: "triceps" },
  "Tríceps francês na polia": { id: "05bba219-dc55-4e17-90ea-5df4bd3fee1f", nome: "Tríceps francês na polia", grupo: "triceps" },
  "Tríceps francês com halter": { id: "8646caa6-2db5-4be3-82f6-d38add8e00eb", nome: "Tríceps francês com halter", grupo: "triceps" },
  "Leg press horizontal": { id: "e608ec0b-b0e3-45e7-8306-d60f4c91b85f", nome: "Leg press horizontal", grupo: "quadriceps" },
  "Rosca inversa (pegada pronada)": { id: "d7a2ac95-b567-4685-b726-f38299b6131a", nome: "Rosca inversa (pegada pronada)", grupo: "antebraco" },
  "Rosca inclinada com halteres": { id: "d4b90aa6-1dd4-4fef-8970-efffaf143b1d", nome: "Rosca inclinada com halteres", grupo: "biceps" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Panturrilha sentado": { id: "052fd2e5-9e43-4f0c-80cf-e91d4ea663d1", nome: "Panturrilha sentado", grupo: "panturrilha" },
  "Abdominal remador": { id: "ad5e0a1b-8712-4327-b218-3eab38afa918", nome: "Abdominal remador", grupo: "abdomen" },
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
const ISO5 = "Fazer em todas as séries: 5 repetições isométricas (segurando 3 s no pico de contração) e o restante das repetições normais, explodindo.";
const ISO10 = "Fazer em todas as séries: 10 repetições isométricas (segurando 3 s no pico de contração) e o restante das repetições normais, explodindo.";
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string | null = null) => ex(nome, reps, null, { tecnica: "piramide", rir: 3, obs });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, rir: 3, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, rir: 3, obs });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    nome: ROTULO,
    objetivo: "Emagrecimento",
    nivel: "Intermediário",
    split: "6 dias + cardio no domingo",
    modo_semana: "rotativo",
    frequencia: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D", "E", "F"], diasPorSemana: 6 },
    metas_volume: {},
    prioridades: ["gluteo", "quadriceps", "posteriores", "biceps", "triceps"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes:
      "Sequência A → F (Seg a Sáb) e cardio no domingo; aeróbico de 20–30 min após a musculação. Punhos: strap quando precisar e pegada neutra. Antes de cada treino: mobilidade de posterior, quadril, tornozelo e torácica, ativação e core. Viagens a trabalho: adaptar sem perder a constância.",
  },
  treinos: [
    treino("A", "Glúteos + Quadríceps", [
      ex("Prancha frontal", x(2, "60s"), null, { tecnica: "isometria", rir: 3 }),
      pir("Cadeira extensora", P20, ISO5),
      pir("Agachamento no Smith", ["15", "12", "10", "8"], "Colocar duas anilhas de 1 kg no chão (ou uma plataforma) para apoiar o calcanhar. Pés um pouco além da linha do ombro, pontas para fora e joelhos acompanhando a linha dos pés. Descer o máximo que a sua amplitude deixar."),
      pir("Leg press 45°", ["15", "12", "10", "8"], "Como no agachamento: pernas um pouco mais abertas, pontas dos pés e joelhos para fora. Descer o máximo que a sua amplitude deixar."),
      pir("Cadeira abdutora", P20, ISO5),
      pir("Hip thrust com barra", P20, ISO5),
    ]),
    treino("B", "Costas + Ombros + Bíceps", [
      pir("Remada sentada pegada aberta", P20, ISO5),
      pir("Remada sentada na polia (triângulo)", P20),
      pir("Puxada frontal aberta (pulley)", P20, "Pegada aberta pronada."),
      biA("Desenvolvimento Arnold", ["12", "12", "10", "10"], "B1"),
      biB("Elevação lateral com halteres", ["12", "12", "10", "10"], "B1"),
      pir("Rosca martelo", P20),
    ]),
    treino("C", "Posterior de Coxa + Glúteos + Abdômen", [
      pir("Cadeira flexora", P20, ISO5),
      pir("Stiff com barra", ["12", "12", "10", "8"]),
      pir("Mesa flexora", P20),
      pir("Glúteo coice na polia", ["15", "15", "12", "10"], "Pode fazer com a perna esticada ou flexionada, tanto faz: veja o vídeo e escolha a que preferir."),
      pir("Agachamento búlgaro", ["12", "10", "8", "8"], "Com halteres."),
      ex("Abdominal supra na polia em pé", x(4, "20"), null),
    ]),
    treino("D", "Peito + Costas + Tríceps", [
      pir("Supino inclinado com halteres", P20, "Banco a 45°."),
      pir("Pulldown com braços estendidos", P20, "Com barra."),
      pir("Crucifixo invertido na máquina", P20, "Pegada pronada."),
      pir("Tríceps pulley com barra W", P20, ISO5),
      ex("Tríceps testa na polia com barra reta", x(4, "12"), null),
      ex("Tríceps francês na polia", x(4, "10"), null, { obs: "Polia baixa, com corda, unilateral (um braço de cada vez)." }),
    ]),
    treino("E", "Lower completo", [
      pir("Leg press horizontal", P20),
      ex("Agachamento búlgaro", x(4, "12"), null, { obs: "Com halteres. Começar sempre pela perna mais fraca; na mais forte, fazer o mesmo número de repetições que conseguiu na mais fraca." }),
      pir("Cadeira flexora", ["15", "12", "10", "10"]),
      pir("Mesa flexora", P20),
      pir("Cadeira abdutora", P20, ISO5),
    ]),
    treino("F", "Músculos pequenos — Tríceps, Bíceps, Panturrilhas e Abdômen", [
      ex("Tríceps francês com halter", x(3, "12"), null, { rir: 3, obs: "Unilateral (um braço de cada vez)." }),
      biA("Tríceps pulley com barra W", x(3, "12"), "F1"),
      biB("Tríceps testa na polia com barra reta", x(3, "12"), "F1"),
      biA("Rosca inversa (pegada pronada)", x(3, "12"), "F2", "Com barra reta."),
      biB("Rosca martelo", x(3, "12"), "F2"),
      pir("Rosca inclinada com halteres", P20, "Banco a 45°."),
      ex("Panturrilha no leg press", x(4, "20"), null, { obs: `Leg press 180 (horizontal). ${ISO10}` }),
      pir("Panturrilha sentado", P20),
      ex("Abdominal remador", x(4, "15"), null),
    ]),
  ],
  motivo: "Cadastro da prescrição Missão Corpo Esculpido & Punhos de Aço a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
