import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { getAluno } from "@/lib/db";
import { recordesDoAluno } from "@/lib/data/recordes";
import { MeusRecordes } from "@/components/recordes/MeusRecordes";
import { Voltar } from "@/components/ui/Voltar";

export const metadata = { title: "Recordes do aluno" };

export default async function RecordesDoAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  if (!FEATURES.multimodalidade) notFound();
  await requireTreinadorPage();
  const { id } = await params;
  const aluno = await getAluno(id).catch(() => null);
  if (!aluno) notFound();
  const dados = await recordesDoAluno(id);
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <Voltar href={`/treinador/alunos/${id}`} />
      <div>
        <h1 className="text-2xl font-black">🏅 Recordes · {aluno.profile?.nome ?? "Aluno"}</h1>
        <p className="text-sm text-fg-muted">Força por RM exato, benchmarks (RX e Scaled separados) e marcas. Aqui você também registra o primeiro movimento técnico.</p>
      </div>
      <MeusRecordes dados={dados} modo="personal" alunoId={id} />
    </div>
  );
}
