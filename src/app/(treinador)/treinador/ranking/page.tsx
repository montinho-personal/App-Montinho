// Ranking de troféus visto pelo personal: nomes completos e quem é visitante.
import { requireTreinadorPage } from "@/lib/auth/session";
import { atualizarTrofeus, cliquesMontinhoNoRanking, getRanking, salvarDesempate } from "@/lib/data/ranking";
import { CliquesMontinhoRanking } from "@/components/ranking/CliquesMontinhoRanking";
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { listAlunos } from "@/lib/db";
import { RankingTrofeus } from "@/components/ranking/RankingTrofeus";
import { NarrativaRanking } from "@/components/ranking/NarrativaRanking";
import { semMinhaLinha } from "@/lib/ranking/trofeus";

export const metadata = { title: "Ranking de troféus" };
export const dynamic = "force-dynamic";

export default async function RankingTreinadorPage() {
  await requireTreinadorPage();
  const alunos = (await listAlunos({ incluirVisitantes: true }).catch(() => [])).filter((a) => a.status === "ativo");
  await atualizarTrofeus(alunos);
  if (alunos.length) await salvarDesempate(await aderenciaDeTodos(alunos)).catch(() => undefined);
  // O “Meu treino” do personal fica fora do ranking (pedido do Montinho, 28/10/2026).
  const linhas = semMinhaLinha(await getRanking(null).catch(() => []));
  const cliques = await cliquesMontinhoNoRanking(90).catch(() => null);
  return (
    <div className="max-w-2xl space-y-5">
      <NarrativaRanking />
      {cliques ? <CliquesMontinhoRanking r={cliques} dias={90} /> : null}
      <RankingTrofeus linhas={linhas} nomeCompleto />
      <p className="text-[11px] text-fg-subtle">Aqui você vê o nome completo de todos. Os alunos veem só o primeiro nome e a inicial, e quem desligou “Aparecer no ranking” não aparece para eles.</p>
    </div>
  );
}
