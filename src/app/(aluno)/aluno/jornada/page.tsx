// Minha Jornada: mapa visual das conquistas e linha do tempo do próprio aluno.
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { dadosDaJornada } from "@/lib/data/conquistas";
import { JornadaClient } from "@/components/jornada/JornadaClient";

export const metadata = { title: "Minha Jornada" };

export default async function JornadaPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const d = await dadosDaJornada(aluno);
  return <JornadaClient jornada={d.jornada} eventos={d.eventos} stats={d.stats} nome={(aluno.profile?.nome ?? sessao.nome).split(" ")[0]} reconhecimentos={d.reconhecimentosPorCodigo} semTreinos={d.semTreinos} />;
}
