// Quantas pessoas estão fazendo cada treino pronto (e o Monte com IA).
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { nomeVisivel, prontosVisiveis } from "@/lib/visitante/treinos-prontos";
import { DIAS_FAZENDO_AGORA, type UsoDoPronto } from "@/lib/visitante/uso-prontos";

const curta = (d: string | null) => (d ? d.split("-").reverse().slice(0, 2).join("/") : "—");

export function UsoTreinosProntos({ uso, demo }: { uso: UsoDoPronto[]; demo: boolean }) {
  const porChave = new Map(uso.map((u) => [u.chave, u]));
  const zero = { escolheram: 0, comAtivo: 0, fazendoAgora: 0, treinosFeitos: 0, desafiosConcluidos: 0, ultimaEscolha: null };
  const linhas = [
    ...prontosVisiveis(demo).map((t) => ({ chave: t.slug, rotulo: `${t.emoji} ${nomeVisivel(t)}`, ...zero, ...porChave.get(t.slug) })),
    { chave: "monte-com-ia", rotulo: "✨ Monte com IA", ...zero, ...porChave.get("monte-com-ia") },
  ].sort((a, b) => b.fazendoAgora - a.fazendoAgora || b.escolheram - a.escolheram || b.treinosFeitos - a.treinosFeitos);
  const total = (k: "escolheram" | "fazendoAgora" | "treinosFeitos") => linhas.reduce((n, l) => n + l[k], 0);

  return (
    <Card id="treinos-prontos">
      <CardHeader>
        <CardTitle className="text-base">🔥 Treinos prontos: quem está fazendo</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-sm text-fg-muted">
          {total("escolheram")} {total("escolheram") === 1 ? "escolha" : "escolhas"} · {total("fazendoAgora")} fazendo agora · {total("treinosFeitos")} {total("treinosFeitos") === 1 ? "treino feito" : "treinos feitos"}. “Fazendo agora” = está com o treino em Meus treinos e treinou nos últimos {DIAS_FAZENDO_AGORA} dias.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-muted">
                <th className="py-1.5 pr-2 font-medium">Treino</th>
                <th className="px-2 py-1.5 text-right font-medium">Fazendo agora</th>
                <th className="px-2 py-1.5 text-right font-medium">Escolheram</th>
                <th className="px-2 py-1.5 text-right font-medium">Treinos feitos</th>
                <th className="px-2 py-1.5 text-right font-medium">Desafio concluído</th>
                <th className="py-1.5 pl-2 text-right font-medium">Última escolha</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave} className={`border-t border-border ${l.escolheram ? "" : "text-fg-subtle"}`}>
                  <td className="py-2 pr-2 font-medium">{l.rotulo}</td>
                  <td className="px-2 py-2 text-right font-bold tabular-nums">{l.fazendoAgora}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.escolheram}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.treinosFeitos}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.chave === "monte-com-ia" ? "—" : l.desafiosConcluidos}</td>
                  <td className="py-2 pl-2 text-right tabular-nums">{curta(l.ultimaEscolha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
