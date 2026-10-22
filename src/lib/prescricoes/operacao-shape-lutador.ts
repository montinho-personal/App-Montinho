// ============================================================================
// Prescrição — Operação Shape de Lutador (Leonardo Beltran). 5 treinos em
// sequência A → E. Fonte: prints da ficha do personal (22/10/2026).
// Mesmas convenções das fichas anteriores:
//  • Pirâmide: técnica "piramide" + séries detalhadas.
//  • Bi-set: mesmo "bloco"; 0 s entre os exercícios e o descanso da rodada no 2º.
//  • Descansos: o PADRÃO do Montinho (1min30 entre séries, 2 min após o
//    exercício) — decisão do personal em 20/10/2026, no lugar dos da ficha.
//  • Padrão de toda ficha (./regras): até a falha (RIR 0) e aquecimento no 1º
//    exercício (a prancha fica de fora e passa o aquecimento para o seguinte).
//    Por isso o “Fazer 2 séries de aquecimento…” e o “Fazer todas as séries
//    até a falha!” da ficha viram o texto padrão; o resto das observações fica
//    como o personal escreveu. Cargas nunca preenchidas.
// Correspondências: “Crucifixo máquina” = peck deck; “Supino máquina 45°” =
// Supino inclinado na máquina; “Tríceps francês na polia baixa com corda
// bilateral” = Tríceps francês na polia; “Abdominal supra na polia” = em pé;
// “Puxada frontal pegada aberta supinada” = Puxada frontal supinada; “Barra
// fixa (pull up)” = Barra fixa pronada; “Remada halteres banco inclinado” =
// apoiada no banco inclinado; “Crucifixo inverso com halter banco 30°” = no
// banco inclinado; “Leg press 180” = horizontal; “Rosca direta banco 45°” =
// Rosca inclinada com halteres; “Hip thrust” = com barra. Nomes dos treinos e
// configurações do programa: os que o personal já tinha no app para o Leo.
// ============================================================================

import type { ExercicioInput, SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SerieConfig } from "@/lib/series";
import { comRegras } from "./regras";

export const ID_PRESCRICAO = "operacao-shape-lutador-v1";
export const NOME_ALUNO = "Leonardo Beltran";
export const ROTULO = "Operação Shape de Lutador";

type Lib = { id: string; nome: string; grupo: GrupoMuscular };

