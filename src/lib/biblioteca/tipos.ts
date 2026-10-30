// ============================================================================
// Tipos da Biblioteca Inteligente de Exercícios.
// Arquivo só de tipos/constantes (sem dependências), para ser importado tanto
// pelo app quanto pelo gerador do SQL do catálogo (scripts/gerar-sql-catalogo).
// ============================================================================

import type { Equipamento, GrupoMuscular } from "@/lib/supabase/types-extended";

export type PadraoMovimento =
  | "empurrar_horizontal"
  | "empurrar_inclinado"
  | "empurrar_vertical"
  | "aducao_horizontal"
  | "puxar_vertical"
  | "puxar_horizontal"
  | "extensao_ombro"
  | "abducao_ombro"
  | "flexao_ombro"
  | "abducao_horizontal"
  | "rotacao_externa"
  | "elevacao_escapular"
  | "flexao_cotovelo"
  | "extensao_cotovelo"
  | "agachar"
  | "avanco"
  | "extensao_joelho"
  | "dobradica_quadril"
  | "flexao_joelho"
  | "extensao_quadril"
  | "abducao_quadril"
  | "aducao_quadril"
  | "flexao_plantar"
  | "flexao_tronco"
  | "flexao_quadril"
  | "rotacao_tronco"
  | "antiextensao"
  | "antiflexao_lateral"
  | "antirrotacao"
  | "extensao_tronco"
  | "flexao_punho"
  | "extensao_punho"
  | "carregamento";

export const PADRAO_LABEL: Record<PadraoMovimento, string> = {
  empurrar_horizontal: "Empurrar horizontal",
  empurrar_inclinado: "Empurrar inclinado",
  empurrar_vertical: "Empurrar vertical",
  aducao_horizontal: "Adução horizontal do ombro",
  puxar_vertical: "Puxar vertical",
  puxar_horizontal: "Puxar horizontal",
  extensao_ombro: "Extensão do ombro",
  abducao_ombro: "Abdução do ombro",
  flexao_ombro: "Flexão do ombro",
  abducao_horizontal: "Abdução horizontal do ombro",
  rotacao_externa: "Rotação externa do ombro",
  elevacao_escapular: "Elevação escapular",
  flexao_cotovelo: "Flexão do cotovelo",
  extensao_cotovelo: "Extensão do cotovelo",
  agachar: "Agachar",
  avanco: "Avanço (unilateral)",
  extensao_joelho: "Extensão do joelho",
  dobradica_quadril: "Dobradiça de quadril",
  flexao_joelho: "Flexão do joelho",
  extensao_quadril: "Extensão do quadril",
  abducao_quadril: "Abdução do quadril",
  aducao_quadril: "Adução do quadril",
  flexao_plantar: "Flexão plantar",
  flexao_tronco: "Flexão do tronco",
  flexao_quadril: "Flexão do quadril",
  rotacao_tronco: "Rotação do tronco",
  antiextensao: "Antiextensão (estabilidade)",
  antiflexao_lateral: "Antiflexão lateral (estabilidade)",
  antirrotacao: "Antirrotação (estabilidade)",
  extensao_tronco: "Extensão do tronco",
  flexao_punho: "Flexão do punho",
  extensao_punho: "Extensão do punho",
  carregamento: "Carregamento",
};

export type Articulacao = "ombro" | "escapula" | "cotovelo" | "punho" | "coluna" | "quadril" | "joelho" | "tornozelo";

export const ARTICULACAO_LABEL: Record<Articulacao, string> = {
  ombro: "Ombro",
  escapula: "Escápula",
  cotovelo: "Cotovelo",
  punho: "Punho",
  coluna: "Coluna",
  quadril: "Quadril",
  joelho: "Joelho",
  tornozelo: "Tornozelo",
};

export type TipoMovimento = "multiarticular" | "monoarticular";

