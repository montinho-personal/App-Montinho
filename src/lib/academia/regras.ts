// ============================================================================
// Academia da Tribo (pedido do Montinho, 05/11/2026) — regras PURAS.
// A tribo constrói academias com as toneladas REAIS da musculação.
// O banco (0146) é quem conta e conclui; aqui fica o espelho testado das
// contas (usado na demo e nas telas): etapas, progresso, previsão, banners,
// simulador e textos. Nada aqui inventa números: tudo sai dos dados reais.
// ============================================================================

import { tipoDePeso, type PadraoCarga } from "@/lib/treino/padrao-carga";

/** Série com carga acima disso (ou reps acima de REPS_MAX) fica de fora até o personal liberar. */
export const CARGA_MAX_KG = 500;
export const REPS_MAX = 100;

export type EstadoObra = "rascunho" | "ativa" | "concluida";

export type Obra = {
  id: string;
  ordem: number;
  modelo: ModeloObra;
  nome: string;
  narrativa: string | null;
  area_m2: number;
  materiais_t: number;
  meta_kg: number;
  banner_dias: number;
  mostrar_contribuicoes: boolean;
  estado: EstadoObra;
  ativada_em: string | null;
  concluida_em: string | null;
};

export type DadosObra = Obra & {
  total_kg: number;
  participantes: number;
  treinos: number;
  meu_kg: number;
  meus_treinos: number;
  por_dia: Array<{ dia: string; kg: number }>;
};

// ---------------------------------------------------------------------------
// Catálogo das academias (porte e hipótese de materiais; a META em toneladas
// de treino é definida pelo personal no simulador, antes de cada obra).
// Materiais ≈ intensidade de materiais de edificações (ordem de 1 t/m² em
// construção leve de 1 pavimento, mais nas de vários pavimentos) — estimativa
// ilustrativa, não quantitativo de engenharia.
// ---------------------------------------------------------------------------
export type ModeloObra = "bairro" | "expansao" | "moderna" | "centro" | "premium" | "complexo";

export const CATALOGO_OBRAS: Array<{ modelo: ModeloObra; nome: string; area_m2: number; materiais_t: number; pavimentos: number; descricao: string }> = [
  { modelo: "bairro", nome: "Academia de Bairro", area_m2: 200, materiais_t: 200, pavimentos: 1, descricao: "Pequena, acolhedora, com o essencial para treinar bem." },
  { modelo: "expansao", nome: "Academia em Expansão", area_m2: 400, materiais_t: 440, pavimentos: 1, descricao: "Mais espaço, mais aparelhos e uma área de pesos livres maior." },
  { modelo: "moderna", nome: "Academia Moderna", area_m2: 800, materiais_t: 1000, pavimentos: 2, descricao: "Dois andares, fachada de vidro e espaço para aulas." },
  { modelo: "centro", nome: "Centro de Treinamento", area_m2: 1500, materiais_t: 2000, pavimentos: 2, descricao: "Área de força, cardio, funcional e avaliação." },
  { modelo: "premium", nome: "Academia Premium", area_m2: 2500, materiais_t: 3500, pavimentos: 3, descricao: "Três andares, vestiários completos e terraço." },
  { modelo: "complexo", nome: "Complexo Fitness de Luxo", area_m2: 5000, materiais_t: 7500, pavimentos: 3, descricao: "O maior de todos: academia, piscina, quadras e spa." },
];

export const infoModelo = (m: string) => CATALOGO_OBRAS.find((c) => c.modelo === m) ?? CATALOGO_OBRAS[0];

/** Proposta aprovada pelo Montinho (05/11/2026): 200 m², 200 t de materiais, meta de 6.000 t. */
export const PRIMEIRA_OBRA = { ...CATALOGO_OBRAS[0], meta_kg: 6_000_000, banner_dias: 7 };

export const REFERENCIAS_OBRA = [
  { titulo: "Material intensity of buildings (Journal of Industrial Ecology)", url: "https://doi.org/10.1111/JIEC.13143" },
  { titulo: "Material intensity of buildings (Journal of Building Engineering)", url: "https://doi.org/10.1016/j.jobe.2023.108234" },
];

export const VOCE_SABIA = "Uma edificação do porte desta academia, com aproximadamente 200 m², pode representar cerca de 200 toneladas de materiais, dependendo do projeto e do sistema construtivo. Nossa tribo vai transformar toneladas movimentadas nos treinos em progresso de construção!";

