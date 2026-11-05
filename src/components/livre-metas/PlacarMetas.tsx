// Placar da semana do protocolo livre (por metas) (servidor ou cliente).
import { STATUS_META, type LinhaPlacar, type Sugestao } from "@/lib/treino/livre-metas";

const COR: Record<LinhaPlacar["status"], string> = {
  zerado: "bg-fg-subtle/40",
  abaixo: "bg-gold",
  na_faixa: "bg-success",
  limite: "bg-red",
  acima: "bg-red",
};

export function PlacarMetas({ placar, sugestao, titulo = "🎯 Sua semana por músculo", compacto, resumo, nota }: { placar: LinhaPlacar[]; sugestao?: Sugestao | null; titulo?: string; compacto?: boolean; resumo?: string; nota?: string | null }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Placar da semana">
      <p className="text-sm font-bold">{titulo}</p>
      {resumo ? <p className="mt-1 text-sm text-fg-muted">{resumo}</p> : null}
      {sugestao ? <p className="mt-1 rounded-lg bg-accent/10 px-3 py-2 text-sm text-fg">💡 {sugestao.texto}</p> : null}
      <ul className={`mt-3 grid gap-x-4 gap-y-2 ${compacto ? "grid-cols-2" : "sm:grid-cols-2"}`}>
        {placar.map((l) => {
          // Ombros = total; anterior/lateral/posterior ficam LOGO ABAIXO dele, no mesmo bloco de
          // largura inteira (pedido do Montinho, 29/10 e 05/11/2026: o “Lateral” caía na coluna do lado).
          const temTotal = placar.some((x) => x.grupo === "ombros");
          if (l.grupo.startsWith("ombro_") && temTotal) return null;
          const totalOmbros = l.grupo === "ombros" && (!!l.partes || placar.some((x) => x.grupo.startsWith("ombro_")));
          if (!totalOmbros) return <Linha key={l.grupo} l={l} nome={l.nome} />;
          const partes = [
            ...placar.filter((x) => x.grupo.startsWith("ombro_")).map((x) => ({ grupo: x.grupo, linha: x as LinhaPlacar | null, nome: x.nome, feitas: x.feitas })),
            ...(l.partes ?? []).map((x) => ({ grupo: x.grupo, linha: null as LinhaPlacar | null, nome: x.nome, feitas: x.feitas })),
          ].sort((x, y) => ordemOmbro(x.grupo) - ordemOmbro(y.grupo));
          return (
            <li key={l.grupo} className="col-span-full text-xs">
              <Corpo l={l} nome="Ombros (total)" />
              <p className="mt-0.5 text-[10px] text-fg-subtle">Soma de anterior + lateral + posterior</p>
              <ul className="mt-1.5 space-y-1.5 border-l border-border pl-3">
                {partes.map((p) =>
                  p.linha ? (
                    <li key={p.grupo}>
                      <Corpo l={p.linha} nome={`↳ ${nomeParte(p.nome)}`} parte />
                    </li>
                  ) : (
                    <li key={p.grupo} className="flex items-baseline gap-1 text-fg-muted">
                      <span className="font-medium">↳ {nomeParte(p.nome)}</span>
                      <span className="text-[10px] text-fg-subtle">sem faixa própria</span>
                      <span className="ml-auto tabular-nums">{String(p.feitas).replace(".", ",")} {p.feitas === 1 ? "série" : "séries"}</span>
                    </li>
                  ),
                )}
              </ul>
            </li>
          );
        })}
      </ul>
      {nota ? <p className="mt-2 text-[11px] text-fg-muted">{nota}</p> : null}
      <p className="mt-2 text-[10px] text-fg-subtle">⚪ ainda não fez · 🟡 abaixo da faixa · ✅ na faixa · 🔴 no limite ou passou (só aviso)</p>
    </section>
  );
}

const ORDEM_OMBRO = ["ombro_anterior", "ombro_lateral", "ombro_posterior"];
const ordemOmbro = (g: string) => (ORDEM_OMBRO.indexOf(g) + 1 || 9);
const nomeParte = (n: string) => n.replace(/^Ombro ([a-z])/, (_, c: string) => c.toUpperCase());

function Corpo({ l, nome, parte }: { l: LinhaPlacar; nome: string; parte?: boolean }) {
  const pct = Math.min(100, Math.round((l.feitas / Math.max(1, l.max)) * 100));
  const st = STATUS_META[l.status];
  return (
    <>
      <div className="flex items-baseline gap-1">
        <span className={parte ? "font-medium text-fg-muted" : "font-semibold text-fg"}>{nome}</span>
        <span className="ml-auto tabular-nums text-fg-muted">
          {String(l.feitas).replace(".", ",")} de {l.min}–{l.max}
        </span>
        <span aria-label={st.rotulo} title={st.rotulo}>{st.emoji}</span>
      </div>
      <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className={`h-full ${COR[l.status]}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-px bg-fg/40" style={{ left: `${Math.round((l.min / Math.max(1, l.max)) * 100)}%` }} />
      </div>
    </>
  );
}

function Linha({ l, nome }: { l: LinhaPlacar; nome: string }) {
  return (
    <li className="text-xs">
      <Corpo l={l} nome={nome} />
    </li>
  );
}