export type CampoRegistro = "carga" | "repeticoes" | "tempo" | "distancia" | "assistencia" | "calorias";

export const CAMPO_REGISTRO_LABEL: Record<CampoRegistro, string> = {
  carga: "Carga (kg)",
  repeticoes: "Repetições",
  tempo: "Tempo (s)",
  distancia: "Distância (m)",
  assistencia: "Assistência (kg)",
  calorias: "Calorias",
};

/** Regiões com estresse articular relevante (casam com as regiões de src/lib/restricoes.ts). */
export type RegiaoEstresse = "joelho" | "ombro" | "lombar" | "cotovelo_punho" | "quadril";

export const REGIAO_ESTRESSE_LABEL: Record<RegiaoEstresse, string> = {
  joelho: "Joelho",
  ombro: "Ombro",
  lombar: "Lombar / Coluna",
  cotovelo_punho: "Cotovelo / Punho",
  quadril: "Quadril",
};

export type Nivel = "iniciante" | "intermediario" | "avancado";

export const NIVEL_LABEL: Record<Nivel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const EQUIPAMENTO_LABEL: Record<Equipamento, string> = {
  barra: "Barra",
  halter: "Halteres",
  maquina: "Máquina",
  polia: "Polia",
  peso_corporal: "Peso corporal",
  cabo: "Cabo",
  kettlebell: "Kettlebell",
  elastico: "Elástico",
  esteira: "Esteira",
  bike: "Bicicleta",
  corda: "Corda",
  banco: "Banco",
  smith: "Smith",
  outro: "Outro",
  barra_fixa: "Barra fixa",
  paralelas: "Paralelas",
  anilha: "Anilha",
  barra_w: "Barra W",
  trx: "Fita de suspensão",
  bola: "Bola suíça",
  roda: "Roda abdominal",
  caneleira: "Caneleira",
};

/**
 * Exercício do catálogo (fonte única: src/lib/biblioteca/catalogo.ts).
 * `pesosSecundarios`: fração de série atribuída a cada músculo secundário na
 * estimativa de volume PONDERADO (o volume direto conta só `grupo`).
 */
export type ExercicioCatalogo = {
  slug: string;
  nome: string;
  sinonimos: string[];
  grupo: GrupoMuscular;
  pesosSecundarios: Partial<Record<GrupoMuscular, number>>;
  padrao: PadraoMovimento;
  articulacoes: Articulacao[];
  equipamento: Equipamento[];
  tipo: TipoMovimento;
  nivel: Nivel;
  execucao: string[];
  erros: string[];
  substituicoes: string[];
  registro: CampoRegistro[];
  estresse: RegiaoEstresse[];
  /** false para exercícios que não entram na contagem de séries (ex.: carregamento). */
  contaVolume: boolean;
};

/** Item da biblioteca como o app o usa (catálogo + cadastros do treinador). */
export type ItemBiblioteca = {
  id: string;
  slug: string;
  nome: string;
  sinonimos: string[];
  grupo: GrupoMuscular;
  secundarios: GrupoMuscular[];
  pesosSecundarios: Partial<Record<GrupoMuscular, number>>;
  padrao: PadraoMovimento | null;
  articulacoes: Articulacao[];
  equipamento: Equipamento[];
  tipo: TipoMovimento | null;
  nivel: Nivel | null;
  execucao: string[];
  erros: string[];
  registro: CampoRegistro[];
  estresse: RegiaoEstresse[];
  contaVolume: boolean;
  origem: "catalogo" | "treinador";
  /** Mídia só conta quando verificada pelo treinador (video_validado). */
  midia: { provider: string; id: string; verificada: boolean } | null;
};

export type StatusEquivalencia = "sugerida" | "aprovada" | "rejeitada";

export type Equivalencia = {
  exercicioId: string;
  alternativaId: string;
  origem: "catalogo" | "treinador";
  status: StatusEquivalencia;
  nota: string | null;
};
