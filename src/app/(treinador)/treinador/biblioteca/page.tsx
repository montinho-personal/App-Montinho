export const dynamic = "force-dynamic";

import { Badge } from "@/components/ui/Badge";
import { requireTreinadorPage } from "@/lib/auth/session";
import { listarBiblioteca, listarEquivalencias, listarFavoritos, usoDosExercicios } from "@/lib/data/biblioteca";
import { BibliotecaClient } from "./BibliotecaClient";

export const metadata = { title: "Biblioteca de exercícios" };

export default async function BibliotecaPage() {
  const sessao = await requireTreinadorPage();
  const [itens, equivalencias, favoritos] = await Promise.all([listarBiblioteca(), listarEquivalencias(), listarFavoritos(sessao.userId)]);
  const uso = await usoDosExercicios(itens);
  const semMidia = itens.filter((i) => !i.midia?.verificada).length;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge tone="accent">Biblioteca</Badge>
          <h1 className="text-3xl font-bold mt-3">Exercícios</h1>
          <p className="text-fg-muted text-sm mt-1">
            {itens.length} exercícios com grupo muscular, padrão de movimento, execução, erros comuns e substituições revisáveis.
          </p>
        </div>
        {semMidia > 0 ? (
          <p className="text-xs text-warning" role="status">
            {semMidia} sem vídeo verificado — filtre por “Sem mídia” para completar.
          </p>
        ) : null}
      </header>
      <BibliotecaClient inicial={itens} equivalenciasIniciais={equivalencias} favoritosIniciais={favoritos} uso={uso} />
    </div>
  );
}