// ---------------------------------------------------------------------------
// Toneladas de um treino (espelho de obra_kg_sessao na 0146)
// ---------------------------------------------------------------------------
export type SerieObra = { id?: string; tipo: string; carga_kg: number | null; reps: number | null; blocos?: Array<{ carga?: number | null; reps?: number | null }> | null };
export type ExercicioObra = { nome: string; equipamento?: readonly string[] | null; unilateral?: boolean | null; series: SerieObra[] };

/** kg de uma série (sem o dobro do “por lado”): blocos somados um a um. */
export function kgDaSerie(s: SerieObra): number {
  if (s.blocos && s.blocos.length) return s.blocos.reduce((t, b) => t + (Number(b.carga ?? s.carga_kg ?? 0) || 0) * (Number(b.reps ?? 0) || 0), 0);
  return (s.carga_kg ?? 0) * (s.reps ?? 0);
}

/** Exercício feito um lado de cada vez: 1 série anotada = os dois lados (pedido do Montinho, 05/11/2026). */
const NOME_UNILATERAL = /unilateral|serrote|concentrad|bulgar/;
export const ehUnilateral = (e: Pick<ExercicioObra, "nome" | "unilateral">) =>
  !!e.unilateral || NOME_UNILATERAL.test(e.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());

export const serieForaDoLimite = (s: SerieObra) => (s.carga_kg ?? 0) > CARGA_MAX_KG || (s.reps ?? 0) > REPS_MAX;

/** Toneladas (em kg) de um treino + quantas séries ficaram para o personal conferir. */
export function kgDaSessao(exs: ExercicioObra[], padrao: PadraoCarga, liberadas: ReadonlySet<string> = new Set()): { kg: number; conferir: number } {
  let kg = 0;
  let conferir = 0;
  for (const e of exs) {
    const tipo = tipoDePeso(e);
    const dobro = (tipo && padrao[tipo] === "por_lado" ? 2 : 1) * (ehUnilateral(e) ? 2 : 1);
    for (const s of e.series) {
      if (s.tipo === "aquecimento") continue;
      if (serieForaDoLimite(s) && !(s.id && liberadas.has(s.id))) {
        conferir++;
        continue;
      }
      const v = kgDaSerie(s);
      if (v > 0) kg += v * dobro;
    }
  }
  return { kg: Math.round(kg * 10) / 10, conferir };
}

/** O treino entra na obra? Só começado (e criado no servidor) depois da ativação e antes da inauguração. */
export function treinoEntraNaObra(t: { iniciado_em: string; created_at?: string | null }, obra: Pick<Obra, "estado" | "ativada_em">): boolean {
  if (obra.estado !== "ativa" || !obra.ativada_em) return false;
  const a = Date.parse(obra.ativada_em);
  return Date.parse(t.iniciado_em) >= a && (t.created_at == null || Date.parse(t.created_at) >= a);
}

// ---------------------------------------------------------------------------
// Etapas da obra (ordem do processo construtivo)
// ---------------------------------------------------------------------------
export type Etapa = { n: number; pct: number; nome: string; curto: string; texto: string };

export const ETAPAS: Etapa[] = [
  { n: 0, pct: 0, nome: "Terreno", curto: "Terreno", texto: "Toda grande história começa do zero. Hoje, nossa tribo começa a construir a sua academia." },
  { n: 1, pct: 10, nome: "Fundação", curto: "Fundação", texto: "O primeiro passo está dado. A base da nossa academia já está pronta!" },
  { n: 2, pct: 25, nome: "Estrutura principal", curto: "Estrutura", texto: "Os pilares e as vigas estão de pé. Dá para ver o tamanho do que estamos construindo." },
  { n: 3, pct: 40, nome: "Paredes e cobertura", curto: "Paredes", texto: "As paredes subiram e o telhado está chegando. A academia já tem forma!" },
  { n: 4, pct: 55, nome: "Fachada e instalações", curto: "Fachada", texto: "A fachada ganhou o nome da tribo e a parte elétrica e hidráulica está sendo instalada." },
  { n: 5, pct: 70, nome: "Equipamentos chegando", curto: "Equipamentos", texto: "As máquinas estão chegando! A força da tribo está transformando este projeto em realidade." },
  { n: 6, pct: 85, nome: "Acabamentos finais", curto: "Acabamentos", texto: "Estamos perto da inauguração. Falta pouco para abrir as portas da nossa academia!" },
  { n: 7, pct: 100, nome: "Inaugurada", curto: "Inaugurada", texto: "Ela está pronta! Os treinos da tribo transformaram um terreno vazio em uma academia construída pela nossa força." },
];

