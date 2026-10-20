"use client";

// ============================================================================
// Biblioteca de exercícios (painel do treinador).
//  • Busca instantânea por nome, parte do nome, sinônimo, grupo, equipamento
//    ou padrão de movimento, com filtros e favoritos.
//  • Ficha completa: músculos (com o peso usado no volume ponderado), padrão,
//    articulações, execução, erros comuns, campos de registro, estresse
//    articular, uso real nas suas prescrições e mídia (com pendência).
//  • Substituições: o personal aprova ou rejeita cada sugestão.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { GRUPO_COR, GRUPO_LABEL } from "@/lib/grupos";
import { buscarExercicios, type FiltrosBusca } from "@/lib/biblioteca/busca";
import { sugerirSubstituicoes, ORIGEM_SUGESTAO_LABEL } from "@/lib/biblioteca/substituicao";
import {
  ARTICULACAO_LABEL,
  CAMPO_REGISTRO_LABEL,
  EQUIPAMENTO_LABEL,
  NIVEL_LABEL,
  PADRAO_LABEL,
  REGIAO_ESTRESSE_LABEL,
  type Equivalencia,
  type ItemBiblioteca,
  type PadraoMovimento,
  type StatusEquivalencia,
} from "@/lib/biblioteca/tipos";
import type { UsoExercicio } from "@/lib/data/biblioteca";
import type { Equipamento, GrupoMuscular } from "@/lib/supabase/types-extended";
import { FormExercicio } from "./FormExercicio";

type Props = {
  inicial: ItemBiblioteca[];
  equivalenciasIniciais: Equivalencia[];
  favoritosIniciais: string[];
  uso: Record<string, UsoExercicio>;
};

const GRUPOS_FILTRO: GrupoMuscular[] = [
  "peito", "costas", "ombro_anterior", "ombro_lateral", "ombro_posterior", "trapezio", "biceps", "triceps", "antebraco",
  "quadriceps", "posteriores", "gluteo", "adutores", "panturrilha", "abdomen", "core", "lombar",
];

