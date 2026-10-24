// ============================================================================
// Exercícios sem vídeo nos treinos ativos (regra do Montinho, 24/10/2026):
// sempre que um aluno ou visitante tiver na ficha um exercício sem vídeo, o
// personal é avisado no painel. Vídeo = o da biblioteca (verificado) ou o
// link próprio do exercício na ficha. Contas puras; os dados vêm de
// src/lib/data/sem-video.ts.
// ============================================================================

export type ExercicioNaFicha = { nome: string; bibliotecaId: string | null; videoUrl: string | null; alunoId: string };
export type ItemVideo = { nome: string; temVideo: boolean };
export type Pessoa = { id: string; nome: string; visitante: boolean };
export type SemVideo = { exercicio: string; nomeLivre: boolean; pessoas: Pessoa[] };

export function exerciciosSemVideo(exs: ExercicioNaFicha[], biblioteca: Map<string, ItemVideo>, pessoas: Map<string, Pessoa>): SemVideo[] {
  const porNome = new Map<string, SemVideo>();
  for (const e of exs) {
    const pessoa = pessoas.get(e.alunoId);
    if (!pessoa || e.videoUrl?.trim()) continue;
    const item = e.bibliotecaId ? biblioteca.get(e.bibliotecaId) : undefined;
    if (item?.temVideo) continue;
    const nome = item?.nome ?? e.nome.trim();
    if (!nome) continue;
    const chave = nome.toLowerCase();
    const atual = porNome.get(chave) ?? { exercicio: nome, nomeLivre: !item, pessoas: [] };
    if (!atual.pessoas.some((p) => p.id === pessoa.id)) atual.pessoas.push(pessoa);
    porNome.set(chave, atual);
  }
  const alunos = (s: SemVideo) => s.pessoas.filter((p) => !p.visitante).length;
  return [...porNome.values()]
    .map((s) => ({ ...s, pessoas: [...s.pessoas].sort((a, b) => Number(a.visitante) - Number(b.visitante) || a.nome.localeCompare(b.nome, "pt-BR")) }))
    .sort((a, b) => alunos(b) - alunos(a) || b.pessoas.length - a.pessoas.length || a.exercicio.localeCompare(b.exercicio, "pt-BR"));
}