export const pctDaObra = (totalKg: number, metaKg: number) => (metaKg > 0 ? Math.max(0, Math.min(100, (totalKg / metaKg) * 100)) : 0);

export function etapaDe(pct: number, concluida = false): Etapa {
  if (concluida) return ETAPAS[7];
  let e = ETAPAS[0];
  for (const x of ETAPAS) if (pct >= x.pct && x.n < 7) e = x;
  return e;
}

/** Próximo marco e quanto falta (em kg de treino). */
export function proximoMarco(totalKg: number, metaKg: number): { etapa: Etapa; faltaKg: number } | null {
  const pct = pctDaObra(totalKg, metaKg);
  const prox = ETAPAS.find((e) => e.pct > pct);
  if (!prox) return null;
  return { etapa: prox, faltaKg: Math.max(0, (prox.pct / 100) * metaKg - totalKg) };
}

/** Materiais “desbloqueados” (mecânica de jogo: meta de treino ÷ materiais). */
export const materiaisDesbloqueados = (totalKg: number, o: Pick<Obra, "meta_kg" | "materiais_t">) => Math.min(o.materiais_t, (totalKg / o.meta_kg) * o.materiais_t);
/** Quantas toneladas de treino viram 1 t de material. */
export const conversao = (o: Pick<Obra, "meta_kg" | "materiais_t">) => o.meta_kg / 1000 / o.materiais_t;

// ---------------------------------------------------------------------------
// Previsão e simulador (média móvel de 14 dias; com pouco dado não inventa)
// ---------------------------------------------------------------------------
const DIA = 86_400_000;
export const PREVISAO = { janelaDias: 14, minDias: 7, minTreinos: 5 } as const;

/** “calculando”: quando a previsão sai (`aPartirDe`, 7 dias depois da ativação) e quantos treinos ainda faltam. */
export type Previsao = { tipo: "calculando"; aPartirDe?: string; faltamTreinos?: number } | { tipo: "pronta" } | { tipo: "data"; data: string; kgPorSemana: number; semanas: number };

export function previsaoDaObra(d: Pick<DadosObra, "total_kg" | "meta_kg" | "treinos" | "ativada_em" | "estado" | "por_dia">, agora: Date): Previsao {
  if (d.estado === "concluida" || d.total_kg >= d.meta_kg) return { tipo: "pronta" };
  if (!d.ativada_em) return { tipo: "calculando" };
  const dias = (agora.getTime() - Date.parse(d.ativada_em)) / DIA;
  if (dias < PREVISAO.minDias || d.treinos < PREVISAO.minTreinos) {
    const out: Previsao = { tipo: "calculando" };
    if (dias < PREVISAO.minDias) out.aPartirDe = new Date(Date.parse(d.ativada_em) + PREVISAO.minDias * DIA).toISOString();
    if (d.treinos < PREVISAO.minTreinos) out.faltamTreinos = PREVISAO.minTreinos - d.treinos;
    return out;
  }
  const janela = Math.min(PREVISAO.janelaDias, dias);
  const desde = agora.getTime() - janela * DIA;
  const kg = d.por_dia.filter((p) => Date.parse(`${p.dia}T12:00:00-03:00`) >= desde - DIA / 2).reduce((t, p) => t + p.kg, 0);
  const porDia = kg / janela;
  if (porDia <= 0) return { tipo: "calculando" };
  const faltaDias = (d.meta_kg - d.total_kg) / porDia;
  return { tipo: "data", data: new Date(agora.getTime() + faltaDias * DIA).toISOString(), kgPorSemana: porDia * 7, semanas: faltaDias / 7 };
}

/** Quantas semanas a obra leva em cada ritmo (kg por semana). */
export const semanasPara = (metaKg: number, kgPorSemana: number) => (kgPorSemana > 0 ? metaKg / kgPorSemana : Infinity);

export function cenarios(metaKg: number, ritmoAtualKgSemana: number): Array<{ rotulo: string; kgSemana: number; semanas: number }> {
  const base = Math.max(1, ritmoAtualKgSemana);
  return [
    { rotulo: "Ritmo caindo (−30%)", kgSemana: base * 0.7, semanas: semanasPara(metaKg, base * 0.7) },
    { rotulo: "Ritmo de agora", kgSemana: base, semanas: semanasPara(metaKg, base) },
    { rotulo: "Tribo crescendo (+30%)", kgSemana: base * 1.3, semanas: semanasPara(metaKg, base * 1.3) },
  ];
}

