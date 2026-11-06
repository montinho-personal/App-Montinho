// Painel visual da avaliação física (bioimpedância, 7 dobras ou medidas) —
// pedido do Montinho, 06/11/2026. Sem estado: serve no servidor e no cliente.
// Números grandes, corpo por partes (massa magra × gordura) e “ver todos os
// dados”. Setas neutras: o app não diz se subir ou descer é bom.
import Link from "next/link";
import { dataBR } from "@/lib/format";
import { textoDiferenca, type Linha } from "@/lib/medidas/relatorio-avaliacao";
import { ROTULO_METODO, totalDeDados, type ResumoAvaliacao, type Segmento } from "@/lib/medidas/resumo-avaliacao";

const br = (v: number | null | undefined, casas = 1) => (v == null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: casas }));
const valorTxt = (l: Linha) => `${br(l.atual, l.unidade === "" ? 2 : 1)}${l.unidade === "%" ? "%" : l.unidade ? ` ${l.unidade}` : ""}`;

function Numero({ l, destaque }: { l: Linha; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${destaque ? "border-accent/60 bg-accent/10" : "border-border bg-bg"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{l.rotulo}</p>
      <p className={`mt-0.5 font-extrabold tabular-nums leading-none ${destaque ? "text-2xl text-accent" : "text-xl"}`}>{valorTxt(l)}</p>
      {l.diferenca != null ? <p className="mt-1 text-[11px] tabular-nums text-fg-muted">{textoDiferenca(l)} desde a anterior</p> : null}
    </div>
  );
}

function Parte({ s, nome }: { s: Segmento | undefined; nome: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-2 py-1.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">{nome}</p>
      {s ? (
        <>
          {s.magra != null ? <p className="text-sm font-bold tabular-nums">💪 {br(s.magra, 2)} kg</p> : null}
          {s.gordura != null ? <p className="text-xs tabular-nums text-fg-muted">gordura {br(s.gordura, 2)} kg</p> : null}
        </>
      ) : (
        <p className="text-xs text-fg-subtle">—</p>
      )}
    </div>
  );
}

/** Corpo por partes: braços nas laterais, tronco no meio, pernas embaixo. */
export function CorpoSegmentar({ segmentos }: { segmentos: Segmento[] }) {
  const p = (k: Segmento["parte"]) => segmentos.find((s) => s.parte === k);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">Corpo por partes</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        <Parte s={p("braco_d")} nome="Braço D" />
        <Parte s={p("tronco")} nome="Tronco" />
        <Parte s={p("braco_e")} nome="Braço E" />
        <Parte s={p("perna_d")} nome="Perna D" />
        <div className="grid place-items-center text-3xl" aria-hidden>🧍</div>
        <Parte s={p("perna_e")} nome="Perna E" />
      </div>
      <p className="mt-1 text-[10px] text-fg-subtle">💪 = massa magra de cada parte. Lado direito à esquerda da tela, como no laudo.</p>
    </div>
  );
}

export function PainelAvaliacao({ r, relatorioHref, medidasHref, compacto = false, titulo = "🩺 Avaliação física" }: { r: ResumoAvaliacao; relatorioHref?: string; medidasHref?: string; compacto?: boolean; titulo?: string }) {
  const principais = compacto ? r.principais.slice(0, 4) : r.principais;
  const total = totalDeDados(r);
  return (
    <section className="rounded-2xl border border-accent/40 bg-card p-4" aria-label="Avaliação física">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-xs text-fg-muted">
          {ROTULO_METODO[r.metodo]} · {dataBR(r.data)}
          {r.personal ? " · pelo personal" : ""}
        </p>
      </div>
      {r.anterior ? <p className="mt-0.5 text-xs text-fg-subtle">Comparando com a avaliação de {dataBR(r.anterior.data)} (mesmo método).</p> : r.metodo !== "medidas" ? <p className="mt-0.5 text-xs text-fg-subtle">🏁 Primeira avaliação deste tipo no app: é o ponto de partida.</p> : null}

      {principais.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {principais.map((l, i) => <Numero key={l.rotulo} l={l} destaque={i < 2 && r.metodo !== "medidas"} />)}
        </div>
      ) : null}

      {!compacto && r.segmentos.length ? <div className="mt-4"><CorpoSegmentar segmentos={r.segmentos} /></div> : null}

      {!compacto && r.circunferencias.length ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">Circunferências</p>
          <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {r.circunferencias.map((l) => (
              <li key={l.rotulo} className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1">
                <span className="text-fg-muted">{l.rotulo}</span>
                <span className="tabular-nums font-semibold">{valorTxt(l)}{l.diferenca != null && l.diferenca !== 0 ? <span className="ml-1 text-[11px] font-normal text-fg-subtle">({textoDiferenca(l)})</span> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compacto && (r.outros.length || r.tecnicos.length) ? (
        <details className="mt-4 rounded-lg border border-border bg-bg px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold">Ver todos os dados do laudo ({r.outros.length + r.tecnicos.length})</summary>
          <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {[...r.outros, ...r.tecnicos].map((e) => (
              <li key={e.nome} className="flex items-baseline justify-between gap-2 border-b border-border/50 py-1">
                <span className="text-fg-muted">{e.nome}</span>
                <span className="tabular-nums font-semibold">{br(e.valor, 2)} {e.unidade}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {!compacto && r.observacao ? <p className="mt-3 text-xs text-fg-subtle">📝 {r.observacao}</p> : null}

      {relatorioHref || medidasHref ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {relatorioHref ? <Link href={relatorioHref} className="touch inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg">📄 Relatório da avaliação</Link> : null}
          {medidasHref ? <Link href={medidasHref} className="touch inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold">{compacto && total > principais.length ? `Ver tudo (${total} dados)` : "Medidas e avaliações"} →</Link> : null}
        </div>
      ) : null}
    </section>
  );
}
