"use client";

// Editor de blocos do treino de Cross Training, HYROX, funcional e híbrido
// (Multimodalidade, 0133). A musculação NÃO passa por aqui: o montador de
// sempre continua igual. O bloco de força usa as linhas de exercício do
// montador (séries × reps × carga), logo abaixo deste editor.
import { CampoNumero } from "@/components/ui/CampoNumero";
import { SeletorExercicio } from "@/components/montador/SeletorExercicio";
import { BENCHMARKS_REF, novoBloco, resumoBloco, simuladoHyrox, duracaoBlocoSeg } from "@/lib/modalidades/blocos";
import { FORMATOS, TIPOS_BLOCO, type BlocoTreino, type Formato, type ModalidadeTreino, type MovimentoBloco, type TipoBloco } from "@/lib/modalidades/tipos";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";

type Props = {
  modalidade: ModalidadeTreino;
  blocos: BlocoTreino[];
  onChange: (b: BlocoTreino[]) => void;
  itens: ItemBiblioteca[];
  favoritos: Set<string>;
  uso: Map<string, number>;
};

const BOTOES: Record<ModalidadeTreino, Array<{ tipo: TipoBloco; formato?: Formato; rotulo: string }>> = {
  musculacao: [],
  cross: [
    { tipo: "aquecimento", rotulo: "＋ Aquecimento" },
    { tipo: "tecnica", rotulo: "＋ Técnica" },
    { tipo: "forca", rotulo: "＋ Força" },
    { tipo: "metcon", formato: "amrap", rotulo: "＋ WOD" },
    { tipo: "volta_calma", rotulo: "＋ Volta à calma" },
  ],
  hyrox: [
    { tipo: "corrida", rotulo: "＋ Corrida" },
    { tipo: "estacao", rotulo: "＋ Estação" },
    { tipo: "aquecimento", rotulo: "＋ Aquecimento" },
  ],
  funcional: [
    { tipo: "aquecimento", rotulo: "＋ Aquecimento" },
    { tipo: "circuito", formato: "circuito", rotulo: "＋ Circuito" },
    { tipo: "volta_calma", rotulo: "＋ Volta à calma" },
  ],
  hibrido: [
    { tipo: "forca", rotulo: "＋ Força" },
    { tipo: "metcon", formato: "amrap", rotulo: "＋ WOD" },
    { tipo: "corrida", rotulo: "＋ Corrida" },
    { tipo: "estacao", rotulo: "＋ Estação" },
    { tipo: "circuito", formato: "circuito", rotulo: "＋ Circuito" },
  ],
};

const FORMATOS_DO_TIPO: Partial<Record<TipoBloco, Formato[]>> = {
  metcon: ["amrap", "emom", "for_time", "rounds_for_time", "chipper", "tabata", "intervalo", "death_by", "ladder", "livre"],
  circuito: ["circuito", "tabata", "intervalo", "emom", "amrap"],
};

const minutos = (seg: number | null | undefined) => (seg ? Math.round((seg / 60) * 10) / 10 : null);
const campo = "h-9 rounded-md border border-border bg-bg px-2 text-sm";