/** Ritmo recente: média das semanas FECHADAS (a atual ainda não terminou). */
export function ritmoRecente(semanas: Array<{ semana: string; kg: number }>, hojeSegunda: string, quantas = 3): number {
  const fechadas = semanas.filter((s) => s.semana < hojeSegunda).slice(-quantas);
  if (!fechadas.length) return 0;
  return fechadas.reduce((t, s) => t + s.kg, 0) / fechadas.length;
}

// ---------------------------------------------------------------------------
// Destaque na Home: lançamento (dias configuráveis) → card compacto; inauguração.
// ---------------------------------------------------------------------------
export type DestaqueHome = { lancamento: boolean; inauguracao: Pick<Obra, "id" | "nome"> | null; compacto: boolean };

export function destaqueNaHome(obras: Obra[], agora: Date): DestaqueHome {
  const ativa = obras.find((o) => o.estado === "ativa") ?? null;
  const lancamento = !!ativa?.ativada_em && agora.getTime() < Date.parse(ativa.ativada_em) + ativa.banner_dias * DIA;
  const ultima = obras
    .filter((o) => o.estado === "concluida" && o.concluida_em)
    .sort((a, b) => Date.parse(b.concluida_em!) - Date.parse(a.concluida_em!))[0];
  const inauguracao = ultima && agora.getTime() < Date.parse(ultima.concluida_em!) + ultima.banner_dias * DIA ? { id: ultima.id, nome: ultima.nome } : null;
  return { lancamento, inauguracao, compacto: !!ativa && !lancamento };
}

// ---------------------------------------------------------------------------
// Textos (sempre com os números reais; nada inventado)
// ---------------------------------------------------------------------------
/** Materiais na obra: em kg enquanto não chega a 1 t (para não mostrar “0 t” no começo). */
export const textoMateriais = (t: number) =>
  t < 1 ? `${Math.floor(t * 1000).toLocaleString("pt-BR")} kg` : `${(t < 10 ? Math.floor(t * 10) / 10 : Math.floor(t)).toLocaleString("pt-BR")} t`;

export const toneladas = (kg: number) => {
  const t = kg / 1000;
  return t >= 100 ? Math.round(t).toLocaleString("pt-BR") : t.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
};

export function frasesDaObra(d: Pick<DadosObra, "total_kg" | "meta_kg" | "participantes" | "treinos" | "estado" | "nome">): string[] {
  const out: string[] = [];
  if (d.estado === "concluida") {
    out.push(`${d.treinos.toLocaleString("pt-BR")} treinos de ${d.participantes} ${d.participantes === 1 ? "pessoa" : "pessoas"} levantaram ${toneladas(d.total_kg)} toneladas para erguer a ${d.nome}.`);
    return out;
  }
  if (d.total_kg <= 0) {
    out.push("A obra começou do zero. O primeiro treino de musculação concluído coloca o primeiro tijolo.");
    return out;
  }
  out.push(`${d.participantes} ${d.participantes === 1 ? "pessoa já ajudou" : "pessoas já ajudaram"} com ${d.treinos.toLocaleString("pt-BR")} ${d.treinos === 1 ? "treino" : "treinos"}.`);
  const prox = proximoMarco(d.total_kg, d.meta_kg);
  if (prox) out.push(`Faltam ${toneladas(prox.faltaKg)} t para: ${prox.etapa.nome}.`);
  return out;
}

/** Texto curto da notificação/banner da inauguração (os mesmos números do banco). */
export function textoInauguracao(d: Pick<DadosObra, "nome" | "total_kg" | "participantes" | "ativada_em" | "concluida_em">): string {
  const dias = d.ativada_em && d.concluida_em ? Math.max(1, Math.round((Date.parse(d.concluida_em) - Date.parse(d.ativada_em)) / DIA)) : null;
  return `${dias ? `Depois de ${dias} ${dias === 1 ? "dia" : "dias"}, ` : ""}${toneladas(d.total_kg)} toneladas movimentadas e ${d.participantes} ${d.participantes === 1 ? "participante" : "participantes"}, a ${d.nome} foi inaugurada!`;
}

export const duracaoTexto = (ini: string, fim: string) => {
  const dias = Math.max(1, Math.round((Date.parse(fim) - Date.parse(ini)) / DIA));
  if (dias < 60) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const meses = Math.round(dias / 30.4);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
};
