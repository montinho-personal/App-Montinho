"use client";

import { useFecharComVoltar } from "@/lib/useFecharComVoltar";

// ============================================================================
// Tabela de Volume Semanal — sempre visível enquanto o treinador monta.
// Desktop: coluna lateral sticky. Celular/tablet: barra inferior que abre um
// painel. Recalcula a cada tecla (função pura, sem servidor).
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { GRUPO_COR, GRUPO_LABEL, GRUPOS_META } from "@/lib/grupos";
import { STATUS_META_LABEL, type LinhaVolume, type MetaVolume, type ResultadoVolume } from "@/lib/volume/calcular";
import { REGRAS_TECNICAS, TECNICA_CURTA, type RegraTecnicas } from "@/lib/volume/tecnicas";
import type { Tecnica } from "@/lib/volume/calcular";
import { AVISO_REFERENCIA, aplicarPrioridades, referenciasPorNivel, type NivelReferencia } from "@/lib/volume/referencias";
import { Icon } from "@/components/ui/Icon";
import { lerFaixa, textoFaixa } from "@/lib/volume/faixa";

type Filtro = "todos" | "superiores" | "inferiores" | "prioritarios";
type Ordem = "padrao" | "volume" | "prioridade" | "falta";

type Props = {
  /** Botão extra na barra fixa do celular (ex.: Salvar), sempre à mão. */
  acao?: React.ReactNode;
  resultado: ResultadoVolume;
  metas: Partial<Record<GrupoMuscular, MetaVolume>>;
  prioridades: string[];
  nivel: string | null;
  incluirSecundario: boolean;
  realizado?: Partial<Record<GrupoMuscular, number>> | null; // média semanal realizada (opcional)
  /** Séries FEITAS nesta semana em qualquer treino (ficha, extra, treino livre). Com ele, aparece a coluna “Feito”. */
  feito?: FeitoNaSemana | null;
  /** Sem onMetas/onPrioridades a tabela fica só de leitura (metas e prioridades não editáveis). */
  onMetas?: (m: Partial<Record<GrupoMuscular, MetaVolume>>) => void;
  onPrioridades?: (p: string[]) => void;
  onSecundario: (v: boolean) => void;
  /** Regra de contagem das técnicas avançadas (drop set, rest-pause, myo-reps). */
  regraTecnicas?: RegraTecnicas;
  onRegraTecnicas?: (r: RegraTecnicas) => void;
  ajustarPorRir?: boolean;
  onAjustarPorRir?: (v: boolean) => void;
};

export type FeitoNaSemana = { inicio: string; direto: Partial<Record<GrupoMuscular, number>>; comSecundario: Partial<Record<GrupoMuscular, number>> };

const PARTES_OMBRO: GrupoMuscular[] = ["ombros", "ombro_anterior", "ombro_lateral", "ombro_posterior"];

/** Quanto foi feito na linha (Ombros total = soma das partes; parte do abdômen não tem série própria). */
export function feitoDaLinha(l: Pick<LinhaVolume, "grupo" | "somaDasPartes" | "parteDe">, feitas: Partial<Record<GrupoMuscular, number>>): number | null {
  if (l.parteDe) return null;
  if (l.somaDasPartes) return Math.round(PARTES_OMBRO.reduce((n, g) => n + (feitas[g] ?? 0), 0) * 100) / 100;
  return feitas[l.grupo] ?? 0;
}

/** Número no padrão brasileiro (vírgula decimal, até 2 casas). */
const numBR = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const STATUS_COR: Record<LinhaVolume["status"], string> = {
  abaixo: "text-info",
  na_meta: "text-success",
  acima: "text-warning",
  sem_meta: "text-fg-subtle",
};

