import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { TreinoAtivoServidor } from "@/app/(aluno)/aluno/treino/[treinoId]/TreinoAtivoServidor";

type PageProps = { params: Promise<{ id: string; treinoId: string }>; searchParams: Promise<{ sessao?: string; previa?: string }> };

export const metadata = { title: "Aula presencial" };

/** A mesma tela de treino do aluno, operada pelo personal (origem “treinador”). Com ?previa=1: só a prévia do montador (nada começa). */
export default async function AulaTreinoPage({ params, searchParams }: PageProps) {
  await requireTreinadorPage();
  const { id, treinoId } = await params;
  const { sessao: sessaoId, previa } = await searchParams;
  const ehPrevia = previa === "1";
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const nome = aluno.profile?.nome ?? "Aluno";
  return (
    <div className="mx-auto max-w-md">
      <TreinoAtivoServidor alunoId={id} nomeAluno={nome} treinoId={treinoId} sessaoId={ehPrevia ? undefined : sessaoId} presencial={{ alunoId: id, nomeAluno: nome.split(" ")[0], voltarHref: ehPrevia ? `/treinador/alunos/${id}/treinos` : `/treinador/alunos/${id}`, previa: ehPrevia }} />
    </div>
  );
}
