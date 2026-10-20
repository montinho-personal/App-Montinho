"use client";

// ============================================================================
// Tabela de Volume Semanal — sempre visível enquanto o treinador monta.
// Desktop: coluna lateral sticky. Celular/tablet: barra inferior que abre um
// painel. Recalcula a cada tecla (função pura, sem servidor).
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { GRUPO_COR, GRUPO_LABEL, GRUPOS_SELECIONAVEIS } from "@/lib/grupos";
import { STATUS_META_LABEL, type LinhaVolume, type MetaVolume, type ResultadoVolume } from "@/lib/volume/calcular";
import { REGRAS_TECNICAS, TECNICA_CURTA, type RegraTecnicas } from "@/lib/volume/tecnicas";
import type { Tecnica } from "@/lib/volume/calcular";
import { AVISO_REFERENCIA, aplicarPrioridades, referenciasPorNivel, type NivelReferencia } from "@/lib/volume/referencias";
import { Icon } from "@/components/ui/Icon";

type Filtro = "todos" | "superiores" | "inferiores";
type Ordem = "padrao" | "volume" | "prioridade";

type Props = {
  resultado: ResultadoVolume;
  metas: Partial<Record<GrupoMuscular, MetaVolume>>;
  prioridades: string[];
  nivel: string | null;
  incluirSecundario: boolean;
  realizado?: Partial<Record<GrupoMuscular, number>> | null; // média semanal realizada (opcional)
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
  return (
    <>
      {/* Desktop / telas largas */}
      <aside className="hidden xl:block xl:sticky xl:top-4 self-start max-h-[calc(100vh-2rem)] overflow-auto rounded-xl border border-border bg-surface" aria-label="Tabela de volume semanal">
        <TabelaVolumeConteudo {...props} />
      </aside>

      {/* Celular / tablet: barra fixa + painel */}
      <div className="xl:hidden">
        <button
          type="button"
          onClick={() => setAbertoMobile(true)}
          className="touch fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between rounded-xl border border-accent/40 bg-card px-4 py-3 shadow-xl"
          aria-haspopup="dialog"
          aria-expanded={abertoMobile}
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <Icon name="table" className="text-accent" /> Volume semanal
          </span>
          <span className="text-xs text-fg-muted">
            {numBR(props.resultado.subtotais.total)} séries · {numBR(props.resultado.sessoesSemana)} sessões/sem · toque para ver
          </span>
        </button>
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

export function TabelaVolumeConteudo({ resultado, metas, prioridades, nivel, incluirSecundario, realizado, onMetas, onPrioridades, onSecundario, regraTecnicas = "moderada", onRegraTecnicas, ajustarPorRir = false, onAjustarPorRir, semTitulo = false }: Props & { semTitulo?: boolean }) {
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
    if (ordem === "volume") l = [...l].sort((a, b) => b.total - a.total);
    if (ordem === "prioridade") l = [...l].sort((a, b) => Number(prioridades.includes(b.grupo)) - Number(prioridades.includes(a.grupo)) || b.total - a.total);
    return l;
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

  function setMeta(g: GrupoMuscular, campo: "min" | "max", v: string) {
    if (!onMetas) return;
    const n = Math.max(0, Math.min(80, Number(v) || 0));
    const atual = metas[g] ?? { min: 0, max: 0 };
    onMetas({ ...metas, [g]: { ...atual, [campo]: n } });
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
        <select aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="rounded-full border border-border bg-bg px-2 py-1 text-[11px]">
          <option value="padrao">Ordem padrão</option>
          <option value="volume">Maior volume</option>
          <option value="prioridade">Prioridade</option>
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
                <th className="text-right font-semibold px-1 py-1">Meta</th>
                {!compacto ? <th className="text-right font-semibold px-1 py-1" title="Sessões por semana em que o grupo recebe séries">Freq.</th> : null}
                {incluirSecundario ? <th className="text-right font-semibold px-1 py-1" title="Participação secundária estimada (fração de série × frequência)">+sec</th> : null}
                {incluirSecundario ? <th className="text-right font-semibold px-1 py-1" title="Ponderado = séries diretas + secundário estimado. O total direto continua sendo a referência.">Pond.</th> : null}
                {verRealizado ? <th className="text-right font-semibold px-1 py-1">Real.</th> : null}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const prioritario = prioridades.includes(l.grupo);
                const real = realizado?.[l.grupo];
                return (
                  <tr key={l.grupo} className="border-t border-border">
                    <td className="px-1 py-1.5">
                      <button type="button" onClick={() => togglePrioridade(l.grupo)} disabled={!onPrioridades} className="inline-flex items-center gap-1.5 text-left disabled:cursor-default" title={!onPrioridades ? (prioritario ? "Prioritário" : undefined) : prioritario ? "Prioritário (clique para remover)" : "Marcar como prioritário"}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: GRUPO_COR[l.grupo] }} aria-hidden />
                        <span className={`font-semibold ${l.grupo === "nao_classificado" || l.grupo === "pernas" ? "text-warning" : ""}`}>{l.label}</span>
                        {prioritario ? <Icon name="star" size={11} className="text-accent" label="prioritário" /> : null}
                      </button>
                      {Object.keys(l.tecnicas).length ? (
                        <span className="block text-[10px] text-accent leading-snug">
                          {(Object.entries(l.tecnicas) as Array<[Tecnica, number]>)
                            .map(([t, v]) => `${TECNICA_CURTA[t]}${v ? ` +${numBR(v)}` : ""}`)
                            .join(" · ")}
                        </span>
                      ) : null}
                      {!compacto && l.status !== "sem_meta" ? <span className={`block text-[10px] ${STATUS_COR[l.status]}`}>{STATUS_META_LABEL[l.status]}{l.diferenca ? ` (${l.diferenca > 0 ? "+" : ""}${numBR(l.diferenca)})` : ""}</span> : null}
                    </td>
                    {!compacto ? letras.map((x) => (
                      <td key={x} className="px-1 py-1.5 text-right font-mono text-fg-muted">
                        {l.porDia[x] ? numBR(l.porDia[x]) : "·"}
                      </td>
                    )) : null}
                    <td className={`px-1 py-1.5 text-right font-mono font-bold ${STATUS_COR[l.status]}`} title={l.deTecnicas ? `${numBR(l.total - l.deTecnicas)} séries + ${numBR(l.deTecnicas)} de drops/mini-séries` : undefined}>
                      {numBR(l.total)}
                      {l.deTecnicas ? <span className="text-accent">*</span> : null}
                    </td>
                    <td className="px-1 py-1.5 text-right font-mono">
                      {editandoMetas ? (
                        <span className="inline-flex items-center gap-0.5">
                          <input aria-label={`Meta mínima de ${l.label}`} type="number" min={0} max={80} value={metas[l.grupo]?.min ?? ""} onChange={(e) => setMeta(l.grupo, "min", e.target.value)} className="w-9 rounded border border-border bg-bg px-1 text-right text-[11px]" />
                          –
                          <input aria-label={`Meta máxima de ${l.label}`} type="number" min={0} max={80} value={metas[l.grupo]?.max ?? ""} onChange={(e) => setMeta(l.grupo, "max", e.target.value)} className="w-9 rounded border border-border bg-bg px-1 text-right text-[11px]" />
                        </span>
                      ) : l.meta ? (
                        `${l.meta.min}–${l.meta.max}`
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </td>
                    {!compacto ? <td className="px-1 py-1.5 text-right font-mono text-fg-muted">{l.frequencia ? `${numBR(l.frequencia)}×` : "·"}</td> : null}
                    {incluirSecundario ? <td className="px-1 py-1.5 text-right font-mono text-fg-subtle">{l.secundario ? `+${numBR(l.secundario)}` : "·"}</td> : null}
                    {incluirSecundario ? <td className="px-1 py-1.5 text-right font-mono text-fg-muted">{l.ponderado ? numBR(l.ponderado) : "·"}</td> : null}
                    {verRealizado ? <td className={`px-1 py-1.5 text-right font-mono ${real != null && l.total > 0 && real < l.total * 0.7 ? "text-warning" : "text-fg-muted"}`}>{real ?? "·"}</td> : null}
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border-strong text-[11px] text-fg-muted">
                <td className="px-1 py-1.5 font-semibold">Inferiores (soma)</td>
                {!compacto ? letras.map((x) => <td key={x} />) : null}
                <td className="px-1 py-1.5 text-right font-mono">{numBR(resultado.subtotais.inferiores)}</td>
                <td colSpan={5} />
              </tr>
              <tr className="text-[11px] text-fg-muted">
                <td className="px-1 py-1 font-semibold">Superiores (soma)</td>
                {!compacto ? letras.map((x) => <td key={x} />) : null}
                <td className="px-1 py-1 text-right font-mono">{numBR(resultado.subtotais.superiores)}</td>
                <td colSpan={5} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {onMetas ? <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => setEditandoMetas((v) => !v)} className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-fg-muted hover:text-fg">
          {editandoMetas ? "Concluir metas" : "Editar metas"}
        </button>
        <button type="button" onClick={aplicarReferencia} className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-fg-muted hover:text-fg" title={AVISO_REFERENCIA}>
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
            {GRUPOS_SELECIONAVEIS.filter((g) => !metas[g] && g !== "cardio" && g !== "nao_classificado").map((g) => (
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
