// Ranking de troféus dos alunos e visitantes (0076).
import Link from "next/link";
import { IncentivoIndicacao } from "@/components/indicacao/IncentivoIndicacao";
import { incentivoIndicacao } from "@/lib/data/indicacao";
import { requireAlunoPage } from "@/lib/auth/session";
import { atualizarTrofeus, getRanking } from "@/lib/data/ranking";
import { getAluno } from "@/lib/db";
import { fraseDoRanking, podioDaPosicao, PODIO, semMinhaLinha } from "@/lib/ranking/trofeus";
import { RankingTrofeus } from "@/components/ranking/RankingTrofeus";
import { CutucadasRecebidas } from "@/components/ranking/CutucadasRecebidas";
import { minhasCutucadasRanking, montinhoNoRanking } from "@/lib/data/ranking";
import { MontinhoNoRanking } from "@/components/ranking/MontinhoNoRanking";
import { ehVisitante } from "@/lib/auth/guards";
import { BRAND } from "@/config/brand";
import { CompartilharRanking } from "@/components/ranking/CompartilharRanking";
import { NarrativaRanking } from "@/components/ranking/NarrativaRanking";
import { EntradaDesafios } from "@/components/desafios/EntradaDesafios";
import { listarMeusDesafios } from "@/lib/data/desafios";

export const metadata = { title: "Ranking de troféus" };
export const dynamic = "force-dynamic";

/** Personal no “Meu treino”: fora do ranking, mas vê onde estaria (nunca “conquiste o 1º troféu”). */
function fraseDoPersonal(eu: { posicao: number; trofeus: number } | null): string {
  if (!eu) return "Seus troféus aparecem aqui assim que você ganhar o primeiro.";
  return `Com ${eu.trofeus} ${eu.trofeus === 1 ? "troféu" : "troféus"}, você estaria em ${eu.posicao}º lugar (só você vê isto).`;
}

export default async function RankingPage() {
  const sessao = await requireAlunoPage();
  const incentivo = await incentivoIndicacao(sessao).catch(() => null);
  const aluno = await getAluno(sessao.alunoId);
  if (aluno) await atualizarTrofeus([aluno]);
  const [todas, desafios, cutucadas] = await Promise.all([getRanking(sessao.alunoId).catch(() => []), listarMeusDesafios(sessao.alunoId).catch(() => []), sessao.comoPersonal ? Promise.resolve([]) : minhasCutucadasRanking(sessao.alunoId).catch(() => [])]);
  const montinho = sessao.comoPersonal ? null : await montinhoNoRanking().catch(() => null);
  // Personal no “Meu treino”: vê o ranking como aluno, mas fica fora dele.
  const linhas = sessao.comoPersonal ? semMinhaLinha(todas) : todas;
  const eu = linhas.find((l) => l.eu);
  const p = eu ? podioDaPosicao(eu.posicao) : null;
  return (
    <div className="space-y-5">
      <NarrativaRanking />
      <CutucadasRecebidas cutucadas={cutucadas} />
      <EntradaDesafios desafios={desafios} />
      <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3" style={p ? { borderColor: `${PODIO[p].cor}80` } : undefined}>
        {sessao.comoPersonal ? <p className="text-xs text-fg-muted">🏋️ Você está como aluno pelo “Meu treino”: seus troféus contam para você, mas você fica fora do ranking.</p> : null}
        {eu ? <p className="text-3xl font-black">{p ? PODIO[p].emoji : `${eu.posicao}º`} <span className="text-base font-bold">{eu.trofeus} {eu.trofeus === 1 ? "troféu" : "troféus"}</span></p> : null}
        <p className="text-sm font-semibold">{sessao.comoPersonal ? fraseDoPersonal(todas.find((l) => l.eu) ?? null) : fraseDoRanking(linhas)}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <Link href="/aluno/conquistas/todas" className="alvo font-semibold text-accent underline-offset-2 hover:underline">Ver os troféus que faltam →</Link>
          <Link href="/aluno/conquistas/todas?aba=desafiadores" className="alvo font-semibold text-accent underline-offset-2 hover:underline">🔥 Mais desafiadores</Link>
        </div>
        {eu && !sessao.comoPersonal ? <div className="mt-3"><CompartilharRanking dados={{ posicao: eu.posicao, trofeus: eu.trofeus, total: linhas.length, nome: (aluno?.profile?.nome ?? sessao.nome).split(" ")[0] }} /></div> : null}
      </div>
      {montinho ? <MontinhoNoRanking dados={montinho} meusTrofeus={eu?.trofeus ?? null} minhaPosicao={eu?.posicao ?? null} nome={aluno?.profile?.nome ?? sessao.nome} visitante={ehVisitante(sessao)} whatsapp={BRAND.contact.whatsapp ?? null} /> : null}
      <RankingTrofeus linhas={linhas} desafiar />
      {incentivo ? <IncentivoIndicacao momento="ranking" aluno={incentivo.aluno} fecharam={incentivo.fecharam} /> : null}
      <p className="text-[11px] text-fg-subtle">No ranking aparecem só o primeiro nome e a inicial do sobrenome. Não quer aparecer para os outros? Desligue em Perfil → “Aparecer no ranking”.</p>
    </div>
  );
}
