// Minha Jornada: mapa visual das conquistas e linha do tempo do próprio aluno.
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { dadosDaJornada } from "@/lib/data/conquistas";
import { JornadaClient } from "@/components/jornada/JornadaClient";
import { albumParaAluno } from "@/lib/data/desbloqueia";
import { eventosDasDescobertas, progressoAlbum } from "@/lib/desbloqueia/motor";
import { juntarEventos } from "@/lib/conquistas/jornada";

export const metadata = { title: "Minha Jornada" };

export default async function JornadaPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const [d, album] = await Promise.all([dadosDaJornada(aluno), albumParaAluno(aluno)]);
  const eventos = juntarEventos(d.eventos, eventosDasDescobertas(album.itens));
  const stats = { ...d.stats, album: progressoAlbum(album.itens) };
  return <JornadaClient jornada={d.jornada} eventos={eventos} stats={stats} nome={(aluno.profile?.nome ?? sessao.nome).split(" ")[0]} reconhecimentos={d.reconhecimentosPorCodigo} semTreinos={d.semTreinos} />;
}
