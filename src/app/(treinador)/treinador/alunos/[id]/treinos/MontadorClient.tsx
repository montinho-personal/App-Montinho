"use client";

// ============================================================================
// Montador de treinos (A…H) com Tabela de Volume Semanal sempre visível.
//  • IDs estáveis: linhas existentes mantêm o id do exercício (histórico preservado).
//  • Frequência/calendário por letra alimenta o volume em tempo real.
//  • Grupo por exercício: biblioteca > correção salva > heurística (com confiança);
//    a escolha manual vira correção reutilizável ao salvar.
//  • Reordenar por botões (acessível) e por arrastar; duplicar; copiar entre dias;
//    desfazer/refazer; campos avançados só quando o treinador quiser.
// ============================================================================

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { EXTRAS_PADRAO, temExtras } from "@/lib/volume/tecnicas";
import { TabelaVolume } from "@/components/montador/TabelaVolume";
import { PainelTempo } from "@/components/montador/PainelTempo";
import { estimarDuracao, mesclarParametros, type ExercicioTempo, type ParametrosTempo, type ResultadoTempo } from "@/lib/tempo/estimar";
import { usePreferenciasVolume } from "@/components/montador/usePreferenciasVolume";
import { CartaoAnamnese } from "@/components/montador/CartaoAnamnese";
import { ExemplosSemelhantes } from "@/components/montador/ExemplosSemelhantes";
import { SeletorExercicio } from "@/components/montador/SeletorExercicio";
import { AlternativasExercicio } from "@/components/montador/AlternativasExercicio";
import { indicePorNome, interpretarEquipamentos } from "@/lib/biblioteca/itens";
import type { ContextoAluno } from "@/lib/biblioteca/substituicao";
import type { Equivalencia, ItemBiblioteca, Nivel } from "@/lib/biblioteca/tipos";
import { alertasDoExercicio, regioesDaAnamnese, regioesLesionadas } from "@/lib/restricoes";
import { GRUPO_COR, GRUPO_LABEL, GRUPOS_SELECIONAVEIS, montarLookupBiblioteca, normalizarNome, resolverGrupo, type GrupoResolvido } from "@/lib/grupos";
import { calcularVolumeSemanal, frequenciaDoCalendario, type Calendario, type DiaVolume, type Frequencia, type MetaVolume, type Tecnica } from "@/lib/volume/calcular";
import { configIgual, detalhar, repsResumo, totalSeries, type SerieConfig } from "@/lib/series";
import type { Anamnese, GrupoMuscular } from "@/lib/supabase/types-extended";
import type { ExercicioPrescrito, Programa, SnapshotPrograma, TreinoLetra } from "@/lib/supabase/types-sessoes";
import { LETRAS_TREINO } from "@/lib/supabase/types-sessoes";
import type { Treino } from "@/lib/supabase/types";

// ----------------------------------------------------------------------------
// Tipos de view
// ----------------------------------------------------------------------------
type Row = {
  key: string;
  id: string | null;
  nome: string;
  grupo: GrupoMuscular | null; // escolha manual (override)
  secundarios: GrupoMuscular[];
  seriesConfig: SerieConfig;
  aquecimento: number;
  tecnica: Tecnica;
  /** Drops (drop set) ou mini-séries (rest-pause/myo-reps); "" = assumir o padrão. */
  tecnicaExtras: string;
  /** Em quantas séries a técnica é aplicada; "" = padrão (última série; myo-reps: todas). */
  tecnicaSeries: string;
  /** Descanso após o último set (s); "" = padrão do treino/treinador. */
  descansoApos: string;
  /** Cadência prescrita (ex.: 3-1-2); "" = estimativa por repetição. */
  cadencia: string;
  bloco: string;
  unilateral: boolean;
  observacoes: string;
  cargaAlvo: string;
  rir: string;
  contaVolume: boolean;
  bibliotecaId: string | null;
  grupoOrigemSalvo: ExercicioPrescrito["grupo_origem"];
};

type TreinoVM = { key: string; id: string | null; letra: TreinoLetra; nome: string; ativo: boolean; observacoes: string; rows: Row[]; tempos: Partial<ParametrosTempo>; tempoAlvo: string };

type ProgramaVM = {
  nome: string;
  objetivo: string;
  nivel: string;
  split: string;
  modo_semana: "fixa" | "rotativo";
  calendario: Calendario;
  frequenciaManual: Frequencia;
  metas_volume: Partial<Record<GrupoMuscular, MetaVolume>>;
  prioridades: string[];
  equipamentos: string[];
  duracao_min: string;
  permite_versao_reduzida: boolean;
  observacoes: string;
};

type Estado = { programa: ProgramaVM; treinos: TreinoVM[] };

type BibliotecaItem = { id: string; nome: string; grupo_muscular: GrupoMuscular; grupos_secundarios: GrupoMuscular[]; sinonimos: string[]; equipamento: string[] };

type Props = {
  /** Padrões de tempo do treinador (nível acima do treino). */
  temposTreinador: Partial<ParametrosTempo>;
  alunoId: string;
  alunoNome: string;
  programa: Programa | null;
  treinosIniciais: Array<Treino & { exercicios: ExercicioPrescrito[] }>;
  finalizados: Array<{ id: string; letra: string; nome: string; exercicios: number }>;
  biblioteca: BibliotecaItem[];
  /** Biblioteca completa (busca, alternativas e pesos do volume ponderado). */
  itensBiblioteca: ItemBiblioteca[];
  equivalencias: Equivalencia[];
  favoritos: string[];
  usoExercicios: Record<string, { vezes: number; alunos: number }>;
  correcoes: Array<{ nome: string; grupo: GrupoMuscular; secundarios: GrupoMuscular[] }>;
  anamnese: Anamnese | null;
  realizadoSemanal: Partial<Record<GrupoMuscular, number>>;
};

const DIAS_SEMANA = [
  { dia: 1, label: "Seg" },
  { dia: 2, label: "Ter" },
  { dia: 3, label: "Qua" },
  { dia: 4, label: "Qui" },
  { dia: 5, label: "Sex" },
  { dia: 6, label: "Sáb" },
  { dia: 0, label: "Dom" },
];

const TECNICAS: Array<{ v: Tecnica; l: string }> = [
  { v: "normal", l: "Normal" },
  { v: "superset", l: "Superset" },
  { v: "biset", l: "Bi-set" },
  { v: "dropset", l: "Drop set" },
  { v: "rest_pause", l: "Rest-pause" },
  { v: "cluster", l: "Cluster" },
  { v: "piramide", l: "Pirâmide" },
  { v: "isometria", l: "Isometria" },
  { v: "myo_reps", l: "Myo-reps" },
  { v: "unilateral", l: "Unilateral" },
];

const PRESETS: Array<{ nome: string; letras: TreinoLetra[]; calendario: Calendario; split: string }> = [
  { nome: "Full Body 3x", letras: ["A", "B", "C"], calendario: { modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 3, letra: "B" }, { dia: 5, letra: "C" }] }, split: "Full Body" },
  { nome: "ABC 3x", letras: ["A", "B", "C"], calendario: { modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 3, letra: "B" }, { dia: 5, letra: "C" }] }, split: "ABC" },
  { nome: "ABC 5x (A/B repetem)", letras: ["A", "B", "C"], calendario: { modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 2, letra: "B" }, { dia: 3, letra: "C" }, { dia: 4, letra: "A" }, { dia: 5, letra: "B" }] }, split: "ABC" },
  { nome: "ABC rotativo 5x", letras: ["A", "B", "C"], calendario: { modo: "rotativo", sequencia: ["A", "B", "C"], diasPorSemana: 5 }, split: "ABC" },
  { nome: "Upper/Lower 4x", letras: ["A", "B", "C", "D"], calendario: { modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 2, letra: "B" }, { dia: 4, letra: "C" }, { dia: 5, letra: "D" }] }, split: "Upper/Lower" },
  { nome: "ABCDE 5x", letras: ["A", "B", "C", "D", "E"], calendario: { modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 2, letra: "B" }, { dia: 3, letra: "C" }, { dia: 4, letra: "D" }, { dia: 5, letra: "E" }] }, split: "ABCDE" },
  { nome: "PPL 6x", letras: ["A", "B", "C", "D", "E", "F"], calendario: { modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 2, letra: "B" }, { dia: 3, letra: "C" }, { dia: 4, letra: "D" }, { dia: 5, letra: "E" }, { dia: 6, letra: "F" }] }, split: "PPL" },
];

