// Treino livre por metas do aluno: o personal só define as séries por semana de cada músculo.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { ehLivreMetas, placarDoAluno } from "@/lib/data/livre-metas";
import { EditorMetas } from "@/components/livre-metas/EditorMetas";
import { PlacarMetas } from "@/components/livre-metas/PlacarMetas";

export const metadata = { title: "Treino livre por metas" };
export const dynamic = "force-dynamic";

export default async function LivreMetasPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTreinadorPage();
  const { id } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const { programa } = await getPlanoAtivo(id);
  const ligado = ehLivreMetas(programa);
  const p = ligado ? await placarDoAluno(id).catch(() => null) : null;
  const nome = aluno.profile?.nome ?? "Aluno";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <Link href={`/treinador/alunos/${id}/treinos`} className="text-xs text-fg-muted hover:underline">← Treino de musculação</Link>
        <h1 className="text-2xl font-bold">🎯 Treino livre por metas · {nome.split(" ")[0]}</h1>
        <p className="text-sm text-fg-muted">Você define só a faixa de séries por semana de cada músculo. O aluno monta o treino na hora e o app vai sugerindo o que falta.</p>
      </header>
      {p?.placar.length ? <PlacarMetas placar={p.placar} sugestao={p.sugestao} titulo="Como está a semana" /> : null}
      <EditorMetas alunoId={id} inicial={ligado ? (programa?.metas_volume ?? {}) : {}} ligadoInicial={ligado} />
    </div>
  );
}
