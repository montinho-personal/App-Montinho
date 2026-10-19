"use client";

import { useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { buscarSemelhantes } from "@/lib/memoria/similaridade";
import { GRUPO_LABEL } from "@/lib/grupos";
import { dataBR } from "@/lib/format";
import type { BibliotecaPrograma } from "@/lib/supabase/types-sessoes";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export function MemoriaClient({ acervoInicial }: { acervoInicial: BibliotecaPrograma[] }) {
  const toast = useToast();
  const [acervo, setAcervo] = useState(acervoInicial);
  const [q, setQ] = useState("");
  const [dias, setDias] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [nivel, setNivel] = useState("");
  const [somenteFav, setSomenteFav] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");

  const temCriterio = q.trim() || dias || objetivo || nivel || somenteFav;
  const lista = useMemo(() => {
    if (!temCriterio) return acervo.map((item) => ({ item, similaridade: null as number | null, motivos: [] as string[], alertas: [] as string[] }));
    return buscarSemelhantes(acervo, { texto: q || null, dias: dias ? Number(dias) : null, objetivo: objetivo || null, nivel: nivel || null, somenteFavoritos: somenteFav }, undefined, 50);
  }, [acervo, q, dias, objetivo, nivel, somenteFav, temCriterio]);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/memoria/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return toast.error("Falha ao atualizar");
    const m = (await res.json()) as BibliotecaPrograma;
    setAcervo((cur) => cur.map((x) => (x.id === id ? m : x)));
  }
  async function excluir(id: string) {
    if (!confirm("Remover este exemplo do acervo? O histórico do aluno de origem continua intacto.")) return;
    const res = await fetch(`/api/memoria/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Falha ao excluir");
    setAcervo((cur) => cur.filter((x) => x.id !== id));
    toast.success("Removido do acervo.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-[220px] space-y-1 text-xs text-fg-muted">
            Busca em português
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='ex.: "4 dias, glúteos, upper/lower, academia"' className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg" />
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            Dias
            <select value={dias} onChange={(e) => setDias(e.target.value)} className="h-10 rounded-md border border-border bg-bg px-2 text-sm text-fg block">
              <option value="">—</option>
              {[2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            Objetivo
            <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="h-10 rounded-md border border-border bg-bg px-2 text-sm text-fg block">
              <option value="">—</option>
              <option value="hipertrofia">Hipertrofia</option>
              <option value="forca">Força</option>
              <option value="emagrecimento">Emagrecimento</option>
              <option value="condicionamento">Condicionamento</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            Nível
            <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="h-10 rounded-md border border-border bg-bg px-2 text-sm text-fg block">
              <option value="">—</option>
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted h-10">
            <input type="checkbox" checked={somenteFav} onChange={(e) => setSomenteFav(e.target.checked)} /> só favoritos
          </label>
        </CardBody>
      </Card>

      <p className="text-xs text-fg-subtle">
        {lista.length} de {acervo.length} programa(s){temCriterio ? " · ordenados por similaridade explicada" : " · mais recentes primeiro"}
      </p>

      {lista.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="text-center py-10 text-sm text-fg-muted">{acervo.length === 0 ? "Acervo vazio. Salve um plano no montador e ele aparece aqui, sem dados do aluno." : "Nada compatível com esses critérios."}</CardBody>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {lista.map(({ item, similaridade, motivos, alertas }) => (
            <li key={item.id}>
              <Card className={item.favorito ? "border-accent/40" : ""}>
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{item.nome}</p>
                      <p className="text-xs text-fg-muted">{item.resumo}</p>
                      <p className="text-[11px] text-fg-subtle mt-1">
                        {item.status} · usado {item.uso_count}× · {dataBR(item.updated_at)} · 👍 {item.feedback?.util ?? 0} · 👎 {item.feedback?.nao_util ?? 0} · adaptado {item.feedback?.usei_adaptei ?? 0}×
                      </p>
                      {similaridade !== null ? <p className="text-[11px] text-accent mt-0.5">{similaridade}% — {motivos.join(" · ")}</p> : null}
                      {alertas.length ? <p className="text-[11px] text-warning">{alertas.join(" · ")}</p> : null}
                    </div>
                    <button type="button" onClick={() => void patch(item.id, { favorito: !item.favorito })} className={`touch shrink-0 ${item.favorito ? "text-accent" : "text-fg-subtle hover:text-fg"}`} aria-pressed={item.favorito} aria-label="Favoritar">
                      <Icon name="star" size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((t) => (
                      <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-fg-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                  {item.justificativa ? <p className="text-xs text-fg-muted border-l-2 border-accent/50 pl-2">{item.justificativa}</p> : null}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <button type="button" onClick={() => setAberto(aberto === item.id ? null : item.id)} className="rounded-md border border-border px-2 py-1 text-fg-muted hover:text-fg">
                      {aberto === item.id ? "Ocultar" : "Ver estrutura"}
                    </button>
                    <button type="button" onClick={() => { setEditando(editando === item.id ? null : item.id); setJustificativa(item.justificativa ?? ""); }} className="rounded-md border border-border px-2 py-1 text-fg-muted hover:text-fg">
                      Justificativa
                    </button>
                    <button type="button" onClick={() => void patch(item.id, { feedback: "util" })} className="rounded-md border border-border px-2 py-1 text-fg-muted hover:text-success">
                      Útil
                    </button>
                    <button type="button" onClick={() => void patch(item.id, { feedback: "nao_util" })} className="rounded-md border border-border px-2 py-1 text-fg-muted hover:text-danger">
                      Não útil
                    </button>
                    <button type="button" onClick={() => void excluir(item.id)} className="ml-auto rounded-md border border-red/30 px-2 py-1 text-red">
                      Excluir do acervo
                    </button>
                  </div>
                  {editando === item.id ? (
                    <div className="space-y-2">
                      <textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={2} maxLength={500} className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm" placeholder="Por que esse programa funciona bem / quando usar" />
                      <Button size="sm" onClick={() => { void patch(item.id, { justificativa: justificativa || null }); setEditando(null); }}>
                        Salvar justificativa
                      </Button>
                    </div>
                  ) : null}
                  {aberto === item.id ? (
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      {item.estrutura.treinos.map((t) => (
                        <div key={t.letra} className="rounded-md border border-border p-2">
                          <p className="font-bold">
                            {t.letra} · {t.nome}
                          </p>
                          <ul className="mt-1 space-y-0.5 text-fg-muted">
                            {t.exercicios.map((e) => (
                              <li key={e.id}>
                                {e.nome} — {e.series}×{e.reps}
                                {e.grupo_muscular ? ` · ${GRUPO_LABEL[e.grupo_muscular as GrupoMuscular]}` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      <p className="sm:col-span-2 text-[11px] text-fg-subtle">Para aplicar em um aluno: abra o montador dele e use “Já montei algo parecido?”.</p>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