export function TabelaVolume(props: Props) {
  const [abertoMobile, setAbertoMobile] = useState(false);
  useFecharComVoltar(abertoMobile, () => setAbertoMobile(false));
  return (
    <>
      {/* Desktop / telas largas */}
      <aside className="hidden xl:block xl:sticky xl:top-4 self-start max-h-[calc(100vh-2rem)] overflow-auto rounded-xl border border-border bg-surface" aria-label="Tabela de volume semanal">
        <TabelaVolumeConteudo {...props} />
      </aside>

      {/* Celular / tablet: barra fixa + painel */}
      <div className="xl:hidden">
        <div className="fixed bottom-3 left-3 right-3 z-40 flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => setAbertoMobile(true)}
            className="touch flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-accent/40 bg-card px-3 py-2.5 shadow-xl"
            aria-haspopup="dialog"
            aria-expanded={abertoMobile}
          >
            <span className="flex shrink-0 items-center gap-2 text-sm font-bold">
              <Icon name="table" className="text-accent" /> Volume
            </span>
            <span className="min-w-0 text-right text-xs text-fg-muted">
              {numBR(props.resultado.subtotais.total)} séries · {numBR(props.resultado.sessoesSemana)} sessões/sem
              {(() => {
                const abaixo = props.resultado.linhas.filter((l) => l.status === "abaixo").length;
                const comMeta = props.resultado.linhas.some((l) => l.meta);
                if (!comMeta) return null;
                return abaixo ? <span className="block font-bold text-info">🎯 {abaixo} abaixo da meta</span> : <span className="block font-bold text-success">✓ tudo na meta</span>;
              })()}
            </span>
          </button>
          {props.acao ?? null}
        </div>
        {abertoMobile ? (
          <div className="fixed inset-0 z-50 flex items-end bg-black/60" role="dialog" aria-modal="true" aria-label="Tabela de volume semanal" onClick={() => setAbertoMobile(false)}>
            <div className="w-full max-h-[85vh] overflow-auto rounded-t-2xl border-t border-border bg-surface" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-sm font-bold">Volume semanal</span>
                <button type="button" onClick={() => setAbertoMobile(false)} className="touch text-fg-muted" aria-label="Fechar">
                  <Icon name="x" />
                </button>
              </div>
              <TabelaVolumeConteudo {...props} semTitulo />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

export function TabelaVolumeConteudo({ resultado, metas, prioridades, nivel, incluirSecundario, realizado, feito, onMetas, onPrioridades, onSecundario, regraTecnicas = "moderada", onRegraTecnicas, ajustarPorRir = false, onAjustarPorRir, semTitulo = false }: Props & { semTitulo?: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ordem, setOrdem] = useState<Ordem>("padrao");
  const [compacto, setCompacto] = useState(false);
  // Celular: começa compacto (só Semana/Meta) para a tabela caber na tela; o treinador pode desmarcar.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- largura da tela só existe no navegador
      if (window.matchMedia("(max-width: 640px)").matches) setCompacto(true);
    } catch {}
  }, []);
  const [editandoMetas, setEditandoMetas] = useState(false);
  const [verRealizado, setVerRealizado] = useState(false);

  const linhas = useMemo(() => {
    let l = resultado.linhas.filter((x) => x.total > 0 || x.meta || x.secundario > 0 || x.exerciciosRevisar > 0);
    if (filtro === "superiores") l = l.filter((x) => x.superior);
    if (filtro === "inferiores") l = l.filter((x) => x.inferior);
    if (filtro === "prioritarios") l = l.filter((x) => prioridades.includes(x.grupo));
    if (ordem === "volume") l = [...l].sort((a, b) => b.total - a.total);
    if (ordem === "falta") {
      const pct = (x: LinhaVolume) => (x.status === "abaixo" && x.meta ? (x.meta.min + (x.diferenca ?? 0)) / x.meta.min : x.status === "sem_meta" ? 3 : 2);
      l = [...l].sort((a, b) => pct(a) - pct(b));
    }
    if (ordem === "prioridade") l = [...l].sort((a, b) => Number(prioridades.includes(b.grupo)) - Number(prioridades.includes(a.grupo)) || b.total - a.total);
    return partesJuntoDoTotal(l);
  }, [resultado, filtro, ordem, prioridades]);

  const letras = resultado.letras;
  const temRealizado = realizado && Object.keys(realizado).length > 0;
  const revisar = resultado.linhas.reduce((n, l) => n + l.exerciciosRevisar, 0);
  const naoClassificado = resultado.linhas.find((l) => l.grupo === "nao_classificado" || l.grupo === "pernas");

  function aplicarReferencia() {
    if (!onMetas) return;
    const base = referenciasPorNivel((nivel as NivelReferencia) || "intermediario");
    onMetas(aplicarPrioridades(base, prioridades as GrupoMuscular[]));
  }

  /** Grava a faixa digitada (“8-12” ou “12”); vazio apaga. Devolve false se o texto for inválido. */
  function setFaixa(g: GrupoMuscular, texto: string): boolean {
    if (!onMetas) return false;
    const f = lerFaixa(texto);
    if (f === null) return false;
    if (f === "vazio") {
      const resto = { ...metas };
      delete resto[g];
      onMetas(resto);
    } else onMetas({ ...metas, [g]: f });
    return true;
  }

  function togglePrioridade(g: GrupoMuscular) {
    if (!onPrioridades) return;
    onPrioridades(prioridades.includes(g) ? prioridades.filter((x) => x !== g) : [...prioridades, g]);
  }

  return (
    <div className="p-3 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        {semTitulo ? <span /> : <h3 className="font-extrabold">Volume semanal</h3>}
        <span className="text-[11px] text-fg-subtle">
          {numBR(resultado.sessoesSemana)} sessões/sem · {numBR(resultado.subtotais.total)} séries válidas
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {(["todos", "superiores", "inferiores"] as Filtro[]).map((f) => (
          <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f} className={`rounded-full border px-2.5 py-1 font-semibold ${filtro === f ? "border-accent text-accent bg-accent/10" : "border-border text-fg-muted"}`}>
            {f === "todos" ? "Todos" : f === "superiores" ? "Superiores" : "Inferiores"}
          </button>
        ))}
        {prioridades.length ? (
          <button type="button" onClick={() => setFiltro("prioritarios")} aria-pressed={filtro === "prioritarios"} className={`rounded-full border px-2.5 py-1 font-semibold ${filtro === "prioritarios" ? "border-accent text-accent bg-accent/10" : "border-border text-fg-muted"}`}>
            ★ Prioritários ({prioridades.length})
          </button>
        ) : null}
        <select aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="rounded-full border border-border bg-bg px-2 py-1 text-[11px]">
          <option value="padrao">Ordem padrão</option>
          <option value="volume">Maior volume</option>
          <option value="prioridade">Prioridade</option>
          <option value="falta">Falta mais para a meta</option>
        </select>
        <label className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-fg-muted">
          <input type="checkbox" checked={compacto} onChange={(e) => setCompacto(e.target.checked)} /> compacto
        </label>
        <label className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-fg-muted" title="Volume ponderado: soma às séries diretas uma fração de série para cada músculo secundário, com o peso cadastrado na biblioteca (ex.: supino → tríceps 0,5). Sem peso cadastrado, usa 50%.">
          <input type="checkbox" checked={incluirSecundario} onChange={(e) => onSecundario(e.target.checked)} /> volume ponderado (estimado)
        </label>
        {onRegraTecnicas ? (
          <select
            aria-label="Como contar técnicas avançadas"
            title={`Como drops e mini-séries entram no volume. ${REGRAS_TECNICAS[regraTecnicas].descricao}`}
            value={regraTecnicas}
            onChange={(e) => onRegraTecnicas(e.target.value as RegraTecnicas)}
            className="rounded-full border border-border bg-bg px-2 py-1 text-[11px]"
          >
            {(Object.keys(REGRAS_TECNICAS) as RegraTecnicas[]).map((k) => (
              <option key={k} value={k}>
                Técnicas: {REGRAS_TECNICAS[k].label}
              </option>
            ))}
          </select>
        ) : null}
        {onAjustarPorRir ? (
          <label className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-fg-muted" title="Séries longe da falha valem menos: RIR 0–3 = 1 série; RIR 4–5 = 0,5; acima de 5 = 0. Usa o RIR prescrito de cada exercício.">
            <input type="checkbox" checked={ajustarPorRir} onChange={(e) => onAjustarPorRir(e.target.checked)} /> ajustar por RIR
          </label>
        ) : null}
        {temRealizado ? (
          <label className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-fg-muted">
            <input type="checkbox" checked={verRealizado} onChange={(e) => setVerRealizado(e.target.checked)} /> programado × realizado
          </label>
        ) : null}
      </div>

      {revisar > 0 ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11px] text-fg-muted">
          <span className="font-bold text-warning">{revisar} exercício(s)</span> com grupo detectado automaticamente — confira e ajuste no montador. {naoClassificado ? "Itens “não classificados/a classificar” continuam contados à parte." : ""}
        </p>
      ) : null}

      {onMetas ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setEditandoMetas((v) => !v)} aria-pressed={editandoMetas} className={`alvo rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${editandoMetas ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted hover:text-fg"}`}>
            {editandoMetas ? "✓ Concluir metas" : "✎ Editar metas (faixas)"}
          </button>
          {editandoMetas ? <span className="text-[11px] text-fg-muted">Digite na coluna Meta: <strong>8-12</strong> (faixa) ou <strong>12</strong> (número único). Apague para tirar a meta. Depois, salve o plano.</span> : null}
        </div>
      ) : null}

      {onPrioridades ? (
        <p className="text-[10.5px] text-fg-subtle">
          <span className="font-bold text-accent">★ Prioridade</span> = músculo prioritário do protocolo (linha destacada). Toque no nome do músculo para marcar ou desmarcar.
        </p>
      ) : prioridades.length ? (
        <p className="text-[10.5px] text-fg-subtle"><span className="font-bold text-accent">★ Prioridade</span> = músculo prioritário do protocolo.</p>
      ) : null}

      {feito ? <NotaFeito feito={feito} incluirSecundario={incluirSecundario} grupos={resultado.linhas.map((l) => l.grupo)} /> : null}

      {linhas.length === 0 ? (
        <p className="py-6 text-center text-xs text-fg-subtle">Digite os exercícios: o volume aparece aqui na hora.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-fg-subtle">
                <th className="text-left font-semibold px-1 py-1">Grupo</th>
                {!compacto ? letras.map((l) => (
                  <th key={l} className="text-right font-semibold px-1 py-1">
                    {l}
                  </th>
                )) : null}
                <th className="text-right font-semibold px-1 py-1" title="Séries diretas válidas por semana (sem aquecimento). * inclui drops/mini-séries de técnicas avançadas pela regra escolhida.">Sem.</th>
                <th className="whitespace-nowrap text-right font-semibold px-1 py-1">Meta</th>
                {feito ? <th className="whitespace-nowrap text-right font-semibold px-1 py-1 text-accent" title="Séries feitas nesta semana (segunda até hoje) em qualquer treino: da ficha, extra, treino livre e aula presencial. Sem aquecimento.">Feito</th> : null}
                {!compacto ? <th className="text-right font-semibold px-1 py-1" title="Sessões por semana em que o grupo recebe séries">Freq.</th> : null}
                {incluirSecundario ? <th className="text-right font-semibold px-1 py-1" title="Participação secundária estimada (fração de série × frequência)">+sec</th> : null}
                {incluirSecundario ? <th className="text-right font-semibold px-1 py-1" title="Total = séries diretas + secundário estimado. É este total que é comparado com a meta.">Total</th> : null}
                {verRealizado ? <th className="text-right font-semibold px-1 py-1">Real.</th> : null}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const prioritario = prioridades.includes(l.grupo);
                const real = realizado?.[l.grupo];
                // Ombros = total; as partes (anterior/lateral/posterior) aparecem como “↳” (pedido do Montinho, 29/10/2026).
                // Abdômen = total; supra e infra (pelo nome do exercício) aparecem como “↳” (pedido do Montinho, 30/10/2026).
                const parteAbdomen = !!l.parteDe;
                const parteOmbro = (l.grupo.startsWith("ombro_") && resultado.linhas.some((x) => x.somaDasPartes)) || parteAbdomen;
                const abdomenTotal = l.grupo === "abdomen" && resultado.linhas.some((x) => x.parteDe === "abdomen");
                const rotulo = l.somaDasPartes ? "Ombros (total)" : abdomenTotal ? "Abdômen (total)" : parteAbdomen ? `↳ ${l.label.replace("Abdômen s", "S").replace("Abdômen i", "I")}` : parteOmbro ? `↳ ${l.label.replace("Ombro a", "A").replace("Ombro l", "L").replace("Ombro p", "P")}` : l.label;
                return (
                  <tr key={l.grupo} className={`border-t border-border ${prioritario ? "bg-accent/10 shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}>
                    <td className={`px-1 py-1.5 ${parteOmbro ? "pl-4" : ""}`}>
                      <button type="button" onClick={() => togglePrioridade(l.grupo)} disabled={!onPrioridades} className="inline-flex min-h-6 items-center gap-1.5 text-left disabled:cursor-default" title={!onPrioridades ? (prioritario ? "Prioritário" : undefined) : prioritario ? "Prioritário (clique para remover)" : "Marcar como prioritário"}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: GRUPO_COR[l.grupo] }} aria-hidden />
                        <span className={`${parteOmbro ? "font-medium text-fg-muted" : "font-semibold"} ${l.grupo === "nao_classificado" || l.grupo === "pernas" ? "text-warning" : ""}`}>{rotulo}</span>
                        {prioritario ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-bg">
                            <Icon name="star" size={9} label="prioritário" /> Prioridade
                          </span>
                        ) : null}
                      </button>
                      {l.somaDasPartes ? <span className="block text-[10px] text-fg-subtle leading-snug">anterior + lateral + posterior</span> : null}
                      {abdomenTotal ? <span className="block text-[10px] text-fg-subtle leading-snug">todos os abdominais (supra e infra pelo nome)</span> : null}
                      {Object.keys(l.tecnicas).length ? (
                        <span className="block text-[10px] text-accent leading-snug">
                          {(Object.entries(l.tecnicas) as Array<[Tecnica, number]>)
                            .map(([t, v]) => `${TECNICA_CURTA[t]}${v ? ` +${numBR(v)}` : ""}`)
                            .join(" · ")}
                        </span>
                      ) : null}
                      {compacto && l.status === "abaixo" && l.diferenca ? <span className="block text-[10px] font-semibold text-info">🎯 faltam {numBR(-l.diferenca)}</span> : null}
                      {compacto && l.status === "acima" && l.diferenca ? <span className="block text-[10px] text-warning">passou {numBR(l.diferenca)}</span> : null}
                      {!compacto && l.status !== "sem_meta" ? <span className={`block text-[10px] ${STATUS_COR[l.status]}`}>{STATUS_META_LABEL[l.status]}{l.diferenca ? ` (${l.diferenca > 0 ? "+" : ""}${numBR(l.diferenca)})` : ""}</span> : null}
                    </td>
                    {!compacto ? letras.map((x) => (
                      <td key={x} className="px-1 py-1.5 text-right font-mono text-fg-muted">
                        {l.porDia[x] ? numBR(l.porDia[x]) : "·"}
                      </td>
                    )) : null}
                    <td className={`px-1 py-1.5 text-right font-mono font-bold ${incluirSecundario ? "text-fg" : STATUS_COR[l.status]}`} title={l.deTecnicas ? `${numBR(l.total - l.deTecnicas)} séries + ${numBR(l.deTecnicas)} de drops/mini-séries` : undefined}>
                      {numBR(l.total)}
                      {l.deTecnicas ? <span className="text-accent">*</span> : null}
                    </td>
                    <td className="px-1 py-1.5 text-right font-mono">
                      {editandoMetas ? (
                        <CampoFaixa key={`${l.grupo}:${textoFaixa(metas[l.grupo])}`} rotulo={l.label} inicial={textoFaixa(metas[l.grupo])} onSalvar={(t) => setFaixa(l.grupo, t)} />
                      ) : l.meta ? (
                        <span className="whitespace-nowrap">{l.meta.max > l.meta.min ? `${l.meta.min}–${l.meta.max}` : l.meta.min}</span>
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </td>
                    {feito ? (() => {
                      const f = feitoDaLinha(l, incluirSecundario ? feito.comSecundario : feito.direto);
                      if (f === null) return <td className="px-1 py-1.5 text-right font-mono text-fg-subtle">·</td>;
                      const cor = !l.meta ? "text-fg-muted" : f < l.meta.min ? "text-info" : f > l.meta.max ? "text-warning" : "text-success";
                      return <td className={`px-1 py-1.5 text-right font-mono font-bold ${cor}`}>{numBR(f)}</td>;
                    })() : null}
                    {!compacto ? <td className="px-1 py-1.5 text-right font-mono text-fg-muted">{l.frequencia ? `${numBR(l.frequencia)}×` : "·"}</td> : null}
                    {incluirSecundario ? <td className="px-1 py-1.5 text-right font-mono text-fg-subtle">{l.secundario ? `+${numBR(l.secundario)}` : "·"}</td> : null}
                    {incluirSecundario ? <td className={`px-1 py-1.5 text-right font-mono font-bold ${STATUS_COR[l.status]}`}>{l.ponderado ? numBR(l.ponderado) : "·"}</td> : null}
                    {verRealizado ? <td className={`px-1 py-1.5 text-right font-mono ${real != null && l.total > 0 && real < l.total * 0.7 ? "text-warning" : "text-fg-muted"}`}>{real ?? "·"}</td> : null}
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border-strong text-[11px] text-fg-muted">
                <td className="px-1 py-1.5 font-semibold">Inferiores (soma)</td>
                {!compacto ? letras.map((x) => <td key={x} />) : null}
                <td className="px-1 py-1.5 text-right font-mono">{numBR(resultado.subtotais.inferiores)}</td>
                <td colSpan={6} />
              </tr>
              <tr className="text-[11px] text-fg-muted">
                <td className="px-1 py-1 font-semibold">Superiores (soma)</td>
                {!compacto ? letras.map((x) => <td key={x} />) : null}
                <td className="px-1 py-1 text-right font-mono">{numBR(resultado.subtotais.superiores)}</td>
                <td colSpan={6} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {onMetas ? <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => setEditandoMetas((v) => !v)} className="alvo rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-fg-muted hover:text-fg">
          {editandoMetas ? "✓ Concluir metas" : "✎ Editar metas (faixas)"}
        </button>
        <button type="button" onClick={aplicarReferencia} className="alvo rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-fg-muted hover:text-fg" title={AVISO_REFERENCIA}>
          Preencher com faixas de referência
        </button>
        {editandoMetas ? (
          <select
            aria-label="Adicionar meta para um grupo"
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-[11px]"
            value=""
            onChange={(e) => {
              const g = e.target.value as GrupoMuscular;
              if (g) onMetas({ ...metas, [g]: metas[g] ?? { min: 8, max: 12 } });
            }}
          >
            <option value="">+ grupo com meta…</option>
            {GRUPOS_META.filter((g) => !metas[g] && g !== "cardio" && g !== "nao_classificado").map((g) => (
              <option key={g} value={g}>
                {GRUPO_LABEL[g]}
              </option>
            ))}
          </select>
        ) : null}
      </div> : null}

      <ul className="space-y-0.5 text-[10.5px] text-fg-subtle leading-snug">
        <li>Unidade: séries válidas prescritas por grupo e semana (aquecimento e cardio não contam).</li>
        {resultado.linhas.some((l) => l.deTecnicas > 0) ? <li><span className="text-accent">*</span> inclui drops/mini-séries de técnicas avançadas (passe o dedo/mouse no número para ver a conta).</li> : null}
        {resultado.avisos.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
        <li>Metas são do aluno; rótulos neutros (abaixo / na meta / acima / sem meta). {AVISO_REFERENCIA}</li>
      </ul>
    </div>
  );
}

/** Campo da meta: aceita “8-12”, “8 a 12” ou “12”; grava ao sair do campo ou com Enter. */
function CampoFaixa({ rotulo, inicial, onSalvar }: { rotulo: string; inicial: string; onSalvar: (t: string) => boolean }) {
  const [texto, setTexto] = useState(inicial);
  const [erro, setErro] = useState(false);
  function gravar() {
    if (texto.trim() === inicial) return setErro(false);
    const ok = onSalvar(texto);
    setErro(!ok);
    const f = ok ? lerFaixa(texto) : null;
    if (f && f !== "vazio") setTexto(textoFaixa(f)); // “8 a 12” → “8-12”
  }
  return (
    <input
      aria-label={`Meta de ${rotulo} (ex.: 8-12)`}
      aria-invalid={erro}
      title={erro ? "Use 8-12 ou 12 (até 80)" : "Faixa da meta: 8-12 ou 12"}
      inputMode="text"
      autoComplete="off"
      placeholder="—"
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value);
        setErro(false);
      }}
      onBlur={gravar}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`h-8 w-14 rounded border bg-bg px-1 text-center font-mono text-[12px] ${erro ? "border-red text-red" : "border-border"}`}
    />
  );
}

/**
 * Partes (↳) sempre logo abaixo do total delas, em qualquer ordem da tabela: supra/infra embaixo do
 * Abdômen e anterior/lateral/posterior embaixo de Ombros (04/11/2026: ordenado por volume, o “↳ Supra/Infra”
 * caía embaixo da Panturrilha).
 */
export function partesJuntoDoTotal<T extends { grupo: string; parteDe?: string; somaDasPartes?: boolean }>(linhas: T[]): T[] {
  const ombrosTotal = linhas.some((x) => x.grupo === "ombros" && x.somaDasPartes);
  const paiDe = (x: T): string | null => x.parteDe ?? (ombrosTotal && x.grupo.startsWith("ombro_") ? "ombros" : null);
  const pais = new Set(linhas.map((x) => x.grupo));
  const soltas = linhas.filter((x) => { const p = paiDe(x); return !p || !pais.has(p); });
  return soltas.flatMap((x) => [x, ...linhas.filter((y) => paiDe(y) === x.grupo)]);
}

/** Legenda da coluna “Feito” + músculos treinados na semana que o protocolo não tem. */
function NotaFeito({ feito, incluirSecundario, grupos }: { feito: FeitoNaSemana; incluirSecundario: boolean; grupos: GrupoMuscular[] }) {
  const feitas = incluirSecundario ? feito.comSecundario : feito.direto;
  const tem = new Set<string>(grupos);
  if (grupos.some((g) => g.startsWith("ombro_") || g === "ombros")) for (const g of PARTES_OMBRO) tem.add(g);
  const fora = (Object.entries(feitas) as Array<[GrupoMuscular, number]>).filter(([g, n]) => !tem.has(g) && n >= 1);
  const desde = feito.inicio.split("-").reverse().slice(0, 2).join("/");
  return (
    <p className="rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-[11px] text-fg-muted">
      <strong className="text-accent">Feito</strong> = séries desta semana (desde segunda, {desde}) em <strong>qualquer treino</strong>: da ficha, extra e treino livre{incluirSecundario ? ", com o secundário" : ""}.
      {fora.length ? <> Fora do protocolo: {fora.map(([g, n]) => `${GRUPO_LABEL[g] ?? g} ${numBR(n)}`).join(" · ")}.</> : null}
    </p>
  );
}