let seq = 0;
const novaKey = () => `k${Date.now().toString(36)}-${seq++}`;
const emptyRow = (): Row => ({ key: novaKey(), id: null, nome: "", grupo: null, secundarios: [], seriesConfig: configIgual(3, "10-12", null), aquecimento: 0, tecnica: "normal", tecnicaExtras: "", tecnicaSeries: "", descansoApos: "", cadencia: "", bloco: "", unilateral: false, observacoes: "", cargaAlvo: "", rir: "", contaVolume: true, bibliotecaId: null, grupoOrigemSalvo: null });
const cloneRow = (r: Row): Row => ({ ...r, key: novaKey(), id: null, seriesConfig: JSON.parse(JSON.stringify(r.seriesConfig)) });
const emptyTreino = (letra: TreinoLetra): TreinoVM => ({ key: novaKey(), id: null, letra, nome: `Treino ${letra}`, ativo: true, observacoes: "", rows: [emptyRow()], tempos: {}, tempoAlvo: "" });

function rowDeExercicio(e: ExercicioPrescrito): Row {
  const cfg = (e.series_config as SerieConfig | null) ?? configIgual(e.series, e.reps, e.ie);
  if (cfg.modo === "iguais") cfg.descanso_seg = e.descanso_seg ?? cfg.descanso_seg;
  return {
    key: novaKey(),
    id: e.id,
    nome: e.nome,
    grupo: e.grupo_origem && e.grupo_origem !== "heuristica" ? e.grupo_muscular : null,
    secundarios: e.grupos_secundarios ?? [],
    seriesConfig: cfg,
    aquecimento: e.series_aquecimento ?? 0,
    tecnica: e.tecnica ?? "normal",
    tecnicaExtras: e.tecnica_extras != null ? String(e.tecnica_extras) : "",
    tecnicaSeries: e.tecnica_series != null ? String(e.tecnica_series) : "",
    descansoApos: e.descanso_apos_seg != null ? String(e.descanso_apos_seg) : "",
    cadencia: e.cadencia ?? "",
    bloco: e.bloco ?? "",
    unilateral: e.unilateral ?? false,
    observacoes: e.observacoes ?? "",
    cargaAlvo: e.carga_alvo ?? "",
    rir: e.rir != null ? String(e.rir) : "",
    contaVolume: e.conta_volume !== false,
    bibliotecaId: e.biblioteca_id ?? null,
    grupoOrigemSalvo: e.grupo_origem ?? null,
  };
}

function programaInicial(p: Programa | null, letras: TreinoLetra[]): ProgramaVM {
  const cal = (p?.calendario && "modo" in p.calendario ? (p.calendario as Calendario) : null) ?? ({ modo: "fixa", dias: letras.map((l, i) => ({ dia: ((i + 1) % 7) as number, letra: l })) } as Calendario);
  return {
    nome: p?.nome ?? "Programa atual",
    objetivo: p?.objetivo ?? "",
    nivel: p?.nivel ?? "",
    split: p?.split ?? "",
    modo_semana: p?.modo_semana ?? "fixa",
    calendario: cal,
    frequenciaManual: p?.frequencia ?? {},
    metas_volume: p?.metas_volume ?? {},
    prioridades: p?.prioridades ?? [],
    equipamentos: p?.equipamentos ?? [],
    duracao_min: p?.duracao_min != null ? String(p.duracao_min) : "",
    permite_versao_reduzida: p?.permite_versao_reduzida ?? false,
    observacoes: p?.observacoes ?? "",
  };
}

// ----------------------------------------------------------------------------
/** Converte uma linha do montador no formato do cálculo de tempo (aquecimento = primeiras séries). */
function exercicioTempoDaLinha(r: Row): ExercicioTempo {
  const cfg = r.seriesConfig;
  const todas = cfg.modo === "iguais" ? Array.from({ length: Math.max(0, cfg.series) }, () => ({ reps: cfg.reps, descansoSeg: cfg.descanso_seg })) : cfg.series.map((x) => ({ reps: x.reps, descansoSeg: x.descanso_seg }));
  const aquec = Math.min(r.aquecimento, todas.length);
  return {
    id: r.key,
    nome: r.nome,
    series: todas.slice(aquec),
    aquecimento: aquec,
    cadencia: r.cadencia || null,
    tecnica: r.tecnica,
    tecnicaExtras: r.tecnicaExtras === "" ? null : Number(r.tecnicaExtras),
    tecnicaSeries: r.tecnicaSeries === "" ? null : Number(r.tecnicaSeries),
    bloco: r.bloco || null,
    unilateral: r.unilateral,
    descansoAposSeg: r.descansoApos === "" ? null : Number(r.descansoApos),
  };
}