/** Correspondência com a biblioteca (produção). */
export const BIBLIOTECA: Record<string, Lib> = {
  "Crucifixo na máquina (peck deck)": { id: "07b7f78e-52ee-49ba-856b-2d6cc6c3c717", nome: "Crucifixo na máquina (peck deck)", grupo: "peito" },
  "Supino reto com halteres": { id: "8dd6c638-1899-4e23-a481-d50224fab49e", nome: "Supino reto com halteres", grupo: "peito" },
  "Supino inclinado na máquina": { id: "e9eb48f3-3674-41e7-9e19-8dac06a12f2d", nome: "Supino inclinado na máquina", grupo: "peito" },
  "Elevação lateral com halteres": { id: "c572eff5-1904-42db-8e91-687b1d3705b3", nome: "Elevação lateral com halteres", grupo: "ombro_lateral" },
  "Tríceps francês na polia": { id: "05bba219-dc55-4e17-90ea-5df4bd3fee1f", nome: "Tríceps francês na polia", grupo: "triceps" },
  "Abdominal supra na polia em pé": { id: "71910fd0-ec3b-4953-ae00-18c168d693c9", nome: "Abdominal supra na polia em pé", grupo: "abdomen" },
  "Prancha frontal": { id: "f96c1647-c28a-4b98-99e0-ff89bea743d1", nome: "Prancha frontal", grupo: "core" },
  "Puxada frontal supinada": { id: "e4cbefb1-5d99-47ba-90fb-6b742d7a4ec4", nome: "Puxada frontal supinada", grupo: "costas" },
  "Barra fixa pronada": { id: "f307e4ec-108d-4f4d-b25a-aad60a2b826b", nome: "Barra fixa pronada", grupo: "costas" },
  "Remada com halteres apoiada no banco inclinado": { id: "052864ca-f355-4632-bcb1-f7981fc968d5", nome: "Remada com halteres apoiada no banco inclinado", grupo: "costas" },
  "Crucifixo invertido com halteres no banco inclinado": { id: "34d10ab8-d4b1-4bfc-911f-902e94eda0ec", nome: "Crucifixo invertido com halteres no banco inclinado", grupo: "ombro_posterior" },
  "Rosca direta com barra reta": { id: "f2f117f1-f158-43e4-b3fb-1d4e5ed852a4", nome: "Rosca direta com barra reta", grupo: "biceps" },
  "Rosca inversa (pegada pronada)": { id: "d7a2ac95-b567-4685-b726-f38299b6131a", nome: "Rosca inversa (pegada pronada)", grupo: "antebraco" },
  "Cadeira extensora": { id: "ce624289-c6c3-436f-9ecb-7f82c3bcac6d", nome: "Cadeira extensora", grupo: "quadriceps" },
  "Agachamento no Smith": { id: "3e0765c2-3c91-47ac-9601-a1ed12a11685", nome: "Agachamento no Smith", grupo: "quadriceps" },
  "Leg press horizontal": { id: "e608ec0b-b0e3-45e7-8306-d60f4c91b85f", nome: "Leg press horizontal", grupo: "quadriceps" },
  "Cadeira adutora": { id: "359bf353-1d05-4258-a3c8-632ab812b43f", nome: "Cadeira adutora", grupo: "adutores" },
  "Panturrilha no leg press": { id: "b8fe9647-34c4-4b08-b3f1-0e8341ac18f7", nome: "Panturrilha no leg press", grupo: "panturrilha" },
  "Puxada frontal aberta (pulley)": { id: "d6f9c3e8-527b-4f3c-b2d5-39d7872364f1", nome: "Puxada frontal aberta (pulley)", grupo: "costas" },
  "Remada sentada pegada aberta": { id: "e8ed7c94-a1ae-4b4c-ba07-dc8190af500e", nome: "Remada sentada pegada aberta", grupo: "costas" },
  "Meio terra no Smith": { id: "f2cdfa68-bf01-4940-a8bb-d9fe0bb75d91", nome: "Meio terra no Smith", grupo: "gluteo" },
  "Desenvolvimento Arnold": { id: "0721b959-5db6-41a3-8b97-831caac84a9b", nome: "Desenvolvimento Arnold", grupo: "ombro_anterior" },
  "Rosca inclinada com halteres": { id: "d4b90aa6-1dd4-4fef-8970-efffaf143b1d", nome: "Rosca inclinada com halteres", grupo: "biceps" },
  "Rosca martelo": { id: "8a7388a8-b426-4bf0-8d8a-d6bcf99d67d7", nome: "Rosca martelo", grupo: "biceps" },
  "Cadeira flexora": { id: "eecf0d46-3d2e-4d2e-a243-5ca7c04c71cf", nome: "Cadeira flexora", grupo: "posteriores" },
  "Mesa flexora": { id: "b6edc236-2a9b-4067-97f8-264d35a4c7e3", nome: "Mesa flexora", grupo: "posteriores" },
  "Hip thrust com barra": { id: "92cc0e3b-48ea-454a-b872-8bac4bc30d28", nome: "Hip thrust com barra", grupo: "gluteo" },
  "Levantamento terra sumô": { id: "24c806bd-ea67-4d37-8791-ba280334ab30", nome: "Levantamento terra sumô", grupo: "gluteo" },
  "Abdominal infra no banco declinado": { id: "b3eb07b6-ce28-454c-a68f-d025cb7daf1e", nome: "Abdominal infra no banco declinado", grupo: "abdomen" },
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
const P15 = ["15", "12", "10", "10"];
const ISO5 = "Em todas as séries, fazer 5 repetições isométricas (segurando 3 s no pico de contração) e o restante normal, explodindo!";
const ISO10 = "Em todas as séries, fazer 10 repetições isométricas (segurando 3 s no pico de contração) e o restante normal, explodindo!";
const CARGA = "Conforme diminuir as repetições, aumentar a carga.";
const x = (n: number, r: string) => Array.from({ length: n }, () => r);
const pir = (nome: string, reps: string[], obs: string | null = null) => ex(nome, reps, null, { tecnica: "piramide", obs });
const prancha = () => ex("Prancha frontal", x(2, "60s"), null, { tecnica: "isometria" });
const biA = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, 0, { tecnica: "biset", bloco, descansoApos: 0, obs });
const biB = (nome: string, reps: string[], bloco: string, obs: string | null = null) => ex(nome, reps, null, { tecnica: "biset", bloco, obs });
const treino = (letra: TreinoInput["letra"], nome: string, exercicios: ExercicioInput[]): TreinoInput => comRegras({ letra, nome, ativo: true, observacoes: null, exercicios });

