"use client";

import { useMemo, useState } from "react";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { useToast } from "@/components/ui/Toast";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { VideoThumb } from "@/components/ui/VideoThumb";
import type {
  ExercicioBiblioteca,
  TemplateTreino,
  TemplateTreinoExercicio,
  TemplateTreinoEstrutura,
} from "@/lib/supabase/types-extended";

type ClientProps = {
  templates: TemplateTreino[];
  biblioteca: ExercicioBiblioteca[];
};

type Modo = { tipo: "lista" } | { tipo: "criar" } | { tipo: "editar"; template: TemplateTreino } | { tipo: "ver"; template: TemplateTreino };

function criarCopiaLocal(t: TemplateTreino): TemplateTreino {
  const agora = new Date().toISOString();
  return {
    ...t,
    id: `tpl-${Date.now()}`,
    nome: `${t.nome} (cópia)`,
    uso_count: 0,
    created_at: agora,
    updated_at: agora,
  };
}

export function TemplatesClient({ templates: inicial, biblioteca }: ClientProps) {
  const toast = useToast();
  const [templates, setTemplates] = useState<TemplateTreino[]>(inicial);
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<Modo>({ tipo: "lista" });

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.nome.toLowerCase().includes(q) ||
        t.publico_alvo?.toLowerCase().includes(q) ||
        t.descricao?.toLowerCase().includes(q)
    );
  }, [templates, busca]);

  function handleCriar(novo: TemplateTreino) {
    setTemplates((t) => [novo, ...t]);
    setModo({ tipo: "lista" });
  }

  function handleAtualizar(atualizado: TemplateTreino) {
    setTemplates((t) => t.map((x) => (x.id === atualizado.id ? atualizado : x)));
    setModo({ tipo: "lista" });
  }

  async function handleDuplicar(t: TemplateTreino) {
    const payload = {
      nome: `${t.nome} (cópia)`,
      descricao: t.descricao,
      publico_alvo: t.publico_alvo,
      estrutura: t.estrutura,
    };
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const criado: TemplateTreino = await res.json();
        setTemplates((prev) => [criado, ...prev]);
        return;
      }
      const err = await res.json().catch(() => ({}));
      toast.error(`Erro ao duplicar: ${err.error ?? res.status}`);
    } catch {
      toast.error("Sem conexão — cópia salva localmente.");
    }
    // fallback
    setTemplates((prev) => [criarCopiaLocal(t), ...prev]);
  }

  async function handleArquivar(id: string) {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) toast.warn("Erro ao excluir template — removido localmente.");
    } catch {
      toast.error("Sem conexão — template removido localmente.");
    }
    setTemplates((prev) => prev.filter((x) => x.id !== id));
    setModo({ tipo: "lista" });
  }

  if (modo.tipo === "criar") {
    return <TemplateBuilder biblioteca={biblioteca} onCancel={() => setModo({ tipo: "lista" })} onSalvar={handleCriar} />;
  }

  if (modo.tipo === "editar") {
    return (
      <TemplateBuilder
        biblioteca={biblioteca}
        inicial={modo.template}
        onCancel={() => setModo({ tipo: "lista" })}
        onSalvar={handleAtualizar}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar template (nome, público, descrição)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={() => setModo({ tipo: "criar" })}>
          + Novo template
        </Button>
      </div>

      <div className="text-xs text-fg-subtle">
        {filtrados.length} {filtrados.length === 1 ? "template" : "templates"}
        {busca ? ` filtrados (${templates.length} total)` : ""}
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="📋"
              title={busca ? "Nada encontrado" : "Sem templates"}
              description={
                busca
                  ? "Tente outro termo."
                  : "Crie um modelo reutilizável: defina quantos treinos (A/B/C/D/E ou outro), escolha exercícios da biblioteca."
              }
              action={<Button onClick={() => setModo({ tipo: "criar" })}>Criar template</Button>}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtrados.map((t) => {
            const totalEx = Object.values(t.estrutura).reduce(
              (acc, sec) => acc + (sec.exercicios?.length ?? 0),
              0
            );
            return (
              <Card key={t.id} className="hover:border-accent/40 transition-colors">
                <CardBody>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">{t.nome}</div>
                      {t.publico_alvo ? (
                        <div className="text-xs text-fg-subtle mt-0.5">{t.publico_alvo}</div>
                      ) : null}
                    </div>
                    {t.uso_count > 0 ? (
                      <Badge tone="gold">{t.uso_count} {t.uso_count === 1 ? "uso" : "usos"}</Badge>
                    ) : null}
                  </div>
                  {t.descricao ? (
                    <p className="text-sm text-fg-muted mb-3 line-clamp-2">{t.descricao}</p>
                  ) : null}
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    {Object.keys(t.estrutura).map((letra) => (
                      <div
                        key={letra}
                        className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-xs font-black text-accent"
                      >
                        {letra}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-fg-subtle">
                    {t.numero_treinos} {t.numero_treinos === 1 ? "treino" : "treinos"} · {totalEx} {totalEx === 1 ? "exercício" : "exercícios"} no total
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setModo({ tipo: "ver", template: t })}
                    >
                      Ver
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setModo({ tipo: "editar", template: t })}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicar(t)}>
                      Duplicar
                    </Button>
                    <Button variant="primary" size="sm">
                      Clonar p/ aluno
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {modo.tipo === "ver" ? (
        <TemplateView
          template={modo.template}
          onClose={() => setModo({ tipo: "lista" })}
          onEditar={() => setModo({ tipo: "editar", template: modo.template })}
          onDuplicar={() => {
            handleDuplicar(modo.template);
            setModo({ tipo: "lista" });
          }}
          onArquivar={() => handleArquivar(modo.template.id)}
        />
      ) : null}
    </div>
  );
}

// ============================================================================
// BUILDER — criação livre de template
// ============================================================================

type SecaoEstado = { letra: string; nome: string; exercicios: TemplateTreinoExercicio[] };

function TemplateBuilder({
  biblioteca,
  inicial,
  onCancel,
  onSalvar,
}: {
  biblioteca: ExercicioBiblioteca[];
  inicial?: TemplateTreino;
  onCancel: () => void;
  onSalvar: (t: TemplateTreino) => void;
}) {
  const editando = !!inicial;
  const toast = useToast();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [publico, setPublico] = useState(inicial?.publico_alvo ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [secoes, setSecoes] = useState<SecaoEstado[]>(() => {
    if (inicial) {
      return Object.entries(inicial.estrutura).map(([letra, sec]) => ({
        letra,
        nome: sec.nome,
        exercicios: sec.exercicios ?? [],
      }));
    }
    return [
      { letra: "A", nome: "Treino A", exercicios: [] },
      { letra: "B", nome: "Treino B", exercicios: [] },
      { letra: "C", nome: "Treino C", exercicios: [] },
    ];
  });
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);

  function addSecao() {
    const proxima = String.fromCharCode(65 + secoes.length); // A, B, C, D...
    setSecoes((s) => [...s, { letra: proxima, nome: `Treino ${proxima}`, exercicios: [] }]);
  }

  function removerSecao(idx: number) {
    setSecoes((s) => s.filter((_, i) => i !== idx).map((sec, i) => ({
      ...sec,
      letra: String.fromCharCode(65 + i),
      nome: sec.nome.replace(/Treino [A-Z]/, `Treino ${String.fromCharCode(65 + i)}`),
    })));
  }

  function updateSecaoNome(idx: number, novoNome: string) {
    setSecoes((s) => s.map((sec, i) => (i === idx ? { ...sec, nome: novoNome } : sec)));
  }

  function addExercicio(secaoIdx: number, ex: ExercicioBiblioteca) {
    const novo: TemplateTreinoExercicio = {
      biblioteca_id: ex.id,
      nome: ex.nome,
      series: 3,
      reps: "10-12",
      ie: 8,
      descanso_seg: 60,
    };
    setSecoes((s) => s.map((sec, i) => (i === secaoIdx ? { ...sec, exercicios: [...sec.exercicios, novo] } : sec)));
    setPickerOpen(null);
  }

  function removerExercicio(secaoIdx: number, exIdx: number) {
    setSecoes((s) =>
      s.map((sec, i) => (i === secaoIdx ? { ...sec, exercicios: sec.exercicios.filter((_, j) => j !== exIdx) } : sec))
    );
  }

  function updateExercicio(secaoIdx: number, exIdx: number, patch: Partial<TemplateTreinoExercicio>) {
    setSecoes((s) =>
      s.map((sec, i) =>
        i === secaoIdx
          ? { ...sec, exercicios: sec.exercicios.map((e, j) => (j === exIdx ? { ...e, ...patch } : e)) }
          : sec
      )
    );
  }

  async function salvar() {
    if (!nome.trim()) return;
    const estrutura: TemplateTreinoEstrutura = {};
    secoes.forEach((s) => {
      estrutura[s.letra] = { nome: s.nome, exercicios: s.exercicios };
    });
    const payload = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      publico_alvo: publico.trim() || null,
      estrutura,
    };
    try {
      const url = editando ? `/api/templates/${inicial!.id}` : "/api/templates";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const salvo: TemplateTreino = await res.json();
        onSalvar(salvo);
        return;
      }
      const err = await res.json().catch(() => ({}));
      toast.error(`Erro ao salvar template: ${err.error ?? res.status}`);
    } catch {
      toast.error("Sem conexão — template salvo localmente.");
    }
    // fallback local
    const novo: TemplateTreino = {
      id: inicial?.id ?? `tpl-${Date.now()}`,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      publico_alvo: publico.trim() || null,
      numero_treinos: secoes.length,
      estrutura,
      uso_count: inicial?.uso_count ?? 0,
      created_at: inicial?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSalvar(novo);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-fg-muted text-sm hover:text-fg flex items-center gap-1">
          ← Voltar pra lista
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={() => { void salvar(); }} disabled={!nome.trim()}>
            {editando ? "Salvar alterações" : "Salvar template"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editando ? "Editar template" : "Novo template"}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="t-nome">Nome do template *</Label>
            <Input
              id="t-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Hipertrofia Mulher Intermediária"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="t-publico">Público-alvo</Label>
            <Input
              id="t-publico"
              value={publico}
              onChange={(e) => setPublico(e.target.value)}
              placeholder="Ex: Mulher 25-40 anos, 1-3 anos de treino"
            />
          </div>
          <div>
            <Label htmlFor="t-desc">Descrição</Label>
            <textarea
              id="t-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-bg border border-border px-4 py-2 text-sm focus:outline-none focus:border-accent"
              placeholder="Objetivo do treino, frequência semanal sugerida..."
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-fg-muted font-bold">
          Treinos ({secoes.length})
        </h2>
        <Button variant="secondary" size="sm" onClick={addSecao}>+ Adicionar treino</Button>
      </div>

      <div className="space-y-4">
        {secoes.map((sec, idx) => (
          <Card key={sec.letra}>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-xl font-black text-accent shrink-0">
                  {sec.letra}
                </div>
                <Input
                  value={sec.nome}
                  onChange={(e) => updateSecaoNome(idx, e.target.value)}
                  placeholder="Ex: Peito · Tríceps · Abdômen"
                />
                {secoes.length > 1 ? (
                  <button
                    onClick={() => removerSecao(idx)}
                    className="text-fg-subtle hover:text-red px-2 text-sm shrink-0"
                    title="Remover treino"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              {sec.exercicios.length === 0 ? (
                <div className="text-center py-6 text-sm text-fg-subtle border border-dashed border-border rounded-lg">
                  Nenhum exercício neste treino ainda
                </div>
              ) : (
                <ul className="space-y-2">
                  {sec.exercicios.map((ex, exIdx) => {
                    const biblio = biblioteca.find((b) => b.id === ex.biblioteca_id);
                    const source =
                      biblio?.video_provider && biblio?.video_id
                        ? { provider: biblio.video_provider, id: biblio.video_id }
                        : null;
                    return (
                      <li key={exIdx} className="flex items-start gap-3 bg-bg border border-border rounded-lg p-3">
                        <VideoThumb source={source} size="sm" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="font-semibold text-sm">{ex.nome}</div>
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-fg-subtle font-bold mb-0.5">Séries</div>
                              <CampoNumero min={1} max={20} valor={ex.series} onChange={(v) => updateExercicio(idx, exIdx, { series: v })} aria-label="Séries" className="h-8 w-full bg-bg border border-border rounded-md px-2 text-xs text-center font-mono focus:outline-none focus:border-accent" />
                            </div>
                            <Mini
                              label="Reps"
                              value={ex.reps}
                              onChange={(v) => updateExercicio(idx, exIdx, { reps: v })}
                              wide
                            />
                            <Mini
                              label="IE"
                              value={ex.ie?.toString() ?? ""}
                              onChange={(v) =>
                                updateExercicio(idx, exIdx, { ie: v ? Number(v) : null })
                              }
                            />
                            <Mini
                              label="Desc(s)"
                              value={ex.descanso_seg?.toString() ?? ""}
                              onChange={(v) =>
                                updateExercicio(idx, exIdx, { descanso_seg: v ? Number(v) : null })
                              }
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removerExercicio(idx, exIdx)}
                          className="text-fg-subtle hover:text-red px-2 text-xs shrink-0"
                          title="Remover"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Button variant="secondary" size="sm" onClick={() => setPickerOpen(idx)} className="w-full">
                + Adicionar exercício da biblioteca
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      {pickerOpen !== null ? (
        <ExercicioPicker
          biblioteca={biblioteca}
          jaAdicionados={secoes[pickerOpen].exercicios.map((e) => e.biblioteca_id)}
          onClose={() => setPickerOpen(null)}
          onPick={(ex) => addExercicio(pickerOpen, ex)}
        />
      ) : null}
    </div>
  );
}

function Mini({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-fg-subtle font-bold mb-0.5">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-full bg-bg border border-border rounded-md px-2 text-xs text-center font-mono focus:outline-none focus:border-accent ${
          wide ? "" : ""
        }`}
      />
    </div>
  );
}

function ExercicioPicker({
  biblioteca,
  jaAdicionados,
  onClose,
  onPick,
}: {
  biblioteca: ExercicioBiblioteca[];
  jaAdicionados: string[];
  onClose: () => void;
  onPick: (e: ExercicioBiblioteca) => void;
}) {
  const [busca, setBusca] = useState("");
  const filtrados = biblioteca.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
      >
        <CardHeader className="flex items-center justify-between sticky top-0 bg-card z-10">
          <CardTitle>Escolher exercício</CardTitle>
          <button onClick={onClose} className="alvo text-fg-subtle hover:text-fg text-xl">✕</button>
        </CardHeader>
        <CardBody className="space-y-3">
          <Input
            type="search"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          <ul className="space-y-2">
            {filtrados.map((ex) => {
              const ja = jaAdicionados.includes(ex.id);
              const source =
                ex.video_provider && ex.video_id ? { provider: ex.video_provider, id: ex.video_id } : null;
              return (
                <li key={ex.id}>
                  <button
                    onClick={() => !ja && onPick(ex)}
                    disabled={ja}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      ja
                        ? "bg-bg/50 border-border opacity-50 cursor-not-allowed"
                        : "bg-bg border-border hover:border-accent/40 hover:bg-card-hover"
                    }`}
                  >
                    <VideoThumb source={source} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{ex.nome}</div>
                      <div className="text-[11px] text-fg-subtle capitalize">{ex.grupo_muscular}</div>
                    </div>
                    {ja ? <span className="text-xs text-success">✓ adicionado</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL VIEW — detalhes do template
// ============================================================================
function TemplateView({
  template,
  onClose,
  onEditar,
  onDuplicar,
  onArquivar,
}: {
  template: TemplateTreino;
  onClose: () => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onArquivar: () => void;
}) {
  const totalEx = Object.values(template.estrutura).reduce(
    (acc, sec) => acc + (sec.exercicios?.length ?? 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <CardHeader className="flex items-center justify-between sticky top-0 bg-card z-10 border-b border-border">
          <div className="flex-1 min-w-0">
            <CardTitle>{template.nome}</CardTitle>
            {template.publico_alvo ? (
              <p className="text-xs text-fg-subtle mt-1">{template.publico_alvo}</p>
            ) : null}
          </div>
          <button onClick={onClose} className="alvo text-fg-subtle hover:text-fg text-xl shrink-0 ml-3">
            ✕
          </button>
        </CardHeader>
        <CardBody className="space-y-5">
          {template.descricao ? (
            <p className="text-sm text-fg-muted">{template.descricao}</p>
          ) : null}

          <div className="flex items-center gap-2 flex-wrap text-xs text-fg-subtle">
            <Badge tone="accent">{template.numero_treinos} {template.numero_treinos === 1 ? "treino" : "treinos"}</Badge>
            <Badge>{totalEx} {totalEx === 1 ? "exercício" : "exercícios"}</Badge>
            {template.uso_count > 0 ? <Badge tone="gold">{template.uso_count} {template.uso_count === 1 ? "uso" : "usos"}</Badge> : null}
          </div>

          <div className="space-y-3">
            {Object.entries(template.estrutura).map(([letra, sec]) => (
              <div key={letra} className="bg-bg border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-lg font-black text-accent">
                    {letra}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{sec.nome}</div>
                    <div className="text-[11px] text-fg-subtle">
                      {sec.exercicios?.length ?? 0} {(sec.exercicios?.length ?? 0) === 1 ? "exercício" : "exercícios"}
                    </div>
                  </div>
                </div>
                {sec.exercicios && sec.exercicios.length > 0 ? (
                  <ul className="space-y-1.5">
                    {sec.exercicios.map((e, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-xs text-fg-muted bg-card/40 rounded-md px-2 py-1.5"
                      >
                        <span className="font-mono text-fg-subtle w-5">{i + 1}.</span>
                        <span className="flex-1 text-fg">{e.nome}</span>
                        <span className="font-mono text-fg-subtle">
                          {e.series}×{e.reps}
                          {e.ie ? ` @${e.ie}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-fg-subtle italic">Sem exercícios neste treino</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 sticky bottom-0 bg-card -mx-6 px-6 pb-2 pt-3 border-t border-border">
            <Button variant="ghost" onClick={onArquivar}>
              Arquivar
            </Button>
            <Button variant="ghost" onClick={onDuplicar}>
              Duplicar
            </Button>
            <Button variant="secondary" onClick={onEditar}>
              Editar
            </Button>
            <Button variant="primary">Clonar p/ aluno</Button>
          </div>
        </CardBody>
      </div>
    </div>
  );
}
