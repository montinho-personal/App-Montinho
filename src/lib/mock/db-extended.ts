import type {
  Anamnese,
  CheckIn,
  Conhecimento,
  ExercicioBiblioteca,
  Foto,
  Mensagem,
  Solicitacao,
  TemplateTreino,
} from "@/lib/supabase/types-extended";

// ============================================================================
// Biblioteca de Exercícios — primeiros 24 que o Pedro vai gravar
// ============================================================================
export const mockBiblioteca: ExercicioBiblioteca[] = [
  // Peito
  { id: "ex-bib-001", nome: "Supino reto barra",        slug: "supino-reto-barra",        grupo_muscular: "peito",  grupos_secundarios: ["triceps", "ombros"], equipamento: ["barra", "banco"], video_provider: "youtube", video_id: "rT7DgCr-3pg", thumbnail_url: null, duracao_seg: 45, descricao: "Exercício composto para peito.", instrucoes: ["Deite no banco com os pés firmes no chão", "Pegue a barra com pegada média", "Desça controlado até tocar o peito", "Empurre explosivo até estender os braços"], observacoes: null, dificuldade: 3, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-002", nome: "Supino inclinado halter",  slug: "supino-inclinado-halter",  grupo_muscular: "peito",  grupos_secundarios: ["triceps", "ombros"], equipamento: ["halter", "banco"], video_provider: "youtube", video_id: "8iPEnn-ltC8", thumbnail_url: null, duracao_seg: 40, descricao: null, instrucoes: [], observacoes: null, dificuldade: 3, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-003", nome: "Crucifixo máquina",        slug: "crucifixo-maquina",        grupo_muscular: "peito",  grupos_secundarios: [],                    equipamento: ["maquina"], video_provider: "youtube", video_id: "Z57CtFmRMxA", thumbnail_url: null, duracao_seg: 35, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },

  // Costas
  { id: "ex-bib-010", nome: "Puxada frontal aberta",    slug: "puxada-frontal-aberta",    grupo_muscular: "costas", grupos_secundarios: ["biceps"],            equipamento: ["polia"], video_provider: "youtube", video_id: "CAwf7n6Luuc", thumbnail_url: null, duracao_seg: 40, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-011", nome: "Remada baixa triângulo",   slug: "remada-baixa-triangulo",   grupo_muscular: "costas", grupos_secundarios: ["biceps"],            equipamento: ["polia"], video_provider: "youtube", video_id: "GZbfZ033f74", thumbnail_url: null, duracao_seg: 40, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-012", nome: "Remada serrote unilateral",slug: "remada-serrote",           grupo_muscular: "costas", grupos_secundarios: ["biceps"],            equipamento: ["halter", "banco"], video_provider: "youtube", video_id: "roCP6wCXPqo", thumbnail_url: null, duracao_seg: 40, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },

  // Pernas
  { id: "ex-bib-020", nome: "Hack machine",             slug: "hack-machine",             grupo_muscular: "quadriceps", grupos_secundarios: ["gluteo"],            equipamento: ["maquina"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 50, descricao: null, instrucoes: [], observacoes: null, dificuldade: 3, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-021", nome: "Leg press 45º",            slug: "leg-press-45",             grupo_muscular: "quadriceps", grupos_secundarios: ["gluteo"],            equipamento: ["maquina"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 50, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-022", nome: "Cadeira extensora",        slug: "cadeira-extensora",        grupo_muscular: "quadriceps", grupos_secundarios: [],                    equipamento: ["maquina"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 35, descricao: null, instrucoes: [], observacoes: null, dificuldade: 1, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-023", nome: "Mesa flexora",             slug: "mesa-flexora",             grupo_muscular: "posteriores", grupos_secundarios: ["gluteo"],            equipamento: ["maquina"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 35, descricao: null, instrucoes: [], observacoes: null, dificuldade: 1, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-024", nome: "Stiff barra",              slug: "stiff-barra",              grupo_muscular: "posteriores", grupos_secundarios: ["gluteo", "lombar"],  equipamento: ["barra"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 40, descricao: null, instrucoes: [], observacoes: null, dificuldade: 3, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-025", nome: "Glúteo coice polia",       slug: "gluteo-coice-polia",       grupo_muscular: "gluteo", grupos_secundarios: [],                    equipamento: ["polia"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 30, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-026", nome: "Panturrilha em pé",        slug: "panturrilha-em-pe",        grupo_muscular: "panturrilha", grupos_secundarios: [],               equipamento: ["maquina"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 30, descricao: null, instrucoes: [], observacoes: null, dificuldade: 1, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },

  // Braços
  { id: "ex-bib-030", nome: "Tríceps testa barra W",    slug: "triceps-testa-barra-w",    grupo_muscular: "triceps",grupos_secundarios: [],                    equipamento: ["barra", "banco"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 35, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-031", nome: "Tríceps corda polia",      slug: "triceps-corda-polia",      grupo_muscular: "triceps",grupos_secundarios: [],                    equipamento: ["polia", "corda"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 30, descricao: null, instrucoes: [], observacoes: null, dificuldade: 1, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-032", nome: "Rosca direta barra W",     slug: "rosca-direta-barra-w",     grupo_muscular: "biceps", grupos_secundarios: ["antebraco"],         equipamento: ["barra"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 35, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-033", nome: "Rosca martelo halter",     slug: "rosca-martelo-halter",     grupo_muscular: "biceps", grupos_secundarios: ["antebraco"],         equipamento: ["halter"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 30, descricao: null, instrucoes: [], observacoes: null, dificuldade: 1, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },

  // Ombros
  { id: "ex-bib-040", nome: "Desenvolvimento halter",   slug: "desenvolvimento-halter",   grupo_muscular: "ombros", grupos_secundarios: ["triceps"],           equipamento: ["halter", "banco"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 40, descricao: null, instrucoes: [], observacoes: null, dificuldade: 3, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-041", nome: "Elevação lateral",         slug: "elevacao-lateral",         grupo_muscular: "ombros", grupos_secundarios: [],                    equipamento: ["halter"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 30, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-042", nome: "Encolhimento halter",      slug: "encolhimento-halter",      grupo_muscular: "ombros", grupos_secundarios: [],                    equipamento: ["halter"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 25, descricao: null, instrucoes: [], observacoes: null, dificuldade: 1, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },

  // Core / Cardio
  { id: "ex-bib-050", nome: "Prancha frontal",          slug: "prancha-frontal",          grupo_muscular: "core",   grupos_secundarios: [],                    equipamento: ["peso_corporal"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 30, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-051", nome: "Abdominal infra",          slug: "abdominal-infra",          grupo_muscular: "abdomen",grupos_secundarios: [],                    equipamento: ["peso_corporal"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 25, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-052", nome: "Russian twist",            slug: "russian-twist",            grupo_muscular: "core",   grupos_secundarios: [],                    equipamento: ["halter"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 30, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-060", nome: "Esteira inclinada",        slug: "esteira-inclinada",        grupo_muscular: "cardio", grupos_secundarios: [],                    equipamento: ["esteira"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 60, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
  { id: "ex-bib-061", nome: "Bike ergométrica",         slug: "bike-ergometrica",         grupo_muscular: "cardio", grupos_secundarios: [],                    equipamento: ["bike"], video_provider: null, video_id: null, thumbnail_url: null, duracao_seg: 60, descricao: null, instrucoes: [], observacoes: null, dificuldade: 2, arquivado: false, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
];

// ============================================================================
// Helper pra montar exercícios de template usando a biblioteca
// ============================================================================
type TemplateExercicio = TemplateTreino["estrutura"][string]["exercicios"][number];

function ex(slug: string, series: number, reps: string, ie: number | null = 8, descanso = 60): TemplateExercicio | null {
  const b = mockBiblioteca.find((x) => x.slug === slug);
  if (!b) return null;
  return {
    biblioteca_id: b.id,
    nome: b.nome,
    series,
    reps,
    ie,
    descanso_seg: descanso,
  };
}

function clean<T>(arr: Array<T | null>): T[] {
  return arr.filter((x): x is T => x !== null);
}

// ============================================================================
// Templates de Treino — biblioteca pré-populada
// ============================================================================
export const mockTemplates: TemplateTreino[] = [
  {
    id: "tpl-001",
    nome: "Iniciante Feminino · Hipertrofia",
    descricao: "Programa A/B/C/D/E focado em construção de base muscular. Volume moderado, foco em aprendizado técnico.",
    publico_alvo: "Mulher iniciante (0-6 meses de treino)",
    numero_treinos: 5,
    estrutura: {
      A: {
        nome: "Peito · Tríceps · Abdômen",
        exercicios: clean([
          ex("supino-reto-barra", 3, "10-12", 7, 90),
          ex("supino-inclinado-halter", 3, "10-12", 7, 75),
          ex("crucifixo-maquina", 3, "12-15", 7, 60),
          ex("triceps-corda-polia", 3, "12-15", 7, 60),
          ex("prancha-frontal", 3, "30s", 7, 45),
        ]),
      },
      B: {
        nome: "Costas · Bíceps",
        exercicios: clean([
          ex("puxada-frontal-aberta", 3, "10-12", 7, 90),
          ex("remada-baixa-triangulo", 3, "10-12", 7, 75),
          ex("remada-serrote", 3, "10-12", 7, 60),
          ex("rosca-direta-barra-w", 3, "10-12", 7, 60),
          ex("rosca-martelo-halter", 3, "10-12", 7, 60),
        ]),
      },
      C: {
        nome: "Pernas · Glúteo",
        exercicios: clean([
          ex("leg-press-45", 4, "12-15", 7, 120),
          ex("cadeira-extensora", 3, "12-15", 7, 60),
          ex("mesa-flexora", 3, "12-15", 7, 60),
          ex("stiff-barra", 3, "10-12", 7, 75),
          ex("gluteo-coice-polia", 3, "15 cada perna", 7, 45),
          ex("panturrilha-em-pe", 3, "15-20", 7, 45),
        ]),
      },
      D: {
        nome: "Ombros · Trapézio",
        exercicios: clean([
          ex("desenvolvimento-halter", 3, "10-12", 7, 75),
          ex("elevacao-lateral", 3, "12-15", 7, 60),
          ex("encolhimento-halter", 3, "12-15", 7, 60),
          ex("abdominal-infra", 3, "15-20", 7, 45),
        ]),
      },
      E: {
        nome: "Cardio · Core",
        exercicios: clean([
          ex("esteira-inclinada", 1, "20min", 7, 0),
          ex("prancha-frontal", 3, "45s", 7, 30),
          ex("russian-twist", 3, "20 reps", 7, 30),
        ]),
      },
    },
    uso_count: 12,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },

  {
    id: "tpl-002",
    nome: "Iniciante Masculino · Hipertrofia",
    descricao: "Base de hipertrofia em 4 dias. Foco em padrões compostos e ganho de força mensurável.",
    publico_alvo: "Homem iniciante (0-12 meses)",
    numero_treinos: 4,
    estrutura: {
      A: {
        nome: "Peito · Ombro · Tríceps",
        exercicios: clean([
          ex("supino-reto-barra", 4, "8-10", 8, 120),
          ex("supino-inclinado-halter", 3, "10-12", 8, 90),
          ex("desenvolvimento-halter", 3, "10-12", 8, 90),
          ex("elevacao-lateral", 3, "12-15", 7, 60),
          ex("triceps-testa-barra-w", 3, "10-12", 8, 75),
          ex("triceps-corda-polia", 3, "12-15", 7, 60),
        ]),
      },
      B: {
        nome: "Costas · Bíceps",
        exercicios: clean([
          ex("puxada-frontal-aberta", 4, "8-10", 8, 120),
          ex("remada-baixa-triangulo", 3, "10-12", 8, 90),
          ex("remada-serrote", 3, "10-12", 7, 60),
          ex("rosca-direta-barra-w", 3, "10-12", 8, 75),
          ex("rosca-martelo-halter", 3, "10-12", 7, 60),
        ]),
      },
      C: {
        nome: "Pernas Completo",
        exercicios: clean([
          ex("hack-machine", 4, "10-12", 8, 150),
          ex("leg-press-45", 3, "12-15", 8, 120),
          ex("cadeira-extensora", 3, "12-15", 7, 60),
          ex("mesa-flexora", 3, "12-15", 7, 60),
          ex("stiff-barra", 3, "8-10", 8, 90),
          ex("panturrilha-em-pe", 4, "12-15", 7, 45),
        ]),
      },
      D: {
        nome: "Ombros · Braços · Core",
        exercicios: clean([
          ex("desenvolvimento-halter", 3, "8-10", 8, 90),
          ex("elevacao-lateral", 4, "12-15", 7, 60),
          ex("encolhimento-halter", 3, "12-15", 7, 60),
          ex("rosca-martelo-halter", 3, "10-12", 7, 60),
          ex("triceps-corda-polia", 3, "12-15", 7, 60),
          ex("prancha-frontal", 3, "60s", 7, 30),
        ]),
      },
    },
    uso_count: 7,
    created_at: "2026-04-05T00:00:00Z",
    updated_at: "2026-04-05T00:00:00Z",
  },

  {
    id: "tpl-003",
    nome: "Push · Pull · Legs (PPL) Clássico",
    descricao: "6 dias por semana com 2x cada padrão. Alto volume para hipertrofia avançada.",
    publico_alvo: "Homem ou mulher intermediário/avançado",
    numero_treinos: 6,
    estrutura: {
      A: {
        nome: "Push 1 (peito heavy)",
        exercicios: clean([
          ex("supino-reto-barra", 4, "6-8", 9, 150),
          ex("supino-inclinado-halter", 4, "8-10", 8, 120),
          ex("crucifixo-maquina", 3, "12-15", 8, 75),
          ex("desenvolvimento-halter", 3, "8-10", 8, 90),
          ex("triceps-testa-barra-w", 3, "10-12", 8, 75),
        ]),
      },
      B: {
        nome: "Pull 1 (costas heavy)",
        exercicios: clean([
          ex("puxada-frontal-aberta", 4, "6-8", 9, 150),
          ex("remada-serrote", 4, "8-10", 8, 90),
          ex("remada-baixa-triangulo", 3, "10-12", 8, 75),
          ex("rosca-direta-barra-w", 3, "8-10", 8, 75),
          ex("rosca-martelo-halter", 3, "10-12", 7, 60),
        ]),
      },
      C: {
        nome: "Legs 1 (quadríceps focus)",
        exercicios: clean([
          ex("hack-machine", 4, "8-10", 9, 180),
          ex("leg-press-45", 4, "10-12", 8, 150),
          ex("cadeira-extensora", 4, "12-15", 8, 60),
          ex("mesa-flexora", 3, "10-12", 7, 75),
          ex("panturrilha-em-pe", 4, "12-15", 7, 45),
        ]),
      },
      D: {
        nome: "Push 2 (ombro/tríceps focus)",
        exercicios: clean([
          ex("desenvolvimento-halter", 4, "6-8", 9, 150),
          ex("elevacao-lateral", 5, "12-15", 8, 45),
          ex("supino-inclinado-halter", 3, "10-12", 8, 90),
          ex("crucifixo-maquina", 3, "12-15", 7, 60),
          ex("triceps-corda-polia", 4, "12-15", 8, 60),
        ]),
      },
      E: {
        nome: "Pull 2 (bíceps/dorsal focus)",
        exercicios: clean([
          ex("remada-baixa-triangulo", 4, "8-10", 9, 120),
          ex("puxada-frontal-aberta", 3, "10-12", 8, 90),
          ex("remada-serrote", 3, "10-12", 7, 60),
          ex("rosca-direta-barra-w", 4, "8-10", 8, 75),
          ex("rosca-martelo-halter", 4, "10-12", 8, 60),
        ]),
      },
      F: {
        nome: "Legs 2 (posterior/glúteo)",
        exercicios: clean([
          ex("stiff-barra", 4, "6-8", 9, 150),
          ex("mesa-flexora", 4, "10-12", 8, 75),
          ex("leg-press-45", 4, "12-15", 8, 120),
          ex("gluteo-coice-polia", 3, "12-15", 8, 60),
          ex("panturrilha-em-pe", 4, "15-20", 7, 45),
        ]),
      },
    },
    uso_count: 4,
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },

  {
    id: "tpl-004",
    nome: "Upper · Lower (4 dias)",
    descricao: "2 superiores + 2 inferiores. Ótima frequência por grupo (2x/sem).",
    publico_alvo: "Intermediário com 4 dias disponíveis",
    numero_treinos: 4,
    estrutura: {
      A: {
        nome: "Upper Heavy (força)",
        exercicios: clean([
          ex("supino-reto-barra", 4, "5-6", 9, 150),
          ex("puxada-frontal-aberta", 4, "5-6", 9, 150),
          ex("desenvolvimento-halter", 3, "8-10", 8, 90),
          ex("remada-baixa-triangulo", 3, "8-10", 8, 90),
          ex("rosca-direta-barra-w", 3, "8-10", 8, 75),
          ex("triceps-testa-barra-w", 3, "8-10", 8, 75),
        ]),
      },
      B: {
        nome: "Lower Heavy (força)",
        exercicios: clean([
          ex("hack-machine", 4, "5-6", 9, 180),
          ex("stiff-barra", 4, "5-6", 9, 150),
          ex("leg-press-45", 3, "10-12", 8, 120),
          ex("cadeira-extensora", 3, "10-12", 8, 60),
          ex("panturrilha-em-pe", 4, "8-10", 8, 45),
        ]),
      },
      C: {
        nome: "Upper Volume (hipertrofia)",
        exercicios: clean([
          ex("supino-inclinado-halter", 4, "10-12", 8, 90),
          ex("remada-serrote", 4, "10-12", 8, 75),
          ex("elevacao-lateral", 4, "12-15", 7, 60),
          ex("crucifixo-maquina", 3, "12-15", 7, 60),
          ex("rosca-martelo-halter", 3, "12-15", 7, 60),
          ex("triceps-corda-polia", 3, "12-15", 7, 60),
        ]),
      },
      D: {
        nome: "Lower Volume (hipertrofia)",
        exercicios: clean([
          ex("leg-press-45", 4, "12-15", 8, 120),
          ex("mesa-flexora", 4, "10-12", 8, 75),
          ex("cadeira-extensora", 4, "12-15", 7, 60),
          ex("gluteo-coice-polia", 4, "12-15", 7, 60),
          ex("panturrilha-em-pe", 4, "15-20", 7, 45),
          ex("abdominal-infra", 3, "15-20", 7, 45),
        ]),
      },
    },
    uso_count: 6,
    created_at: "2026-04-12T00:00:00Z",
    updated_at: "2026-04-12T00:00:00Z",
  },

  {
    id: "tpl-005",
    nome: "Full Body Iniciante (3x/sem)",
    descricao: "Treino completo em 3 dias. Ideal pra começar do zero, frequência alta por grupo.",
    publico_alvo: "Quem está começando do zero",
    numero_treinos: 3,
    estrutura: {
      A: {
        nome: "Full Body A",
        exercicios: clean([
          ex("hack-machine", 3, "10-12", 7, 90),
          ex("supino-reto-barra", 3, "10-12", 7, 90),
          ex("puxada-frontal-aberta", 3, "10-12", 7, 90),
          ex("desenvolvimento-halter", 2, "10-12", 7, 75),
          ex("rosca-direta-barra-w", 2, "12", 7, 60),
          ex("triceps-corda-polia", 2, "12", 7, 60),
          ex("prancha-frontal", 2, "30s", 7, 30),
        ]),
      },
      B: {
        nome: "Full Body B",
        exercicios: clean([
          ex("stiff-barra", 3, "10-12", 7, 90),
          ex("supino-inclinado-halter", 3, "10-12", 7, 90),
          ex("remada-serrote", 3, "10-12", 7, 75),
          ex("elevacao-lateral", 3, "12-15", 7, 60),
          ex("rosca-martelo-halter", 2, "12", 7, 60),
          ex("abdominal-infra", 2, "15", 7, 45),
        ]),
      },
      C: {
        nome: "Full Body C",
        exercicios: clean([
          ex("leg-press-45", 3, "12-15", 7, 90),
          ex("crucifixo-maquina", 3, "12-15", 7, 60),
          ex("remada-baixa-triangulo", 3, "10-12", 7, 75),
          ex("cadeira-extensora", 2, "12-15", 7, 60),
          ex("mesa-flexora", 2, "12-15", 7, 60),
          ex("panturrilha-em-pe", 3, "15-20", 7, 45),
        ]),
      },
    },
    uso_count: 9,
    created_at: "2026-04-15T00:00:00Z",
    updated_at: "2026-04-15T00:00:00Z",
  },

  {
    id: "tpl-006",
    nome: "Glúteo Focus (5x/sem)",
    descricao: "Programa focado em glúteo com alta frequência. Dia leg/glute dedicado.",
    publico_alvo: "Mulher com objetivo principal de glúteo",
    numero_treinos: 5,
    estrutura: {
      A: {
        nome: "Glúteo Heavy",
        exercicios: clean([
          ex("hack-machine", 4, "8-10", 8, 120),
          ex("stiff-barra", 4, "8-10", 8, 120),
          ex("gluteo-coice-polia", 4, "12-15 cada", 8, 60),
          ex("mesa-flexora", 3, "12-15", 7, 60),
        ]),
      },
      B: {
        nome: "Peito · Tríceps",
        exercicios: clean([
          ex("supino-reto-barra", 3, "10-12", 7, 75),
          ex("supino-inclinado-halter", 3, "12", 7, 60),
          ex("triceps-corda-polia", 3, "12-15", 7, 60),
        ]),
      },
      C: {
        nome: "Glúteo Volume",
        exercicios: clean([
          ex("leg-press-45", 4, "15-20", 8, 90),
          ex("gluteo-coice-polia", 4, "15-20 cada", 8, 45),
          ex("stiff-barra", 3, "12", 8, 75),
          ex("mesa-flexora", 4, "12-15", 7, 60),
          ex("panturrilha-em-pe", 3, "15-20", 7, 45),
        ]),
      },
      D: {
        nome: "Costas · Bíceps",
        exercicios: clean([
          ex("puxada-frontal-aberta", 3, "10-12", 7, 75),
          ex("remada-serrote", 3, "10-12", 7, 60),
          ex("rosca-direta-barra-w", 3, "10-12", 7, 60),
        ]),
      },
      E: {
        nome: "Glúteo Finisher · Core",
        exercicios: clean([
          ex("gluteo-coice-polia", 5, "15 cada", 8, 30),
          ex("cadeira-extensora", 3, "15-20", 7, 60),
          ex("prancha-frontal", 3, "60s", 7, 30),
          ex("russian-twist", 3, "20", 7, 30),
        ]),
      },
    },
    uso_count: 5,
    created_at: "2026-04-20T00:00:00Z",
    updated_at: "2026-04-20T00:00:00Z",
  },

  {
    id: "tpl-007",
    nome: "Emagrecimento · Cardio Integrado",
    descricao: "Treino híbrido força + cardio em todos os dias. Foco em déficit calórico.",
    publico_alvo: "Quem busca emagrecer com base de força",
    numero_treinos: 4,
    estrutura: {
      A: {
        nome: "Full Body + Cardio",
        exercicios: clean([
          ex("esteira-inclinada", 1, "10min aquecimento", 6, 60),
          ex("leg-press-45", 3, "15-20", 7, 60),
          ex("supino-inclinado-halter", 3, "12-15", 7, 60),
          ex("puxada-frontal-aberta", 3, "12-15", 7, 60),
          ex("prancha-frontal", 3, "45s", 7, 30),
          ex("esteira-inclinada", 1, "15min HIIT", 8, 0),
        ]),
      },
      B: {
        nome: "Upper + Cardio",
        exercicios: clean([
          ex("supino-reto-barra", 3, "12-15", 7, 60),
          ex("remada-serrote", 3, "12-15", 7, 60),
          ex("desenvolvimento-halter", 3, "12-15", 7, 60),
          ex("rosca-direta-barra-w", 3, "12", 7, 45),
          ex("triceps-corda-polia", 3, "12", 7, 45),
          ex("esteira-inclinada", 1, "20min steady", 7, 0),
        ]),
      },
      C: {
        nome: "Lower + Core + Cardio",
        exercicios: clean([
          ex("hack-machine", 3, "15-20", 7, 60),
          ex("mesa-flexora", 3, "15-20", 7, 60),
          ex("gluteo-coice-polia", 3, "15 cada", 7, 45),
          ex("russian-twist", 3, "20", 7, 30),
          ex("abdominal-infra", 3, "15-20", 7, 30),
          ex("esteira-inclinada", 1, "20min HIIT", 8, 0),
        ]),
      },
      D: {
        nome: "Cardio Longo + Mobilidade",
        exercicios: clean([
          ex("esteira-inclinada", 1, "40-60min steady state", 6, 0),
          ex("prancha-frontal", 4, "45s", 7, 30),
        ]),
      },
    },
    uso_count: 3,
    created_at: "2026-04-25T00:00:00Z",
    updated_at: "2026-04-25T00:00:00Z",
  },

  {
    id: "tpl-008",
    nome: "Cutting Avançado (5 dias)",
    descricao: "Manter massa em déficit. Alto volume, RPE moderado pra recuperação em déficit calórico.",
    publico_alvo: "Avançado em fase de definição",
    numero_treinos: 5,
    estrutura: {
      A: {
        nome: "Peito · Tríceps · Core",
        exercicios: clean([
          ex("supino-reto-barra", 4, "8-10", 8, 90),
          ex("supino-inclinado-halter", 4, "10-12", 8, 75),
          ex("crucifixo-maquina", 3, "15", 8, 60),
          ex("triceps-testa-barra-w", 3, "10-12", 8, 75),
          ex("triceps-corda-polia", 3, "15", 7, 45),
          ex("prancha-frontal", 3, "60s", 8, 30),
        ]),
      },
      B: {
        nome: "Costas · Bíceps",
        exercicios: clean([
          ex("puxada-frontal-aberta", 4, "8-10", 8, 90),
          ex("remada-baixa-triangulo", 4, "10-12", 8, 75),
          ex("remada-serrote", 3, "10-12", 7, 60),
          ex("rosca-direta-barra-w", 4, "10-12", 8, 60),
          ex("rosca-martelo-halter", 3, "12-15", 7, 60),
        ]),
      },
      C: {
        nome: "Pernas Completo",
        exercicios: clean([
          ex("hack-machine", 4, "10-12", 8, 120),
          ex("leg-press-45", 3, "15-20", 8, 90),
          ex("mesa-flexora", 4, "12-15", 8, 60),
          ex("stiff-barra", 3, "10-12", 8, 90),
          ex("gluteo-coice-polia", 3, "12-15", 7, 45),
          ex("panturrilha-em-pe", 4, "15-20", 7, 45),
        ]),
      },
      D: {
        nome: "Ombros · Trapézio",
        exercicios: clean([
          ex("desenvolvimento-halter", 4, "8-10", 8, 90),
          ex("elevacao-lateral", 5, "12-15", 7, 45),
          ex("encolhimento-halter", 3, "12-15", 7, 60),
          ex("crucifixo-maquina", 3, "12-15", 7, 60),
        ]),
      },
      E: {
        nome: "Cardio + Core",
        exercicios: clean([
          ex("esteira-inclinada", 1, "30min steady 70% FCmax", 6, 0),
          ex("bike-ergometrica", 1, "15min HIIT", 8, 0),
          ex("prancha-frontal", 4, "60s", 7, 30),
          ex("russian-twist", 4, "20", 7, 30),
          ex("abdominal-infra", 4, "15-20", 7, 30),
        ]),
      },
    },
    uso_count: 2,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },

  {
    id: "tpl-009",
    nome: "Avançado · Hipertrofia (5 dias com split)",
    descricao: "Split clássico bro/avançado com volume alto. 1 grupo por dia.",
    publico_alvo: "Avançado (3+ anos de treino)",
    numero_treinos: 5,
    estrutura: {
      A: {
        nome: "Peito",
        exercicios: clean([
          ex("supino-reto-barra", 5, "6-8/8-10/10-12", 9, 120),
          ex("supino-inclinado-halter", 4, "8-10", 8, 90),
          ex("crucifixo-maquina", 4, "10-12", 8, 60),
          ex("triceps-corda-polia", 3, "12-15", 7, 60),
        ]),
      },
      B: {
        nome: "Costas",
        exercicios: clean([
          ex("puxada-frontal-aberta", 5, "6-8/8-10/10-12", 9, 120),
          ex("remada-baixa-triangulo", 4, "8-10", 8, 90),
          ex("remada-serrote", 4, "10-12", 8, 75),
          ex("rosca-direta-barra-w", 3, "10-12", 7, 60),
        ]),
      },
      C: {
        nome: "Pernas",
        exercicios: clean([
          ex("hack-machine", 5, "6-8/8-10/10-12", 9, 150),
          ex("leg-press-45", 4, "10-12", 8, 120),
          ex("cadeira-extensora", 4, "12-15", 8, 60),
          ex("mesa-flexora", 4, "10-12", 8, 75),
          ex("stiff-barra", 3, "8-10", 8, 90),
          ex("panturrilha-em-pe", 5, "12-15", 7, 45),
        ]),
      },
      D: {
        nome: "Ombros",
        exercicios: clean([
          ex("desenvolvimento-halter", 5, "6-8/8-10/10-12", 9, 120),
          ex("elevacao-lateral", 5, "12-15", 8, 45),
          ex("encolhimento-halter", 4, "10-12", 8, 60),
          ex("crucifixo-maquina", 3, "12-15", 7, 60),
        ]),
      },
      E: {
        nome: "Braços + Core",
        exercicios: clean([
          ex("rosca-direta-barra-w", 4, "8-10", 8, 75),
          ex("rosca-martelo-halter", 4, "10-12", 8, 60),
          ex("triceps-testa-barra-w", 4, "8-10", 8, 75),
          ex("triceps-corda-polia", 4, "12-15", 7, 60),
          ex("prancha-frontal", 4, "60s", 8, 30),
          ex("russian-twist", 4, "20", 7, 30),
        ]),
      },
    },
    uso_count: 1,
    created_at: "2026-05-05T00:00:00Z",
    updated_at: "2026-05-05T00:00:00Z",
  },

  {
    id: "tpl-010",
    nome: "Manutenção · Mínimo Eficaz (2x/sem)",
    descricao: "Para fases de viagem, doença ou estresse alto. Mantém ganhos com volume mínimo.",
    publico_alvo: "Qualquer nível em fase de manutenção",
    numero_treinos: 2,
    estrutura: {
      A: {
        nome: "Full Body 1",
        exercicios: clean([
          ex("hack-machine", 2, "8-10", 8, 120),
          ex("supino-reto-barra", 2, "8-10", 8, 120),
          ex("puxada-frontal-aberta", 2, "8-10", 8, 120),
          ex("desenvolvimento-halter", 2, "10-12", 8, 90),
          ex("prancha-frontal", 2, "60s", 7, 30),
        ]),
      },
      B: {
        nome: "Full Body 2",
        exercicios: clean([
          ex("stiff-barra", 2, "8-10", 8, 120),
          ex("supino-inclinado-halter", 2, "10-12", 8, 90),
          ex("remada-serrote", 2, "10-12", 8, 90),
          ex("elevacao-lateral", 2, "12-15", 7, 60),
          ex("rosca-martelo-halter", 2, "10-12", 7, 60),
        ]),
      },
    },
    uso_count: 0,
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
];

// ============================================================================
// Check-ins da Aline (últimos 14 dias)
// ============================================================================
function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const mockCheckIns: CheckIn[] = [
  { id: "ci-1", aluno_id: "aline", data: diasAtras(0),  energia: 8, sono: 7, dor: 2, motivacao: 9, estresse: 4, notas: null, created_at: new Date().toISOString() },
  { id: "ci-2", aluno_id: "aline", data: diasAtras(1),  energia: 7, sono: 6, dor: 3, motivacao: 8, estresse: 5, notas: null, created_at: new Date().toISOString() },
  { id: "ci-3", aluno_id: "aline", data: diasAtras(2),  energia: 9, sono: 8, dor: 1, motivacao: 9, estresse: 3, notas: "Dia ótimo, PR no supino.", created_at: new Date().toISOString() },
  { id: "ci-4", aluno_id: "aline", data: diasAtras(3),  energia: 6, sono: 5, dor: 4, motivacao: 6, estresse: 7, notas: null, created_at: new Date().toISOString() },
  { id: "ci-5", aluno_id: "aline", data: diasAtras(4),  energia: 7, sono: 7, dor: 2, motivacao: 7, estresse: 5, notas: null, created_at: new Date().toISOString() },
  { id: "ci-6", aluno_id: "aline", data: diasAtras(5),  energia: 8, sono: 8, dor: 2, motivacao: 8, estresse: 4, notas: null, created_at: new Date().toISOString() },
  { id: "ci-7", aluno_id: "aline", data: diasAtras(7),  energia: 8, sono: 7, dor: 3, motivacao: 8, estresse: 5, notas: null, created_at: new Date().toISOString() },
  { id: "ci-8", aluno_id: "aline", data: diasAtras(8),  energia: 7, sono: 6, dor: 4, motivacao: 7, estresse: 6, notas: null, created_at: new Date().toISOString() },
];

// ============================================================================
// Anamnese da Aline (atleta wellness — lesão de joelho + ombro)
// ============================================================================
export const mockAnamnese: Anamnese[] = [
  {
    id: "anam-aline",
    aluno_id: "aline",
    objetivo_principal:
      "Competir na categoria Wellness — desenvolver pernas e glúteo mantendo cintura fina, secar pro palco.",
    prazo_meses: 6,
    meta_peso_kg: 63,
    ja_treinou: true,
    tempo_treino_meses: 42,
    frequencia_semanal: 5,
    lesoes:
      "Condromalácia patelar no joelho direito (grau 2). Desconforto no ombro direito em desenvolvimento com carga alta.",
    cirurgias: null,
    medicamentos: "Anticoncepcional. Creatina e whey (suplementos).",
    doencas_cronicas: null,
    dores_atuais: "Joelho direito ao agachar profundo com carga.",
    onde_treina: "academia",
    equipamentos_disponiveis: ["barra", "halter", "maquina", "polia", "cabo", "smith", "banco"],
    horas_sono: 7,
    consome_alcool: "socialmente",
    fuma: false,
    estresse_nivel: 4,
    aceita_termos: true,
    assinado_em: "2026-03-12T14:00:00Z",
    created_at: "2026-03-12T14:00:00Z",
    updated_at: "2026-03-12T14:00:00Z",
  },
];

// ============================================================================
// Fotos de evolução — 3 sessões × 4 poses (placeholders SVG, sem rede)
// ============================================================================
function silhueta(pose: string, dataISO: string, cinturaHalf: number, tom: string): string {
  const [y, m, d] = dataISO.split("-");
  const dataBR = `${d}/${m}/${y.slice(2)}`;
  const cx = 200;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>` +
    `<stop offset='0' stop-color='#241c17'/><stop offset='1' stop-color='#15100d'/></linearGradient></defs>` +
    `<rect width='400' height='600' fill='url(#g)'/>` +
    `<rect x='${cx - 120}' y='176' width='26' height='208' rx='13' fill='${tom}' opacity='0.6'/>` +
    `<rect x='${cx + 94}' y='176' width='26' height='208' rx='13' fill='${tom}' opacity='0.6'/>` +
    `<circle cx='${cx}' cy='80' r='33' fill='${tom}'/>` +
    `<path d='M${cx - 90},170 Q${cx - 62},248 ${cx - cinturaHalf},298 Q${cx - 80},344 ${cx - 74},430 L${cx - 34},562 L${cx - 11},562 L${cx - 6},345 L${cx + 6},345 L${cx + 11},562 L${cx + 34},562 L${cx + 74},430 Q${cx + 80},344 ${cx + cinturaHalf},298 Q${cx + 62},248 ${cx + 90},170 Z' fill='${tom}'/>` +
    `<text x='24' y='42' font-family='sans-serif' font-size='21' font-weight='700' fill='#666'>${pose}</text>` +
    `<text x='376' y='580' text-anchor='end' font-family='monospace' font-size='19' fill='#8a807a'>${dataBR}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SESSOES_FOTO = [
  { data: "2026-03-12", cintura: 72, tom: "#3a312b" },
  { data: "2026-04-10", cintura: 62, tom: "#46392f" },
  { data: "2026-05-10", cintura: 53, tom: "#52432f" },
];
const POSES_FOTO: { tipo: Foto["tipo"]; label: string }[] = [
  { tipo: "frente", label: "Frente" },
  { tipo: "lado", label: "Lado" },
  { tipo: "costas", label: "Costas" },
  { tipo: "pose", label: "Pose Wellness" },
];

export const mockFotos: Foto[] = SESSOES_FOTO.flatMap((s, si) =>
  POSES_FOTO.map((p, pi) => ({
    id: `foto-${si}-${pi}`,
    aluno_id: "aline",
    data: s.data,
    url: silhueta(p.label, s.data, s.cintura, s.tom),
    tipo: p.tipo,
    observacoes:
      si === 2 && pi === 0 ? "Cintura visivelmente mais seca — ótima evolução." : null,
    created_at: `${s.data}T10:00:00Z`,
  }))
);

// ============================================================================
// Solicitações recorrentes (pedidos automáticos ao aluno)
// ============================================================================
export const mockSolicitacoes: Solicitacao[] = [
  { id: "sol-1", aluno_id: "aline", tipo: "foto",         titulo: "Fotos de progresso", descricao: "Frente, lado, costas e uma pose da categoria.", recorrencia_dias: 7,  proxima_em: diasAtras(1),  ultima_em: diasAtras(6), ativo: true,  created_at: "2026-03-12T00:00:00Z", updated_at: "2026-03-12T00:00:00Z" },
  { id: "sol-2", aluno_id: "aline", tipo: "medida",       titulo: "Peso e cintura",     descricao: "Peso em jejum + circunferência da cintura.",     recorrencia_dias: 7,  proxima_em: diasAtras(0),  ultima_em: diasAtras(7), ativo: true,  created_at: "2026-03-12T00:00:00Z", updated_at: "2026-03-12T00:00:00Z" },
  { id: "sol-3", aluno_id: "aline", tipo: "questionario", titulo: "Check-in semanal",   descricao: "Energia, sono, dor, motivação e estresse.",      recorrencia_dias: 7,  proxima_em: diasAtras(-4), ultima_em: diasAtras(3), ativo: true,  created_at: "2026-03-12T00:00:00Z", updated_at: "2026-03-12T00:00:00Z" },
  { id: "sol-4", aluno_id: "aline", tipo: "exame",        titulo: "Hemograma + hormonal", descricao: "Painel completo pré-temporada.",               recorrencia_dias: null, proxima_em: diasAtras(-20), ultima_em: null,       ativo: true,  created_at: "2026-03-12T00:00:00Z", updated_at: "2026-03-12T00:00:00Z" },
];

// ============================================================================
// Mensagens — exemplo de chat treinador ↔ Aline
// ============================================================================
export const mockMensagens: Mensagem[] = [
  { id: "m-1", aluno_id: "aline", remetente_id: "trainer-montinho", tipo: "texto", conteudo: "Aline, ótimo trabalho ontem no treino A! Vi que aumentou 2kg no supino. 💪", anexo_url: null, lida_em: "2026-05-15T08:00:00Z", created_at: "2026-05-14T20:00:00Z" },
  { id: "m-2", aluno_id: "aline", remetente_id: "aluno-aline",   tipo: "texto", conteudo: "Obrigada Pedro! Foi pesado mas consegui completar todas as séries.", anexo_url: null, lida_em: "2026-05-15T08:00:00Z", created_at: "2026-05-14T20:15:00Z" },
  { id: "m-3", aluno_id: "aline", remetente_id: "trainer-montinho", tipo: "texto", conteudo: "Lembra que amanhã é dia C (pernas). Vai com tudo!", anexo_url: null, lida_em: null, created_at: "2026-05-15T19:00:00Z" },
];

// ============================================================================
// Base de Conhecimento — referências científicas do Pedro
// ============================================================================
export const mockConhecimento: Conhecimento[] = [
  {
    id: "con-001",
    titulo: "Science and Development of Muscle Hypertrophy",
    autores: ["Brad J. Schoenfeld"],
    tipo: "livro",
    ano: 2021,
    descricao: "A referência mais completa sobre hipertrofia muscular baseada em evidências. Cobre mecanismos, variáveis de treino, nutrição e recuperação.",
    arquivo_url: null,
    link_externo: "https://www.humankinetics.com/products/all-products/science-and-development-of-muscle-hypertrophy-2nd-edition",
    transcricao: null,
    tags: ["hipertrofia", "volume", "frequência", "intensidade", "meta-análise"],
    citacao_apa: "Schoenfeld, B. J. (2021). Science and development of muscle hypertrophy (2nd ed.). Human Kinetics.",
    paginas: 300,
    duracao_seg: null,
    arquivado: false,
    destaque: true,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "con-002",
    titulo: "Dose-response relationship between weekly resistance training volume and increases in muscle mass",
    autores: ["Brad J. Schoenfeld", "Dan Ogborn", "James W. Krieger"],
    tipo: "paper",
    ano: 2017,
    descricao: "Meta-análise com 15 estudos (n=289) mostrando relação dose-resposta entre volume semanal e hipertrofia. Base dos valores MEV/MAV/MRV.",
    arquivo_url: null,
    link_externo: "https://pubmed.ncbi.nlm.nih.gov/27870618/",
    transcricao: null,
    tags: ["MEV", "MAV", "MRV", "volume", "dose-resposta", "meta-análise"],
    citacao_apa: "Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. Journal of Sports Sciences, 35(11), 1073–1082.",
    paginas: 10,
    duracao_seg: null,
    arquivado: false,
    destaque: true,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "con-003",
    titulo: "Validating the Use of the Rating of Perceived Exertion for Resistance Training",
    autores: ["Eric R. Helms", "Adam Storey", "Matthew T. Cross"],
    tipo: "paper",
    ano: 2016,
    descricao: "Valida o uso do RPE (escala RTS de Tuchscherer) como ferramenta confiável de autorregulação do treino de força.",
    arquivo_url: null,
    link_externo: "https://pubmed.ncbi.nlm.nih.gov/26512833/",
    transcricao: null,
    tags: ["RPE", "RIR", "autorregulação", "RTS", "percepção de esforço"],
    citacao_apa: "Helms, E. R., Storey, A., Cross, M. T., et al. (2016). RPE and velocity relationships for the back squat, bench press, and deadlift in powerlifters. Journal of Strength and Conditioning Research, 30(5), 1290–1297.",
    paginas: 8,
    duracao_seg: null,
    arquivado: false,
    destaque: true,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "con-004",
    titulo: "Resistance Training to Momentary Muscular Failure Improves Cardiovascular Fitness",
    autores: ["James Fisher", "James Steele", "Stewart Bruce-Low", "Dave Smith"],
    tipo: "paper",
    ano: 2011,
    descricao: "Análise sobre treino até a falha vs. RIR 2-3 para hipertrofia e ganho de força.",
    arquivo_url: null,
    link_externo: "https://pubmed.ncbi.nlm.nih.gov/22105707/",
    transcricao: null,
    tags: ["falha muscular", "RIR", "hipertrofia", "força"],
    citacao_apa: "Fisher, J., Steele, J., Bruce-Low, S., & Smith, D. (2011). Evidence-based resistance training recommendations. Medicina Sportiva, 15(3), 147–162.",
    paginas: 16,
    duracao_seg: null,
    arquivado: false,
    destaque: false,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "con-005",
    titulo: "The Mechanisms of Muscle Hypertrophy and Their Application to Resistance Training",
    autores: ["Brad J. Schoenfeld"],
    tipo: "paper",
    ano: 2010,
    descricao: "Paper clássico descrevendo os 3 mecanismos de hipertrofia: tensão mecânica, stress metabólico e dano muscular.",
    arquivo_url: null,
    link_externo: "https://pubmed.ncbi.nlm.nih.gov/20847704/",
    transcricao: null,
    tags: ["tensão mecânica", "stress metabólico", "dano muscular", "hipertrofia"],
    citacao_apa: "Schoenfeld, B. J. (2010). The mechanisms of muscle hypertrophy and their application to resistance training. Journal of Strength and Conditioning Research, 24(10), 2857–2872.",
    paginas: 16,
    duracao_seg: null,
    arquivado: false,
    destaque: false,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "con-006",
    titulo: "Predicting 1-RM performance from reps-to-fatigue",
    autores: ["Matt Brzycki"],
    tipo: "paper",
    ano: 1993,
    descricao: "Fórmula clássica para estimativa de 1RM a partir de repetições submáximas (Brzycki): 1RM = peso × 36 / (37 − reps).",
    arquivo_url: null,
    link_externo: null,
    transcricao: null,
    tags: ["1RM", "Brzycki", "força máxima", "estimativa"],
    citacao_apa: "Brzycki, M. (1993). Strength testing — predicting a one-rep max from reps-to-fatigue. Journal of Physical Education, Recreation & Dance, 64(1), 88–90.",
    paginas: 3,
    duracao_seg: null,
    arquivado: false,
    destaque: false,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "con-007",
    titulo: "The effect of protein timing on muscle strength and hypertrophy",
    autores: ["Brad J. Schoenfeld", "Alan A. Aragon", "James W. Krieger"],
    tipo: "paper",
    ano: 2013,
    descricao: "Meta-análise sobre timing de proteína pós-treino — relevância da janela anabólica e distribuição proteica ao longo do dia.",
    arquivo_url: null,
    link_externo: "https://pubmed.ncbi.nlm.nih.gov/23343682/",
    transcricao: null,
    tags: ["proteína", "nutrição", "timing", "janela anabólica", "hipertrofia"],
    citacao_apa: "Schoenfeld, B. J., Aragon, A. A., & Krieger, J. W. (2013). The effect of protein timing on muscle strength and hypertrophy: A meta-analysis. Journal of the International Society of Sports Nutrition, 10(1), 53.",
    paginas: 13,
    duracao_seg: null,
    arquivado: false,
    destaque: false,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "con-008",
    titulo: "Plyometric vs. isotonic training influence on tendon properties and muscle output",
    autores: ["Gäelle Fouré", "Antoine Nordez", "Christophe Cornu"],
    tipo: "paper",
    ano: 2013,
    descricao: "Comparação de treinamento pliométrico vs. isotônico em propriedades do tendão.",
    arquivo_url: null,
    link_externo: null,
    transcricao: null,
    tags: ["pliometria", "tendão", "força", "potência"],
    citacao_apa: "Fouré, G., Nordez, A., & Cornu, C. (2013). Effects of plyometric training on passive stiffness of gastrocnemii muscles and Achilles tendon. European Journal of Applied Physiology, 113(10), 2485–2495.",
    paginas: 11,
    duracao_seg: null,
    arquivado: false,
    destaque: false,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
];
