"use client";

// Treino livre em andamento: a pessoa escolhe o exercício na hora, anota as
// séries (carga × repetições, normal/aquecimento/técnica), a técnica do
// exercício e uma anotação. Cada série é gravada ao tocar no ✓.
import { RecadosAoVivo } from "@/components/ao-vivo/RecadosAoVivo";
import { TelaAcesaTreino } from "@/components/treinos/TelaAcesa";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RestTimer } from "@/components/ui/RestTimer";
import { GRUPO_LABEL } from "@/lib/grupos";
import { EscolherExercicio, type ItemBusca } from "@/components/livre/EscolherExercicio";
import { TECNICAS_LIVRE, lerCarga, lerReps, tiposDeSerie } from "@/lib/treino/livre";
import type { SerieTipo } from "@/lib/supabase/types-sessoes";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { PlacarMetas } from "@/components/livre-metas/PlacarMetas";
import { avisoDaSerie, contaNoPlacar, linhaDoGrupo, somarNoPlacar, sugestaoDeAgora, type LinhaPlacar } from "@/lib/treino/livre-metas";

export type SerieTela = { key: string; serie: number; tipo: SerieTipo; carga: string; reps: string; salva: boolean };
export type ExercicioTela = { seId: string; nome: string; grupo: GrupoMuscular | null; tecnica: string; observacao: string; ultima: string | null; series: SerieTela[] };

const novaChave = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
/** Descanso depois da série, igual ao treino normal (aquecimento descansa menos). */
const DESCANSO_SEG = { valida: 90, aquecimento: 60 } as const;

const relogio = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
const FEEDBACK = [
  { id: "leve", rotulo: "😌 Leve" },
  { id: "ok", rotulo: "💪 Na medida" },
  { id: "pesado", rotulo: "🥵 Pesado" },
  { id: "dor", rotulo: "⚠️ Senti dor" },
] as const;

async function chamar(url: string, metodo: string, corpo: unknown): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    return { ok: r.ok, json: ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown> };
  } catch {
    return { ok: false, json: { error: "Sem conexão. Confira a internet e tente de novo." } };
  }
}

