import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { diferenca, TEXTO_LIMITE, TEXTO_SEMANA_FRACA, type ComparacaoMeses } from "@/lib/visitante/evolucao";

/** Modo Visitante: este mês × mês passado, só com o que foi registrado. */
export function MesContraMes({ c, semanaFraca }: { c: ComparacaoMeses; semanaFraca: boolean }) {
  const linhas: Array<{ rotulo: string; atual: number; anterior: number; sufixo?: string }> = [
    { rotulo: "Treinos", atual: c.atual.treinos, anterior: c.anterior.treinos },
    { rotulo: "Séries", atual: c.atual.series, anterior: c.anterior.series },
    { rotulo: "Carga total levantada", atual: c.atual.cargaTotalKg, anterior: c.anterior.cargaTotalKg, sufixo: " kg" },
    { rotulo: "Tempo treinando", atual: c.atual.minutos, anterior: c.anterior.minutos, sufixo: " min" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Este mês × mês passado</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {semanaFraca ? <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold">{TEXTO_SEMANA_FRACA}</p> : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-fg-muted">
              <th className="py-1 text-left font-normal" />
              <th className="py-1 text-right font-normal capitalize">{c.rotuloAtual}</th>
              <th className="py-1 text-right font-normal capitalize">{c.rotuloAnterior}</th>
              <th className="py-1 text-right font-normal">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.rotulo} className="border-t border-border">
                <td className="py-2">{l.rotulo}</td>
                <td className="py-2 text-right font-semibold">{l.atual.toLocaleString("pt-BR")}{l.sufixo ?? ""}</td>
                <td className="py-2 text-right text-fg-muted">{l.anterior.toLocaleString("pt-BR")}{l.sufixo ?? ""}</td>
                <td className="py-2 text-right text-fg-muted">{diferenca(l.atual, l.anterior)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-fg-subtle">{TEXTO_LIMITE}</p>
      </CardBody>
    </Card>
  );
}
