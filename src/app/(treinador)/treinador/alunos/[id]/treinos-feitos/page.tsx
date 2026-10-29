// Treinos feitos de um aluno: treino a treino, com as séries e as anotações.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { dataLocal } from "@/lib/aderencia/calcular";
import { treinosFeitosDoAluno } from "@/lib/data/treinos-feitos";
import { TreinosFeitosLista } from "@/components/historico/TreinosFeitosLista";

export const metadata = { title: "Treinos feitos" };
export const dynamic = "force-dynamic";

export default async function TreinosFeitosDoAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTreinadorPage();
  const { id } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const nome = aluno.profile?.nome ?? "Aluno";
  const lista = await treinosFeitosDoAluno(id);
  const notas = lista.reduce((n, t) => n + t.anotacoes.length, 0);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/treinador/alunos/${id}`} className="inline-flex min-h-6 items-center text-sm text-fg-muted hover:text-fg">← {nome}</Link>
      <header>
        <h1 className="text-2xl font-bold">📋 Treinos feitos</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {lista.length ? `${lista.length} ${lista.length === 1 ? "treino" : "treinos"} de ${nome.split(" ")[0]}${notas ? ` · ${notas} ${notas === 1 ? "anotação" : "anotações"}` : ""}. Toque num treino para ver cada série.` : `${nome.split(" ")[0]} ainda não registrou treinos.`}
        </p>
      </header>
      <TreinosFeitosLista lista={lista} hoje={dataLocal(new Date())} porTreino />
    </div>
  );
}
