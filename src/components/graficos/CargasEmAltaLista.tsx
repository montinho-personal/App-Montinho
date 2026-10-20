// Lista “cargas em alta”: nome, linha da carga máxima por dia e o ganho real.
import type { CargaEmAlta } from "@/lib/relatorios/cargas-em-alta";
import { dataBR } from "@/lib/format";
import { Sparkline } from "./Sparkline";

const kg = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;

export function CargasEmAltaLista({ itens, compacto = false }: { itens: CargaEmAlta[]; compacto?: boolean }) {
  if (!itens.length) return null;
  return (
    <ul className="space-y-2">
      {itens.map((c) => (
        <li key={c.chave} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{c.nome}</p>
            <p className="text-xs text-fg-muted">
              {kg(c.primeira)} → <span className="font-semibold text-fg">{kg(c.ultima)}</span>
              {compacto ? null : <span className="text-fg-subtle"> · desde {dataBR(c.desde).slice(0, 5)}</span>}
            </p>
          </div>
          <Sparkline valores={c.pontos.map((p) => p.carga)} largura={compacto ? 64 : 88} />
          <span className="shrink-0 whitespace-nowrap text-right text-sm font-bold text-success">+{kg(c.ganhoKg)}</span>
        </li>
      ))}
    </ul>
  );
}
