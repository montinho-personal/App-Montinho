// Exercícios sem vídeo nos treinos ativos de alunos e visitantes (painel do personal).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { mockProfiles } from "@/lib/mock/db";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { exerciciosSemVideo, type ExercicioNaFicha, type Pessoa, type SemVideo } from "@/lib/videos/sem-video";

export async function listarSemVideo(): Promise<SemVideo[]> {
  const itens = await listarBiblioteca();
  const biblioteca = new Map(itens.map((i) => [i.id, { nome: i.nome, temVideo: !!i.midia?.verificada }]));
  if (isDemoMode()) {
    const st = demoStore();
    const ativos = new Map(st.treinos.filter((t) => t.ativo).map((t) => [t.id, t.aluno_id]));
    const pessoas = new Map<string, Pessoa>(
      st.alunos.filter((a) => a.status !== "arquivado").map((a) => [a.id, { id: a.id, nome: mockProfiles.find((p) => p.id === a.profile_id)?.nome ?? "Aluno", visitante: a.modalidade === "visitante" }])
    );
    const exs: ExercicioNaFicha[] = st.exercicios
      .filter((e) => ativos.has(e.treino_id) && !e.removido_em)
      .map((e) => ({ nome: e.nome, bibliotecaId: e.biblioteca_id ?? null, videoUrl: e.video_url, alunoId: ativos.get(e.treino_id)! }));
    return exerciciosSemVideo(exs, biblioteca, pessoas);
  }
  const db = await getDb();
  const [{ data: treinos }, { data: alunos }] = await Promise.all([
    db.from("treinos").select("id, aluno_id").eq("ativo", true).limit(5000),
    db.from("alunos").select("id, status, modalidade, profile:profiles(nome)").neq("status", "arquivado"),
  ]);
  const ativos = new Map(((treinos ?? []) as Array<{ id: string; aluno_id: string }>).map((t) => [t.id, t.aluno_id]));
  if (!ativos.size) return [];
  const pessoas = new Map<string, Pessoa>(
    ((alunos ?? []) as unknown as Array<{ id: string; modalidade: string | null; profile: { nome: string | null } | null }>).map((a) => [a.id, { id: a.id, nome: a.profile?.nome ?? "Aluno", visitante: a.modalidade === "visitante" }])
  );
  const { data: exs } = await db.from("exercicios").select("nome, biblioteca_id, video_url, treino_id").in("treino_id", [...ativos.keys()]).is("removido_em", null).limit(20000);
  return exerciciosSemVideo(
    ((exs ?? []) as Array<{ nome: string; biblioteca_id: string | null; video_url: string | null; treino_id: string }>).map((e) => ({ nome: e.nome, bibliotecaId: e.biblioteca_id, videoUrl: e.video_url, alunoId: ativos.get(e.treino_id)! })),
    biblioteca,
    pessoas
  );
}
