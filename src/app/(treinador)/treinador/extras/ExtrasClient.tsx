"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { MODALIDADES, RECUPERACAO, type Modalidade, type Recuperacao } from "@/lib/treino/extra";
import { GRUPOS } from "@/lib/validacao/schemas";
import type { ItemExtraAprovado } from "@/lib/treino/extra";
import { descricaoDosItens, duracaoEstimada, seriesTotais, type OpcaoExtra } from "@/lib/treino/extra-opcoes";
import { normalizarNome } from "@/lib/grupos";
import { EditorExtra, type ItemBibliotecaLeve } from "./EditorExtra";
import type { ExtraDitado } from "@/lib/treino/ditado-extra";
import { DitarExtra } from "./DitarExtra";

type Pendente = { id: string; aluno: string; titulo: string; classificacao: string; motivos: string[]; recuperacao: Recuperacao | null; tempo: number | null; data: string };
type Config = { habilitado: boolean; requer_aprovacao: boolean; aprovacao_so_intensos: boolean; max_por_semana: number; dias_permitidos: number[]; limite_series_semana: number; intervalo_min_horas: number; observacao: string | null };
type Extra = { id: string; modalidade: Modalidade; titulo: string; descricao: string | null; duracao_min: number; treino_id: string | null; grupos: string[]; series_estimadas: number; ativo: boolean; exercicios: ItemExtraAprovado[] | null };
type Detalhe = { alunoId: string; config: Config; extras: Extra[]; treinos: Array<{ id: string; nome: string }>; feitos: Array<{ id: string; titulo: string; data: string; duracaoMin: number | null; series: number }>; seriesSemana: number; opcoes: OpcaoExtra[]; motivoSemOpcoes: string; biblioteca: ItemBibliotecaLeve[] } | null;

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CLASSE: Record<string, string> = { liberado: "dentro das regras", aprovacao: "precisa da sua aprovação", nao_recomendado: "o app não recomendou" };
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const vazio = (): Omit<Extra, "id" | "ativo" | "exercicios"> & { id: string | null } => ({ id: null, modalidade: "cardio_leve", titulo: "", descricao: "", duracao_min: 30, treino_id: null, grupos: [], series_estimadas: 0 });
const inp = "h-9 rounded-md border border-border bg-bg px-2";

