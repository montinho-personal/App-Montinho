import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { TreinoAtivoServidor } from "@/app/(aluno)/aluno/treino/[treinoId]/TreinoAtivoServidor";

type PageProps = { params: Promise<{ id: string; treinoId: string }>; searchParams: Promise<{ sessao?: string }> };

export const metadata = { title: "Aula presencial" };

/** A mesma tela de treino do aluno, operada pelo personal (origem “treinador”). */
export default async function AulaTreinoPage({ params, searchParams }: PageProps) {
  await requireTreinadorPage();
  const { id, treinoId } = await params;
  const { sessao: sessaoId } = await searchParams;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const nome = aluno.profile?.nome ?? "Aluno";
  return (
    <div className="mx-auto max-w-md">
      <TreinoAtivoServidor alunoId={id} nomeAluno={nome} treinoId={treinoId} sessaoId={sessaoId} presencial={{ alunoId: id, nomeAluno: nome.split(" ")[0], voltarHref: `/treinador/alunos/${id}` }} />
    </div>
  );
}
