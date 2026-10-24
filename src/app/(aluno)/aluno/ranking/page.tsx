// Ranking de troféus dos alunos e visitantes (0076).
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { atualizarTrofeus, getRanking } from "@/lib/data/ranking";
import { getAluno } from "@/lib/db";
import { fraseDoRanking, podioDaPosicao, PODIO } from "@/lib/ranking/trofeus";
import { RankingTrofeus } from "@/components/ranking/RankingTrofeus";
import { NarrativaRanking } from "@/components/ranking/NarrativaRanking";
import { EntradaDesafios } from "@/components/desafios/EntradaDesafios";
import { listarMeusDesafios } from "@/lib/data/desafios";

export const metadata = { title: "Ranking de troféus" };
export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (aluno) await atualizarTrofeus([aluno]);
  const [linhas, desafios] = await Promise.all([getRanking(sessao.alunoId).catch(() => []), listarMeusDesafios(sessao.alunoId).catch(() => [])]);
  const eu = linhas.find((l) => l.eu);
  const p = eu ? podioDaPosicao(eu.posicao) : null;
  return (
    <div className="space-y-5">
      <NarrativaRanking />
      <EntradaDesafios desafios={desafios} />
      <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3" style={p ? { borderColor: `${PODIO[p].cor}80` } : undefined}>
        {eu ? <p className="text-3xl font-black">{p ? PODIO[p].emoji : `${eu.posicao}º`} <span className="text-base font-bold">{eu.trofeus} {eu.trofeus === 1 ? "troféu" : "troféus"}</span></p> : null}
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
