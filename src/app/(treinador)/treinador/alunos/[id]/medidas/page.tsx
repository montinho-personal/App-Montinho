// Medidas e avaliações de um aluno, vistas e registradas pelo personal.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { listarAvaliacoes } from "@/lib/data/medidas";
import { isDemoMode } from "@/lib/env";
import { MedidasAvaliacoes } from "@/components/medidas/MedidasAvaliacoes";
import { ComparadorMedidas } from "@/components/evolucao/ComparadorMedidas";

export const metadata = { title: "Medidas e avaliações" };
export const dynamic = "force-dynamic";

export default async function MedidasDoAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTreinadorPage();
  const { id } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const { medidas, arquivos } = await listarAvaliacoes(id);
  const nome = aluno.profile?.nome ?? "Aluno";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/treinador/alunos/${id}`} className="inline-flex min-h-6 items-center text-sm text-fg-muted hover:text-fg">← {nome}</Link>
      <header>
        <h1 className="text-2xl font-bold">Medidas e avaliações</h1>
        <p className="mt-1 text-sm text-fg-muted">O que você ou o aluno registrarem aqui aparece na Evolução dele, no comparador e no relatório. Arquivos (PDF, foto, print) ficam guardados só para vocês dois. Em cada arquivo, “✨ Puxar as medidas” lê os números de todas as datas do laudo.</p>
      </header>
      {medidas.length >= 2 ? <ComparadorMedidas evolucao={medidas} /> : null}
      <MedidasAvaliacoes alunoId={id} medidas={medidas} arquivos={arquivos} nome={nome.split(" ")[0]} demo={isDemoMode()} doPersonal />
    </div>
  );
}
