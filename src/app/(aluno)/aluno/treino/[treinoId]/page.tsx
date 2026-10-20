import { requireAlunoPage } from "@/lib/auth/session";
import { TreinoAtivoServidor } from "./TreinoAtivoServidor";

type PageProps = { params: Promise<{ treinoId: string }>; searchParams: Promise<{ sessao?: string; extra?: string; rec?: string; tempo?: string }> };

export const metadata = { title: "Treino" };

export default async function TreinoExecucaoPage({ params, searchParams }: PageProps) {
  const sessao = await requireAlunoPage();
  const { treinoId } = await params;
  const { sessao: sessaoId, extra: extraId, rec, tempo } = await searchParams;
  return <TreinoAtivoServidor alunoId={sessao.alunoId} nomeAluno={sessao.nome} treinoId={treinoId} sessaoId={sessaoId} extraId={extraId} rec={rec} tempo={tempo} />;
}
