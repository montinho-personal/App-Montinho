// Ranking de troféus dos alunos e visitantes (0076).
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { getRanking } from "@/lib/data/ranking";
import { fraseDoRanking, podioDaPosicao, PODIO } from "@/lib/ranking/trofeus";
import { RankingTrofeus } from "@/components/ranking/RankingTrofeus";

export const metadata = { title: "Ranking de troféus" };
export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const sessao = await requireAlunoPage();
  const linhas = await getRanking(sessao.alunoId).catch(() => []);
  const eu = linhas.find((l) => l.eu);
  const p = eu ? podioDaPosicao(eu.posicao) : null;
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Gamificação</p>
        <h1 className="text-2xl font-bold">Ranking de troféus</h1>
        <p className="mt-1 text-sm text-fg-muted">Quem tem mais troféus diferentes na turma do Montinho. Empate divide o lugar.</p>
      </header>
      <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3" style={p ? { borderColor: `${PODIO[p].cor}80` } : undefined}>
        {eu ? <p className="text-3xl font-black">{p ? PODIO[p].emoji : `${eu.posicao}º`} <span className="text-base font-bold">{eu.trofeus} troféus</span></p> : null}
        <p className="text-sm font-semibold">{fraseDoRanking(linhas)}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <Link href="/aluno/conquistas/todas" className="alvo font-semibold text-accent underline-offset-2 hover:underline">Ver os troféus que faltam →</Link>
          <Link href="/aluno/conquistas/todas?aba=desafiadores" className="alvo font-semibold text-accent underline-offset-2 hover:underline">🔥 Mais desafiadores</Link>
        </div>
      </div>
      <RankingTrofeus linhas={linhas} />
      <p className="text-[11px] text-fg-subtle">No ranking aparecem só o primeiro nome e a inicial do sobrenome. Não quer aparecer para os outros? Desligue em Perfil → “Aparecer no ranking”.</p>
    </div>
  );
}
