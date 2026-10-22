// Mock data layer — usada enquanto Supabase não está configurado.
// Estrutura idêntica aos tipos de @/lib/supabase/types.
// Quando credenciais chegarem, trocar adapter em @/lib/db.ts.

import type {
  Aluno,
  Dieta,
  Evolucao,
  Exercicio,
  Logbook,
  Pagamento,
  Profile,
  Treino,
} from "@/lib/supabase/types";

// ============================================================================
// Profiles
// ============================================================================
export const mockProfiles: Profile[] = [
  {
    id: "trainer-montinho",
    email: "treinador@exemplo.com",
    nome: "Montinho (demo)",
    role: "treinador",
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "aluno-aline",
    email: "aline.souza@example.com",
    nome: "Aline de Souza",
    role: "aluno",
    avatar_url: null,
    created_at: "2026-03-12T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: "aluno-bia",
    email: "bia.visitante@example.com",
    nome: "Bia Ramos",
    role: "aluno",
    avatar_url: null,
    created_at: "2026-10-20T00:00:00Z",
    updated_at: "2026-10-20T00:00:00Z",
  },
  {
    id: "aluno-joao",
    email: "joao.pereira@example.com",
    nome: "João Pereira",
    role: "aluno",
    avatar_url: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-05-12T00:00:00Z",
  },
  {
    id: "aluno-marina",
    email: "marina.costa@example.com",
    nome: "Marina Costa",
    role: "aluno",
    avatar_url: null,
    created_at: "2026-02-20T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
  {
    id: "aluno-rafael",
    email: "rafael.alves@example.com",
    nome: "Rafael Alves",
    role: "aluno",
    avatar_url: null,
    created_at: "2026-03-25T00:00:00Z",
    updated_at: "2026-05-14T00:00:00Z",
  },
  {
    id: "aluno-camila",
    email: "camila.lima@example.com",
    nome: "Camila Lima",
    role: "aluno",
    avatar_url: null,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
];

// ============================================================================
// Alunos
// ============================================================================
export const mockAlunos: Aluno[] = [
  {
    id: "aline",
    profile_id: "aluno-aline",
    telefone: "(48) 99999-1234",
    data_nascimento: "1995-07-22",
    sexo: "F",
    altura_cm: 168,
    objetivo: "Hipertrofia + definição. Reduzir percentual de gordura mantendo massa magra.",
    observacoes: "Lesão antiga no joelho direito — evitar agachamento livre carga máxima.",
    status: "ativo",
    data_inicio: "2026-03-12",
    acesso_ate: "2026-06-12",
    ultimo_treino_em: "2026-05-14T19:30:00Z",
    created_at: "2026-03-12T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    // Modo Visitante: entrou por convite e monta os próprios treinos.
    id: "bia",
    profile_id: "aluno-bia",
    telefone: null,
    data_nascimento: null,
    sexo: null,
    altura_cm: null,
    objetivo: null,
    observacoes: null,
    status: "ativo",
    modalidade: "visitante",
    data_inicio: "2026-10-20",
    acesso_ate: null,
    ultimo_treino_em: null,
    created_at: "2026-10-20T00:00:00Z",
    updated_at: "2026-10-20T00:00:00Z",
  },
  {
    id: "joao",
    profile_id: "aluno-joao",
    telefone: "(48) 99888-2222",
    data_nascimento: "1992-03-15",
    sexo: "M",
    altura_cm: 178,
    objetivo: "Ganho de massa magra (bulking).",
    observacoes: null,
    status: "pendente",
    data_inicio: "2026-04-01",
    acesso_ate: "2026-05-01",
    ultimo_treino_em: "2026-04-28T20:00:00Z",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-05-12T00:00:00Z",
  },
  {
    id: "marina",
    profile_id: "aluno-marina",
    telefone: "(48) 99777-3333",
    data_nascimento: "1988-11-08",
    sexo: "F",
    altura_cm: 162,
    objetivo: "Emagrecimento. Meta: -8kg em 6 meses.",
    observacoes: "Iniciante. Aumentar carga progressivamente.",
    status: "inadimplente",
    data_inicio: "2026-02-20",
    acesso_ate: "2026-04-20",
    ultimo_treino_em: "2026-04-15T18:00:00Z",
    created_at: "2026-02-20T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
  {
    id: "rafael",
    profile_id: "aluno-rafael",
    telefone: "(48) 99666-4444",
    data_nascimento: "1996-09-30",
    sexo: "M",
    altura_cm: 185,
    objetivo: "Força máxima + performance esportiva (futebol amador).",
    observacoes: "Atleta intermediário. 3 anos de treino regular.",
    status: "ativo",
    data_inicio: "2026-03-25",
    acesso_ate: "2026-06-25",
    ultimo_treino_em: "2026-05-15T07:00:00Z",
    created_at: "2026-03-25T00:00:00Z",
    updated_at: "2026-05-14T00:00:00Z",
  },
  {
    id: "camila",
    profile_id: "aluno-camila",
    telefone: "(48) 99555-5555",
    data_nascimento: "1990-04-18",
    sexo: "F",
    altura_cm: 170,
    objetivo: "Tônus muscular e bem-estar geral.",
    observacoes: "Treina 3x por semana. Foco glúteo e pernas.",
    status: "ativo",
    data_inicio: "2026-01-15",
    acesso_ate: "2026-06-15",
    ultimo_treino_em: "2026-05-13T17:30:00Z",
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
];

// ============================================================================
// Treinos da Aline (replicando o PDF real)
// ============================================================================
export const mockTreinos: Treino[] = [
  {
    id: "t-aline-a",
    aluno_id: "aline",
    letra: "A",
    nome: "Peito · Tríceps · Abdômen",
    observacoes: "Foco em volume. Descanso 60-90s entre séries.",
    ordem: 0,
    ativo: true,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "t-aline-b",
    aluno_id: "aline",
    letra: "B",
    nome: "Costas · Bíceps",
    observacoes: "Pegada variada. Trabalhar amplitude.",
    ordem: 1,
    ativo: true,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "t-aline-c",
    aluno_id: "aline",
    letra: "C",
    nome: "Pernas · Glúteo",
    observacoes: "Sem agachamento livre carga máx (joelho). Substituir por hack.",
    ordem: 2,
    ativo: true,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "t-aline-d",
    aluno_id: "aline",
    letra: "D",
    nome: "Ombros · Trapézio",
    observacoes: "Cuidado com elevação lateral — não passar do paralelo.",
    ordem: 3,
    ativo: true,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "t-aline-e",
    aluno_id: "aline",
    letra: "E",
    nome: "Cardio · Core",
    observacoes: "30min cardio + circuito core. HIIT opcional.",
    ordem: 4,
    ativo: true,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
];

// ============================================================================
// Exercícios — formato: reps progressivas (10-12/8-10/6-8), IE 1-10
// ============================================================================
export const mockExercicios: Exercicio[] = [
  // Treino A — Peito · Tríceps · Abdômen
  { id: "ex-a1", treino_id: "t-aline-a", ordem: 0, nome: "Supino reto barra",         series: 4, reps: "10-12/8-10/6-8/6-8", ie: 8, descanso_seg: 90, observacoes: "Pegada média.", video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-a2", treino_id: "t-aline-a", ordem: 1, nome: "Supino inclinado halter",   series: 3, reps: "10-12/8-10/8-10",    ie: 8, descanso_seg: 75, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-a3", treino_id: "t-aline-a", ordem: 2, nome: "Crucifixo máquina",         series: 3, reps: "12-15/10-12/10-12",  ie: 7, descanso_seg: 60, observacoes: "Apertar peito no topo.", video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-a4", treino_id: "t-aline-a", ordem: 3, nome: "Tríceps testa barra W",     series: 3, reps: "10-12/8-10/8-10",    ie: 8, descanso_seg: 75, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-a5", treino_id: "t-aline-a", ordem: 4, nome: "Tríceps corda polia",       series: 3, reps: "12-15/12-15/12-15",  ie: 7, descanso_seg: 60, observacoes: "Cotovelo fixo.", video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-a6", treino_id: "t-aline-a", ordem: 5, nome: "Prancha frontal",           series: 3, reps: "45s/60s/60s",        ie: 7, descanso_seg: 45, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-a7", treino_id: "t-aline-a", ordem: 6, nome: "Abdominal infra",           series: 3, reps: "15-20/15-20/15-20",  ie: 7, descanso_seg: 45, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },

  // Treino B — Costas · Bíceps
  { id: "ex-b1", treino_id: "t-aline-b", ordem: 0, nome: "Puxada frontal aberta",     series: 4, reps: "10-12/8-10/8-10/6-8", ie: 8, descanso_seg: 90, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-b2", treino_id: "t-aline-b", ordem: 1, nome: "Remada baixa triângulo",    series: 3, reps: "10-12/8-10/8-10",     ie: 8, descanso_seg: 75, observacoes: "Peito aberto.", video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-b3", treino_id: "t-aline-b", ordem: 2, nome: "Remada serrote unilateral", series: 3, reps: "10-12/10-12/10-12",   ie: 8, descanso_seg: 60, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-b4", treino_id: "t-aline-b", ordem: 3, nome: "Pulldown corda",            series: 3, reps: "12-15/12-15/12-15",   ie: 7, descanso_seg: 60, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-b5", treino_id: "t-aline-b", ordem: 4, nome: "Rosca direta barra W",      series: 3, reps: "10-12/8-10/8-10",     ie: 8, descanso_seg: 60, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-b6", treino_id: "t-aline-b", ordem: 5, nome: "Rosca martelo halter",      series: 3, reps: "10-12/10-12/10-12",   ie: 7, descanso_seg: 60, observacoes: "Sem balanço.", video_url: null, created_at: "2026-04-13T00:00:00Z" },

  // Treino C — Pernas · Glúteo (sem agachamento livre carga máx)
  { id: "ex-c1", treino_id: "t-aline-c", ordem: 0, nome: "Hack machine",              series: 4, reps: "12-15/10-12/8-10/8-10", ie: 9, descanso_seg: 120, observacoes: "Pé alto na plataforma.", video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-c2", treino_id: "t-aline-c", ordem: 1, nome: "Leg press 45º",             series: 4, reps: "15-20/12-15/10-12/10-12", ie: 9, descanso_seg: 120, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-c3", treino_id: "t-aline-c", ordem: 2, nome: "Cadeira extensora",         series: 3, reps: "12-15/10-12/10-12",   ie: 8, descanso_seg: 60, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-c4", treino_id: "t-aline-c", ordem: 3, nome: "Mesa flexora",              series: 3, reps: "12-15/10-12/10-12",   ie: 8, descanso_seg: 60, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-c5", treino_id: "t-aline-c", ordem: 4, nome: "Stiff barra",               series: 3, reps: "10-12/10-12/8-10",    ie: 8, descanso_seg: 75, observacoes: "Joelho semi-flexionado.", video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-c6", treino_id: "t-aline-c", ordem: 5, nome: "Glúteo coice polia",        series: 3, reps: "15/15/15 cada perna", ie: 7, descanso_seg: 45, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-c7", treino_id: "t-aline-c", ordem: 6, nome: "Panturrilha em pé",         series: 4, reps: "15-20/12-15/12-15/12-15", ie: 7, descanso_seg: 45, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },

  // Treino D — Ombros · Trapézio
  { id: "ex-d1", treino_id: "t-aline-d", ordem: 0, nome: "Desenvolvimento halter",    series: 4, reps: "10-12/8-10/8-10/6-8", ie: 8, descanso_seg: 90, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-d2", treino_id: "t-aline-d", ordem: 1, nome: "Elevação lateral",          series: 3, reps: "12-15/10-12/10-12",   ie: 7, descanso_seg: 60, observacoes: "Não passar do paralelo.", video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-d3", treino_id: "t-aline-d", ordem: 2, nome: "Elevação frontal halter",   series: 3, reps: "12-15/10-12/10-12",   ie: 7, descanso_seg: 60, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-d4", treino_id: "t-aline-d", ordem: 3, nome: "Crucifixo invertido máq.",  series: 3, reps: "12-15/12-15/12-15",   ie: 7, descanso_seg: 60, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-d5", treino_id: "t-aline-d", ordem: 4, nome: "Encolhimento halter",       series: 3, reps: "12-15/10-12/10-12",   ie: 7, descanso_seg: 60, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },

  // Treino E — Cardio · Core
  { id: "ex-e1", treino_id: "t-aline-e", ordem: 0, nome: "Esteira inclinada",         series: 1, reps: "20min @ 6,5km/h 8%",  ie: 7, descanso_seg: 0,  observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-e2", treino_id: "t-aline-e", ordem: 1, nome: "Bike ergométrica",          series: 1, reps: "10min HIIT",          ie: 8, descanso_seg: 0,  observacoes: "30s sprint / 60s leve.", video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-e3", treino_id: "t-aline-e", ordem: 2, nome: "Prancha lateral",           series: 3, reps: "30s/30s/30s cada lado", ie: 7, descanso_seg: 30, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-e4", treino_id: "t-aline-e", ordem: 3, nome: "Russian twist",             series: 3, reps: "20/20/20 reps",       ie: 7, descanso_seg: 45, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
  { id: "ex-e5", treino_id: "t-aline-e", ordem: 4, nome: "Dead bug",                  series: 3, reps: "12/12/12 cada lado",  ie: 6, descanso_seg: 30, observacoes: null, video_url: null, created_at: "2026-04-13T00:00:00Z" },
];

// ============================================================================
// Dieta da Aline (replicando Excel real)
// ============================================================================
export const mockDieta: Dieta[] = [
  {
    id: "d-aline-1",
    aluno_id: "aline",
    refeicao: "Café da manhã",
    ordem: 0,
    horario: "07:00",
    alimentos: [
      { nome: "Pão integral", quantidade: "2 fatias" },
      { nome: "Ovo inteiro", quantidade: "2 unidades" },
      { nome: "Café preto sem açúcar", quantidade: "200ml" },
      { nome: "Mamão papaia", quantidade: "1 fatia média" },
    ],
    substituicoes: [
      { nome: "Tapioca", quantidade: "1 unidade (40g)" },
      { nome: "Aveia em flocos", quantidade: "3 colheres de sopa" },
    ],
    observacoes: null,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "d-aline-2",
    aluno_id: "aline",
    refeicao: "Lanche da manhã",
    ordem: 1,
    horario: "10:00",
    alimentos: [
      { nome: "Whey protein", quantidade: "1 scoop (30g)" },
      { nome: "Banana", quantidade: "1 unidade média" },
    ],
    substituicoes: [
      { nome: "Iogurte natural desnatado", quantidade: "200g + 1 maçã" },
    ],
    observacoes: null,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "d-aline-3",
    aluno_id: "aline",
    refeicao: "Almoço",
    ordem: 2,
    horario: "12:30",
    alimentos: [
      { nome: "Arroz integral", quantidade: "4 colheres de sopa" },
      { nome: "Feijão preto", quantidade: "1 concha média" },
      { nome: "Frango grelhado", quantidade: "150g" },
      { nome: "Salada verde", quantidade: "à vontade" },
      { nome: "Azeite extra virgem", quantidade: "1 colher de sopa" },
    ],
    substituicoes: [
      { nome: "Patinho moído (substituir frango)", quantidade: "150g" },
      { nome: "Tilápia grelhada (substituir frango)", quantidade: "180g" },
      { nome: "Batata-doce (substituir arroz)", quantidade: "150g cozida" },
    ],
    observacoes: "Priorizar legumes coloridos na salada.",
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "d-aline-4",
    aluno_id: "aline",
    refeicao: "Lanche da tarde",
    ordem: 3,
    horario: "16:00",
    alimentos: [
      { nome: "Pão integral", quantidade: "1 fatia" },
      { nome: "Pasta de amendoim integral", quantidade: "1 colher de sopa" },
      { nome: "Café preto", quantidade: "1 xícara" },
    ],
    substituicoes: [
      { nome: "Mix de oleaginosas", quantidade: "30g" },
    ],
    observacoes: null,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "d-aline-5",
    aluno_id: "aline",
    refeicao: "Pré-treino",
    ordem: 4,
    horario: "18:30",
    alimentos: [
      { nome: "Banana", quantidade: "1 unidade" },
      { nome: "Café preto", quantidade: "1 xícara" },
    ],
    substituicoes: [
      { nome: "Pão integral com mel", quantidade: "1 fatia + 1 colher de chá" },
    ],
    observacoes: "30 a 60min antes do treino.",
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
  {
    id: "d-aline-6",
    aluno_id: "aline",
    refeicao: "Jantar",
    ordem: 5,
    horario: "21:00",
    alimentos: [
      { nome: "Omelete (3 ovos)", quantidade: "1 porção" },
      { nome: "Legumes refogados", quantidade: "1 prato sobremesa" },
      { nome: "Queijo branco", quantidade: "30g" },
    ],
    substituicoes: [
      { nome: "Frango desfiado", quantidade: "120g" },
      { nome: "Salmão grelhado", quantidade: "150g" },
    ],
    observacoes: null,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
  },
];

// ============================================================================
// Logbook — algumas execuções reais da Aline (semana passada)
// ============================================================================
export const mockLogbook: Logbook[] = [
  // Treino A executado 14/05
  { id: "lb-1", aluno_id: "aline", exercicio_id: "ex-a1", data: "2026-05-14", serie: 1, carga_kg: 30, reps: 12, ie: 7, observacoes: null, created_at: "2026-05-14T19:35:00Z" },
  { id: "lb-2", aluno_id: "aline", exercicio_id: "ex-a1", data: "2026-05-14", serie: 2, carga_kg: 32, reps: 10, ie: 8, observacoes: null, created_at: "2026-05-14T19:37:00Z" },
  { id: "lb-3", aluno_id: "aline", exercicio_id: "ex-a1", data: "2026-05-14", serie: 3, carga_kg: 35, reps: 8, ie: 9, observacoes: "Último PR aumentado.", created_at: "2026-05-14T19:39:00Z" },
  { id: "lb-4", aluno_id: "aline", exercicio_id: "ex-a1", data: "2026-05-14", serie: 4, carga_kg: 35, reps: 7, ie: 9, observacoes: null, created_at: "2026-05-14T19:41:00Z" },
];

// ============================================================================
// Evolução
// ============================================================================
export const mockEvolucao: Evolucao[] = [
  { id: "ev-1", aluno_id: "aline", data: "2026-03-12", peso_kg: 68.5, gordura_pct: 28.0, cintura_cm: 76, quadril_cm: 102, braco_cm: 28, coxa_cm: 58, peito_cm: 90, observacoes: "Avaliação inicial.", created_at: "2026-03-12T00:00:00Z" },
  { id: "ev-2", aluno_id: "aline", data: "2026-04-10", peso_kg: 67.2, gordura_pct: 26.5, cintura_cm: 74, quadril_cm: 101, braco_cm: 28.5, coxa_cm: 58.5, peito_cm: 91, observacoes: null, created_at: "2026-04-10T00:00:00Z" },
  { id: "ev-3", aluno_id: "aline", data: "2026-05-10", peso_kg: 66.4, gordura_pct: 25.1, cintura_cm: 72, quadril_cm: 100, braco_cm: 29, coxa_cm: 59, peito_cm: 92, observacoes: "Excelente progresso.", created_at: "2026-05-10T00:00:00Z" },
];

// ============================================================================
// Pagamentos
// ============================================================================
export const mockPagamentos: Pagamento[] = [
  { id: "p-1", aluno_id: "aline",   order_nsu: "BS-aline-202603", invoice_slug: "inv-001", transaction_nsu: "tx-001", valor_centavos: 24990, metodo: "pix",        status: "pago",      checkout_url: null, receipt_url: null, vencimento: "2026-03-12", pago_em: "2026-03-12T14:00:00Z", raw_webhook: null, created_at: "2026-03-12T00:00:00Z", updated_at: "2026-03-12T00:00:00Z" },
  { id: "p-2", aluno_id: "aline",   order_nsu: "BS-aline-202604", invoice_slug: "inv-002", transaction_nsu: "tx-002", valor_centavos: 24990, metodo: "recorrente", status: "pago",      checkout_url: null, receipt_url: null, vencimento: "2026-04-12", pago_em: "2026-04-12T14:00:00Z", raw_webhook: null, created_at: "2026-04-12T00:00:00Z", updated_at: "2026-04-12T00:00:00Z" },
  { id: "p-3", aluno_id: "aline",   order_nsu: "BS-aline-202605", invoice_slug: "inv-003", transaction_nsu: "tx-003", valor_centavos: 24990, metodo: "recorrente", status: "pago",      checkout_url: null, receipt_url: null, vencimento: "2026-05-12", pago_em: "2026-05-12T14:00:00Z", raw_webhook: null, created_at: "2026-05-12T00:00:00Z", updated_at: "2026-05-12T00:00:00Z" },
  { id: "p-4", aluno_id: "joao",    order_nsu: "BS-joao-202605",  invoice_slug: "inv-004", transaction_nsu: null,     valor_centavos: 24990, metodo: null,         status: "pendente",  checkout_url: "https://checkout.infinitepay.io/abc", receipt_url: null, vencimento: "2026-05-01", pago_em: null, raw_webhook: null, created_at: "2026-04-25T00:00:00Z", updated_at: "2026-04-25T00:00:00Z" },
  { id: "p-5", aluno_id: "marina",  order_nsu: "BS-marina-202604", invoice_slug: "inv-005", transaction_nsu: null,    valor_centavos: 24990, metodo: null,         status: "atrasado",  checkout_url: "https://checkout.infinitepay.io/def", receipt_url: null, vencimento: "2026-04-20", pago_em: null, raw_webhook: null, created_at: "2026-04-15T00:00:00Z", updated_at: "2026-05-05T00:00:00Z" },
  { id: "p-6", aluno_id: "rafael",  order_nsu: "BS-rafael-202605", invoice_slug: "inv-006", transaction_nsu: "tx-006", valor_centavos: 24990, metodo: "pix",        status: "pago",      checkout_url: null, receipt_url: null, vencimento: "2026-05-25", pago_em: "2026-05-08T10:00:00Z", raw_webhook: null, created_at: "2026-05-08T00:00:00Z", updated_at: "2026-05-08T00:00:00Z" },
  { id: "p-7", aluno_id: "camila",  order_nsu: "BS-camila-202605", invoice_slug: "inv-007", transaction_nsu: "tx-007", valor_centavos: 24990, metodo: "recorrente", status: "pago",      checkout_url: null, receipt_url: null, vencimento: "2026-05-15", pago_em: "2026-05-15T08:00:00Z", raw_webhook: null, created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z" },
];
