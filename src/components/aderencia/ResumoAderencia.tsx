// Índices de aderência e sequência (aluno e treinador). Valores vêm do cálculo
// sobre sessões persistidas; "—" quando não há semanas com prescrição.
import type { ResultadoAderencia } from "@/lib/aderencia/calcular";

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

export function ResumoAderencia({ r, titulo = "Consistência" }: { r: Pick<ResultadoAderencia, "indices" | "sequencia">; titulo?: string }) {
  const i = r.indices;
  const itens = [
    { rotulo: "Semana atual", valor: i.semanaAtual.meta ? `${i.semanaAtual.pontos.toLocaleString("pt-BR")}/${i.semanaAtual.meta}` : "—", dica: "Treinos válidos desta semana ÷ meta" },
    { rotulo: "Últimas 4 semanas", valor: pct(i.d28.pct), dica: `${i.d28.semanas} semana(s) completas com prescrição` },
    { rotulo: "Últimas 12 semanas", valor: pct(i.s12.pct), dica: `${i.s12.semanas} semana(s)` },
    { rotulo: "Desde o início", valor: pct(i.total.pct), dica: `${i.total.semanas} semana(s)` },
  ];
  return (
    <section aria-label={titulo} className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {itens.map((x) => (
          <div key={x.rotulo} className="rounded-lg border border-border bg-bg px-3 py-2" title={x.dica}>
            <p className="text-[11px] text-fg-subtle">{x.rotulo}</p>
            <p className="font-mono text-lg font-bold">{x.valor}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-fg-muted">
        Sequência atual: <strong className="text-fg">{r.sequencia.atual}</strong> semana(s) · melhor: <strong className="text-fg">{r.sequencia.melhor}</strong> · {r.sequencia.semanasCumpridas} de {r.sequencia.semanasParticipando} semanas com a meta cumprida.
      </p>
      <p className="text-[11px] text-fg-subtle">
        Aderência = treinos planejados válidos ÷ meta semanal. Extras não inflam o índice; semanas em pausa combinada ou sem prescrição ficam de fora. Treino parcial (menos da metade das séries) vale meio.
      </p>
    </section>
  );
}
