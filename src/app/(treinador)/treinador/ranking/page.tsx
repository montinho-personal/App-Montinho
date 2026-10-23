// Ranking de troféus visto pelo personal: nomes completos e quem é visitante.
import { requireTreinadorPage } from "@/lib/auth/session";
import { atualizarTrofeus, getRanking, salvarDesempate } from "@/lib/data/ranking";
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { listAlunos } from "@/lib/db";
import { RankingTrofeus } from "@/components/ranking/RankingTrofeus";

export const metadata = { title: "Ranking de troféus" };
export const dynamic = "force-dynamic";

export default async function RankingTreinadorPage() {
  await requireTreinadorPage();
  const alunos = (await listAlunos({ incluirVisitantes: true }).catch(() => [])).filter((a) => a.status === "ativo");
  await atualizarTrofeus(alunos);
  if (alunos.length) await salvarDesempate(await aderenciaDeTodos(alunos)).catch(() => undefined);
  const linhas = await getRanking(null).catch(() => []);
  return (
    <div className="max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Gamificação</p>
        <h1 className="text-2xl font-bold">Ranking de troféus</h1>
        <p className="mt-1 text-sm text-fg-muted">Quem tem mais troféus fica na frente.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>Empatou? Fica na frente quem treinou com mais constância (*).</li>
          <li>Os alunos veem só o primeiro nome e a inicial do sobrenome. Você vê o nome completo.</li>
          <li>Quem escolheu não aparecer no ranking some para os outros alunos, mas aqui você vê todo mundo.</li>
        </ul>
      </header>
      <RankingTrofeus linhas={linhas} nomeCompleto />
    </div>
  );
}