export function EditorBlocos({ modalidade, blocos, onChange, itens, favoritos, uso }: Props) {
  const idPorSlug = (slug: string) => itens.find((i) => i.slug === slug)?.id ?? null;
  const upd = (id: string, p: Partial<BlocoTreino>) => onChange(blocos.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const mover = (id: string, dir: -1 | 1) => {
    const i = blocos.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocos.length) return;
    const n = [...blocos];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const remover = (id: string) => onChange(blocos.filter((b) => b.id !== id));
  const updMov = (b: BlocoTreino, k: number, p: Partial<MovimentoBloco>) => upd(b.id, { movimentos: b.movimentos.map((m, i) => (i === k ? { ...m, ...p } : m)) });
  const totalSeg = blocos.reduce((t, b) => t + (duracaoBlocoSeg(b) ?? 0), 0);

  return (
    <div className="space-y-3 border-b border-border bg-bg/30 px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold">Blocos do treino</p>
        {totalSeg ? <p className="text-[11px] font-mono text-fg-subtle">≈ {Math.round(totalSeg / 60)} min nos blocos com tempo</p> : null}
      </div>
      {!blocos.length ? <p className="text-sm text-fg-muted">Nenhum bloco ainda. Toque nos botões abaixo para montar.</p> : null}
      <ol className="space-y-2">
        {blocos.map((b, i) => {
          const info = TIPOS_BLOCO[b.tipo];
          const formatos = FORMATOS_DO_TIPO[b.tipo];
          const campos = new Set<string>(b.formato ? FORMATOS[b.formato].campos : []);
          const temMovimentos = b.tipo !== "forca";
          return (
            <li key={b.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>{info.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{info.nome}</span>
                  <span className="block truncate text-[11px] text-fg-muted">{resumoBloco(b)}</span>
                </span>
                <button type="button" onClick={() => mover(b.id, -1)} disabled={i === 0} className="h-8 w-8 rounded-md border border-border text-sm disabled:opacity-30" aria-label={`Subir ${info.nome}`}>↑</button>
                <button type="button" onClick={() => mover(b.id, 1)} disabled={i === blocos.length - 1} className="h-8 w-8 rounded-md border border-border text-sm disabled:opacity-30" aria-label={`Descer ${info.nome}`}>↓</button>
                <button type="button" onClick={() => remover(b.id)} className="h-8 w-8 rounded-md border border-red/30 text-sm text-red" aria-label={`Tirar ${info.nome}`}>✕</button>
              </div>

              {b.tipo === "forca" ? (
                <p className="mt-2 rounded-lg bg-bg/60 p-2 text-xs text-fg-muted">🏋️ Os exercícios de força ficam logo abaixo, com séries, repetições e carga, como na musculação. Eles contam no volume semanal e geram os recordes de carga.</p>
              ) : null}

              {formatos ? (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Formato">
                    {formatos.map((f) => (
                      <button key={f} type="button" role="radio" aria-checked={b.formato === f} onClick={() => upd(b.id, { ...novoBloco(b.tipo, [], f), id: b.id, movimentos: b.movimentos, texto: b.texto, titulo: b.titulo })} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${b.formato === f ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                        {FORMATOS[f].nome}
                      </button>
                    ))}
                  </div>
                  {b.formato ? <p className="text-[11px] text-fg-subtle">{FORMATOS[b.formato].explica}</p> : null}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {campos.has("minutos") ? (
                      <label className="flex items-center gap-1.5">Minutos <CampoNumero valor={b.minutos ?? null} min={1} max={240} onChange={(v) => upd(b.id, { minutos: v })} className={`${campo} w-16`} /></label>
                    ) : null}
                    {campos.has("intervalo_seg") ? (
                      <label className="flex items-center gap-1.5">A cada
                        <select value={b.intervalo_seg ?? 60} onChange={(e) => upd(b.id, { intervalo_seg: Number(e.target.value) })} className={campo}>
                          {[60, 90, 120, 180, 240].map((s) => <option key={s} value={s}>{s % 60 ? `${s} s` : `${s / 60} min`}</option>)}
                        </select>
                      </label>
                    ) : null}
                    {campos.has("rounds") ? (
                      <label className="flex items-center gap-1.5">Rounds <CampoNumero valor={b.rounds ?? null} min={1} max={200} onChange={(v) => upd(b.id, { rounds: v })} className={`${campo} w-16`} /></label>
                    ) : null}
                    {campos.has("trabalho_seg") ? (
                      <label className="flex items-center gap-1.5">Trabalho (s) <CampoNumero valor={b.trabalho_seg ?? null} min={5} max={3600} onChange={(v) => upd(b.id, { trabalho_seg: v })} className={`${campo} w-16`} /></label>
                    ) : null}
                    {campos.has("descanso_seg") ? (
                      <label className="flex items-center gap-1.5">Descanso (s) <CampoNumero valor={b.descanso_seg ?? null} min={0} max={3600} onChange={(v) => upd(b.id, { descanso_seg: v })} onVazio={() => upd(b.id, { descanso_seg: 0 })} className={`${campo} w-16`} /></label>
                    ) : null}
                    {campos.has("time_cap_seg") ? (
                      <label className="flex items-center gap-1.5">Limite (min) <CampoNumero valor={minutos(b.time_cap_seg)} min={1} max={600} decimal onChange={(v) => upd(b.id, { time_cap_seg: Math.round(v * 60) })} onVazio={() => upd(b.id, { time_cap_seg: null })} className={`${campo} w-16`} /></label>
                    ) : null}
                    {b.formato === "for_time" || b.formato === "ladder" || b.formato === "chipper" ? (
                      <label className="flex items-center gap-1.5">Esquema <input value={b.esquema ?? ""} onChange={(e) => upd(b.id, { esquema: e.target.value.slice(0, 60) })} placeholder="21-15-9" className={`${campo} w-24`} /></label>
                    ) : null}
                  </div>
                  {b.tipo === "metcon" ? (
                    <label className="flex min-w-0 flex-col gap-1 text-xs">É um benchmark?
                      <select value={b.benchmark ?? ""} onChange={(e) => upd(b.id, { benchmark: e.target.value || null })} className={`${campo} w-full min-w-0 max-w-full`}>
                        <option value="">Não</option>
                        {BENCHMARKS_REF.map((r) => <option key={r.slug} value={r.slug}>{r.nome} · {r.resumo}</option>)}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {b.tipo === "aquecimento" || b.tipo === "tecnica" || b.tipo === "volta_calma" || b.tipo === "metcon" || b.tipo === "circuito" ? (
                <textarea value={b.texto ?? ""} onChange={(e) => upd(b.id, { texto: e.target.value.slice(0, 1500) })} rows={b.tipo === "metcon" || b.tipo === "circuito" ? 2 : 3} placeholder={b.tipo === "tecnica" ? "Ex.: Double Under, 10 min de prática com progressão" : b.tipo === "metcon" || b.tipo === "circuito" ? "Observações para o aluno (opcional)" : "O que fazer (texto livre)"} aria-label={`Descrição: ${info.nome}`} className="mt-2 w-full rounded-lg border border-border bg-bg p-2 text-sm" />
              ) : null}

              {temMovimentos ? (
                <div className="mt-2 space-y-2">
                  {b.movimentos.map((m, k) => {
                    const porDistancia = b.tipo === "corrida" || b.tipo === "estacao";
                    return (
                      <div key={k} className="space-y-1.5 rounded-lg border border-border/70 p-2">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            {b.tipo === "corrida" ? (
                              <p className="text-sm font-semibold">🏃 Corrida</p>
                            ) : (
                              <SeletorExercicio valor={m.nome} bibliotecaId={m.biblioteca_id ?? null} itens={itens} favoritos={favoritos} uso={uso} onTexto={(v) => updMov(b, k, { nome: v, biblioteca_id: null })} onEscolher={(it) => updMov(b, k, { nome: it.nome, biblioteca_id: it.id })} onEnterLivre={() => undefined} onMover={() => undefined} placeholder="Movimento (ex.: Thruster)" ariaLabel={`Movimento ${k + 1}`} />
                            )}
                          </div>
                          <button type="button" onClick={() => upd(b.id, { movimentos: b.movimentos.filter((_, i2) => i2 !== k) })} className="h-8 w-8 shrink-0 rounded-md border border-border text-xs text-fg-muted" aria-label={`Tirar movimento ${k + 1}`}>✕</button>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {b.tipo !== "corrida" ? <label className="flex items-center gap-1">Reps <input value={m.reps ?? ""} onChange={(e) => updMov(b, k, { reps: e.target.value.slice(0, 40) })} placeholder="10" className={`${campo} w-16`} /></label> : null}
                          {b.tipo !== "corrida" ? <label className="flex items-center gap-1">Carga <input value={m.carga ?? ""} onChange={(e) => updMov(b, k, { carga: e.target.value.slice(0, 40) })} placeholder="43/29 kg" className={`${campo} w-24`} /></label> : null}
                          {porDistancia ? <label className="flex items-center gap-1">Distância (m) <CampoNumero valor={m.distancia_m ?? null} min={1} max={100000} onChange={(v) => updMov(b, k, { distancia_m: v })} onVazio={() => updMov(b, k, { distancia_m: null })} className={`${campo} w-20`} /></label> : null}
                          {b.tipo === "estacao" || b.tipo === "metcon" ? <label className="flex items-center gap-1">Calorias <CampoNumero valor={m.calorias ?? null} min={1} max={5000} onChange={(v) => updMov(b, k, { calorias: v })} onVazio={() => updMov(b, k, { calorias: null })} className={`${campo} w-16`} /></label> : null}
                        </div>
                        {b.tipo === "metcon" || b.tipo === "circuito" ? (
                          <input value={m.scaled ?? ""} onChange={(e) => updMov(b, k, { scaled: e.target.value.slice(0, 120) })} placeholder="Versão Scaled (opcional): ex.: pull-up com elástico" aria-label={`Versão Scaled do movimento ${k + 1}`} className={`${campo} w-full`} />
                        ) : null}
                      </div>
                    );
                  })}
                  {b.tipo !== "corrida" ? (
                    <button type="button" onClick={() => upd(b.id, { movimentos: [...b.movimentos, { nome: "" }] })} className="text-xs font-semibold text-accent">＋ Movimento</button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-1.5">
        {BOTOES[modalidade].map((x) => (
          <button key={x.rotulo} type="button" onClick={() => {
            const nb = novoBloco(x.tipo, blocos, x.formato);
            onChange([...blocos, x.tipo === "corrida" ? { ...nb, movimentos: [{ nome: "Corrida", distancia_m: 1000 }] } : x.tipo === "estacao" ? { ...nb, movimentos: [{ nome: "" }] } : nb]);
          }} className="rounded-lg border border-accent/50 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10">
            {x.rotulo}
          </button>
        ))}
        {modalidade === "hyrox" ? (
          <>
            <button type="button" onClick={() => onChange(simuladoHyrox(8, idPorSlug))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold">Simulado completo (8 estações)</button>
            <button type="button" onClick={() => onChange(simuladoHyrox(4, idPorSlug))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold">Parcial (4 estações)</button>
          </>
        ) : null}
      </div>
      {modalidade === "hyrox" ? <p className="text-[11px] text-fg-subtle">As cargas variam por categoria: preencha as do aluno. Simulado parcial nunca é comparado com o completo.</p> : null}
    </div>
  );
}