export function LivreClient({ sessaoId, iniciadoEm, itens, inicial, extra = false, voltar = "/aluno", metas }: { sessaoId: string; iniciadoEm: string; itens: ItemBusca[]; inicial: ExercicioTela[]; extra?: boolean; voltar?: string; /** Treino livre por metas: placar da semana (com o que já foi salvo neste treino) e o contexto da sugestão. */ metas?: { placar: LinhaPlacar[]; hoje: string; recentes: GrupoMuscular[] } | null }) {
  const router = useRouter();
  const [exs, setExs] = useState<ExercicioTela[]>(inicial);
  const [aberto, setAberto] = useState<string | null>(inicial.at(-1)?.seId ?? null);
  const [buscando, setBuscando] = useState(inicial.length === 0);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [timer, setTimer] = useState<{ seg: number; key: number } | null>(null);
  const [terminando, setTerminando] = useState(false);
  const [feedback, setFeedback] = useState<(typeof FEEDBACK)[number]["id"] | null>(null);
  const [comentario, setComentario] = useState("");
  const [placar, setPlacar] = useState<LinhaPlacar[]>(metas?.placar ?? []);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verPlacar, setVerPlacar] = useState(false);
  const jaHoje = [...new Set(exs.filter((e) => e.series.some((s) => s.salva && contaNoPlacar(s.tipo))).map((e) => linhaDoGrupo(placar, e.grupo)?.grupo).filter((g): g is GrupoMuscular => !!g))];
  const sugestao = metas && placar.length ? sugestaoDeAgora(placar, { hoje: metas.hoje, recentes: metas.recentes, jaHoje }) : null;
  // Séries que já estão no placar (as salvas antes de abrir a tela já vêm na conta do servidor).
  const contadas = useRef(new Set(inicial.flatMap((e) => e.series.filter((x) => x.salva && contaNoPlacar(x.tipo)).map((x) => x.key))));
  /** Põe/tira a série do placar (só uma vez por série) e avisa quando entra na faixa ou chega no limite. */
  function contarNoPlacar(e: ExercicioTela, s: SerieTela, conta: boolean) {
    const ja = contadas.current.has(s.key);
    if (!placar.length || ja === conta) return;
    const antes = linhaDoGrupo(placar, e.grupo);
    if (!antes) return;
    if (conta) contadas.current.add(s.key);
    else contadas.current.delete(s.key);
    setPlacar(somarNoPlacar(placar, e.grupo, conta ? 1 : -1));
    if (conta) setAviso(avisoDaSerie(antes.feitas, antes.feitas + 1, antes));
  }

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const decorrido = Math.max(0, Math.round((agora - new Date(iniciadoEm).getTime()) / 1000));
  const seriesFeitas = exs.reduce((n, e) => n + e.series.filter((s) => s.salva && s.tipo !== "aquecimento").length, 0);

  const mudarEx = (seId: string, f: (e: ExercicioTela) => ExercicioTela) => setExs((l) => l.map((e) => (e.seId === seId ? f(e) : e)));
  const mudarSerie = (seId: string, key: string, patch: Partial<SerieTela>) => mudarEx(seId, (e) => ({ ...e, series: e.series.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

  // Um toque basta: fecha a busca na hora e ignora toques repetidos enquanto adiciona.
  const adicionando = useRef(false);
  async function adicionar(corpo: { biblioteca_id?: string; nome_livre?: string }) {
    if (adicionando.current) return;
    adicionando.current = true;
    setOcupado(true);
    setBuscando(false);
    setErro(null);
    const r = await chamar(`/api/livre/${sessaoId}/exercicios`, "POST", { client_key: novaChave(), tecnica: "normal", ...corpo });
    adicionando.current = false;
    setOcupado(false);
    if (!r.ok) {
      setBuscando(true);
      return setErro(String(r.json.error ?? "Não foi possível adicionar agora."));
    }
    const seId = String(r.json.id);
    setExs((l) => [...l, { seId, nome: String(r.json.nome), grupo: (r.json.grupo as GrupoMuscular | null) ?? null, tecnica: "normal", observacao: "", ultima: (r.json.ultima as string | null) ?? null, series: [{ key: novaChave(), serie: 1, tipo: "valida", carga: "", reps: "", salva: false }] }]);
    setAberto(seId);
    setBuscando(false);
  }

  function maisSerie(e: ExercicioTela) {
    const ult = e.series.at(-1);
    mudarEx(e.seId, (x) => ({ ...x, series: [...x.series, { key: novaChave(), serie: (ult?.serie ?? 0) + 1, tipo: ult?.tipo === "aquecimento" ? "valida" : (ult?.tipo ?? "valida"), carga: ult?.carga ?? "", reps: ult?.reps ?? "", salva: false }] }));
  }

  async function salvarSerie(e: ExercicioTela, s: SerieTela) {
    const carga = lerCarga(s.carga);
    const reps = lerReps(s.reps);
    if (reps == null && carga == null) return setErro("Anote pelo menos as repetições ou a carga da série.");
    if (s.carga.trim() && carga == null) return setErro("Carga inválida. Use números, ex.: 42,5");
    setErro(null);
    const r = await chamar(`/api/sessoes/${sessaoId}/series`, "POST", { session_exercise_id: e.seId, client_key: `livre:${s.key}`, serie: s.serie, tipo: s.tipo, carga_kg: carga, reps });
    if (!r.ok) return setErro(String(r.json.error ?? "Não foi possível salvar a série."));
    contarNoPlacar(e, s, contaNoPlacar(s.tipo));
    mudarSerie(e.seId, s.key, { salva: true });
    const seg = s.tipo === "aquecimento" ? DESCANSO_SEG.aquecimento : DESCANSO_SEG.valida;
    setTimer((t) => ({ seg, key: (t?.key ?? 0) + 1 }));
    if (navigator.vibrate) navigator.vibrate(30);
  }

  async function apagarSerie(e: ExercicioTela, s: SerieTela) {
    if (s.salva) {
      const r = await chamar(`/api/sessoes/${sessaoId}/series`, "DELETE", { client_key: `livre:${s.key}` });
      if (!r.ok) return setErro(String(r.json.error ?? "Não foi possível apagar a série."));
      contarNoPlacar(e, s, false);
    }
    mudarEx(e.seId, (x) => ({ ...x, series: x.series.filter((y) => y.key !== s.key).map((y, i) => ({ ...y, serie: i + 1 })) }));
  }

  /** Tira o exercício do treino (posto por engano). Com séries salvas, confirma e apaga as séries antes. */
  async function tirar(e: ExercicioTela) {
    const salvas = e.series.filter((s) => s.salva);
    if (salvas.length && !window.confirm(`Tirar “${e.nome}” do treino? ${salvas.length === 1 ? "A série salva será apagada." : `As ${salvas.length} séries salvas serão apagadas.`}`)) return;
    setErro(null);
    for (const s of salvas) {
      const r = await chamar(`/api/sessoes/${sessaoId}/series`, "DELETE", { client_key: `livre:${s.key}` });
      if (!r.ok) return setErro(String(r.json.error ?? "Não foi possível apagar a série."));
      contarNoPlacar(e, s, false);
    }
    const r = await chamar(`/api/livre/${sessaoId}/exercicios/${e.seId}`, "DELETE", {});
    if (!r.ok) return setErro(String(r.json.error ?? "Não foi possível tirar agora."));
    setExs((l) => l.filter((x) => x.seId !== e.seId));
    if (aberto === e.seId) setAberto(null);
  }

  async function ajustar(e: ExercicioTela, patch: { tecnica?: string; observacao?: string }) {
    const r = await chamar(`/api/livre/${sessaoId}/exercicios/${e.seId}`, "PATCH", patch);
    if (!r.ok) setErro(String(r.json.error ?? "Não foi possível salvar agora."));
  }

  async function terminar(status: "concluida" | "abandonada") {
    setOcupado(true);
    const r = await chamar(`/api/sessoes/${sessaoId}`, "PATCH", { status, feedback_percepcao: status === "concluida" ? feedback : null, feedback_comentario: comentario.trim() || null });
    setOcupado(false);
    if (!r.ok) return setErro(String(r.json.error ?? "Não foi possível terminar agora."));
    if (status === "abandonada") return router.push(voltar);
    router.refresh();
  }

  const pendentes = exs.reduce((n, e) => n + e.series.filter((s) => !s.salva && (s.carga.trim() || s.reps.trim())).length, 0);

  return (
    <div className="space-y-4 pb-24">
      <RecadosAoVivo sessaoId={sessaoId} />
      <div className="flex justify-end"><TelaAcesaTreino /></div>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">🎲 {extra ? "Treino extra · livre" : "Treino livre"}</p>
          <h1 className="text-2xl font-bold leading-tight">Decida na hora</h1>
          <p className="text-sm text-fg-muted">Escolha o exercício, anote as séries e siga para o próximo.{extra ? " Como extra, fica registrado à parte e não conta na meta semanal." : ""}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-right">
          <p className="font-mono text-lg font-bold tabular-nums">{relogio(decorrido)}</p>
          <p className="text-[11px] text-fg-subtle">{seriesFeitas} {seriesFeitas === 1 ? "série" : "séries"}</p>
        </div>
      </header>

      {timer ? (
        // Mesmo descanso do treino normal: flutua embaixo, perto do polegar, acima do menu.
        <div className="fixed inset-x-3 z-[45] mx-auto max-w-xl drop-shadow-2xl bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4">
          <RestTimer key={timer.key} duracaoSeg={timer.seg} autoStart onComplete={() => setTimer(null)} onDismiss={() => setTimer(null)} />
        </div>
      ) : null}

      {placar.length ? (
        <div className="space-y-2">
          {aviso ? (
            <div role="status" className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${aviso.startsWith("✅") ? "border-success/50 bg-success/10" : "border-red/50 bg-red/10"}`}>
              <span className="flex-1">{aviso}</span>
              <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso" className="text-fg-muted"><Icon name="x" size={14} /></button>
            </div>
          ) : null}
          {sugestao ? <p className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm">💡 {sugestao.texto}</p> : null}
          <button type="button" onClick={() => setVerPlacar((v) => !v)} aria-expanded={verPlacar} className="alvo text-sm font-semibold text-accent underline underline-offset-4">
            {verPlacar ? "Esconder o placar da semana" : "🎯 Ver o placar da semana por músculo"}
          </button>
          {verPlacar ? <PlacarMetas placar={placar} compacto /> : null}
        </div>
      ) : null}

      {erro ? <p role="alert" className="rounded-xl border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{erro}</p> : null}

      <ol className="space-y-3">
        {exs.map((e, i) => {
          const abertoAqui = aberto === e.seId;
          const feitas = e.series.filter((s) => s.salva && s.tipo !== "aquecimento").length;
          const tipos = tiposDeSerie(e.tecnica);
          return (
            <li key={e.seId} className={`rounded-xl border ${abertoAqui ? "border-accent/60" : "border-border"} bg-card`}>
              <div className="flex items-center">
              <button type="button" onClick={() => setAberto(abertoAqui ? null : e.seId)} aria-expanded={abertoAqui} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 text-left">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-sm font-bold text-accent">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-tight">{e.nome}</span>
                  <span className="block text-xs text-fg-subtle">{e.grupo ? GRUPO_LABEL[e.grupo] : "Exercício com o seu nome"} · {feitas} {feitas === 1 ? "série" : "séries"}{e.tecnica !== "normal" ? ` · ${TECNICAS_LIVRE.find((t) => t.id === e.tecnica)?.rotulo}` : ""}</span>
                </span>
                <Icon name={abertoAqui ? "up" : "down"} size={18} className="shrink-0 text-fg-muted" />
              </button>
              <button type="button" onClick={() => void tirar(e)} aria-label={`Tirar ${e.nome} do treino`} className="alvo mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-fg-subtle hover:text-red">
                <Icon name="trash" size={18} />
              </button>
              </div>
              {abertoAqui ? (
                <div className="space-y-3 border-t border-border px-4 py-3">
                  {e.ultima ? <p className="text-xs text-fg-muted">📌 {e.ultima}</p> : null}
                  <label className="block text-xs font-semibold text-fg-muted">
                    Técnica
                    <select
                      value={e.tecnica}
                      onChange={(ev) => {
                        const t = ev.target.value;
                        const validos = new Set(tiposDeSerie(t).map((x) => x.id));
                        mudarEx(e.seId, (x) => ({ ...x, tecnica: t, series: x.series.map((s) => (s.salva || validos.has(s.tipo) ? s : { ...s, tipo: "valida" })) }));
                        void ajustar(e, { tecnica: t });
                      }}
                      className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg"
                    >
                      {TECNICAS_LIVRE.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}
                    </select>
                    {e.tecnica !== "normal" ? <span className="mt-1 block font-normal text-fg-subtle">{TECNICAS_LIVRE.find((t) => t.id === e.tecnica)?.dica}</span> : null}
                  </label>

                  <div className="space-y-2">
                    <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem_2.25rem] items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      <span>Série</span><span>Carga (kg)</span><span>Reps</span><span className="sr-only">Salvar</span><span className="sr-only">Apagar</span>
                    </div>
                    {e.series.map((s) => (
                      <div key={s.key} className="space-y-1">
                        <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem_2.25rem] items-center gap-2">
                          <span className="text-center font-mono text-sm text-fg-muted">{s.tipo === "aquecimento" ? "A" : s.serie}</span>
                          <input inputMode="decimal" value={s.carga} onChange={(ev) => mudarSerie(e.seId, s.key, { carga: ev.target.value, salva: false })} placeholder="kg" aria-label={`Carga da série ${s.serie}`} className="h-11 w-full rounded-lg border border-border bg-bg px-2 text-center text-base tabular-nums" />
                          <input inputMode="numeric" value={s.reps} onChange={(ev) => mudarSerie(e.seId, s.key, { reps: ev.target.value.replace(/\D/g, "").slice(0, 3), salva: false })} placeholder="reps" aria-label={`Repetições da série ${s.serie}`} className="h-11 w-full rounded-lg border border-border bg-bg px-2 text-center text-base tabular-nums" />
                          <button type="button" onClick={() => void salvarSerie(e, s)} aria-label={s.salva ? "Série salva" : "Salvar série"} className={`grid h-11 w-11 place-items-center rounded-lg border ${s.salva ? "border-success bg-success/20 text-success" : "border-accent text-accent"}`}>
                            <Icon name="check" size={18} />
                          </button>
                          <button type="button" onClick={() => void apagarSerie(e, s)} aria-label="Apagar série" className="grid h-9 w-9 place-items-center rounded-lg text-fg-subtle hover:text-red">
                            <Icon name="x" size={16} />
                          </button>
                        </div>
                        {tipos.length > 1 ? (
                          <div className="ml-10 flex flex-wrap gap-1.5">
                            {tipos.map((t) => (
                              <button key={t.id} type="button" onClick={() => mudarSerie(e.seId, s.key, { tipo: t.id, salva: false })} aria-pressed={s.tipo === t.id} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${s.tipo === t.id ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-subtle"}`}>
                                {t.rotulo}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <button type="button" onClick={() => maisSerie(e)} className="alvo flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-semibold text-fg-muted hover:text-fg">
                      <Icon name="plus" size={16} /> Mais uma série
                    </button>
                  </div>

                  <label className="block text-xs font-semibold text-fg-muted">
                    Anotação (opcional)
                    <textarea value={e.observacao} onChange={(ev) => mudarEx(e.seId, (x) => ({ ...x, observacao: ev.target.value.slice(0, 300) }))} onBlur={() => void ajustar(e, { observacao: e.observacao })} rows={2} placeholder="Ex.: máquina 3, banco na posição 4, senti mais o glúteo" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-normal text-fg" />
                  </label>
                  <button type="button" onClick={() => void tirar(e)} className="alvo flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red/40 text-sm font-semibold text-red">
                    <Icon name="trash" size={16} /> Tirar este exercício do treino
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {buscando ? (
        <EscolherExercicio itens={itens} placar={placar.length ? placar : undefined} onEscolher={(it) => void adicionar({ biblioteca_id: it.id })} onMeuNome={(nome) => void adicionar({ nome_livre: nome })} onFechar={() => setBuscando(false)} />
      ) : (
        <button type="button" disabled={ocupado} onClick={() => setBuscando(true)} className="alvo flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-bold text-bg disabled:opacity-60">
          <Icon name="plus" size={20} /> {exs.length ? "Próximo exercício" : "Escolher o primeiro exercício"}
        </button>
      )}

      {terminando ? (
        <section className="space-y-3 rounded-xl border border-accent/50 bg-card p-4" aria-label="Terminar treino">
          {pendentes ? <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">Você tem {pendentes} {pendentes === 1 ? "série anotada sem salvar" : "séries anotadas sem salvar"}. Toque no ✓ delas para não perder.</p> : null}
          <p className="font-bold">Como foi o treino?</p>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK.map((f) => (
              <button key={f.id} type="button" onClick={() => setFeedback(f.id)} aria-pressed={feedback === f.id} className={`min-h-11 rounded-lg border px-3 text-sm ${feedback === f.id ? "border-accent bg-accent-soft font-semibold" : "border-border"}`}>{f.rotulo}</button>
            ))}
          </div>
          {feedback === "dor" ? <p className="text-xs text-fg-muted">Sentiu dor? Pare o exercício que doeu e, se continuar, fale com o Montinho ou com um profissional de saúde.</p> : null}
          <textarea value={comentario} onChange={(ev) => setComentario(ev.target.value.slice(0, 500))} rows={2} placeholder="Algum comentário? (opcional)" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          <Button variant="success" size="lg" className="w-full" loading={ocupado} disabled={!seriesFeitas} onClick={() => void terminar("concluida")}>Concluir treino</Button>
          {!seriesFeitas ? <p className="text-center text-xs text-fg-muted">Salve pelo menos uma série para concluir.</p> : null}
          <div className="flex justify-between gap-2 text-sm">
            <button type="button" onClick={() => setTerminando(false)} className="alvo text-fg-muted underline underline-offset-4">Voltar ao treino</button>
            <button type="button" onClick={() => { if (window.confirm(seriesFeitas ? "Encerrar sem concluir? As séries ficam guardadas e o treino conta como parcial." : "Cancelar este treino? Ele não conta na semana.")) void terminar("abandonada"); }} className="alvo text-red underline underline-offset-4">{seriesFeitas ? "Encerrar sem concluir" : "Cancelar treino"}</button>
          </div>
        </section>
      ) : exs.length ? (
        <Button variant="secondary" size="lg" className="w-full" onClick={() => setTerminando(true)}>Terminar treino</Button>
      ) : null}

      {/* Sempre dá para sair: sem séries cancela (não conta); com séries, encerra sem concluir (fica parcial). */}
      {!terminando ? (
        <div className="text-center">
          <button type="button" disabled={ocupado} onClick={() => { if (window.confirm(seriesFeitas ? "Encerrar sem concluir? As séries que você marcou ficam guardadas e o treino conta como parcial." : "Cancelar este treino? Nenhuma série foi marcada: ele não conta na semana e você pode começar outro.")) void terminar("abandonada"); }} className="alvo text-sm font-semibold text-red underline underline-offset-4 disabled:opacity-50">
            {seriesFeitas ? "Encerrar sem concluir" : "✖ Cancelar este treino"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
