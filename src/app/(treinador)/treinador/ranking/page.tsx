// Ranking de troféus visto pelo personal: nomes completos e quem é visitante.
import { requireTreinadorPage } from "@/lib/auth/session";
import { getRanking } from "@/lib/data/ranking";
import { RankingTrofeus } from "@/components/ranking/RankingTrofeus";

export const metadata = { title: "Ranking de troféus" };
export const dynamic = "force-dynamic";

export default async function RankingTreinadorPage() {
  await requireTreinadorPage();
  const linhas = await getRanking(null).catch(() => []);
  return (
    <div className="max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Gamificação</p>
        <h1 className="text-2xl font-bold">Ranking de troféus</h1>
        <p className="mt-1 text-sm text-fg-muted">Alunos e visitantes ativos, por troféus diferentes conquistados. Os alunos veem só o primeiro nome e a inicial; quem desligou “Aparecer no ranking” no Perfil não aparece para os outros (aqui você vê todos).</p>
      </header>
      <RankingTrofeus linhas={linhas} nomeCompleto />
    </div>
  );
}
