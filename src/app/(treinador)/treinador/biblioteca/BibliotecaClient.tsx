"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { VideoThumb } from "@/components/ui/VideoThumb";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Equipamento, ExercicioBiblioteca, GrupoMuscular } from "@/lib/supabase/types-extended";
import { parseVideoSource } from "@/lib/video";

const GRUPOS: Array<{ key: GrupoMuscular | "todos"; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "peito", label: "Peito" },
  { key: "costas", label: "Costas" },
  { key: "pernas", label: "Pernas" },
  { key: "gluteo", label: "Glúteo" },
  { key: "ombros", label: "Ombros" },
  { key: "biceps", label: "Bíceps" },
  { key: "triceps", label: "Tríceps" },
  { key: "core", label: "Core" },
  { key: "abdomen", label: "Abdômen" },
  { key: "panturrilha", label: "Panturrilha" },
  { key: "cardio", label: "Cardio" },
];

const GRUPOS_FORM = GRUPOS.filter((g) => g.key !== "todos") as Array<{ key: GrupoMuscular; label: string }>;

export function BibliotecaClient({ inicial }: { inicial: ExercicioBiblioteca[] }) {
  const toast = useToast();
  const [itens, setItens] = useState<ExercicioBiblioteca[]>(inicial);
  const [grupo, setGrupo] = useState<GrupoMuscular | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [modal, setModal] = useState<
    | "fechado"
    | "criar"
    | { ver: ExercicioBiblioteca }
    | { editar: ExercicioBiblioteca }
  >("fechado");

  const filtrados = useMemo(() => {
    return itens.filter((e) => {
      if (grupo !== "todos" && e.grupo_muscular !== grupo) return false;
      if (busca && !e.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [itens, grupo, busca]);

  async function handleCriar(novo: ExercicioBiblioteca) {
    try {
      const res = await fetch("/api/biblioteca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novo),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Erro ao salvar exercício: ${err.error ?? res.status}`);
        setItens((prev) => [novo, ...prev]);
      } else {
        const salvo = await res.json();
        setItens((prev) => [salvo, ...prev]);
      }
    } catch {
      toast.error("Sem conexão — exercício salvo localmente.");
      setItens((prev) => [novo, ...prev]);
    }
    setModal("fechado");
  }

  async function importarVideos() {
    setImporting(true);
    try {
      const res = await fetch("/api/importacoes/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: importText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao importar vídeos");
      const updates = (data.updates ?? []) as Array<{ nome: string; id: string | null; count: number }>;
      setItens((prev) =>
        prev.map((item) => {
          const update = updates.find((u) => u.nome.toLowerCase() === item.nome.toLowerCase() && u.id);
          return update
            ? {
                ...item,
                video_provider: "youtube",
                video_id: update.id,
                thumbnail_url: `https://i.ytimg.com/vi/${update.id}/hqdefault.jpg`,
              }
            : item;
        })
      );
      const afetados = updates.reduce((acc, update) => acc + update.count, 0);
      toast.success(`${afetados} exercícios atualizados com vídeo.`);
      setImportOpen(false);
      setImportText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar vídeos");
    } finally {
      setImporting(false);
    }
  }

  async function handleAtualizar(atualizado: ExercicioBiblioteca) {
    try {
      const res = await fetch(`/api/biblioteca/${atualizado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(atualizado),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Erro ao atualizar: ${err.error ?? res.status}`);
        setItens((prev) => prev.map((x) => (x.id === atualizado.id ? atualizado : x)));
      } else {
        const salvo = await res.json();
        setItens((prev) => prev.map((x) => (x.id === salvo.id ? salvo : x)));
      }
    } catch {
      toast.error("Sem conexão — alteração salva localmente.");
      setItens((prev) => prev.map((x) => (x.id === atualizado.id ? atualizado : x)));
    }
    setModal("fechado");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar exercício..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={() => setModal("criar")}>
          + Novo exercício
        </Button>
        <Button variant="secondary" onClick={() => setImportOpen((value) => !value)}>
          Importar vídeos
        </Button>
      </div>

      {importOpen ? (
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle>Importação de vídeos</CardTitle>
            <p className="text-xs text-fg-muted">
              Cole linhas no formato: nome do exercício; link do YouTube.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Supino reto barra; https://youtu.be/...\nAgachamento livre; https://youtube.com/watch?v=..."}
              className="min-h-36 w-full rounded-lg border border-border bg-bg px-4 py-3 font-mono text-sm text-fg focus:border-accent focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setImportOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={importarVideos} loading={importing}>
                Processar vídeos
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 overflow-x-auto">
        {GRUPOS.map((g) => {
          const ativo = grupo === g.key;
          const count = g.key === "todos" ? itens.length : itens.filter((e) => e.grupo_muscular === g.key).length;
          return (
            <button
              key={g.key}
              onClick={() => setGrupo(g.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                ativo ? "bg-accent text-fg" : "text-fg-muted hover:text-fg"
              }`}
            >
              {g.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="📚"
              title="Nenhum exercício"
              description={busca ? "Tente outro termo." : "Crie seu primeiro exercício e cole o link do YouTube."}
              action={<Button onClick={() => setModal("criar")}>+ Novo exercício</Button>}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.map((e) => {
            const source =
              e.video_provider && e.video_id ? { provider: e.video_provider, id: e.video_id } : null;
            return (
              <button
                key={e.id}
                onClick={() => setModal({ ver: e })}
                className="text-left"
              >
                <Card className="hover:border-accent/40 transition-colors h-full">
                  <CardBody className="flex items-start gap-3">
                    <VideoThumb source={source} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{e.nome}</div>
                      <div className="text-[11px] text-fg-subtle mt-0.5 capitalize">
                        {e.grupo_muscular}
                        {e.equipamento.length > 0 ? ` · ${e.equipamento[0]}` : ""}
                      </div>
                      {e.dificuldade ? (
                        <div className="text-[10px] mt-1.5">
                          {"●".repeat(e.dificuldade)}
                          <span className="opacity-30">{"●".repeat(5 - e.dificuldade)}</span>
                        </div>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {modal === "criar" ? (
        <ExercicioForm onCancel={() => setModal("fechado")} onSalvar={handleCriar} />
      ) : null}

      {typeof modal === "object" && "editar" in modal ? (
        <ExercicioForm
          inicial={modal.editar}
          onCancel={() => setModal("fechado")}
          onSalvar={handleAtualizar}
        />
      ) : null}

      {typeof modal === "object" && "ver" in modal ? (
        <ExercicioVer
          exercicio={modal.ver}
          onClose={() => setModal("fechado")}
          onEditar={(ex) => setModal({ editar: ex })}
          onArquivar={async (id) => {
            try {
              const res = await fetch(`/api/biblioteca/${id}`, { method: "DELETE" });
              if (!res.ok) toast.warn("Erro ao arquivar — lista atualizada localmente.");
            } catch {
              toast.error("Sem conexão — arquivamento salvo localmente.");
            }
            setItens((prev) => prev.map((x) => (x.id === id ? { ...x, arquivado: true } : x)));
            setModal("fechado");
          }}
        />
      ) : null}
    </div>
  );
}

// ============================================================================
// Modal de criação / edição
// ============================================================================
const EQUIPAMENTOS: Equipamento[] = [
  "barra", "halter", "maquina", "polia", "peso_corporal",
  "cabo", "kettlebell", "elastico", "esteira", "bike",
  "corda", "banco", "smith",
];

function ExercicioForm({
  inicial,
  onCancel,
  onSalvar,
}: {
  inicial?: ExercicioBiblioteca;
  onCancel: () => void;
  onSalvar: (e: ExercicioBiblioteca) => void;
}) {
  const editando = !!inicial;
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [grupo, setGrupo] = useState<GrupoMuscular>(inicial?.grupo_muscular ?? "peito");
  const [videoUrl, setVideoUrl] = useState(
    inicial?.video_id ? inicial.video_id : ""
  );
  const [dificuldade, setDificuldade] = useState(inicial?.dificuldade ?? 3);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? "");
  const [instrucoes, setInstrucoes] = useState<string[]>(
    inicial?.instrucoes && inicial.instrucoes.length > 0 ? inicial.instrucoes : [""]
  );
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>(inicial?.equipamento ?? []);
  const [salvando, setSalvando] = useState(false);

  const source = parseVideoSource(videoUrl);
  const videoOk = videoUrl === "" || source !== null;

  function toggleEquipamento(eq: Equipamento) {
    setEquipamentos((prev) =>
      prev.includes(eq) ? prev.filter((x) => x !== eq) : [...prev, eq]
    );
  }

  function updateInstrucao(i: number, valor: string) {
    setInstrucoes((s) => s.map((v, idx) => (idx === i ? valor : v)));
  }

  function addInstrucao() {
    setInstrucoes((s) => [...s, ""]);
  }

  function removerInstrucao(i: number) {
    setInstrucoes((s) => s.filter((_, idx) => idx !== i));
  }

  function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    const instrucoesLimpas = instrucoes.map((i) => i.trim()).filter(Boolean);
    const novo: ExercicioBiblioteca = {
      id: inicial?.id ?? `ex-bib-${Date.now()}`,
      nome: nome.trim(),
      slug:
        inicial?.slug ??
        nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      grupo_muscular: grupo,
      grupos_secundarios: inicial?.grupos_secundarios ?? [],
      equipamento: equipamentos,
      video_provider: source?.provider ?? null,
      video_id: source?.id ?? null,
      thumbnail_url: inicial?.thumbnail_url ?? null,
      duracao_seg: inicial?.duracao_seg ?? null,
      descricao: descricao.trim() || null,
      instrucoes: instrucoesLimpas,
      observacoes: observacoes.trim() || null,
      dificuldade,
      arquivado: inicial?.arquivado ?? false,
      created_at: inicial?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSalvar(novo);
    setSalvando(false);
  }

  return (
    <Modal onClose={onCancel} title={editando ? "Editar exercício" : "Novo exercício"}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="nome">Nome do exercício *</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Supino reto barra"
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="grupo">Grupo muscular</Label>
          <select
            id="grupo"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value as GrupoMuscular)}
            className="h-11 w-full rounded-lg bg-bg border border-border px-4 text-sm capitalize focus:outline-none focus:border-accent"
          >
            {GRUPOS_FORM.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="video">Link do vídeo</Label>
          <Input
            id="video"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Cole URL do YouTube, Cloudflare Stream ou ID"
          />
          <FieldHint error={videoUrl !== "" && !videoOk}>
            {videoUrl === ""
              ? "Aceita: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/..., ou ID puro"
              : videoOk
                ? `✓ Detectado: ${source?.provider}`
                : "URL não reconhecida"}
          </FieldHint>
        </div>

        {source ? (
          <div>
            <Label>Preview</Label>
            <VideoPlayer source={source} lazy />
          </div>
        ) : null}

        <div>
          <Label htmlFor="dif">Dificuldade</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDificuldade(n)}
                className={`flex-1 h-10 rounded-md font-bold text-sm transition-colors ${
                  dificuldade === n
                    ? "bg-accent text-fg"
                    : "bg-card border border-border text-fg-muted hover:border-accent/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="desc">Descrição</Label>
          <textarea
            id="desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-bg border border-border px-4 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent"
            placeholder="Resumo do exercício, função muscular, padrão de movimento..."
          />
        </div>

        <div>
          <Label>Instruções passo a passo</Label>
          <div className="space-y-2">
            {instrucoes.map((inst, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-7 h-9 flex items-center justify-center bg-card border border-border rounded-md text-xs font-mono text-fg-muted shrink-0">
                  {i + 1}
                </div>
                <input
                  value={inst}
                  onChange={(e) => updateInstrucao(i, e.target.value)}
                  placeholder="Ex: Mantenha as escápulas retraídas durante todo o movimento"
                  className="flex-1 h-9 bg-bg border border-border rounded-md px-3 text-sm focus:outline-none focus:border-accent"
                />
                {instrucoes.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removerInstrucao(i)}
                    className="w-9 h-9 text-fg-subtle hover:text-red"
                    title="Remover"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={addInstrucao}
              className="text-xs text-accent hover:underline font-semibold mt-1"
            >
              + Adicionar passo
            </button>
          </div>
        </div>

        <div>
          <Label>Equipamento</Label>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPAMENTOS.map((eq) => {
              const ativo = equipamentos.includes(eq);
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => toggleEquipamento(eq)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                    ativo
                      ? "bg-accent text-fg"
                      : "bg-card border border-border text-fg-muted hover:border-accent/40"
                  }`}
                >
                  {eq.replace("_", " ")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="obs">Observações / cuidados (opcional)</Label>
          <textarea
            id="obs"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-bg border border-border px-4 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent"
            placeholder="Ex: Evitar se houver dor no ombro. Não passar do paralelo na descida."
          />
        </div>

        <div className="flex gap-2 pt-2 sticky bottom-0 bg-card -mx-6 px-6 pb-2 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={salvar}
            disabled={!nome.trim() || !videoOk}
            loading={salvando}
            className="flex-1"
          >
            {editando ? "Salvar alterações" : "Criar exercício"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Modal de visualização
// ============================================================================
function ExercicioVer({
  exercicio,
  onClose,
  onEditar,
  onArquivar,
}: {
  exercicio: ExercicioBiblioteca;
  onClose: () => void;
  onEditar: (e: ExercicioBiblioteca) => void;
  onArquivar: (id: string) => void;
}) {
  const source =
    exercicio.video_provider && exercicio.video_id
      ? { provider: exercicio.video_provider, id: exercicio.video_id }
      : null;

  return (
    <Modal onClose={onClose} title={exercicio.nome}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge tone="accent" className="capitalize">{exercicio.grupo_muscular}</Badge>
          {exercicio.dificuldade ? (
            <span className="text-xs text-fg-muted">
              {"●".repeat(exercicio.dificuldade)}
              <span className="opacity-30">{"●".repeat(5 - exercicio.dificuldade)}</span>
            </span>
          ) : null}
        </div>

        {source ? <VideoPlayer source={source} lazy /> : (
          <Card className="border-dashed">
            <CardBody className="text-center py-8 text-sm text-fg-subtle">
              Sem vídeo configurado
            </CardBody>
          </Card>
        )}

        {exercicio.descricao ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-bold mb-1.5">
              Descrição
            </div>
            <p className="text-sm text-fg-muted">{exercicio.descricao}</p>
          </div>
        ) : null}

        {exercicio.instrucoes.length > 0 ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-bold mb-1.5">
              Passo a passo
            </div>
            <ol className="text-sm space-y-1.5">
              {exercicio.instrucoes.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-accent font-bold shrink-0">{i + 1}.</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {exercicio.equipamento.length > 0 ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-bold mb-1.5">
              Equipamento
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {exercicio.equipamento.map((e) => (
                <Badge key={e}>{e.replace("_", " ")}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        {exercicio.observacoes ? (
          <div className="border-l-2 border-gold/40 bg-gold/5 pl-3 py-2 rounded-r-md">
            <div className="text-[10px] uppercase tracking-wider text-gold font-bold mb-1">
              ⚠ Cuidados
            </div>
            <p className="text-sm text-fg-muted">{exercicio.observacoes}</p>
          </div>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button variant="ghost" onClick={() => onArquivar(exercicio.id)}>
            Arquivar
          </Button>
          <Button variant="primary" onClick={() => onEditar(exercicio)}>
            Editar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Modal genérico (sem dep externa)
// ============================================================================
function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <CardHeader className="flex items-center justify-between sticky top-0 bg-card z-10">
          <CardTitle>{title}</CardTitle>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg text-xl">
            ✕
          </button>
        </CardHeader>
        <CardBody>{children}</CardBody>
      </div>
    </div>
  );
}
