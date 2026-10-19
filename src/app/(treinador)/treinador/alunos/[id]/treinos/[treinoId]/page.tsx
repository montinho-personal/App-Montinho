import { notFound } from "next/navigation";
import { getAluno, getTreinoComExercicios, listBiblioteca, listTreinos, listExerciciosByTreino, getAnamnese } from "@/lib/db";
import { detectarGrupo } from "@/lib/grupos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { MontadorClient } from "./MontadorClient";

type PageProps = { params: Promise<{ id: string; treinoId: string }> };

export default async function TreinoEditorPage({ params }: PageProps) {
  const { id, treinoId } = await params;
  const [aluno, treino, biblioteca, treinos, anamnese] = await Promise.all([
    getAluno(id),
    getTreinoComExercicios(treinoId),
    listBiblioteca(),
    listTreinos(id),
    getAnamnese(id),
  ]);
  if (!aluno || !treino) notFound();

  // Volume (séries/grupo) dos OUTROS treinos do aluno — base pro modo "semana toda".
  const volumeOutros: Partial<Record<GrupoMuscular, number>> = {};
  const outros = (treinos as Array<{ id: string }>).filter((t) => t.id !== treinoId);
  for (const t of outros) {
    const exs = (await listExerciciosByTreino(t.id)) as Array<{ nome: string; series: number }>;
    for (const ex of exs) {
      const g = detectarGrupo(ex.nome);
      const s = ex.series ?? 0;
      if (s > 0) volumeOutros[g] = (volumeOutros[g] ?? 0) + s;
    }
  }

  return (
    <MontadorClient
      alunoId={id}
      alunoNome={aluno.profile?.nome ?? "Aluno"}
      treino={{
        id: treino.id,
        letra: treino.letra,
        nome: treino.nome,
        observacoes: treino.observacoes ?? null,
      }}
      exerciciosIniciais={treino.exercicios.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        nome: e.nome as string,
        series: (e.series as number) ?? 0,
        reps: (e.reps as string) ?? "",
        ie: (e.ie as number) ?? null,
        descanso_seg: (e.descanso_seg as number) ?? null,
        observacoes: (e.observacoes as string) ?? null,
      }))}
      biblioteca={(biblioteca as Array<{ nome: string }>).map((b) => ({ nome: b.nome }))}
      volumeOutros={volumeOutros}
      anamnese={anamnese}
    />
  );
}