export function BibliotecaClient({ inicial, equivalenciasIniciais, favoritosIniciais, uso }: Props) {
  const toast = useToast();
  const [itens, setItens] = useState(inicial);
  const [equivalencias, setEquivalencias] = useState(equivalenciasIniciais);
  const [favoritos, setFavoritos] = useState(() => new Set(favoritosIniciais));
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<FiltrosBusca>({});
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [form, setForm] = useState<"fechado" | "novo" | ItemBiblioteca>("fechado");
  const fichaRef = useRef<HTMLElement>(null);
  const listaRef = useRef<HTMLElement>(null);

  // Celular/tablet: a ficha fica abaixo da lista; ao abrir um exercício (ou o
  // formulário), rola até ela para o treinador não precisar procurar.
  useEffect(() => {
    if (!selecionadoId && form === "fechado") return;
    if (typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches) return;
    fichaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selecionadoId, form]);

  const voltarParaLista = () => listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const usoMap = useMemo(() => new Map(Object.entries(uso).map(([id, u]) => [id, u.vezes])), [uso]);
  const resultados = useMemo(() => buscarExercicios(itens, busca, filtros, { favoritos, uso: usoMap }), [itens, busca, filtros, favoritos, usoMap]);
  const selecionado = itens.find((i) => i.id === selecionadoId) ?? null;
  const setFiltro = (p: Partial<FiltrosBusca>) => setFiltros((f) => ({ ...f, ...p }));
  const filtrosAtivos = Object.values(filtros).filter(Boolean).length;

  async function alternarFavorito(id: string) {
    const novo = !favoritos.has(id);
    setFavoritos((s) => {
      const n = new Set(s);
      if (novo) n.add(id);
      else n.delete(id);
      return n;
    });
    const res = await fetch("/api/biblioteca/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exercicio_id: id, favorito: novo }) }).catch(() => null);
    if (!res?.ok) {
      toast.error("Não foi possível salvar o favorito.");
      setFavoritos((s) => {
        const n = new Set(s);
        if (novo) n.delete(id);
        else n.add(id);
        return n;
      });
    }
  }

  async function revisar(exercicioId: string, alternativaId: string, status: StatusEquivalencia) {
    const anterior = equivalencias;
    setEquivalencias((lista) => {
      const i = lista.findIndex((e) => e.exercicioId === exercicioId && e.alternativaId === alternativaId);
      if (i < 0) return [...lista, { exercicioId, alternativaId, origem: "treinador", status, nota: null }];
      const copia = [...lista];
      copia[i] = { ...copia[i], status };
      return copia;
    });
    const res = await fetch("/api/biblioteca/equivalencias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exercicio_id: exercicioId, alternativa_id: alternativaId, status }) }).catch(() => null);
    if (!res?.ok) {
      toast.error("Não foi possível salvar a revisão.");
      setEquivalencias(anterior);
    } else toast.success(status === "aprovada" ? "Substituição aprovada." : status === "rejeitada" ? "Substituição rejeitada: não será mais sugerida." : "Revisão desfeita.");
  }

  function aoSalvar(item: ItemBiblioteca) {
    setItens((lista) => {
      const i = lista.findIndex((x) => x.id === item.id);
      if (i < 0) return [...lista, item].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      const copia = [...lista];
      copia[i] = item;
      return copia;
    });
    setSelecionadoId(item.id);
    setForm("fechado");
  }

  async function arquivar(item: ItemBiblioteca) {
    if (!confirm(`Arquivar “${item.nome}”? Treinos que já usam o exercício não mudam.`)) return;
    const res = await fetch(`/api/biblioteca/${item.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast.error("Não foi possível arquivar.");
    setItens((l) => l.filter((x) => x.id !== item.id));
    setSelecionadoId(null);
    toast.success("Exercício arquivado.");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Coluna da lista ------------------------------------------------------ */}
      <section ref={listaRef} className="space-y-3 min-w-0 scroll-mt-20" aria-label="Lista de exercícios">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <Input type="search" aria-label="Buscar exercício" placeholder="Nome, sinônimo, músculo, equipamento… (ex.: pulley, rosca scott, leg)" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" autoFocus />
          </div>
          <Button variant="primary" onClick={() => setForm("novo")}>
            <Icon name="plus" /> Novo
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs" role="group" aria-label="Filtros">
          <select aria-label="Grupo muscular" value={filtros.grupo ?? ""} onChange={(e) => setFiltro({ grupo: (e.target.value || null) as GrupoMuscular | null })} className="h-9 rounded-md border border-border bg-bg px-2">
            <option value="">Todos os músculos</option>
            {GRUPOS_FILTRO.map((g) => (
              <option key={g} value={g}>{GRUPO_LABEL[g]}</option>
            ))}
          </select>
          <select aria-label="Equipamento" value={filtros.equipamento ?? ""} onChange={(e) => setFiltro({ equipamento: (e.target.value || null) as Equipamento | null })} className="h-9 rounded-md border border-border bg-bg px-2">
            <option value="">Qualquer equipamento</option>
            {(Object.keys(EQUIPAMENTO_LABEL) as Equipamento[]).filter((k) => !["esteira", "bike", "outro", "cabo"].includes(k)).map((k) => (
              <option key={k} value={k}>{EQUIPAMENTO_LABEL[k]}</option>
            ))}
          </select>
          <select aria-label="Padrão de movimento" value={filtros.padrao ?? ""} onChange={(e) => setFiltro({ padrao: (e.target.value || null) as PadraoMovimento | null })} className="h-9 rounded-md border border-border bg-bg px-2 max-w-[13rem]">
            <option value="">Qualquer padrão</option>
            {(Object.keys(PADRAO_LABEL) as PadraoMovimento[]).map((k) => (
              <option key={k} value={k}>{PADRAO_LABEL[k]}</option>
            ))}
          </select>
          <select aria-label="Tipo" value={filtros.tipo ?? ""} onChange={(e) => setFiltro({ tipo: (e.target.value || null) as FiltrosBusca["tipo"] })} className="h-9 rounded-md border border-border bg-bg px-2">
            <option value="">Multi e mono</option>
            <option value="multiarticular">Multiarticular</option>
            <option value="monoarticular">Monoarticular</option>
          </select>
          <Chip ativo={!!filtros.somenteFavoritos} onClick={() => setFiltro({ somenteFavoritos: !filtros.somenteFavoritos })}>★ Favoritos ({favoritos.size})</Chip>
          <Chip ativo={!!filtros.somenteSemMidia} onClick={() => setFiltro({ somenteSemMidia: !filtros.somenteSemMidia })}>Sem mídia</Chip>
          {filtros.grupo ? (
            <Chip ativo={!!filtros.incluirSecundarios} onClick={() => setFiltro({ incluirSecundarios: !filtros.incluirSecundarios })}>+ como secundário</Chip>
          ) : null}
          {filtrosAtivos ? (
            <button type="button" className="alvo text-accent underline-offset-2 hover:underline" onClick={() => setFiltros({})}>
              limpar filtros
            </button>
          ) : null}
        </div>

        <p className="text-xs text-fg-subtle" aria-live="polite">{resultados.length} exercício(s)</p>

        <ul className="divide-y divide-border rounded-xl border border-border bg-card max-h-[70vh] overflow-auto">
          {resultados.length === 0 ? (
            <li className="p-6 text-sm text-fg-muted">Nada encontrado. Tente outro nome ou limpe os filtros.</li>
          ) : (
            resultados.map(({ item, motivo }) => {
              const u = uso[item.id];
              return (
                <li key={item.id} className={`flex items-center gap-2 px-3 py-2 ${selecionadoId === item.id ? "bg-accent/10" : "hover:bg-card-hover"}`}>
                  <button type="button" aria-label={favoritos.has(item.id) ? `Remover ${item.nome} dos favoritos` : `Favoritar ${item.nome}`} aria-pressed={favoritos.has(item.id)} onClick={() => alternarFavorito(item.id)} className={`touch shrink-0 ${favoritos.has(item.id) ? "text-accent" : "text-fg-subtle hover:text-fg"}`}>
                    <Icon name="star" />
                  </button>
                  <button type="button" onClick={() => setSelecionadoId(item.id)} className="flex-1 min-w-0 text-left py-1">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GRUPO_COR[item.grupo] }} aria-hidden />
                      <span className="truncate text-sm font-semibold">{item.nome}</span>
                    </span>
                    <span className="block truncate text-[11px] text-fg-subtle">
                      {GRUPO_LABEL[item.grupo]}
                      {item.padrao ? ` · ${PADRAO_LABEL[item.padrao]}` : ""}
                      {busca && motivo && motivo !== "nome" ? ` · por ${motivo}` : ""}
                      {u ? ` · você usou ${u.vezes}× (${u.alunos} aluno${u.alunos === 1 ? "" : "s"})` : ""}
                    </span>
                  </button>
                  {!item.midia?.verificada ? <span className="shrink-0 text-[10px] uppercase tracking-wider text-warning" title="Sem vídeo verificado">sem mídia</span> : null}
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Coluna da ficha ------------------------------------------------------- */}
      <section ref={fichaRef} className="min-w-0 scroll-mt-20 space-y-2" aria-label="Ficha do exercício">
        {selecionado || form !== "fechado" ? (
          <button type="button" onClick={voltarParaLista} className="lg:hidden text-sm font-semibold text-accent">
            ← Voltar à lista
          </button>
        ) : null}
        {form !== "fechado" ? (
          <FormExercicio inicial={form === "novo" ? null : form} itens={itens} onCancelar={() => setForm("fechado")} onSalvo={aoSalvar} />
        ) : selecionado ? (
          <Ficha
            item={selecionado}
            itens={itens}
            equivalencias={equivalencias}
            uso={uso[selecionado.id]}
            favorito={favoritos.has(selecionado.id)}
            onFavorito={() => alternarFavorito(selecionado.id)}
            onRevisar={revisar}
            onEditar={() => setForm(selecionado)}
            onArquivar={() => arquivar(selecionado)}
            onAbrir={setSelecionadoId}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
            Selecione um exercício para ver a ficha completa, a mídia e as substituições.
          </div>
        )}
      </section>
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={ativo} onClick={onClick} className={`h-9 rounded-md border px-3 font-semibold ${ativo ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted hover:text-fg"}`}>
      {children}
    </button>
  );
}

function Ficha({
  item, itens, equivalencias, uso, favorito, onFavorito, onRevisar, onEditar, onArquivar, onAbrir,
}: {
  item: ItemBiblioteca;
  itens: ItemBiblioteca[];
  equivalencias: Equivalencia[];
  uso: UsoExercicio | undefined;
  favorito: boolean;
  onFavorito: () => void;
  onRevisar: (exercicioId: string, alternativaId: string, status: StatusEquivalencia) => void;
  onEditar: () => void;
  onArquivar: () => void;
  onAbrir: (id: string) => void;
}) {
  const { sugestoes } = useMemo(() => sugerirSubstituicoes(item, itens, equivalencias, {}, 8), [item, itens, equivalencias]);
  const rejeitadas = equivalencias.filter((e) => e.exercicioId === item.id && e.status === "rejeitada");
  const nomeDe = (id: string) => itens.find((i) => i.id === id)?.nome ?? "exercício arquivado";

  return (
    <article className="space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="text-xl font-bold">{item.nome}</h2>
          {item.sinonimos.length ? <p className="text-xs text-fg-subtle mt-1">Também chamado de: {item.sinonimos.join(", ")}</p> : null}
          <p className="text-[11px] text-fg-subtle mt-1">{item.origem === "catalogo" ? "Catálogo Montinho" : "Cadastro/edição sua"}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant={favorito ? "primary" : "secondary"} size="sm" onClick={onFavorito} aria-pressed={favorito}>
            <Icon name="star" /> {favorito ? "Favorito" : "Favoritar"}
          </Button>
          <Button variant="secondary" size="sm" onClick={onEditar}>Editar</Button>
          <Button variant="ghost" size="sm" onClick={onArquivar} aria-label="Arquivar exercício">
            <Icon name="trash" />
          </Button>
        </div>
      </header>

      {item.midia?.verificada ? (
        <VideoPlayer source={{ provider: item.midia.provider as "youtube", id: item.midia.id }} />
      ) : (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning" role="status">
          {item.midia ? "Vídeo cadastrado, mas ainda não verificado: o aluno não vê até você marcar como verificado." : "Sem vídeo demonstrativo. Adicione um vídeo verificado em Editar."}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Campo rotulo="Músculo principal (série direta)">{GRUPO_LABEL[item.grupo]}</Campo>
        <Campo rotulo="Secundários (peso no ponderado)">
          {item.secundarios.length ? item.secundarios.map((g) => `${GRUPO_LABEL[g]} ${item.pesosSecundarios[g] != null ? `(${String(item.pesosSecundarios[g]).replace(".", ",")})` : ""}`).join(" · ") : "—"}
        </Campo>
        <Campo rotulo="Padrão de movimento">{item.padrao ? PADRAO_LABEL[item.padrao] : "—"}</Campo>
        <Campo rotulo="Tipo">{item.tipo ? (item.tipo === "multiarticular" ? "Multiarticular" : "Monoarticular") : "—"}</Campo>
        <Campo rotulo="Articulações">{item.articulacoes.map((a) => ARTICULACAO_LABEL[a]).join(", ") || "—"}</Campo>
        <Campo rotulo="Equipamento">{item.equipamento.map((e) => EQUIPAMENTO_LABEL[e] ?? e).join(", ") || "—"}</Campo>
        <Campo rotulo="Nível sugerido">{item.nivel ? NIVEL_LABEL[item.nivel] : "—"}</Campo>
        <Campo rotulo="Registro do aluno">{item.registro.map((r) => CAMPO_REGISTRO_LABEL[r]).join(", ")}</Campo>
        <Campo rotulo="Atenção articular">{item.estresse.length ? item.estresse.map((r) => REGIAO_ESTRESSE_LABEL[r]).join(", ") : "—"}</Campo>
        <Campo rotulo="Conta no volume">{item.contaVolume ? "Sim" : "Não (carregamento/condicionamento)"}</Campo>
      </dl>

      <p className="text-xs text-fg-muted border-t border-border pt-3">
        {uso ? `Seu histórico: prescrito ${uso.vezes} vez(es), para ${uso.alunos} aluno(s).` : "Seu histórico: ainda não prescrito em nenhum treino salvo."}
      </p>

      <Lista titulo="Como executar" itens={item.execucao} />
      <Lista titulo="Erros técnicos frequentes" itens={item.erros} />

      <section className="space-y-2 border-t border-border pt-3">
        <h3 className="text-sm font-bold">Substituições</h3>
        <p className="text-[11px] text-fg-subtle">Regras: mesmo padrão e músculo, ou equivalência do catálogo/aprovada por você. Aprove ou rejeite: rejeitadas nunca mais aparecem.</p>
        {sugestoes.length === 0 ? <p className="text-sm text-fg-muted">Nenhuma substituição compatível.</p> : null}
        <ul className="space-y-2">
          {sugestoes.map((s) => (
            <li key={s.item.id} className="rounded-lg border border-border p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => onAbrir(s.item.id)} className="alvo text-sm font-semibold hover:text-accent text-left">{s.item.nome}</button>
                <span className={`text-[10px] uppercase tracking-wider ${s.origem === "aprovada" ? "text-success" : "text-fg-subtle"}`}>{ORIGEM_SUGESTAO_LABEL[s.origem]}</span>
              </div>
              <p className="text-[11px] text-fg-muted">{s.motivos.join(" · ")}</p>
              {s.alertas.length ? <p className="text-[11px] text-warning">{s.alertas.join(" · ")}</p> : null}
              <div className="mt-1 flex gap-2 text-xs">
                {s.origem !== "aprovada" ? (
                  <button type="button" className="alvo font-semibold text-success hover:underline" onClick={() => onRevisar(item.id, s.item.id, "aprovada")}>Aprovar</button>
                ) : (
                  <button type="button" className="alvo text-fg-muted hover:underline" onClick={() => onRevisar(item.id, s.item.id, "sugerida")}>Desfazer aprovação</button>
                )}
                <button type="button" className="alvo font-semibold text-red hover:underline" onClick={() => onRevisar(item.id, s.item.id, "rejeitada")}>Rejeitar</button>
              </div>
            </li>
          ))}
        </ul>
        {rejeitadas.length ? (
          <details className="text-xs text-fg-muted">
            <summary className="cursor-pointer">Rejeitadas por você ({rejeitadas.length})</summary>
            <ul className="mt-1 space-y-1">
              {rejeitadas.map((r) => (
                <li key={r.alternativaId} className="flex justify-between gap-2">
                  <span>{nomeDe(r.alternativaId)}</span>
                  <button type="button" className="alvo text-accent hover:underline" onClick={() => onRevisar(item.id, r.alternativaId, "sugerida")}>Voltar a sugerir</button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </article>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-fg-subtle">{rotulo}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return null;
  return (
    <section>
      <h3 className="text-sm font-bold mb-1">{titulo}</h3>
      <ul className="list-disc pl-5 space-y-1 text-sm text-fg-muted">
        {itens.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </section>
  );
}
