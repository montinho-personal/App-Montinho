"use client";

// Painel da Academia da Tribo (personal): rascunho → simulador → ativar;
// obra em andamento → destaque, séries para conferir e correções com motivo.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { AcademiaIlustracao } from "@/components/academia/AcademiaIlustracao";
import { CATALOGO_OBRAS, cenarios, conversao, ETAPAS, infoModelo, PRIMEIRA_OBRA, toneladas, type DadosObra, type ModeloObra, type Obra } from "@/lib/academia/regras";
import type { Ajuste, SemanaRitmo, SerieConferir } from "@/lib/data/academia";

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

async function enviar(corpo: Record<string, unknown>): Promise<string | null> {
  const r = await fetch("/api/treinador/academia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
  if (!r) return "Sem conexão. Tente de novo.";
  if (r.ok) return null;
  const j = (await r.json().catch(() => ({}))) as { error?: string; issues?: Array<{ message?: string }> };
  return j.issues?.[0]?.message ?? j.error ?? "Não deu certo. Tente de novo.";
}

function Simulador({ metaKg, ritmo, ritmoAtualKg }: { metaKg: number; ritmo: SemanaRitmo[]; ritmoAtualKg: number }) {
  const lista = cenarios(metaKg, ritmoAtualKg);
  return (
    <div className="space-y-2 rounded-xl border border-border bg-bg p-3 text-sm">
      <p className="font-bold">📊 Quanto tempo leva (ritmo real da tribo)</p>
      {ritmo.length ? (
        <div className="flex items-end gap-1" aria-label="Toneladas por semana">
          {ritmo.map((r) => {
            const max = Math.max(1, ...ritmo.map((x) => x.kg));
            return (
              <div key={r.semana} className="flex flex-1 flex-col items-center gap-0.5">
                <span className="text-[10px] text-fg-muted">{toneladas(r.kg)}</span>
                <div className="w-full rounded-t bg-accent/70" style={{ height: `${Math.max(4, (r.kg / max) * 60)}px` }} />
                <span className="text-[10px] text-fg-subtle">{dataBR(r.semana)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      <p className="text-xs text-fg-muted">Média das últimas semanas fechadas: <b>{toneladas(ritmoAtualKg)} t por semana</b>. (Só para projetar: o histórico nunca entra na obra.)</p>
      <ul className="space-y-1">
        {lista.map((c) => (
          <li key={c.rotulo} className="flex justify-between gap-2 rounded-lg bg-surface px-2 py-1">
            <span>{c.rotulo} · {toneladas(c.kgSemana)} t/sem.</span>
            <b>{Number.isFinite(c.semanas) ? `${Math.round(c.semanas)} semanas (~${(c.semanas / 4.35).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses)` : "—"}</b>
          </li>
        ))}
      </ul>
      <p className="text-xs text-fg-subtle">Ideal para a 1ª obra: de 3 a 4 meses.</p>
    </div>
  );
}

function PreviaEtapas({ modelo }: { modelo: string }) {
  const [e, setE] = useState(0);
  return (
    <div className="space-y-2 rounded-xl border border-border bg-bg p-3">
      <p className="text-sm font-bold">👀 Prévia das etapas</p>
      <div className="overflow-hidden rounded-xl border border-border">
        <AcademiaIlustracao etapa={e} pavimentos={infoModelo(modelo).pavimentos} className="block h-auto w-full" />
      </div>
      <div className="flex flex-wrap gap-1">
        {ETAPAS.map((x) => (
          <button key={x.n} type="button" onClick={() => setE(x.n)} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${e === x.n ? "border-accent bg-accent text-bg" : "border-border"}`}>
            {x.pct}% · {x.curto}
          </button>
        ))}
      </div>
      <p className="text-xs text-fg-muted">“{ETAPAS[e].texto}”</p>
    </div>
  );
}

export function AcademiaAdmin({ obras, ativa, rascunho, ritmo, ritmoAtualKg, conferir, ajustes }: { obras: Obra[]; ativa: DadosObra | null; rascunho: Obra | null; ritmo: SemanaRitmo[]; ritmoAtualKg: number; conferir: SerieConferir[]; ajustes: Ajuste[] }) {
  const router = useRouter();
  const proximaOrdem = Math.max(0, ...obras.map((o) => o.ordem)) + 1;
  const sugestao = CATALOGO_OBRAS[Math.min(CATALOGO_OBRAS.length - 1, proximaOrdem - 1)];
  const base = rascunho ?? (proximaOrdem === 1 ? { ...PRIMEIRA_OBRA, narrativa: null, mostrar_contribuicoes: true } : { ...sugestao, meta_kg: 0, banner_dias: 7, narrativa: null, mostrar_contribuicoes: true });
  const [f, setF] = useState({ nome: base.nome, modelo: base.modelo as ModeloObra, area_m2: base.area_m2, materiais_t: base.materiais_t, meta_t: Math.round(base.meta_kg / 1000), banner_dias: base.banner_dias, narrativa: base.narrativa ?? "", mostrar_contribuicoes: base.mostrar_contribuicoes });
  const [aberto, setAberto] = useState(!!rascunho);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ t: string; erro: boolean } | null>(null);
  const [palavra, setPalavra] = useState("");
  const [ajKg, setAjKg] = useState<number | null>(null);
  const [ajSinal, setAjSinal] = useState<1 | -1>(1);
  const [ajMotivo, setAjMotivo] = useState("");
  const [banner, setBanner] = useState(ativa?.banner_dias ?? 7);

  async function acao(corpo: Record<string, unknown>, ok: string) {
    setOcupado(true);
    setMsg(null);
    const erro = await enviar(corpo);
    setOcupado(false);
    setMsg(erro ? { t: erro, erro: true } : { t: ok, erro: false });
    if (!erro) router.refresh();
    return !erro;
  }

  const conv = f.materiais_t > 0 ? conversao({ meta_kg: f.meta_t * 1000, materiais_t: f.materiais_t }) : 0;

  return (
    <div className="space-y-4">
      {msg ? <p className={`rounded-xl border p-3 text-sm ${msg.erro ? "border-danger/50 bg-danger/10" : "border-success/50 bg-success/10"}`}>{msg.t}</p> : null}

      {/* ---------------- Obra em andamento ---------------- */}
      {ativa ? (
        <section className="space-y-3 rounded-2xl border border-accent/50 bg-accent/5 p-4 text-sm">
          <p className="font-bold">🟢 {ativa.nome} em andamento desde {ativa.ativada_em ? dataHora(ativa.ativada_em) : "—"}</p>
          <p className="text-xs text-fg-muted">Meta {toneladas(ativa.meta_kg)} t · {ativa.materiais_t} t de materiais · conversão {conversao(ativa).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}:1. Depois de ativada, a meta e os números não mudam; correções entram abaixo, com motivo.</p>
          <div className="flex flex-wrap items-center gap-2">
            <span>Destaque no Início por</span>
            <CampoNumero valor={banner} min={0} max={60} onChange={setBanner} className="w-16 rounded-lg border border-border bg-bg px-2 py-1" aria-label="Dias do destaque" />
            <span>dias</span>
            <button type="button" disabled={ocupado} onClick={() => acao({ acao: "exibicao", id: ativa.id, banner_dias: banner }, "Dias do destaque salvos.")} className="rounded-lg border border-border px-3 py-1 font-semibold">
              Salvar
            </button>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ativa.mostrar_contribuicoes} disabled={ocupado} onChange={(e) => acao({ acao: "exibicao", id: ativa.id, mostrar_contribuicoes: e.target.checked }, "Exibição atualizada.")} />
            Mostrar a contribuição de cada pessoa na lista
          </label>

          <details className="rounded-xl border border-border bg-bg p-3" open={conferir.length > 0}>
            <summary className="cursor-pointer font-bold">🔎 Séries para conferir ({conferir.length})</summary>
            <p className="mt-1 text-xs text-fg-muted">Séries com mais de 500 kg ou mais de 100 repetições ficam fora da obra até você confirmar que são de verdade.</p>
            <ul className="mt-2 space-y-2">
              {conferir.map((c) => (
                <li key={c.set_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2">
                  <span>
                    <b>{c.aluno ?? "Aluno"}</b> · {c.exercicio} · {c.carga ?? 0} kg × {c.reps ?? 0} · {dataBR(c.treino_em)}
                  </span>
                  <button type="button" disabled={ocupado} onClick={() => acao({ acao: "liberar", set_id: c.set_id, motivo: "Conferido pelo personal" }, "Série liberada: entrou na obra.")} className="rounded-lg bg-accent px-3 py-1 text-xs font-bold text-bg">
                    É de verdade, liberar
                  </button>
                </li>
              ))}
            </ul>
          </details>

          <details className="rounded-xl border border-border bg-bg p-3">
            <summary className="cursor-pointer font-bold">✍️ Correção com motivo ({ajustes.length})</summary>
            <p className="mt-1 text-xs text-fg-muted">Use só para corrigir erro (ex.: treino anotado no papel). Fica registrado para sempre, com data e motivo.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={ajSinal} onChange={(e) => setAjSinal(Number(e.target.value) as 1 | -1)} className="rounded-lg border border-border bg-bg px-2 py-1">
                <option value={1}>Somar</option>
                <option value={-1}>Tirar</option>
              </select>
              <CampoNumero valor={ajKg} min={1} max={100000} onChange={setAjKg} onVazio={() => setAjKg(null)} decimal className="w-24 rounded-lg border border-border bg-bg px-2 py-1" aria-label="Quilos" />
              <span>kg</span>
            </div>
            <input value={ajMotivo} onChange={(e) => setAjMotivo(e.target.value)} placeholder="Motivo (obrigatório)" maxLength={300} className="mt-2 w-full rounded-lg border border-border bg-bg px-2 py-1.5" />
            <button
              type="button"
              disabled={ocupado || !ajKg || ajMotivo.trim().length < 5}
              onClick={async () => {
                if (await acao({ acao: "ajustar", id: ativa.id, kg: ajSinal * (ajKg ?? 0), motivo: ajMotivo }, "Correção registrada.")) {
                  setAjKg(null);
                  setAjMotivo("");
                }
              }}
              className="mt-2 rounded-lg border border-border px-3 py-1.5 font-semibold disabled:opacity-50"
            >
              Registrar correção
            </button>
            {ajustes.length ? (
              <ul className="mt-2 space-y-1 text-xs text-fg-muted">
                {ajustes.map((a) => (
                  <li key={a.id}>
                    {dataHora(a.em)} · {a.kg > 0 ? "+" : ""}
                    {a.kg.toLocaleString("pt-BR")} kg · {a.motivo}
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        </section>
      ) : null}

      {/* ---------------- Rascunho / próxima obra ---------------- */}
      {!ativa ? (
        !aberto ? (
          <button type="button" onClick={() => setAberto(true)} className="alvo flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg">
            {proximaOrdem === 1 ? "🏗️ Preparar a primeira construção" : `🏗️ Preparar a ${proximaOrdem}ª construção`}
          </button>
        ) : (
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm">
            <p className="font-bold">{rascunho ? "📝 Rascunho (0 t, ainda não começou)" : "📝 Nova construção"}</p>
            <label className="block">
              <span className="text-xs font-semibold text-fg-muted">Porte</span>
              <select
                value={f.modelo}
                onChange={(e) => {
                  const m = infoModelo(e.target.value);
                  setF({ ...f, modelo: m.modelo, nome: m.nome, area_m2: m.area_m2, materiais_t: m.materiais_t });
                }}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2"
              >
                {CATALOGO_OBRAS.map((c) => (
                  <option key={c.modelo} value={c.modelo}>
                    {c.nome} · {c.area_m2.toLocaleString("pt-BR")} m²
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-fg-muted">Nome</span>
              <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} maxLength={60} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-fg-muted">Área (m²)</span>
                <CampoNumero valor={f.area_m2} min={10} max={1_000_000} onChange={(v) => setF({ ...f, area_m2: v })} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-fg-muted">Materiais estimados (t)</span>
                <CampoNumero valor={f.materiais_t} min={1} max={10_000_000} onChange={(v) => setF({ ...f, materiais_t: v })} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-fg-muted">Meta da tribo (t de treino)</span>
                <CampoNumero valor={f.meta_t || null} min={1} max={100_000_000} onChange={(v) => setF({ ...f, meta_t: v })} onVazio={() => setF({ ...f, meta_t: 0 })} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-fg-muted">Destaque no Início (dias)</span>
                <CampoNumero valor={f.banner_dias} min={0} max={60} onChange={(v) => setF({ ...f, banner_dias: v })} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2" />
              </label>
            </div>
            {conv > 0 ? <p className="text-xs text-fg-muted">Conversão do jogo: cada {conv.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t de treino = 1 t de material.</p> : null}
            <label className="block">
              <span className="text-xs font-semibold text-fg-muted">Recado da obra (opcional)</span>
              <textarea value={f.narrativa} onChange={(e) => setF({ ...f, narrativa: e.target.value })} maxLength={600} rows={2} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.mostrar_contribuicoes} onChange={(e) => setF({ ...f, mostrar_contribuicoes: e.target.checked })} />
              Mostrar a contribuição de cada pessoa
            </label>
            {f.meta_t > 0 ? <Simulador metaKg={f.meta_t * 1000} ritmo={ritmo} ritmoAtualKg={ritmoAtualKg} /> : <p className="text-xs text-danger">Defina a meta para ver a simulação.</p>}
            <PreviaEtapas modelo={f.modelo} />
            <button type="button" disabled={ocupado || f.meta_t <= 0} onClick={() => acao({ acao: "salvar", id: rascunho?.id ?? null, ...f, narrativa: f.narrativa || null }, "Rascunho salvo. Ainda não começou: nada conta até você ativar.")} className="alvo w-full rounded-xl border border-accent px-4 py-2.5 font-bold disabled:opacity-50">
              💾 Salvar rascunho
            </button>
            {rascunho ? (
              <>
                <div className="space-y-2 rounded-xl border-2 border-accent p-3">
                  <p className="font-bold">🚀 Ativar oficialmente</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-fg-muted">
                    <li>A obra começa do zero, agora. Só contam treinos começados depois deste momento.</li>
                    <li>Todo mundo (alunos e visitantes em dia) recebe o aviso no celular e no 🔔.</li>
                    <li>O Início mostra o destaque por {f.banner_dias} dias.</li>
                    <li>Depois de ativar, a meta não muda mais. Salve o rascunho antes, se mexeu em algo.</li>
                  </ul>
                  <input value={palavra} onChange={(e) => setPalavra(e.target.value)} placeholder="Digite ATIVAR" className="w-full rounded-lg border border-border bg-bg px-2 py-2 uppercase" aria-label="Digite ATIVAR para confirmar" />
                  <button type="button" disabled={ocupado || palavra.trim().toUpperCase() !== "ATIVAR"} onClick={() => acao({ acao: "ativar", id: rascunho.id, confirmacao: palavra }, "🏗️ Obra ativada! A tribo foi avisada.")} className="alvo w-full rounded-xl bg-accent px-4 py-3 font-black text-bg disabled:opacity-40">
                    ATIVAR A CONSTRUÇÃO
                  </button>
                </div>
                <button type="button" disabled={ocupado} onClick={() => acao({ acao: "apagar", id: rascunho.id }, "Rascunho apagado.")} className="text-xs text-fg-muted underline">
                  Apagar este rascunho
                </button>
              </>
            ) : null}
          </section>
        )
      ) : null}

      {obras.some((o) => o.estado === "concluida") ? (
        <section className="rounded-2xl border border-border p-4 text-sm">
          <p className="font-bold">🏛️ Legado</p>
          <ul className="mt-2 space-y-1">
            {obras
              .filter((o) => o.estado === "concluida")
              .map((o) => (
                <li key={o.id}>
                  {o.ordem}ª · {o.nome} · inaugurada em {o.concluida_em ? dataBR(o.concluida_em) : "—"}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
