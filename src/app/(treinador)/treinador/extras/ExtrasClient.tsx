"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { MODALIDADES, RECUPERACAO, type Modalidade, type Recuperacao } from "@/lib/treino/extra";
import { GRUPOS } from "@/lib/validacao/schemas";
import type { SugestaoExtra } from "@/lib/treino/sugestao-extra";

type Pendente = { id: string; aluno: string; titulo: string; classificacao: string; motivos: string[]; recuperacao: Recuperacao | null; tempo: number | null; data: string };
type Config = { habilitado: boolean; requer_aprovacao: boolean; max_por_semana: number; dias_permitidos: number[]; limite_series_semana: number; intervalo_min_horas: number; observacao: string | null };
type Extra = { id: string; modalidade: Modalidade; titulo: string; descricao: string | null; duracao_min: number; treino_id: string | null; grupos: string[]; series_estimadas: number; ativo: boolean };
type Detalhe = { alunoId: string; config: Config; extras: Extra[]; treinos: Array<{ id: string; nome: string }>; feitos: Array<{ id: string; titulo: string; data: string; duracaoMin: number | null; series: number }>; seriesSemana: number; sugestao: { sugestao: SugestaoExtra | null; motivo: string } } | null;

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CLASSE: Record<string, string> = { liberado: "dentro das regras", aprovacao: "precisa da sua aprovação", nao_recomendado: "o app não recomendou" };
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const vazio = (): Omit<Extra, "id" | "ativo"> & { id: string | null } => ({ id: null, modalidade: "cardio_leve", titulo: "", descricao: "", duracao_min: 30, treino_id: null, grupos: [], series_estimadas: 0 });
const inp = "h-9 rounded-md border border-border bg-bg px-2";

export function ExtrasClient({ alunos, pendentes, detalhe }: { alunos: Array<{ id: string; nome: string }>; pendentes: Pendente[]; detalhe: Detalhe }) {
  const router = useRouter();
  const toast = useToast();
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [cfg, setCfg] = useState<Config | null>(detalhe?.config ?? null);
  const [form, setForm] = useState<ReturnType<typeof vazio> | null>(null);
  const [salvando, setSalvando] = useState(false);

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
        <Card className="border-accent/40">
          <CardBody className="space-y-2 text-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Sugestão automática do app</p>
            {detalhe.sugestao.sugestao ? (
              <>
                <p className="font-semibold">{detalhe.sugestao.sugestao.titulo.replace("Extra sugerido: ", "Abaixo da meta: ")}</p>
                <ul className="space-y-0.5 text-xs text-fg-muted">
                  {detalhe.sugestao.sugestao.grupos.map((g) => (
                    <li key={g.grupo}>{g.rotulo}: {String(g.feito).replace(".", ",")} de {g.meta} séries nos últimos 7 dias (faltam {String(g.falta).replace(".", ",")})</li>
                  ))}
                </ul>
                <ul className="space-y-0.5">
                  {detalhe.sugestao.sugestao.exercicios.map((x) => (
                    <li key={x.nome}>• <strong>{x.nome}</strong> — {x.series} × {x.reps}</li>
                  ))}
                </ul>
                <p className="text-xs text-fg-muted">≈ {detalhe.sugestao.sugestao.duracaoMin} min · {detalhe.sugestao.sugestao.seriesTotal} séries · respeita 48 h de recuperação e o limite de séries extras da semana.</p>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => {
                    const s = detalhe.sugestao.sugestao!;
                    void enviar(`/api/alunos/${detalhe.alunoId}/extras`, "POST", { modalidade: "resistido", titulo: s.titulo, descricao: s.descricao, duracao_min: s.duracaoMin, treino_id: null, grupos: s.grupos.map((g) => g.grupo), series_estimadas: s.seriesTotal }, "Sugestão liberada como treino extra.");
                  }}
                  className="touch rounded-lg bg-accent px-4 py-2 font-bold text-bg disabled:opacity-60"
                >
                  Liberar como treino extra
                </button>
                <p className="text-[11px] text-fg-subtle">Depois de liberada, ela segue as mesmas regras dos outros extras (cansaço, dor, dias, limite). Desative quando não fizer mais sentido.</p>
              </>
            ) : (
              <p className="text-fg-muted">{detalhe.sugestao.motivo}</p>
            )}
          </CardBody>
        </Card>
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
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={cfg.requer_aprovacao} onChange={(e) => setCfg({ ...cfg, requer_aprovacao: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
                Exigir minha aprovação em todo extra
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-0.5">
                  <span className="block text-[11px] text-fg-muted">Máximo por semana</span>
                  <input inputMode="numeric" value={cfg.max_por_semana} onChange={(e) => setCfg({ ...cfg, max_por_semana: Math.min(7, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={`${inp} w-full`} />
                </label>
                <label className="space-y-0.5">
                  <span className="block text-[11px] text-fg-muted">Séries extras/semana (resistido)</span>
                  <input inputMode="numeric" value={cfg.limite_series_semana} onChange={(e) => setCfg({ ...cfg, limite_series_semana: Math.min(60, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={`${inp} w-full`} />
                </label>
                <label className="col-span-2 space-y-0.5">
                  <span className="block text-[11px] text-fg-muted">Intervalo mínimo desde o último treino para extra intenso sem aprovação (horas)</span>
                  <input inputMode="numeric" value={cfg.intervalo_min_horas} onChange={(e) => setCfg({ ...cfg, intervalo_min_horas: Math.min(72, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={`${inp} w-24`} />
                </label>
              </div>
              <fieldset className="space-y-1">
                <legend className="text-[11px] text-fg-muted">Dias permitidos</legend>
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
              <p className="text-[11px] text-fg-subtle">Sempre bloqueados pelo app: dor ou desconforto relatado, mesmo grupo muscular treinado há menos de 48 h (extra intenso), limite da semana atingido. Sem resposta de recuperação, extra intenso vira pedido para você.</p>
              <button type="button" disabled={salvando} onClick={() => void enviar(`/api/alunos/${detalhe.alunoId}/extras`, "PUT", cfg, "Regras salvas.")} className="touch rounded-lg bg-accent px-4 py-2 font-bold text-bg disabled:opacity-60">
                Salvar regras
              </button>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Extras liberados</h2>
                {!form ? (
                  <button type="button" onClick={() => setForm(vazio())} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
                    + Novo extra
                  </button>
                ) : null}
              </div>
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
                      </span>
                      <span className="flex gap-3 text-xs">
                        <button type="button" onClick={() => setForm({ id: x.id, modalidade: x.modalidade, titulo: x.titulo, descricao: x.descricao ?? "", duracao_min: x.duracao_min, treino_id: x.treino_id, grupos: x.grupos, series_estimadas: x.series_estimadas })} className="alvo text-accent underline-offset-2 hover:underline">
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