export function ExtrasClient({ alunos, pendentes, detalhe }: { alunos: Array<{ id: string; nome: string }>; pendentes: Pendente[]; detalhe: Detalhe }) {
  const router = useRouter();
  const toast = useToast();
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [cfg, setCfg] = useState<Config | null>(detalhe?.config ?? null);
  const [form, setForm] = useState<ReturnType<typeof vazio> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ditando, setDitando] = useState(false);
  const [editandoPronto, setEditandoPronto] = useState<Extra | null>(null);
  const [aprovadas, setAprovadas] = useState<string[]>([]);

  // Extra pronto (com exercícios): grava como musculação, com os grupos vindos da biblioteca.
  async function salvarPronto(titulo: string, itens: ItemExtraAprovado[], id: string | null, ok: string) {
    if (!detalhe) return false;
    const porId = new Map(detalhe.biblioteca.map((b) => [b.id, b.grupo]));
    const porNome = new Map(detalhe.biblioteca.map((b) => [normalizarNome(b.nome), b.grupo]));
    const grupos = [...new Set(itens.map((x) => (x.biblioteca_id && porId.get(x.biblioteca_id)) || porNome.get(normalizarNome(x.nome))).filter((g): g is string => !!g && (GRUPOS as readonly string[]).includes(g)))];
    const body = { id, modalidade: "resistido", titulo, descricao: descricaoDosItens(itens), duracao_min: duracaoEstimada(itens), treino_id: null, grupos, series_estimadas: Math.min(40, seriesTotais(itens)), exercicios: itens };
    return enviar(`/api/alunos/${detalhe.alunoId}/extras`, "POST", body, ok);
  }

  async function enviar(url: string, method: string, body: unknown, ok: string) {
    setSalvando(true);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setSalvando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(d?.error ?? "Não foi possível salvar.");
      return false;
    }
    toast.success(ok);
    router.refresh();
    return true;
  }

  const intenso = form ? MODALIDADES[form.modalidade].intenso : false;

  return (
    <div className="space-y-5">
      <section className="space-y-2" aria-labelledby="pend">
        <h2 id="pend" className="text-xs font-bold uppercase tracking-wider text-fg-muted">
          Pedidos aguardando você ({pendentes.length})
        </h2>
        {pendentes.length ? (
          pendentes.map((p) => (
            <Card key={p.id} className="border-accent/40">
              <CardBody className="space-y-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p>
                    <strong>{p.aluno}</strong> quer fazer <strong>{p.titulo}</strong>
                  </p>
                  <span className="text-xs text-fg-subtle">{fmt.format(new Date(p.data))}</span>
                </div>
                <p className="text-xs text-fg-muted">
                  Recuperação: {p.recuperacao ? RECUPERACAO[p.recuperacao] : "não informou"} · Tempo: {p.tempo ? `${p.tempo} min` : "não informou"} · Avaliação do app: {CLASSE[p.classificacao] ?? p.classificacao}
                </p>
                {p.motivos.length ? <p className="text-xs text-fg-subtle">{p.motivos.join(" ")}</p> : null}
                <input value={respostas[p.id] ?? ""} onChange={(e) => setRespostas({ ...respostas, [p.id]: e.target.value.slice(0, 300) })} placeholder="Resposta para o aluno (opcional)" aria-label={`Resposta para ${p.aluno}`} className={`${inp} w-full`} />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={salvando} onClick={() => void enviar("/api/extras/decidir", "POST", { id: p.id, status: "aprovada", resposta: respostas[p.id] || null }, "Aprovado para hoje.")} className="touch rounded-lg bg-accent px-3 py-2 font-bold text-bg disabled:opacity-60">
                    Aprovar para hoje
                  </button>
                  <button type="button" disabled={salvando} onClick={() => void enviar("/api/extras/decidir", "POST", { id: p.id, status: "recusada", resposta: respostas[p.id] || null }, "Resposta enviada.")} className="touch rounded-lg border border-border px-3 py-2 font-semibold text-fg-muted hover:text-fg disabled:opacity-60">
                    Hoje não
                  </button>
                </div>
              </CardBody>
            </Card>
          ))
        ) : (
          <p className="text-sm text-fg-muted">Nenhum pedido pendente.</p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold" htmlFor="aluno-extra">
          Aluno
        </label>
        <select id="aluno-extra" value={detalhe?.alunoId ?? ""} onChange={(e) => router.push(`/treinador/extras?aluno=${e.target.value}`)} className={inp}>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>

      {detalhe ? (
        <section className="space-y-2" aria-labelledby="opcoes-extra">
          <div>
            <h2 id="opcoes-extra" className="text-[11px] font-bold uppercase tracking-wider text-accent">Opções de treino extra para aprovar</h2>
            <p className="text-xs text-fg-muted">O app monta com o plano do aluno. Troque, tire ou ponha exercícios, ajuste séries e repetições e aprove: o aluno passa a ver o treino pronto em “Quero fazer um treino extra” e marca série por série. Continuam valendo as regras abaixo (nível de dor, 48 h, dias e limites).</p>
          </div>
          {detalhe.opcoes.length ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {detalhe.opcoes.map((o) => (
                <Card key={`${detalhe.alunoId}-${o.chave}`} className="border-accent/40">
                  <CardBody className="space-y-2 text-sm">
                    <p className="text-[11px] text-fg-subtle">{o.motivo}</p>
                    {aprovadas.includes(o.chave) ? (
                      <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs font-semibold text-success">Aprovado! Já está na lista de extras liberados.</p>
                    ) : (
                      <EditorExtra
                        tituloInicial={o.titulo}
                        itensIniciais={o.itens}
                        biblioteca={detalhe.biblioteca}
                        salvando={salvando}
                        rotuloBotao="Aprovar e liberar"
                        onAprovar={async (titulo, itens) => {
                          if (await salvarPronto(titulo, itens, null, `“${titulo}” liberado para o aluno.`)) setAprovadas((a) => [...a, o.chave]);
                        }}
                      />
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-fg-muted">{detalhe.motivoSemOpcoes}</p>
          )}
        </section>
      ) : null}

      {detalhe && cfg ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardBody className="space-y-3 text-sm">
              <h2 className="font-bold">Regras do aluno</h2>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={cfg.habilitado} onChange={(e) => setCfg({ ...cfg, habilitado: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
                Permitir treinos extras
              </label>
              <p className="-mt-1 pl-6 text-[11px] text-fg-subtle">Ligado: o aluno vê o botão “Quero fazer um treino extra” com as opções que você liberou abaixo. Desligado: ele não pede extra nenhum.</p>
              <fieldset className="space-y-1">
                <legend className="text-sm">Quando pedir a minha aprovação</legend>
                {([
                  { v: "intensos", t: "Só nos extras de musculação e treino complementar", d: "Caminhada, mobilidade, cardio e sessão técnica saem liberados quando o aluno está dentro das regras abaixo." },
                  { v: "todos", t: "Em todo extra", d: "Até uma caminhada vira pedido para você aprovar antes." },
                  { v: "nunca", t: "Nunca: o app decide pelas regras", d: "Libera sozinho o que estiver dentro das regras; só os casos duvidosos viram pedido." },
                ] as const).map((o) => {
                  const atual = !cfg.requer_aprovacao ? "nunca" : cfg.aprovacao_so_intensos ? "intensos" : "todos";
                  return (
                    <label key={o.v} className="flex items-start gap-2 py-0.5">
                      <input type="radio" name="aprovacao" checked={atual === o.v} onChange={() => setCfg({ ...cfg, requer_aprovacao: o.v !== "nunca", aprovacao_so_intensos: o.v !== "todos" })} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
                      <span>
                        <span className="block">{o.t}</span>
                        <span className="block text-[11px] text-fg-subtle">{o.d}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-0.5">
                  <span className="block text-[11px] text-fg-muted">Máximo por semana</span>
                  <span className="block text-[11px] text-fg-subtle">Quantos treinos extras ele pode fazer de segunda a domingo.</span>
                  <input inputMode="numeric" value={cfg.max_por_semana} onChange={(e) => setCfg({ ...cfg, max_por_semana: Math.min(7, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={`${inp} w-full`} />
                </label>
                <label className="space-y-0.5">
                  <span className="block text-[11px] text-fg-muted">Séries extras/semana (resistido)</span>
                  <span className="block text-[11px] text-fg-subtle">Teto de séries de musculação somando os extras da semana (cardio e mobilidade não contam).</span>
                  <input inputMode="numeric" value={cfg.limite_series_semana} onChange={(e) => setCfg({ ...cfg, limite_series_semana: Math.min(60, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={`${inp} w-full`} />
                </label>
                <label className="col-span-2 space-y-0.5">
                  <span className="block text-[11px] text-fg-muted">Intervalo mínimo desde o último treino para extra intenso sem aprovação (horas)</span>
                  <span className="block text-[11px] text-fg-subtle">Se o último treino foi há menos horas que isso, um extra de musculação vira pedido para você aprovar.</span>
                  <input inputMode="numeric" value={cfg.intervalo_min_horas} onChange={(e) => setCfg({ ...cfg, intervalo_min_horas: Math.min(72, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={`${inp} w-24`} />
                </label>
              </div>
              <fieldset className="space-y-1">
                <legend className="text-[11px] text-fg-muted">Dias permitidos</legend>
                <p className="text-[11px] text-fg-subtle">Dias da semana em que o aluno pode pedir extra (dourado = liberado).</p>
                <div className="flex flex-wrap gap-1">
                  {DIAS.map((d, i) => {
                    const on = cfg.dias_permitidos.includes(i);
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => setCfg({ ...cfg, dias_permitidos: on ? cfg.dias_permitidos.filter((x) => x !== i) : [...cfg.dias_permitidos, i] })} className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-accent text-accent" : "border-border text-fg-subtle"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <p className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-[11px] text-fg-muted"><strong className="text-fg">Extra montado pelo app:</strong> só aparece depois que o aluno faz todos os treinos programados da semana. Ele escolhe tempo (15 a 60 min), foco (músculos prioridade, full body leve ou músculos pequenos) e como está o corpo; o app monta com exercícios do plano, com 2 repetições sobrando, e sai liberado direto, respeitando o máximo por semana, as séries extras e os dias acima.</p>
              <p className="text-[11px] text-fg-subtle">Dor: o aluno escolhe o nível. Dor forte bloqueia o extra e pede para conversar com você; dor leve ou moderada libera com aviso de precaução (carga mais leve, mais cadência e amplitude, evitar o que causa dor e trocar na hora o exercício que doer). Também bloqueados: mesmo grupo muscular treinado há menos de 48 h (extra intenso) e limite da semana atingido. Sem resposta de recuperação, segue pelas regras.</p>
              <button type="button" disabled={salvando} onClick={() => void enviar(`/api/alunos/${detalhe.alunoId}/extras`, "PUT", cfg, "Regras salvas.")} className="touch rounded-lg bg-accent px-4 py-2 font-bold text-bg disabled:opacity-60">
                Salvar regras
              </button>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Extras liberados</h2>
                {!form && !ditando ? (
                  <span className="flex gap-3">
                    <button type="button" onClick={() => setDitando(true)} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
                      🎤 Ditar extra
                    </button>
                    <button type="button" onClick={() => setForm(vazio())} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
                      + Novo extra
                    </button>
                  </span>
                ) : null}
              </div>
              {ditando ? (
                <DitarExtra
                  treinos={detalhe.treinos}
                  salvando={salvando}
                  onFechar={() => setDitando(false)}
                  onRevisar={(x: ExtraDitado) => {
                    setDitando(false);
                    setForm({ id: null, modalidade: x.modalidade, titulo: x.titulo, descricao: x.descricao, duracao_min: x.duracao_min, treino_id: x.treino_id, grupos: x.grupos, series_estimadas: x.series_estimadas });
                  }}
                  onSalvar={async (xs: ExtraDitado[]) => {
                    let ok = 0;
                    for (const x of xs) {
                      const body = { modalidade: x.modalidade, titulo: x.titulo, descricao: x.descricao || null, duracao_min: x.duracao_min, treino_id: x.treino_id, grupos: x.grupos, series_estimadas: x.series_estimadas };
                      if (await enviar(`/api/alunos/${detalhe.alunoId}/extras`, "POST", body, xs.length > 1 ? `Extra “${x.titulo}” salvo.` : "Extra salvo.")) ok++;
                      else break;
                    }
                    if (ok === xs.length) setDitando(false);
                  }}
                />
              ) : null}
              {editandoPronto ? (
                <div className="rounded-lg border border-accent/40 p-3">
                  <EditorExtra
                    tituloInicial={editandoPronto.titulo}
                    itensIniciais={editandoPronto.exercicios ?? []}
                    biblioteca={detalhe.biblioteca}
                    salvando={salvando}
                    rotuloBotao="Salvar alterações"
                    onCancelar={() => setEditandoPronto(null)}
                    onAprovar={async (titulo, itens) => {
                      if (await salvarPronto(titulo, itens, editandoPronto.id, "Extra atualizado.")) setEditandoPronto(null);
                    }}
                  />
                </div>
              ) : null}
              {form ? (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <select value={form.modalidade} onChange={(e) => setForm({ ...form, modalidade: e.target.value as Modalidade })} className={`${inp} w-full`} aria-label="Modalidade">
                    {(Object.keys(MODALIDADES) as Modalidade[]).map((m) => (
                      <option key={m} value={m}>
                        {MODALIDADES[m].rotulo}
                      </option>
                    ))}
                  </select>
                  <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value.slice(0, 80) })} placeholder="Título (ex.: Caminhada leve)" aria-label="Título" className={`${inp} w-full`} />
                  <textarea value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value.slice(0, 600) })} rows={2} placeholder="Orientações (intensidade, cuidados)" aria-label="Orientações" className="w-full rounded-md border border-border bg-bg p-2" />
                  <label className="flex items-center gap-2 text-xs text-fg-muted">
                    Duração
                    <input inputMode="numeric" value={form.duracao_min} onChange={(e) => setForm({ ...form, duracao_min: Math.min(180, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={`${inp} w-16`} aria-label="Duração em minutos" />
                    min
                  </label>
                  {intenso ? (
                    <>
                      <select value={form.treino_id ?? ""} onChange={(e) => setForm({ ...form, treino_id: e.target.value || null })} className={`${inp} w-full`} aria-label="Treino do plano">
                        <option value="">Sem treino do plano (aluno só registra a duração)</option>
                        {detalhe.treinos.map((t) => (
                          <option key={t.id} value={t.id}>
                            Usar o treino {t.nome}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-xs text-fg-muted">
                        Séries estimadas
                        <input inputMode="numeric" value={form.series_estimadas} onChange={(e) => setForm({ ...form, series_estimadas: Math.min(40, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={`${inp} w-16`} aria-label="Séries estimadas" />
                      </label>
                      <fieldset className="space-y-1">
                        <legend className="text-[11px] text-fg-muted">Grupos musculares (para checar recuperação)</legend>
                        <div className="flex flex-wrap gap-1">
                          {GRUPOS.map((g) => {
                            const on = form.grupos.includes(g);
                            return (
                              <button key={g} type="button" aria-pressed={on} onClick={() => setForm({ ...form, grupos: on ? form.grupos.filter((x) => x !== g) : [...form.grupos, g] })} className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? "border-accent text-accent" : "border-border text-fg-subtle"}`}>
                                {g.replace(/_/g, " ")}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    </>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={salvando || !form.titulo.trim() || form.duracao_min < 5}
                      onClick={async () => {
                        const body = { ...form, descricao: form.descricao || null, treino_id: intenso ? form.treino_id : null, grupos: intenso ? form.grupos : [], series_estimadas: intenso ? form.series_estimadas : 0 };
                        if (await enviar(`/api/alunos/${detalhe.alunoId}/extras`, "POST", body, "Extra salvo.")) setForm(null);
                      }}
                      className="touch rounded-lg bg-accent px-4 py-2 font-bold text-bg disabled:opacity-60"
                    >
                      Salvar
                    </button>
                    <button type="button" onClick={() => setForm(null)} className="text-xs text-fg-muted">
                      cancelar
                    </button>
                  </div>
                </div>
              ) : null}
              {detalhe.extras.length ? (
                <ul className="space-y-1.5">
                  {detalhe.extras.map((x) => (
                    <li key={x.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 ${x.ativo ? "" : "border-dashed"}`}>
                      <span>
                        <strong>{x.titulo}</strong>{x.ativo ? null : <span className="text-xs text-warning"> (pausado)</span>} <span className="text-xs text-fg-subtle">· {MODALIDADES[x.modalidade].rotulo} · {x.duracao_min} min{x.series_estimadas ? ` · ${x.series_estimadas} séries` : ""}</span>
                        {x.exercicios?.length ? <span className="block text-xs text-fg-muted">{x.exercicios.map((e) => `${e.nome} ${e.series}×${e.reps}`).join(" · ")}</span> : null}
                      </span>
                      <span className="flex gap-3 text-xs">
                        <button type="button" onClick={() => (x.exercicios?.length ? (setForm(null), setEditandoPronto(x)) : setForm({ id: x.id, modalidade: x.modalidade, titulo: x.titulo, descricao: x.descricao ?? "", duracao_min: x.duracao_min, treino_id: x.treino_id, grupos: x.grupos, series_estimadas: x.series_estimadas }))} className="alvo text-accent underline-offset-2 hover:underline">
                          editar
                        </button>
                        <button type="button" onClick={() => void enviar(`/api/alunos/${detalhe.alunoId}/extras`, "PATCH", { id: x.id, ativo: !x.ativo }, x.ativo ? "Extra pausado." : "Extra reativado.")} className="alvo text-fg-muted underline-offset-2 hover:underline">
                          {x.ativo ? "pausar" : "reativar"}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-fg-muted">Nenhum extra cadastrado. Sem extras liberados, o aluno não vê a opção.</p>
              )}
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardBody className="space-y-2 text-sm">
              <h2 className="font-bold">Extras realizados</h2>
              {detalhe.seriesSemana > cfg.limite_series_semana ? (
                <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                  Nesta semana os extras somaram {detalhe.seriesSemana} séries — acima do limite combinado ({cfg.limite_series_semana}). Vale revisar o volume total.
                </p>
              ) : (
                <p className="text-xs text-fg-muted">Séries extras nesta semana: {detalhe.seriesSemana} de {cfg.limite_series_semana} combinadas. O volume real dos extras entra nos relatórios; a meta semanal não muda.</p>
              )}
              {detalhe.feitos.length ? (
                <ul className="space-y-1 text-xs text-fg-muted">
                  {detalhe.feitos.map((f) => (
                    <li key={f.id}>
                      {fmt.format(new Date(f.data))} · <span className="font-semibold text-fg">{f.titulo}</span>
                      {f.duracaoMin ? ` · ${f.duracaoMin} min` : ""}
                      {f.series ? ` · ${f.series} séries` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-fg-subtle">Nenhum treino extra registrado ainda.</p>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
