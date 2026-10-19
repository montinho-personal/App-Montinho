import { notFound } from "next/navigation";
import { getAluno, listTreinos, listExerciciosByTreino, listBiblioteca, getAnamnese } from "@/lib/db";
import { MontadorMultiClient } from "./MontadorMultiClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function TreinosMultiPage({ params }: PageProps) {
  const { id } = await params;
  const [aluno, treinos, biblioteca, anamnese] = await Promise.all([
    getAluno(id),
    listTreinos(id),
    listBiblioteca(),
    getAnamnese(id),
  ]);

  if (!aluno) notFound();

  const treinosComExercicios = await Promise.all(
    treinos.map(async (t) => ({
      ...t,
      exercicios: await listExerciciosByTreino(t.id),
    }))
  );

  return (
    <MontadorMultiClient
      alunoId={id}
      alunoNome={aluno.profile?.nome ?? "Aluno"}
      treinosIniciais={treinosComExercicios as never}
      biblioteca={(biblioteca as Array<{ nome: string }>).map((b) => ({ nome: b.nome }))}
      anamnese={anamnese as never}
    />
  );
}
