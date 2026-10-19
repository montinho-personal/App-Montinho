// ============================================================================
// Conversão entre catálogo, linhas do banco e o formato usado pelo app
// (ItemBiblioteca), além de utilidades de interpretação de texto livre.
// ============================================================================

import type { Equipamento, GrupoMuscular } from "@/lib/supabase/types-extended";
import { normalizarNome } from "@/lib/grupos";
import { EQUIPAMENTO_LABEL, type ExercicioCatalogo, type ItemBiblioteca, type Nivel, type RegiaoEstresse } from "./tipos";

export function itemDoCatalogo(e: ExercicioCatalogo, id = `cat-${e.slug}`): ItemBiblioteca {
  return {
    id,
    slug: e.slug,
    nome: e.nome,
    sinonimos: e.sinonimos,
    grupo: e.grupo,
    secundarios: Object.keys(e.pesosSecundarios) as GrupoMuscular[],
    pesosSecundarios: e.pesosSecundarios,
    padrao: e.padrao,
    articulacoes: e.articulacoes,
    equipamento: e.equipamento,
    tipo: e.tipo,
    nivel: e.nivel,
    execucao: e.execucao,
    erros: e.erros,
    registro: e.registro,
    estresse: e.estresse,
    contaVolume: e.contaVolume,
    origem: "catalogo",
    midia: null,
  };
}

/** Linha de `exercicios_biblioteca` (com as colunas da migration 0012) → ItemBiblioteca. */
export type LinhaBiblioteca = {
  id: string;
  slug: string;
  nome: string;
  grupo_muscular: GrupoMuscular;
  grupos_secundarios?: GrupoMuscular[] | null;
  equipamento?: Equipamento[] | null;
  sinonimos?: string[] | null;
  instrucoes?: string[] | null;
  erros_comuns?: string[] | null;
  padrao_movimento?: string | null;
  articulacoes?: string[] | null;
  tipo_movimento?: string | null;
  campos_registro?: string[] | null;
  pesos_secundarios?: Record<string, number> | null;
  estresse_articular?: string[] | null;
  nivel_minimo?: string | null;
  conta_volume?: boolean | null;
  origem?: string | null;
  video_provider?: string | null;
  video_id?: string | null;
  video_validado?: boolean | null;
};

export function itemDoBanco(r: LinhaBiblioteca): ItemBiblioteca {
  const pesos = (r.pesos_secundarios ?? {}) as Partial<Record<GrupoMuscular, number>>;
  const secundarios = (r.grupos_secundarios?.length ? r.grupos_secundarios : (Object.keys(pesos) as GrupoMuscular[])) ?? [];
  return {
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    sinonimos: r.sinonimos ?? [],
    grupo: r.grupo_muscular,
    secundarios,
    pesosSecundarios: pesos,
    padrao: (r.padrao_movimento as ItemBiblioteca["padrao"]) ?? null,
    articulacoes: (r.articulacoes ?? []) as ItemBiblioteca["articulacoes"],
    equipamento: r.equipamento ?? [],
    tipo: (r.tipo_movimento as ItemBiblioteca["tipo"]) ?? null,
    nivel: (r.nivel_minimo as Nivel | null) ?? null,
    execucao: r.instrucoes ?? [],
    erros: r.erros_comuns ?? [],
    registro: (r.campos_registro?.length ? r.campos_registro : ["carga", "repeticoes"]) as ItemBiblioteca["registro"],
    estresse: (r.estresse_articular ?? []) as RegiaoEstresse[],
    contaVolume: r.conta_volume ?? true,
    origem: r.origem === "catalogo" ? "catalogo" : "treinador",
    midia: r.video_provider && r.video_id ? { provider: r.video_provider, id: r.video_id, verificada: !!r.video_validado } : null,
  };
}

// ---------------------------------------------------------------------------
// Texto livre → equipamentos (campo "Equipamentos" do programa)
// ---------------------------------------------------------------------------
const SINONIMOS_EQUIPAMENTO: Array<[RegExp, Equipamento]> = [
  [/barra fixa|pull ?up/, "barra_fixa"],
  [/barra w|barra ez/, "barra_w"],
  [/paralela/, "paralelas"],
  [/anilha|disco/, "anilha"],
  [/trx|suspensao|fita/, "trx"],
  [/bola/, "bola"],
  [/roda/, "roda"],
  [/caneleira|tornozeleira/, "caneleira"],
  [/smith/, "smith"],
  [/halter|dumbbell/, "halter"],
  [/kettle/, "kettlebell"],
  [/maquina|aparelho/, "maquina"],
  [/polia|cabo|cross/, "polia"],
  [/elastico|band/, "elastico"],
  [/banco/, "banco"],
  [/corda/, "corda"],
  [/peso corporal|calistenia|livre de carga/, "peso_corporal"],
  [/^barra$|barra livre|barra olimpica|^barras?$/, "barra"],
];

export function interpretarEquipamentos(lista: string[] | null | undefined): Equipamento[] {
  const out = new Set<Equipamento>();
  for (const bruto of lista ?? []) {
    const t = normalizarNome(bruto);
    if (!t) continue;
    const direto = (Object.keys(EQUIPAMENTO_LABEL) as Equipamento[]).find((k) => k === t || normalizarNome(EQUIPAMENTO_LABEL[k]) === t);
    if (direto) {
      out.add(direto);
      continue;
    }
    for (const [rx, eq] of SINONIMOS_EQUIPAMENTO) if (rx.test(t)) out.add(eq);
  }
  return [...out];
}

/** Equipamentos "acessórios" que não bloqueiam uma sugestão por si só. */
const ACESSORIOS: Equipamento[] = ["peso_corporal", "banco", "corda", "caneleira"];

/**
 * O exercício é viável com estes equipamentos? A lista do catálogo traz
 * alternativas (ex.: halter OU kettlebell): basta um implemento principal.
 */
export function equipamentoDisponivel(item: Pick<ItemBiblioteca, "equipamento">, disponiveis: Equipamento[] | null | undefined): boolean {
  if (!disponiveis || !disponiveis.length) return true; // sem informação: não filtra
  const principais = item.equipamento.filter((e) => !ACESSORIOS.includes(e));
  if (!principais.length) return true;
  return principais.some((e) => disponiveis.includes(e));
}

export function nivelNumero(n: Nivel | string | null | undefined): number {
  return n === "avancado" ? 3 : n === "intermediario" ? 2 : n === "iniciante" ? 1 : 0;
}
