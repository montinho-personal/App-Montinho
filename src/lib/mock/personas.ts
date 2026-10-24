// Personas disponíveis APENAS no modo demonstração (sem Supabase).
// A identidade é escolhida na tela de entrada e gravada em cookie.
export const DEMO_PERSONAS = [
  { chave: "treinador", userId: "trainer-montinho", nome: "Montinho (demo)", role: "treinador" as const, alunoId: null },
  { chave: "aluno:aline", userId: "aluno-aline", nome: "Aline de Souza (demo)", role: "aluno" as const, alunoId: "aline" },
  { chave: "aluno:joao", userId: "aluno-joao", nome: "João Pereira (demo)", role: "aluno" as const, alunoId: "joao" },
  { chave: "aluno:bia", userId: "aluno-bia", nome: "Bia Ramos (visitante, demo)", role: "aluno" as const, alunoId: "bia", modalidade: "visitante" as const },
  // Para ver o pós-30 dias na demonstração: acesso acabou há 2 dias (app aberto só para ver) e há 10 dias (app fechado).
  { chave: "aluno:bia-fim", userId: "aluno-bia", nome: "Bia Ramos (visitante, 30 dias acabaram há 2 dias)", role: "aluno" as const, alunoId: "bia", modalidade: "visitante" as const, diasDesdeFim: 2 },
  { chave: "aluno:bia-fechado", userId: "aluno-bia", nome: "Bia Ramos (visitante, app fechado)", role: "aluno" as const, alunoId: "bia", modalidade: "visitante" as const, diasDesdeFim: 10 },
];
