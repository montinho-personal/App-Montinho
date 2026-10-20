// Jornada de um aluno vista pelo personal: capítulos, marcos, próximas
// conquistas e linha do tempo — com atalho para enviar reconhecimento.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { dadosDaJornada } from "@/lib/data/conquistas";
import { JornadaClient } from "@/components/jornada/JornadaClient";

export const metadata = { title: "Jornada do aluno" };

export default async function JornadaDoAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTreinadorPage();
  const { id } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const d = await dadosDaJornada(aluno);
  return (
    <div className="mx-auto max-w-md space-y-3">
      <Link href={`/treinador/alunos/${id}`} className="inline-flex min-h-6 items-center text-sm text-fg-muted hover:text-fg">← {aluno.profile?.nome ?? "Aluno"}</Link>
      <JornadaClient jornada={d.jornada} eventos={d.eventos} stats={d.stats} nome={(aluno.profile?.nome ?? "Aluno").split(" ")[0]} modo="treinador" alunoId={id} reconhecimentos={d.reconhecimentosPorCodigo} semTreinos={d.semTreinos} />
    </div>
  );
}