export function MontadorClient({ alunoId, alunoNome, programa, treinosIniciais, finalizados, biblioteca, itensBiblioteca, equivalencias, favoritos, usoExercicios, correcoes, anamnese, realizadoSemanal, temposTreinador }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [estado, setEstado] = useState<Estado>(() => {
    const treinos = treinosIniciais.length
      ? treinosIniciais.map((t) => ({ key: novaKey(), id: t.id, letra: t.letra as TreinoLetra, nome: t.nome, ativo: t.ativo, observacoes: t.observacoes ?? "", rows: t.exercicios.length ? t.exercicios.map(rowDeExercicio) : [emptyRow()], tempos: (t.tempos ?? {}) as Partial<ParametrosTempo>, tempoAlvo: t.tempo_alvo_min != null ? String(t.tempo_alvo_min) : "" }))
      : [emptyTreino("A"), emptyTreino("B"), emptyTreino("C")];
    return { programa: programaInicial(programa, treinos.map((t) => t.letra)), treinos };
  });
  const passado = useRef<Estado[]>([]);
  const futuro = useRef<Estado[]>([]);
  const [hist, setHist] = useState({ passado: 0, futuro: 0 });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [avancado, setAvancado] = useState(false);
  const [incluirSecundario, setIncluirSecundario] = useState(false);
  // Regra das técnicas avançadas e ajuste por RIR: preferência do treinador neste navegador.
  const { regraTecnicas, setRegraTecnicas, ajustarPorRir, setAjustarPorRir } = usePreferenciasVolume();
  const [motivo, setMotivo] = useState("");
  const [showFinalizados, setShowFinalizados] = useState(false);
  const [showExemplos, setShowExemplos] = useState(false);
  const [showPrograma, setShowPrograma] = useState(!programa);
  const [alternativasDe, setAlternativasDe] = useState<string | null>(null);
  const dragRef = useRef<{ letra: TreinoLetra; key: string } | null>(null);

  // --- lookups ---------------------------------------------------------------
  const lookup = useMemo(() => montarLookupBiblioteca(biblioteca), [biblioteca]);
  const correcoesMap = useMemo(() => new Map(correcoes.map((c) => [c.nome, { grupo: c.grupo, secundarios: c.secundarios }])), [correcoes]);
  const resolver = useCallback(
    (r: Row): GrupoResolvido => resolverGrupo({ nome: r.nome, grupo_muscular: r.grupo, grupos_secundarios: r.secundarios, grupo_origem: r.grupo ? "manual" : null }, lookup, correcoesMap),
    [lookup, correcoesMap]
  );
  const favoritosSet = useMemo(() => new Set(favoritos), [favoritos]);
  const usoMap = useMemo(() => new Map(Object.entries(usoExercicios).map(([id, u]) => [id, u.vezes])), [usoExercicios]);
  const itemPorId = useMemo(() => new Map(itensBiblioteca.map((i) => [i.id, i])), [itensBiblioteca]);
  const itemPorNome = useMemo(() => indicePorNome(itensBiblioteca), [itensBiblioteca]);
  const itemDaLinha = useCallback(
    (r: Row): ItemBiblioteca | null => (r.bibliotecaId ? itemPorId.get(r.bibliotecaId) : undefined) ?? itemPorNome.get(normalizarNome(r.nome)) ?? null,
    [itemPorId, itemPorNome]
  );

  // --- frequência e volume (tempo real) ---------------------------------------
  const frequencia = useMemo<Frequencia>(() => {
    const f = frequenciaDoCalendario(estado.programa.calendario);
    const calendarioVazio = Object.keys(f).length === 0;
    for (const t of estado.treinos) {
      if (!t.ativo) continue;
      // Sem calendário definido: cada letra 1×/semana (ou frequência manual salva).
      // Com calendário definido: letra fora da semana/ciclo = 0 (o treinador vê o aviso na linha).
      if (f[t.letra] == null) f[t.letra] = calendarioVazio ? Number(estado.programa.frequenciaManual[t.letra] ?? 1) : 0;
    }
    return f;
  }, [estado.programa.calendario, estado.programa.frequenciaManual, estado.treinos]);

  const diasVolume = useMemo<DiaVolume[]>(
    () =>
      estado.treinos.map((t) => ({
        letra: t.letra,
        nome: t.nome,
        ativo: t.ativo,
        exercicios: t.rows
          .filter((r) => r.nome.trim())
          .map((r) => {
            const g = resolver(r);
            const item = itemDaLinha(r);
            // Pesos da biblioteca valem quando os secundários não foram alterados à mão.
            const pesos = !r.secundarios.length && item ? item.pesosSecundarios : null;
            return { id: r.key, nome: r.nome, grupo: g.grupo, secundarios: r.secundarios.length ? r.secundarios : item?.secundarios.length ? item.secundarios : g.secundarios, pesosSecundarios: pesos, confianca: g.confianca, series: totalSeries(r.seriesConfig), seriesAquecimento: r.aquecimento, tecnica: r.tecnica, tecnicaExtras: r.tecnicaExtras === "" ? null : Number(r.tecnicaExtras), tecnicaSeries: r.tecnicaSeries === "" ? null : Number(r.tecnicaSeries), rir: r.rir === "" ? null : Number(r.rir), contaVolume: r.contaVolume };
          }),
      })),
    [estado.treinos, resolver, itemDaLinha]
  );

  const volume = useMemo(() => calcularVolumeSemanal(diasVolume, { frequencia, metas: estado.programa.metas_volume, incluirSecundario, agruparOmbros: false, regraTecnicas, ajustarPorRir }), [diasVolume, frequencia, estado.programa.metas_volume, incluirSecundario, regraTecnicas, ajustarPorRir]);

  // Duração estimada de cada treino (recalcula a cada mudança). Precedência:
  // app → padrão do treinador → treino → exercício → série.
  const [padraoTempos, setPadraoTempos] = useState<Partial<ParametrosTempo>>(temposTreinador);
  const duracoes = useMemo(() => {
    const out: Record<string, { resultado: ResultadoTempo; efetivos: ParametrosTempo }> = {};
    for (const t of estado.treinos) {
      const efetivos = mesclarParametros(padraoTempos, t.tempos);
      out[t.key] = { resultado: estimarDuracao(t.rows.filter((r) => r.nome.trim()).map(exercicioTempoDaLinha), efetivos), efetivos };
    }
    return out;
  }, [estado.treinos, padraoTempos]);

  async function salvarPadraoTempos(t: Partial<ParametrosTempo>) {
    const { descansoEntreSeriesSeg, descansoAposExercicioSeg, segundosPorRep, transicaoSeg, transicaoDentroDoDescanso, preparacaoInicialSeg, descansoAquecimentoSeg } = t;
    const corpo = { descansoEntreSeriesSeg, descansoAposExercicioSeg, segundosPorRep, transicaoSeg, transicaoDentroDoDescanso, preparacaoInicialSeg, descansoAquecimentoSeg };
    const res = await fetch("/api/preferencias/tempos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
    if (!res?.ok) return toast.error("Não foi possível salvar seu padrão de tempos.");
    setPadraoTempos(corpo);
    toast.success("Padrão de tempos salvo: vale para os treinos sem ajuste próprio.");
  }

  // Perfil ATUAL do aluno para as alternativas (nunca um treino antigo "genérico").
  const contextoAluno = useMemo<ContextoAluno>(
    () => ({
      equipamentos: interpretarEquipamentos(estado.programa.equipamentos),
      nivel: (["iniciante", "intermediario", "avancado"].includes(estado.programa.nivel) ? estado.programa.nivel : null) as Nivel | null,
      regioesRestritas: regioesDaAnamnese(anamnese),
      objetivo: estado.programa.objetivo || null,
      musculosPrioritarios: estado.programa.prioridades as GrupoMuscular[],
    }),
    [estado.programa.equipamentos, estado.programa.nivel, estado.programa.objetivo, estado.programa.prioridades, anamnese]
  );

  // --- histórico (desfazer/refazer) -------------------------------------------
  const estadoRef = useRef(estado);
  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);
  const commit = useCallback((fn: (e: Estado) => Estado) => {
    const cur = estadoRef.current;
    passado.current = [...passado.current.slice(-49), cur];
    futuro.current = [];
    setEstado(fn(cur));
    setHist({ passado: passado.current.length, futuro: 0 });
    setDirty(true);
  }, []);
  const undo = useCallback(() => {
    const prev = passado.current.pop();
    if (!prev) return;
    futuro.current.push(estadoRef.current);
    setEstado(prev);
    setHist({ passado: passado.current.length, futuro: futuro.current.length });
    setDirty(true);
  }, []);
  const redo = useCallback(() => {
    const next = futuro.current.pop();
    if (!next) return;
    passado.current.push(estadoRef.current);
    setEstado(next);
    setHist({ passado: passado.current.length, futuro: futuro.current.length });
    setDirty(true);
  }, []);

  // --- mutações ---------------------------------------------------------------
  const updPrograma = (patch: Partial<ProgramaVM>) => commit((e) => ({ ...e, programa: { ...e.programa, ...patch } }));
  const updTreino = (key: string, patch: Partial<TreinoVM>) => commit((e) => ({ ...e, treinos: e.treinos.map((t) => (t.key === key ? { ...t, ...patch } : t)) }));
  const updRow = (tk: string, rk: string, patch: Partial<Row>) => commit((e) => ({ ...e, treinos: e.treinos.map((t) => (t.key === tk ? { ...t, rows: t.rows.map((r) => (r.key === rk ? { ...r, ...patch } : r)) } : t)) }));
  const addRow = (tk: string, apos?: string) =>
    commit((e) => ({
      ...e,
      treinos: e.treinos.map((t) => {
        if (t.key !== tk) return t;
        const idx = apos ? t.rows.findIndex((r) => r.key === apos) : t.rows.length - 1;
        const rows = [...t.rows];
        rows.splice(idx + 1, 0, emptyRow());
        return { ...t, rows };
      }),
    }));
  const removeRow = (tk: string, rk: string) => commit((e) => ({ ...e, treinos: e.treinos.map((t) => (t.key === tk ? { ...t, rows: t.rows.filter((r) => r.key !== rk).length ? t.rows.filter((r) => r.key !== rk) : [emptyRow()] } : t)) }));
  const duplicarRow = (tk: string, rk: string) =>
    commit((e) => ({
      ...e,
      treinos: e.treinos.map((t) => {
        if (t.key !== tk) return t;
        const idx = t.rows.findIndex((r) => r.key === rk);
        const rows = [...t.rows];
        rows.splice(idx + 1, 0, cloneRow(t.rows[idx]));
        return { ...t, rows };
      }),
    }));
  const moverRow = (tk: string, rk: string, delta: number) =>
    commit((e) => ({
      ...e,
      treinos: e.treinos.map((t) => {
        if (t.key !== tk) return t;
        const idx = t.rows.findIndex((r) => r.key === rk);
        const alvo = idx + delta;
        if (alvo < 0 || alvo >= t.rows.length) return t;
        const rows = [...t.rows];
        [rows[idx], rows[alvo]] = [rows[alvo], rows[idx]];
        return { ...t, rows };
      }),
    }));
  const moverRowPara = (tk: string, rk: string, destinoKey: string) =>
    commit((e) => ({
      ...e,
      treinos: e.treinos.map((t) => {
        if (t.key !== tk) return t;
        const de = t.rows.findIndex((r) => r.key === rk);
        const para = t.rows.findIndex((r) => r.key === destinoKey);
        if (de < 0 || para < 0 || de === para) return t;
        const rows = [...t.rows];
        const [item] = rows.splice(de, 1);
        rows.splice(para, 0, item);
        return { ...t, rows };
      }),
    }));
  const proximaLetraLivre = (treinos: TreinoVM[]): TreinoLetra | null => LETRAS_TREINO.find((l) => !treinos.some((t) => t.letra === l)) ?? null;
  const addDia = () =>
    commit((e) => {
      const l = proximaLetraLivre(e.treinos);
      if (!l) return e;
      return { ...e, treinos: [...e.treinos, emptyTreino(l)] };
    });
  const duplicarDia = (tk: string) =>
    commit((e) => {
      const l = proximaLetraLivre(e.treinos);
      const src = e.treinos.find((t) => t.key === tk);
      if (!l || !src) return e;
      return { ...e, treinos: [...e.treinos, { ...src, key: novaKey(), id: null, letra: l, nome: `${src.nome} (cópia)`, rows: src.rows.map(cloneRow) }] };
    });
  const copiarDe = (destinoKey: string, origemKey: string) =>
    commit((e) => {
      const src = e.treinos.find((t) => t.key === origemKey);
      if (!src) return e;
      return { ...e, treinos: e.treinos.map((t) => (t.key === destinoKey ? { ...t, observacoes: src.observacoes, rows: src.rows.map(cloneRow) } : t)) };
    });
  const removerDia = (tk: string) =>
    commit((e) => {
      const t = e.treinos.find((x) => x.key === tk);
      if (!t) return e;
      if (t.id) return { ...e, treinos: e.treinos.map((x) => (x.key === tk ? { ...x, ativo: false } : x)) }; // persistido: desativa (vira histórico)
      return { ...e, treinos: e.treinos.filter((x) => x.key !== tk) };
    });
  const aplicarPreset = (p: (typeof PRESETS)[number]) =>
    commit((e) => {
      const treinos = [...e.treinos];
      for (const l of p.letras) if (!treinos.some((t) => t.letra === l)) treinos.push(emptyTreino(l));
      return { ...e, programa: { ...e.programa, calendario: p.calendario, modo_semana: p.calendario.modo, split: e.programa.split || p.split }, treinos: treinos.sort((a, b) => LETRAS_TREINO.indexOf(a.letra) - LETRAS_TREINO.indexOf(b.letra)) };
    });

  /** Usar programa da memória como base (clona; ids novos; dias podem ser substituídos). */
  const aplicarSnapshot = (snap: SnapshotPrograma, somenteLetra?: TreinoLetra) =>
    commit((e) => {
      const novos = snap.treinos
        .filter((t) => !somenteLetra || t.letra === somenteLetra)
        .map((t) => ({
          key: novaKey(),
          id: e.treinos.find((x) => x.letra === t.letra)?.id ?? null, // mantém o id do dia (histórico), troca o conteúdo
          letra: t.letra,
          nome: t.nome,
          ativo: true,
          observacoes: "",
          tempos: e.treinos.find((x) => x.letra === t.letra)?.tempos ?? {},
          tempoAlvo: e.treinos.find((x) => x.letra === t.letra)?.tempoAlvo ?? "",
          rows: t.exercicios.map((x) => ({ ...emptyRow(), nome: x.nome, grupo: x.grupo_muscular, secundarios: x.grupos_secundarios ?? [], seriesConfig: (x.series_config as SerieConfig | null) ?? configIgual(x.series, x.reps, x.ie), aquecimento: x.series_aquecimento ?? 0, tecnica: x.tecnica ?? "normal", tecnicaExtras: x.tecnica_extras != null ? String(x.tecnica_extras) : "", tecnicaSeries: x.tecnica_series != null ? String(x.tecnica_series) : "", descansoApos: x.descanso_apos_seg != null ? String(x.descanso_apos_seg) : "", cadencia: x.cadencia ?? "", bloco: x.bloco ?? "", unilateral: x.unilateral ?? false, rir: x.rir != null ? String(x.rir) : "" })),
        }));
      const restantes = somenteLetra ? e.treinos.filter((t) => t.letra !== somenteLetra) : e.treinos.filter((t) => t.id && !novos.some((n) => n.letra === t.letra)).map((t) => ({ ...t, ativo: false }));
      const treinos = [...restantes, ...novos].sort((a, b) => LETRAS_TREINO.indexOf(a.letra) - LETRAS_TREINO.indexOf(b.letra));
      const programaNovo = somenteLetra ? e.programa : { ...e.programa, split: snap.programa.split ?? e.programa.split, objetivo: snap.programa.objetivo ?? e.programa.objetivo, nivel: snap.programa.nivel ?? e.programa.nivel, frequenciaManual: snap.programa.frequencia ?? e.programa.frequenciaManual, metas_volume: Object.keys(snap.programa.metas_volume ?? {}).length ? snap.programa.metas_volume : e.programa.metas_volume };
      return { programa: programaNovo, treinos };
    });

  // --- salvar -----------------------------------------------------------------
  const salvar = useCallback(async () => {
    setSaving(true);
    setErroSalvar(null);
    const corr: Array<{ nome: string; grupo: GrupoMuscular; secundarios: GrupoMuscular[] }> = [];
    const treinos = estado.treinos.map((t) => ({
      id: t.id,
      letra: t.letra,
      nome: t.nome.trim() || `Treino ${t.letra}`,
      ativo: t.ativo,
      observacoes: t.observacoes.trim() || null,
      tempos: t.tempos as Record<string, number | boolean>,
      tempo_alvo_min: Number(t.tempoAlvo) >= 5 ? Number(t.tempoAlvo) : null,
      duracao_estimada_min: duracoes[t.key]?.resultado.series ? Math.max(5, Math.min(300, Math.round(duracoes[t.key].resultado.totalSeg / 60))) : null,
      exercicios: t.rows
        .filter((r) => r.nome.trim())
        .map((r) => {
          const g = resolver(r);
          const nomeNorm = normalizarNome(r.nome);
          if (r.grupo && (g.origem === "manual" || g.origem === "correcao") && correcoesMap.get(nomeNorm)?.grupo !== r.grupo) corr.push({ nome: r.nome, grupo: r.grupo, secundarios: r.secundarios });
          const cfg = r.seriesConfig;
          return {
            id: r.id,
            nome: r.nome.trim(),
            series: totalSeries(cfg),
            reps: repsResumo(cfg),
            ie: cfg.modo === "iguais" ? cfg.ie : cfg.series.at(-1)?.ie ?? null,
            rir: r.rir === "" ? null : Number(r.rir),
            descanso_seg: cfg.modo === "iguais" ? cfg.descanso_seg : cfg.series.at(-1)?.descanso_seg ?? null,
            observacoes: r.observacoes.trim() || null,
            series_config: cfg,
            biblioteca_id: r.bibliotecaId ?? biblioteca.find((b) => normalizarNome(b.nome) === nomeNorm)?.id ?? null,
            grupo_muscular: g.grupo,
            grupos_secundarios: r.secundarios.length ? r.secundarios : g.secundarios,
            grupo_origem: g.origem,
            grupo_confianca: g.confianca,
            series_aquecimento: r.aquecimento,
            tecnica: r.tecnica,
            tecnica_extras: temExtras(r.tecnica) && r.tecnicaExtras !== "" ? Number(r.tecnicaExtras) : null,
            tecnica_series: temExtras(r.tecnica) && r.tecnicaSeries !== "" ? Number(r.tecnicaSeries) : null,
            descanso_apos_seg: r.descansoApos === "" ? null : Math.min(900, Number(r.descansoApos)),
            cadencia: r.cadencia.trim() || null,
            bloco: r.bloco.trim() || null,
            unilateral: r.unilateral,
            carga_alvo: r.cargaAlvo.trim() || null,
            conta_volume: r.contaVolume,
          };
        }),
    }));
    const p = estado.programa;
    const payload = {
      programa: {
        nome: p.nome.trim() || "Programa atual",
        objetivo: p.objetivo || null,
        nivel: p.nivel || null,
        split: p.split || null,
        modo_semana: p.calendario.modo,
        frequencia,
        calendario: p.calendario,
        metas_volume: p.metas_volume,
        prioridades: p.prioridades,
        equipamentos: p.equipamentos,
        duracao_min: p.duracao_min ? Number(p.duracao_min) : null,
        permite_versao_reduzida: p.permite_versao_reduzida,
        observacoes: p.observacoes.trim() || null,
      },
      treinos,
      motivo: motivo.trim() || null,
      volume: { linhas: volume.linhas.map((l) => ({ grupo: l.grupo, total: l.total, meta: l.meta, status: l.status, frequencia: l.frequencia })), sessoesSemana: volume.sessoesSemana, subtotais: volume.subtotais },
      correcoes: corr,
    };
    try {
      const res = await fetch(`/api/alunos/${alunoId}/plano`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      // ids estáveis vindos do servidor
      setEstado((cur) => ({
        ...cur,
        treinos: cur.treinos.map((t) => {
          const salvo = (data.treinos as Array<{ id: string; letra: string; exercicios: Array<{ id: string; ordem: number; nome: string }> }>).find((x) => x.letra === t.letra);
          if (!salvo) return t;
          const comNome = t.rows.filter((r) => r.nome.trim());
          return { ...t, id: salvo.id, rows: t.rows.map((r) => { const i = comNome.indexOf(r); return i >= 0 && salvo.exercicios[i] ? { ...r, id: salvo.exercicios[i].id } : r; }) };
        }),
      }));
      setDirty(false);
      setMotivo("");
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      toast.success(`Plano salvo (versão ${data.versao?.versao ?? "nova"}). ${corr.length ? `${corr.length} correção(ões) de grupo guardada(s).` : ""}`);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      setErroSalvar(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [estado, frequencia, volume, motivo, alunoId, resolver, correcoesMap, biblioteca, toast, router, duracoes]);

  async function finalizarDia(t: TreinoVM) {
    if (!t.id) return;
    if (!confirm(`Finalizar "${t.nome}"? Ele sai dos treinos ativos do aluno e vira histórico (nada é apagado).`)) return;
    const res = await fetch(`/api/treinos/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: false }) });
    if (res.ok) {
      commit((e) => ({ ...e, treinos: e.treinos.filter((x) => x.key !== t.key) }));
      toast.success("Treino finalizado.");
      router.refresh();
    } else toast.error("Falha ao finalizar.");
  }

  // --- atalhos e proteção de saída --------------------------------------------
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void salvar(); }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [salvar, undo, redo]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const regioesLesao = useMemo(() => regioesLesionadas(anamnese), [anamnese]);
  const totalSeriesGeral = volume.subtotais.total;
  const letrasAtivas = estado.treinos.filter((t) => t.ativo).map((t) => t.letra);

  // ----------------------------------------------------------------------------
  return (
    <div className="space-y-4 pb-20 xl:pb-0">
      <Link href={`/treinador/alunos/${alunoId}`} className="text-fg-muted text-sm hover:text-fg inline-flex items-center gap-1">
        ← {alunoNome}
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Montador de treinos</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            {alunoNome} · <span className="font-mono">{totalSeriesGeral}</span> séries válidas/semana · {volume.sessoesSemana} sessões/sem
            <span className="ml-2" role="status" aria-live="polite">
              {saving ? <span className="text-fg-subtle">salvando…</span> : erroSalvar ? <span className="text-danger">não salvo: {erroSalvar}</span> : dirty ? <span className="text-warning">● alterações não salvas</span> : savedAt ? <span className="text-success">✓ salvo {savedAt}</span> : null}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={undo} disabled={!hist.passado} className="touch rounded-md border border-border px-3 text-fg-muted hover:text-fg disabled:opacity-40" title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Icon name="undo" /></button>
          <button type="button" onClick={redo} disabled={!hist.futuro} className="touch rounded-md border border-border px-3 text-fg-muted hover:text-fg disabled:opacity-40" title="Refazer (Ctrl+Y)" aria-label="Refazer"><Icon name="redo" /></button>
          <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted rounded-md border border-border px-3 h-11">
            <input type="checkbox" checked={avancado} onChange={(e) => setAvancado(e.target.checked)} /> campos avançados
          </label>
          <button type="button" onClick={() => setShowExemplos((v) => !v)} className="touch rounded-md border border-accent/40 px-3 text-sm font-semibold text-accent hover:bg-accent/10 inline-flex items-center gap-1.5"><Icon name="sparkles" size={16} /> Já montei algo parecido?</button>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo da alteração (opcional)" aria-label="Motivo da alteração" className="h-11 rounded-md border border-border bg-bg px-3 text-sm w-56" maxLength={300} />
          <button type="button" onClick={() => void salvar()} disabled={saving} className="touch rounded-md bg-accent px-5 text-sm font-bold text-bg hover:bg-accent-hover disabled:opacity-50">{saving ? "Salvando…" : "Salvar (Ctrl+S)"}</button>
        </div>
      </header>

      {regioesLesao.length > 0 ? (
        <div className="rounded-lg border border-red/30 bg-red/5 px-4 py-2.5 text-sm text-fg-muted" role="note">
          <span className="text-red font-bold">Atenção:</span> restrições registradas em <b className="text-fg">{regioesLesao.join(", ")}</b>. Exercícios de risco ficam marcados com ⚠ nas linhas.
        </div>
      ) : null}

      {showExemplos ? (
        <ExemplosSemelhantes
          criteriosIniciais={{ dias: letrasAtivas.length || null, objetivo: estado.programa.objetivo || null, nivel: estado.programa.nivel || null, split: estado.programa.split || null, prioridades: estado.programa.prioridades, equipamentos: estado.programa.equipamentos }}
          letrasAtuais={letrasAtivas}
          volumeAtual={volume}
          onUsarComoBase={(snap) => { aplicarSnapshot(snap); setShowExemplos(false); toast.success("Programa aplicado como base. Revise e salve."); }}
          onUsarDia={(snap, letra) => { aplicarSnapshot(snap, letra); toast.success(`Treino ${letra} substituído. Revise e salve.`); }}
          onFechar={() => setShowExemplos(false)}
        />
      ) : null}

      {/* Programa: frequência, calendário, metas */}
      <section className="rounded-xl border border-border bg-card">
        <button type="button" onClick={() => setShowPrograma((v) => !v)} aria-expanded={showPrograma} className="w-full flex items-center justify-between px-4 py-3 text-left">
          <span className="font-bold text-sm">Programa e semana</span>
          <span className="text-xs text-fg-subtle">
            {estado.programa.split || "divisão não definida"} · {estado.programa.calendario.modo === "fixa" ? "semana fixa" : "ciclo rotativo"} · {Object.entries(frequencia).filter(([l]) => letrasAtivas.includes(l as TreinoLetra)).map(([l, v]) => `${l}×${v}`).join(" ")}
          </span>
        </button>
        {showPrograma ? (
          <div className="border-t border-border px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <label className="space-y-1"><span className="text-xs text-fg-muted">Nome do programa</span><input value={estado.programa.nome} onChange={(e) => updPrograma({ nome: e.target.value })} className="h-10 w-full rounded-md border border-border bg-bg px-2" /></label>
              <label className="space-y-1"><span className="text-xs text-fg-muted">Objetivo</span>
                <select value={estado.programa.objetivo} onChange={(e) => updPrograma({ objetivo: e.target.value })} className="h-10 w-full rounded-md border border-border bg-bg px-2">
                  <option value="">—</option><option value="hipertrofia">Hipertrofia</option><option value="forca">Força</option><option value="emagrecimento">Emagrecimento</option><option value="condicionamento">Condicionamento</option><option value="saude">Saúde geral</option>
                </select></label>
              <label className="space-y-1"><span className="text-xs text-fg-muted">Nível</span>
                <select value={estado.programa.nivel} onChange={(e) => updPrograma({ nivel: e.target.value })} className="h-10 w-full rounded-md border border-border bg-bg px-2">
                  <option value="">—</option><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option>
                </select></label>
              <label className="space-y-1"><span className="text-xs text-fg-muted">Divisão</span><input list="splits" value={estado.programa.split} onChange={(e) => updPrograma({ split: e.target.value })} className="h-10 w-full rounded-md border border-border bg-bg px-2" placeholder="Upper/Lower, PPL…" /></label>
              <datalist id="splits">{["ABC", "ABCD", "ABCDE", "Upper/Lower", "PPL", "Full Body"].map((s) => <option key={s} value={s} />)}</datalist>
              <label className="space-y-1"><span className="text-xs text-fg-muted">Duração prevista (min)</span><input inputMode="numeric" value={estado.programa.duracao_min} onChange={(e) => updPrograma({ duracao_min: e.target.value.replace(/\D/g, "") })} className="h-10 w-full rounded-md border border-border bg-bg px-2" /></label>
              <label className="space-y-1 col-span-2"><span className="text-xs text-fg-muted">Equipamentos (separados por vírgula)</span><input value={estado.programa.equipamentos.join(", ")} onChange={(e) => updPrograma({ equipamentos: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="h-10 w-full rounded-md border border-border bg-bg px-2" placeholder="barra, halter, máquina, polia" /></label>
              <label className="inline-flex items-center gap-2 text-xs text-fg-muted self-end h-10"><input type="checkbox" checked={estado.programa.permite_versao_reduzida} onChange={(e) => updPrograma({ permite_versao_reduzida: e.target.checked })} /> permitir versão reduzida (“só 30 min”)</label>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-fg-muted">Modelos rápidos:</span>
                {PRESETS.map((p) => (
                  <button key={p.nome} type="button" onClick={() => aplicarPreset(p)} className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted hover:text-fg hover:border-accent/50">{p.nome}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-1.5"><input type="radio" name="modo" checked={estado.programa.calendario.modo === "fixa"} onChange={() => updPrograma({ calendario: { modo: "fixa", dias: letrasAtivas.map((l, i) => ({ dia: (i + 1) % 7, letra: l })) }, modo_semana: "fixa" })} /> Semana fixa</label>
                <label className="inline-flex items-center gap-1.5"><input type="radio" name="modo" checked={estado.programa.calendario.modo === "rotativo"} onChange={() => updPrograma({ calendario: { modo: "rotativo", sequencia: letrasAtivas, diasPorSemana: Math.min(7, letrasAtivas.length || 3) }, modo_semana: "rotativo" })} /> Ciclo rotativo (ex.: ABC em 5 dias)</label>
              </div>
              {estado.programa.calendario.modo === "fixa" ? (
                <div className="grid grid-cols-7 gap-1.5">
                  {DIAS_SEMANA.map((d) => {
                    const cal = estado.programa.calendario as Extract<Calendario, { modo: "fixa" }>;
                    const atual = cal.dias.find((x) => x.dia === d.dia)?.letra ?? "";
                    return (
                      <label key={d.dia} className="text-center text-[11px] text-fg-muted space-y-1">
                        <span>{d.label}</span>
                        <select aria-label={`Treino de ${d.label}`} value={atual} onChange={(e) => { const letra = (e.target.value || null) as TreinoLetra | null; const dias = cal.dias.filter((x) => x.dia !== d.dia); if (letra) dias.push({ dia: d.dia, letra }); updPrograma({ calendario: { modo: "fixa", dias } }); }} className={`h-10 w-full rounded-md border bg-bg px-1 text-center text-sm font-bold ${atual ? "border-accent/50 text-accent" : "border-border text-fg-subtle"}`}>
                          <option value="">—</option>
                          {letrasAtivas.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-3 text-sm">
                  <label className="space-y-1"><span className="text-xs text-fg-muted">Sequência (ex.: A B C)</span><input value={(estado.programa.calendario as Extract<Calendario, { modo: "rotativo" }>).sequencia.join(" ")} onChange={(e) => { const seqL = e.target.value.toUpperCase().split(/[^A-H]+/).filter((x): x is TreinoLetra => LETRAS_TREINO.includes(x as TreinoLetra)); updPrograma({ calendario: { ...(estado.programa.calendario as Extract<Calendario, { modo: "rotativo" }>), sequencia: seqL } }); }} className="h-10 w-40 rounded-md border border-border bg-bg px-2 font-mono" /></label>
                  <label className="space-y-1"><span className="text-xs text-fg-muted">Dias por semana</span><input inputMode="numeric" value={(estado.programa.calendario as Extract<Calendario, { modo: "rotativo" }>).diasPorSemana} onChange={(e) => updPrograma({ calendario: { ...(estado.programa.calendario as Extract<Calendario, { modo: "rotativo" }>), diasPorSemana: Math.max(1, Math.min(7, Number(e.target.value) || 1)) } })} className="h-10 w-20 rounded-md border border-border bg-bg px-2 font-mono" /></label>
                  <p className="text-xs text-fg-subtle">Volume semanal = média do ciclo. Ex.: ABC em 5 dias → cada treino ≈ 1,67×/semana.</p>
                </div>
              )}
            </div>
            <label className="block space-y-1 text-sm"><span className="text-xs text-fg-muted">Observações do programa (visíveis para você)</span><textarea value={estado.programa.observacoes} onChange={(e) => updPrograma({ observacoes: e.target.value })} rows={2} className="w-full rounded-md border border-border bg-bg px-2 py-1.5" /></label>
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 items-start">
        {/* Dias */}
        <div className="space-y-4 min-w-0">
          {estado.treinos.map((t) => {
            const totalT = t.rows.reduce((s, r) => s + (r.nome.trim() ? Math.max(0, totalSeries(r.seriesConfig) - r.aquecimento) : 0), 0);
            return (
              <section key={t.key} className={`rounded-xl border bg-card overflow-hidden ${t.ativo ? "border-border" : "border-dashed border-border opacity-70"}`} aria-label={`Treino ${t.letra}`}>
                <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 flex-wrap">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/30 text-lg font-black text-accent shrink-0" aria-hidden>{t.letra}</div>
                  <input value={t.nome} onChange={(e) => updTreino(t.key, { nome: e.target.value })} className="min-w-[140px] flex-1 bg-transparent text-sm font-bold outline-none border-b border-transparent focus:border-border-strong" aria-label={`Nome do treino ${t.letra}`} />
                  <span className={`text-[11px] font-mono shrink-0 ${t.ativo && !(frequencia[t.letra] ?? 0) ? "text-warning" : "text-fg-subtle"}`} title={t.ativo && !(frequencia[t.letra] ?? 0) ? "Este treino não está na semana/ciclo: não entra no volume semanal" : undefined}>{totalT} séries válidas · ×{frequencia[t.letra] ?? 0}/sem{t.ativo && !(frequencia[t.letra] ?? 0) ? " (fora da semana)" : ""}</span>
                  <label className="inline-flex items-center gap-1 text-[11px] text-fg-muted"><input type="checkbox" checked={t.ativo} onChange={(e) => updTreino(t.key, { ativo: e.target.checked })} /> ativo</label>
                  <select aria-label={`Copiar outro treino para ${t.letra}`} value="" onChange={(e) => e.target.value && copiarDe(t.key, e.target.value)} className="h-8 rounded-md border border-border bg-bg px-1.5 text-[11px] text-fg-muted">
                    <option value="">copiar de…</option>
                    {estado.treinos.filter((x) => x.key !== t.key).map((x) => <option key={x.key} value={x.key}>{x.letra} · {x.nome}</option>)}
                  </select>
                  <button type="button" onClick={() => duplicarDia(t.key)} className="h-8 rounded-md border border-border px-2 text-[11px] text-fg-muted hover:text-fg" title="Duplicar este dia em uma nova letra">Duplicar dia</button>
                  {t.id ? <button type="button" onClick={() => void finalizarDia(t)} className="h-8 rounded-md border border-border px-2 text-[11px] text-fg-muted hover:text-fg" title="Sai dos treinos ativos (histórico preservado)">Finalizar</button> : null}
                  <button type="button" onClick={() => removerDia(t.key)} className="h-8 rounded-md border border-red/30 px-2 text-[11px] text-red" title={t.id ? "Desativar (histórico preservado)" : "Remover dia"} aria-label={`Remover treino ${t.letra}`}><Icon name="trash" size={14} /></button>
                </div>
                {duracoes[t.key] ? (
                  <PainelTempo
                    resultado={duracoes[t.key].resultado}
                    efetivos={duracoes[t.key].efetivos}
                    doTreino={t.tempos}
                    tempoAlvo={t.tempoAlvo || estado.programa.duracao_min}
                    onTreino={(tempos) => updTreino(t.key, { tempos })}
                    onTempoAlvo={(tempoAlvo) => updTreino(t.key, { tempoAlvo })}
                    onSalvarPadrao={(tp) => void salvarPadraoTempos(tp)}
                  />
                ) : null}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-surface text-fg-subtle text-[10px] uppercase tracking-wider">
                        <th className="w-8" aria-label="Ordem" />
                        <th className="text-left font-semibold px-2 py-2 min-w-[200px]">Exercício</th>
                        <th className="text-left font-semibold px-2 py-2 w-40">Grupo</th>
                        <th className="text-center font-semibold px-2 py-2 w-16">Séries</th>
                        <th className="text-left font-semibold px-2 py-2 w-28">Reps</th>
                        <th className="text-center font-semibold px-2 py-2 w-16" title="Descanso (s)">Desc.</th>
                        <th className="text-center font-semibold px-2 py-2 w-14" title="Repetições em reserva">RIR</th>
                        <th className="text-left font-semibold px-2 py-2 min-w-[160px]">Obs. para o aluno</th>
                        <th className="w-28" aria-label="Ações" />
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((r, i) => {
                        const g = resolver(r);
                        const cor = GRUPO_COR[g.grupo];
                        const alertas = alertasDoExercicio(r.nome, anamnese);
                        const altoRisco = alertas.some((a) => a.severidade === "alto");
                        const det = r.seriesConfig.modo === "detalhado";
                        return (
                          <Fragment key={r.key}>
                          <tr
                            draggable
                            onDragStart={() => (dragRef.current = { letra: t.letra, key: r.key })}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => { if (dragRef.current && dragRef.current.letra === t.letra) moverRowPara(t.key, dragRef.current.key, r.key); dragRef.current = null; }}
                            className={`group border-t border-border align-top hover:bg-card-hover/40 ${alertas.length ? (altoRisco ? "bg-red/[0.06]" : "bg-gold/[0.05]") : ""}`}
                          >
                            <td className="px-1 py-1.5 text-center align-middle">
                              <div className="flex flex-col items-center">
                                <button type="button" onClick={() => moverRow(t.key, r.key, -1)} disabled={i === 0} className="text-fg-subtle hover:text-fg disabled:opacity-30 p-0.5" aria-label="Mover para cima"><Icon name="up" size={14} /></button>
                                <span className="text-[10px] text-fg-subtle font-mono cursor-grab" title="Arraste para reordenar">{i + 1}</span>
                                <button type="button" onClick={() => moverRow(t.key, r.key, 1)} disabled={i === t.rows.length - 1} className="text-fg-subtle hover:text-fg disabled:opacity-30 p-0.5" aria-label="Mover para baixo"><Icon name="down" size={14} /></button>
                              </div>
                            </td>
                            <td className="p-0 align-top">
                              <div>
                                <div>
                                  <SeletorExercicio
                                    valor={r.nome}
                                    itens={itensBiblioteca}
                                    favoritos={favoritosSet}
                                    uso={usoMap}
                                    onTexto={(v) => {
                                      const b = itemPorNome.get(normalizarNome(v));
                                      updRow(t.key, r.key, { nome: v, bibliotecaId: b?.id ?? null, grupo: null });
                                    }}
                                    onEscolher={(item) => updRow(t.key, r.key, { nome: item.nome, bibliotecaId: item.id, grupo: null, secundarios: [], contaVolume: item.contaVolume })}
                                    onEnterLivre={() => addRow(t.key, r.key)}
                                    onMover={(dir) => moverRow(t.key, r.key, dir)}
                                    placeholder={`exercício ${i + 1}… (busque por nome, músculo ou equipamento)`}
                                    ariaLabel={`Nome do exercício ${i + 1} do treino ${t.letra}`}
                                  />
                                </div>
                                {r.nome.trim() ? (
                                  <button type="button" onClick={() => setAlternativasDe(alternativasDe === r.key ? null : r.key)} aria-expanded={alternativasDe === r.key} title="Ver alternativas para este exercício" className="ml-2 mb-1 text-[11px] text-fg-subtle hover:text-accent">
                                    ⇄ alternativas
                                  </button>
                                ) : null}
                              </div>
                              {alertas.length ? (
                                <p className="px-2 pb-1 text-[11px]" style={{ color: altoRisco ? "var(--color-red)" : "var(--color-gold)" }}>⚠ {alertas.map((a) => `${a.regiao}: ${a.mensagem}`).join(" · ")}</p>
                              ) : null}
                              {avancado ? (
                                <div className="px-2 pb-2 flex flex-wrap gap-2 text-[11px]">
                                  <label className="inline-flex items-center gap-1 text-fg-muted">aquec.<input inputMode="numeric" value={r.aquecimento} onChange={(e) => updRow(t.key, r.key, { aquecimento: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} className="w-10 rounded border border-border bg-bg px-1 text-center font-mono" aria-label="Séries de aquecimento" /></label>
                                  <label className="inline-flex items-center gap-1 text-fg-muted" title="Descanso depois do último set, antes do próximo exercício. Em branco = padrão do treino.">desc. após<input inputMode="numeric" value={r.descansoApos} placeholder={String(duracoes[t.key]?.efetivos.descansoAposExercicioSeg ?? 120)} onChange={(e) => updRow(t.key, r.key, { descansoApos: e.target.value.replace(/\D/g, "").slice(0, 3) })} className="w-12 rounded border border-border bg-bg px-1 text-center font-mono" aria-label="Descanso após o exercício em segundos" />s</label>
                                  <label className="inline-flex items-center gap-1 text-fg-muted" title="Cadência (ex.: 3-1-2 = 3 s descendo, 1 s parado, 2 s subindo). Em branco = estimativa por repetição.">cadência<input value={r.cadencia} placeholder="3-1-2" onChange={(e) => updRow(t.key, r.key, { cadencia: e.target.value.replace(/[^0-9xX\- ]/g, "").slice(0, 12) })} className="w-14 rounded border border-border bg-bg px-1 text-center font-mono" aria-label="Cadência" /></label>
                                  <select value={r.tecnica} onChange={(e) => updRow(t.key, r.key, { tecnica: e.target.value as Tecnica, unilateral: e.target.value === "unilateral" ? true : r.unilateral })} className="rounded border border-border bg-bg px-1" aria-label="Técnica">
                                    {TECNICAS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
                                  </select>
                                  {temExtras(r.tecnica) ? (
                                    <span className="inline-flex items-center gap-1 text-fg-muted" title="Usado no volume semanal. Em branco = valor padrão (mostrado em cinza).">
                                      <input inputMode="numeric" value={r.tecnicaExtras} placeholder={String(EXTRAS_PADRAO[r.tecnica])} onChange={(e) => updRow(t.key, r.key, { tecnicaExtras: e.target.value.replace(/\D/g, "").slice(0, 2) })} className="w-8 rounded border border-border bg-bg px-1 text-center font-mono" aria-label={r.tecnica === "dropset" ? "Drops por série" : "Mini-séries por série"} />
                                      {r.tecnica === "dropset" ? "drop(s)" : "mini(s)"} em
                                      <input inputMode="numeric" value={r.tecnicaSeries} placeholder={r.tecnica === "myo_reps" ? "todas" : "1"} onChange={(e) => updRow(t.key, r.key, { tecnicaSeries: e.target.value.replace(/\D/g, "").slice(0, 2) })} className="w-10 rounded border border-border bg-bg px-1 text-center font-mono" aria-label="Em quantas séries" />
                                      série(s)
                                    </span>
                                  ) : null}
                                  {(r.tecnica === "superset" || r.tecnica === "biset") ? <input value={r.bloco} onChange={(e) => updRow(t.key, r.key, { bloco: e.target.value })} placeholder="bloco (ex.: S1)" className="w-20 rounded border border-border bg-bg px-1" aria-label="Bloco do superset" /> : null}
                                  <label className="inline-flex items-center gap-1 text-fg-muted"><input type="checkbox" checked={r.unilateral} onChange={(e) => updRow(t.key, r.key, { unilateral: e.target.checked })} /> unilateral</label>
                                  <input value={r.cargaAlvo} onChange={(e) => updRow(t.key, r.key, { cargaAlvo: e.target.value })} placeholder="carga-alvo" className="w-20 rounded border border-border bg-bg px-1" aria-label="Carga-alvo" />
                                  <label className="inline-flex items-center gap-1 text-fg-muted" title="Desmarque para cardio/mobilidade (não entra no volume)"><input type="checkbox" checked={r.contaVolume} onChange={(e) => updRow(t.key, r.key, { contaVolume: e.target.checked })} /> conta volume</label>
                                  <span className="inline-flex items-center gap-1 flex-wrap">
                                    <span className="text-fg-subtle">secund.:</span>
                                    {(r.secundarios.length ? r.secundarios : g.secundarios).map((s) => (
                                      <button key={s} type="button" onClick={() => updRow(t.key, r.key, { secundarios: (r.secundarios.length ? r.secundarios : g.secundarios).filter((x) => x !== s) })} className="rounded-full border border-border px-1.5 text-fg-muted hover:text-red" title="remover">{GRUPO_LABEL[s]} ×</button>
                                    ))}
                                    <select value="" onChange={(e) => e.target.value && updRow(t.key, r.key, { secundarios: [...new Set([...(r.secundarios.length ? r.secundarios : g.secundarios), e.target.value as GrupoMuscular])] })} className="rounded border border-border bg-bg px-1" aria-label="Adicionar grupo secundário">
                                      <option value="">+</option>
                                      {GRUPOS_SELECIONAVEIS.filter((x) => x !== g.grupo).map((x) => <option key={x} value={x}>{GRUPO_LABEL[x]}</option>)}
                                    </select>
                                  </span>
                                </div>
                              ) : null}
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} aria-hidden />
                                <select
                                  value={g.grupo}
                                  onChange={(e) => updRow(t.key, r.key, { grupo: e.target.value as GrupoMuscular })}
                                  aria-label={`Grupo muscular de ${r.nome || "exercício"}`}
                                  title={g.origem === "heuristica" ? `Detectado pelo nome (confiança ${g.confianca}) — confirme` : g.origem === "biblioteca" ? "Da biblioteca" : g.origem === "correcao" ? "Correção salva por você" : "Definido manualmente"}
                                  className={`h-8 w-full rounded-md border bg-bg px-1 text-[12px] ${g.revisar ? "border-warning/60" : "border-border"}`}
                                >
                                  {GRUPOS_SELECIONAVEIS.map((x) => <option key={x} value={x}>{GRUPO_LABEL[x]}</option>)}
                                  {g.grupo === "pernas" ? <option value="pernas">Pernas (a classificar)</option> : null}
                                </select>
                              </div>
                              {g.revisar && r.nome.trim() ? <span className="block text-[10px] text-warning mt-0.5">{g.origem === "heuristica" ? "detectado pelo nome — confirme" : "legado: reclassifique"}</span> : null}
                            </td>
                            <td className="px-2 py-1.5 text-center align-top">
                              <input inputMode="numeric" value={totalSeries(r.seriesConfig)} disabled={det} onChange={(e) => updRow(t.key, r.key, { seriesConfig: configIgual(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)), repsResumo(r.seriesConfig), r.seriesConfig.modo === "iguais" ? r.seriesConfig.ie : null) })} aria-label="Número de séries" className="h-8 w-12 rounded border border-border bg-bg px-1 text-center font-mono text-[12px] disabled:opacity-50" />
                              {r.aquecimento ? <span className="block text-[10px] text-fg-subtle">−{r.aquecimento} aq.</span> : null}
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              {r.seriesConfig.modo === "detalhado" ? (
                                <div className="space-y-1">
                                  {r.seriesConfig.series.map((s, si) => (
                                    <div key={s.ordem} className="flex items-center gap-1">
                                      <span className="text-[10px] text-fg-subtle w-3">{si + 1}</span>
                                      <input value={s.reps} onChange={(e) => { const cfg = r.seriesConfig as Extract<SerieConfig, { modo: "detalhado" }>; updRow(t.key, r.key, { seriesConfig: { modo: "detalhado", series: cfg.series.map((x, j) => (j === si ? { ...x, reps: e.target.value } : x)) } }); }} aria-label={`Reps da série ${si + 1}`} className="h-7 w-16 rounded border border-border bg-bg px-1 font-mono text-[11px]" />
                                      <input value={s.descanso_seg ?? ""} onChange={(e) => { const cfg = r.seriesConfig as Extract<SerieConfig, { modo: "detalhado" }>; updRow(t.key, r.key, { seriesConfig: { modo: "detalhado", series: cfg.series.map((x, j) => (j === si ? { ...x, descanso_seg: e.target.value ? Number(e.target.value) : null } : x)) } }); }} aria-label={`Descanso da série ${si + 1}`} placeholder={String(duracoes[t.key]?.efetivos.descansoEntreSeriesSeg ?? 90)} className="h-7 w-12 rounded border border-border bg-bg px-1 font-mono text-[11px]" />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <input value={repsResumo(r.seriesConfig)} onChange={(e) => updRow(t.key, r.key, { seriesConfig: { ...(r.seriesConfig as Extract<SerieConfig, { modo: "iguais" }>), reps: e.target.value } })} placeholder="10-12" aria-label="Repetições" className="h-8 w-full min-w-[72px] rounded border border-border bg-bg px-2 font-mono text-[12px]" />
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center align-top">
                              {!det ? <input inputMode="numeric" value={(r.seriesConfig as Extract<SerieConfig, { modo: "iguais" }>).descanso_seg ?? ""} onChange={(e) => updRow(t.key, r.key, { seriesConfig: { ...(r.seriesConfig as Extract<SerieConfig, { modo: "iguais" }>), descanso_seg: e.target.value ? Number(e.target.value) : null } })} aria-label="Descanso entre séries em segundos" placeholder={String(duracoes[t.key]?.efetivos.descansoEntreSeriesSeg ?? 90)} title="Descanso entre séries (s). Em branco = padrão do treino." className="h-8 w-14 rounded border border-border bg-bg px-1 text-center font-mono text-[12px]" /> : <span className="text-[10px] text-fg-subtle">por série</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center align-top">
                              <input inputMode="numeric" value={r.rir} onChange={(e) => updRow(t.key, r.key, { rir: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} aria-label="RIR alvo" className="h-8 w-10 rounded border border-border bg-bg px-1 text-center font-mono text-[12px] text-accent font-bold" />
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <input value={r.observacoes} onChange={(e) => updRow(t.key, r.key, { observacoes: e.target.value })} placeholder="nota para o aluno" aria-label="Observação para o aluno" className="h-8 w-full rounded border border-border bg-bg px-2 text-[12px]" />
                            </td>
                            <td className="px-1 py-1.5 text-right whitespace-nowrap align-top">
                              <button type="button" onClick={() => updRow(t.key, r.key, { seriesConfig: det ? configIgual(totalSeries(r.seriesConfig), repsResumo(r.seriesConfig), null) : detalhar(r.seriesConfig) })} className="rounded border border-border px-1.5 py-1 text-[10px] font-semibold text-fg-muted hover:text-accent" title="Séries iguais ou série a série (pirâmide)">{det ? "Iguais" : "Série a série"}</button>
                              <button type="button" onClick={() => duplicarRow(t.key, r.key)} className="ml-1 rounded border border-border px-1.5 py-1 text-fg-muted hover:text-fg" title="Duplicar" aria-label="Duplicar exercício"><Icon name="copy" size={12} /></button>
                              <button type="button" onClick={() => removeRow(t.key, r.key)} className="ml-1 rounded border border-border px-1.5 py-1 text-fg-subtle hover:text-red" title={r.id ? "Remover (o histórico de sessões anteriores é preservado)" : "Remover"} aria-label="Remover exercício"><Icon name="trash" size={12} /></button>
                            </td>
                          </tr>
                          {alternativasDe === r.key ? (
                            <tr>
                              <td />
                              <td colSpan={8} className="pt-0">
                                <AlternativasExercicio
                                  origem={itemDaLinha(r)}
                                  nomeDigitado={r.nome}
                                  itens={itensBiblioteca}
                                  equivalencias={equivalencias}
                                  contexto={contextoAluno}
                                  onTrocar={(item) => {
                                    updRow(t.key, r.key, { nome: item.nome, bibliotecaId: item.id, grupo: null, secundarios: [], contaVolume: item.contaVolume });
                                    setAlternativasDe(null);
                                  }}
                                  onFechar={() => setAlternativasDe(null)}
                                />
                              </td>
                            </tr>
                          ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-border-strong">
                  <button type="button" onClick={() => addRow(t.key)} className="touch px-3 text-left text-fg-muted hover:text-accent text-[12.5px] font-semibold inline-flex items-center gap-1"><Icon name="plus" size={14} /> Adicionar exercício</button>
                  <input value={t.observacoes} onChange={(e) => updTreino(t.key, { observacoes: e.target.value })} placeholder="Observação do treino (aluno vê)" aria-label={`Observação do treino ${t.letra}`} className="h-9 m-1 w-72 max-w-[50%] rounded border border-border bg-bg px-2 text-[12px]" />
                </div>
              </section>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addDia} disabled={!proximaLetraLivre(estado.treinos)} className="touch rounded-md border border-dashed border-border-strong px-4 text-sm font-semibold text-fg-muted hover:text-accent disabled:opacity-40 inline-flex items-center gap-1"><Icon name="plus" size={14} /> Adicionar dia ({proximaLetraLivre(estado.treinos) ?? "—"})</button>
          </div>

          <section className="rounded-xl border border-border bg-card">
            <button type="button" onClick={() => setShowFinalizados((v) => !v)} className="w-full px-4 py-3 text-left text-sm font-bold flex items-center justify-between" aria-expanded={showFinalizados}>
              <span>Treinos finalizados ({finalizados.length})</span>
              <span className="text-fg-subtle text-xs">{showFinalizados ? "▲" : "▼"}</span>
            </button>
            {showFinalizados ? (
              <ul className="divide-y divide-border">
                {finalizados.length === 0 ? <li className="px-4 py-3 text-sm text-fg-subtle">Nenhum treino finalizado.</li> : finalizados.map((t) => (
                  <li key={t.id} className="px-4 py-3 text-sm text-fg-muted flex items-center gap-2"><span className="font-bold text-fg">{t.letra}</span> · {t.nome} <span className="text-fg-subtle text-xs">({t.exercicios} exercícios)</span></li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        {/* Lateral: anamnese + tabela de volume */}
        <div className="space-y-4 xl:sticky xl:top-4 self-start">
          <CartaoAnamnese anamnese={anamnese} />
          <TabelaVolume
            resultado={volume}
            metas={estado.programa.metas_volume}
            prioridades={estado.programa.prioridades}
            nivel={estado.programa.nivel || null}
            incluirSecundario={incluirSecundario}
            realizado={realizadoSemanal}
            onMetas={(m) => updPrograma({ metas_volume: m })}
            onPrioridades={(p) => updPrograma({ prioridades: p })}
            onSecundario={setIncluirSecundario}
            regraTecnicas={regraTecnicas}
            onRegraTecnicas={setRegraTecnicas}
            ajustarPorRir={ajustarPorRir}
            onAjustarPorRir={setAjustarPorRir}
          />
        </div>
      </div>

    </div>
  );
}
