// Tendência do Montinho Pulso por semana (médias na escala −2…+2), em cor neutra.
// Mostra o período, não causa.
import type { SemanaPulso } from "@/lib/pulso/classificar";

const LINHAS = [
  { k: "energia", l: "Energia" },
  { k: "motivacao", l: "Vontade" },
  { k: "recuperacao", l: "Corpo" },
  { k: "sono", l: "Sono" },
] as const;

export function TendenciaPulso({ semanas }: { semanas: SemanaPulso[] }) {
  const tem = (k: (typeof LINHAS)[number]["k"]) => semanas.some((s) => s[k] != null);
  const visiveis = LINHAS.filter((x) => tem(x.k));
  if (!visiveis.length) return null;
  return (
    <div className="space-y-1" aria-label={`Tendência das últimas ${semanas.length} semanas`}>
      {visiveis.map((x) => (
        <div key={x.k} className="flex items-center gap-2 text-[11px] text-fg-muted">
          <span className="w-14">{x.l}</span>
          <div className="flex h-5 items-end gap-0.5">
            {semanas.map((s) => {
              const v = s[x.k];
              return <span key={s.inicio} title={v == null ? "sem resposta" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}`} className={`w-3 rounded-sm ${v == null ? "h-1 bg-border" : v < 0 ? "bg-fg-subtle" : "bg-accent/70"}`} style={v == null ? undefined : { height: `${30 + ((v + 2) / 4) * 70}%` }} />;
            })}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-fg-subtle">Médias por semana (mais antiga → mais recente). Mostram o período, não causa.</p>
    </div>
  );
}
