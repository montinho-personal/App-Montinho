// A Jornada do Chalalá: mapa ilustrado das conquistas, caminho semanal e história do próprio aluno.
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { dadosDaJornada } from "@/lib/data/conquistas";
import { JornadaChalala } from "@/components/jornada-chalala/JornadaChalala";
import { albumParaAluno } from "@/lib/data/desbloqueia";
import { eventosDasDescobertas, progressoAlbum } from "@/lib/desbloqueia/motor";
import { juntarEventos } from "@/lib/conquistas/jornada";

export const metadata = { title: "A Jornada do Chalalá" };

export default async function JornadaPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const [d, album] = await Promise.all([dadosDaJornada(aluno), albumParaAluno(aluno)]);
  const eventos = juntarEventos(d.eventos, eventosDasDescobertas(album.itens));
  const stats = { ...d.stats, album: progressoAlbum(album.itens) };
  return <JornadaChalala jornada={d.jornada} eventos={eventos} stats={stats} nome={(aluno.profile?.nome ?? sessao.nome).split(" ")[0]} reconhecimentos={d.reconhecimentosPorCodigo} semTreinos={d.semTreinos} />;
}
