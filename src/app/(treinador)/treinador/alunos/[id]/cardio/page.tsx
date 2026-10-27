// “Treino de cardio” do aluno: a mesma porta do “Treino de musculação”.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { cardioDoAluno } from "@/lib/data/cardio";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { dataLocal } from "@/lib/aderencia/calcular";
import { AbasTreinoCardio } from "@/components/cardio/AbasTreinoCardio";
import { CardioDoAlunoPersonal, resumoDoCardio } from "@/components/cardio/CardioDoAlunoPersonal";

export const metadata = { title: "Treino de cardio" };

export default async function CardioDoAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTreinadorPage();
  const { id } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const [plano, aderencia] = await Promise.all([getPlanoAtivo(id), aderenciaDoAluno(aluno).catch(() => null)]);
  const c = await cardioDoAluno(id, (aderencia?.semanas ?? []).filter((w) => w.pausada).map((w) => w.inicio)).catch(() => null);
  const nome = aluno.profile?.nome ?? "Aluno";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <Link href={`/treinador/alunos/${id}`} className="text-xs text-fg-muted hover:underline">← {nome}</Link>
        <h1 className="text-2xl font-bold">❤️ Treino de cardio · {nome.split(" ")[0]}</h1>
      </header>
      <AbasTreinoCardio alunoId={id} ativo="cardio" resumoCardio={resumoDoCardio(c)} />
      <CardioDoAlunoPersonal alunoId={id} c={c} treinos={plano.treinos.filter((t) => t.ativo).map((t) => ({ id: t.id, letra: t.letra, nome: t.nome }))} hoje={dataLocal(new Date())} />
    </div>
  );
}
