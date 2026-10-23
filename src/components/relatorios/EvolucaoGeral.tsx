// Evolução geral de cada TREINO e de cada MÚSCULO (aba Evolução do app).
// Server Component; contas em lib/relatorios/evolucao-geral.ts.
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Sparkline } from "@/components/graficos/Sparkline";
import type { MusculoEvolucao, TreinoEvolucao } from "@/lib/relatorios/evolucao-geral";

const br = (v: number, casas = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
const pctTxt = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${br(Math.abs(v))}%`);
const tom = (v: number | null) => (v != null && v > 0 ? "text-accent" : "text-fg-muted");

export function EvolucaoGeral({ treinos, musculos }: { treinos: TreinoEvolucao[]; musculos: MusculoEvolucao[] }) {
  if (!treinos.length && !musculos.length) return null;
  const temMetades = musculos.some((m) => m.seriesSemanaAntes != null);
  return (
    <div className="space-y-5">
      {treinos.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução de cada treino</CardTitle>
            <p className="text-xs text-fg-muted">Volume (carga × repetições) das primeiras × últimas vezes de cada treino no período, e a variação típica da carga dos exercícios que se repetiram.</p>
          </CardHeader>
          <CardBody className="space-y-3">
            {treinos.map((t) => (
              <div key={t.letra} className="flex items-center gap-3 rounded-lg border border-border bg-bg/40 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-black text-accent">{t.letra}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.nome}</p>
                  {t.volumeInicial != null ? (
                    <p className="text-xs text-fg-muted">
                      {t.sessoes.length} {t.sessoes.length === 1 ? "treino" : "treinos"} · volume {br(t.volumeInicial / 1000)} t → <b className="text-fg">{br(t.volumeAtual! / 1000)} t</b> <span className={tom(t.volumePct)}>({pctTxt(t.volumePct)})</span>
                      {t.exerciciosComparaveis ? <> · carga <span className={tom(t.cargaPct)}>{pctTxt(t.cargaPct)}</span>, subiu em {t.exerciciosSubiram} de {t.exerciciosComparaveis}</> : null}
                    </p>
                  ) : (
                    <p className="text-xs text-fg-muted">1 treino no período: ainda sem comparação.</p>
                  )}
                </div>
                <Sparkline valores={t.sessoes.map((s) => s.tonelagem)} largura={72} altura={26} />
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {musculos.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução de cada músculo</CardTitle>
            <p className="text-xs text-fg-muted">
              {temMetades ? "Séries por semana na 1ª metade × 2ª metade do período, " : "Séries no período, "}
              volume e a variação típica da carga dos exercícios do músculo. <span className="font-semibold text-accent">★ prioridade</span> do seu programa.
            </p>
          </CardHeader>
          <CardBody className="space-y-2">
            {musculos.map((m) => (
              <div key={m.grupo} className={`rounded-lg border px-3 py-2.5 ${m.prioridade ? "border-accent/50 bg-accent/10" : "border-border bg-bg/40"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold">
                    {m.prioridade ? <span className="mr-1 text-accent" aria-label="prioridade">★</span> : null}
                    {m.rotulo}
                  </p>
                  <p className={`shrink-0 font-mono text-sm font-bold ${tom(m.cargaPct)}`}>{m.cargaPct != null ? `carga ${pctTxt(m.cargaPct)}` : ""}</p>
                </div>
                <p className="text-xs text-fg-muted">
                  {m.seriesSemanaAntes != null ? <>séries/semana {br(m.seriesSemanaAntes)} → <b className="text-fg">{br(m.seriesSemanaAgora!)}</b></> : <>{br(m.series, 0)} séries</>}
                  {" · "}volume {br(m.tonelagem / 1000)} t
                  {m.exercicios ? <> · subiu em {m.exerciciosSubiram} de {m.exercicios} exercício{m.exercicios === 1 ? "" : "s"}</> : null}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
