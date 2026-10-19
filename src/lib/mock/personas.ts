// Personas disponíveis APENAS no modo demonstração (sem Supabase).
// A identidade é escolhida na tela de entrada e gravada em cookie.
export const DEMO_PERSONAS = [
  { chave: "treinador", userId: "trainer-montinho", nome: "Montinho (demo)", role: "treinador" as const, alunoId: null },
  { chave: "aluno:aline", userId: "aluno-aline", nome: "Aline de Souza (demo)", role: "aluno" as const, alunoId: "aline" },
  { chave: "aluno:joao", userId: "aluno-joao", nome: "João Pereira (demo)", role: "aluno" as const, alunoId: "joao" },
];