export const PRESCRICAO: SalvarPlanoInput = {
  programa: {
    // Mantém o que o personal já tinha configurado para o Leo no app.
    nome: ROTULO,
    objetivo: "Força e performance",
    nivel: "Iniciante",
    split: "Push/Pull/Legs/Costas/Legs",
    modo_semana: "rotativo",
    frequencia: { A: 1.4, B: 1.4, C: 1.4, D: 1.4, E: 1.4 },
    calendario: { modo: "rotativo", sequencia: ["A", "B", "C", "D", "E"], diasPorSemana: 7 },
    metas_volume: {},
    prioridades: ["abdomen", "costas", "ombros", "quadriceps"],
    equipamentos: [],
    duracao_min: null,
    permite_versao_reduzida: false,
    observacoes: null,
    fase: "adaptacao",
  },
  treinos: [
    treino("A", "Push — Peito, ombros e tríceps", [
      pir("Crucifixo na máquina (peck deck)", P20, ISO5),
      pir("Supino reto com halteres", P20, CARGA),
      pir("Supino inclinado na máquina", P20, "Supino máquina 45°."),
      pir("Elevação lateral com halteres", P20, ISO5),
      pir("Tríceps francês na polia", P20, `Na polia baixa, com corda, bilateral. ${CARGA}`),
      pir("Abdominal supra na polia em pé", ["20", "20", "15", "15"]),
    ]),
    treino("B", "Pull — Costas e bíceps", [
      prancha(),
      pir("Puxada frontal supinada", P20, `Pegada aberta supinada. ${ISO5}`),
      pir("Barra fixa pronada", P20, "Caso não esteja conseguindo fazer na barra livre, fazer no graviton."),
      ex("Remada com halteres apoiada no banco inclinado", x(4, "12"), null),
      pir("Crucifixo invertido com halteres no banco inclinado", P20, "Banco a 30°, pegada pronada."),
      biA("Rosca direta com barra reta", x(3, "12"), "B1"),
      biB("Rosca inversa (pegada pronada)", x(3, "12"), "B1", "Com barra reta."),
    ]),
    treino("C", "Legs — Pernas", [
      prancha(),
      pir("Cadeira extensora", P20, `${ISO5} ${CARGA} Deixar descer o máximo a perna para alongar totalmente o quadríceps e contrair o máximo possível lá em cima. Ponta dos pés para cima.`),
      pir("Agachamento no Smith", P20, "Colocar uma anilha de 1 kg ou alguma coisa embaixo do calcanhar: isso vai te ajudar em relação à cadeia posterior encurtada. Abrir a ponta dos pés pra fora, estufar o peito, travar o abdômen e descer controlando. Cuidado para não perder a ativação do abdômen lá embaixo e para não jogar o joelho pra dentro na hora de subir: deixe-o sempre pra fora, apontando para a linha dos pés."),
      pir("Leg press horizontal", P15, "Leg press 180. Descer o máximo que conseguir, que a sua amplitude deixar. Ponta dos pés e joelhos apontados pra fora. Jogar a força e o peso no calcanhar."),
      pir("Cadeira adutora", P20, CARGA),
      ex("Panturrilha no leg press", x(4, "20"), null, { obs: `Leg press 180. ${ISO10}` }),
    ]),
    treino("D", "Costas", [
      pir("Puxada frontal aberta (pulley)", P20, `Pegada aberta pronada. ${CARGA}`),
      pir("Remada sentada pegada aberta", P20, `${ISO5} ${CARGA}`),
      pir("Meio terra no Smith", P20, CARGA),
      biA("Desenvolvimento Arnold", x(4, "12"), "D1"),
      biB("Elevação lateral com halteres", x(4, "12"), "D1"),
      biA("Rosca inclinada com halteres", x(4, "10"), "D2", "Banco a 45°. Se fizer mais repetições do que o sugerido, aumentar o peso."),
      biB("Rosca martelo", x(4, "12"), "D2"),
    ]),
    treino("E", "Legs — Pernas", [
      prancha(),
      pir("Cadeira flexora", P20, `${ISO5} ${CARGA}`),
      pir("Mesa flexora", P20, CARGA),
      pir("Hip thrust com barra", P15, `${ISO5} ${CARGA}`),
      ex("Levantamento terra sumô", x(4, "12"), null, { obs: "Aumentar o peso caso o número de repetições esteja passando do sugerido." }),
      biA("Abdominal infra no banco declinado", x(4, "12"), "E1"),
      biB("Abdominal remador", x(4, "20"), "E1"),
    ]),
  ],
  motivo: "Cadastro da prescrição Operação Shape de Lutador a partir da ficha do personal",
};

/** Pontos que dependem de confirmação do personal (nada foi inventado no lugar). */
export const PENDENCIAS: string[] = [];
