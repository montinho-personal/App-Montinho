// ============================================================================
// Minha Jornada — organização VISUAL das conquistas em capítulos, posição
// atual do aluno e linha do tempo. Tudo é derivado do motor oficial
// (vitrine/regras/conquistas gravadas): aqui não se concede nada.
//
// • Capítulos são narrativa, não barreira: uma medalha do capítulo 3 pode
//   sair antes de uma do capítulo 1.
// • “Você está aqui” = logo depois da MEDALHA DO CAMINHO mais avançada já
//   conquistada (treinos, metas, constância, acompanhamento, fases) — não só
//   nº de treinos. Medalhas “paralelas” (abrir a evolução, técnicas, Além do
//   necessário, Samurai), recordes e retomadas acendem, mas não empurram o
//   marcador: antes, quem só abria a Evolução (0 treinos) caía no capítulo 3
//   (23/10/2026). Os ciclos de tempo só contam depois de todas as medalhas.
// • Depois do capítulo 4 a trilha continua com ciclos de acompanhamento
//   (6 meses, 1 ano…) a partir das semanas reais — marcos, não medalhas novas.
// ============================================================================

import { dataLocal, somarDias, type Semana } from "@/lib/aderencia/calcular";
import type { CodigoConquista } from "./regras";
import type { Medalha } from "./vitrine";
import { CONTEUDO, nomeDaConquista } from "./conteudo";

export type Capitulo = { numero: number; titulo: string; subtitulo: string; cenario: "trilha" | "ponte" | "mirante" | "montanha" | "horizonte" };

export const CAPITULOS: Capitulo[] = [
  { numero: 1, titulo: "Começando", subtitulo: "O primeiro contato com a rotina.", cenario: "trilha" },
  { numero: 2, titulo: "Criando consistência", subtitulo: "A repetição dos treinos e as metas da semana.", cenario: "ponte" },
  { numero: 3, titulo: "Evoluindo", subtitulo: "Desempenho, registros e autoconhecimento.", cenario: "mirante" },
  { numero: 4, titulo: "Continuando", subtitulo: "Acompanhamento prolongado e retomadas.", cenario: "montanha" },
  { numero: 5, titulo: "Seguindo em frente", subtitulo: "Ciclos de acompanhamento ao longo do tempo.", cenario: "horizonte" },
];

/** Em que capítulo cada medalha aparece (só visual). */
export const CAPITULO_DA_MEDALHA: Record<Exclude<CodigoConquista, "recorde" | "eu_voltei" | "desafio_concluido">, number> = {
  primeiro_treino: 1,
  criando_raizes: 1,
  primeira_meta_semanal: 1,
  missao_cumprida: 1,
  cada_quilo_conta: 1,
  terceiro_especial: 1,
  voltei_pro_jogo: 1,
  ponto_de_partida: 1,
  olhar_de_aguia: 1,
  treinos_10: 2,
  primeiro_mes: 2,
  constancia_vida_real: 2,
  semanas_consistentes_4: 2,
  relatorio_mensal: 3,
  treinos_25: 3,
  semanas_consistentes_5: 2,
  semanas_consistentes_6: 3,
  semanas_consistentes_8: 3,
  semanas_consistentes_10: 4,
  semanas_consistentes_12: 4,
  acompanhamento_12_semanas: 4,
  constancia_verdade: 4,
  treinos_50: 4,
  recomeco_consistente: 4,
  // Além do necessário
  fiz_o_necessario: 2,
  fui_alem: 2,
  uma_a_mais: 3,
  nunca_deixei_pra_depois: 3,
  milha_extra: 3,
  sempre_um_a_mais: 4,
  // Técnicas avançadas
  primeira_tecnica: 2,
  tecnicas_2: 3,
  tecnicas_3: 3,
  tecnicas_4: 3,
  tecnicas_5: 4,
  tecnicas_7: 4,
  tecnicas_10: 5,
  mestre_tecnicas: 5,
  // Fases do protocolo
  completou_adaptacao: 2,
  chegou_intensificacao: 3,
  completou_intensificacao: 3,
  completou_consolidacao: 4,
  protocolo_completo: 4,
  treino_samurai: 3,
};

/** Acendem no mapa, mas não mudam o “Você está aqui”: não medem o caminho percorrido. */
export const NAO_MOVEM_O_MARCADOR: ReadonlySet<string> = new Set([
  "relatorio_mensal", "treino_samurai",
  "fiz_o_necessario", "fui_alem", "uma_a_mais", "nunca_deixei_pra_depois", "milha_extra", "sempre_um_a_mais",
  "primeira_tecnica", "tecnicas_2", "tecnicas_3", "tecnicas_4", "tecnicas_5", "tecnicas_7", "tecnicas_10", "mestre_tecnicas",
]);

export type NoJornada =
  | { tipo: "medalha"; id: string; capitulo: number; medalha: Medalha; alcancado: boolean; proxima: boolean }
  | { tipo: "recorrente"; id: string; capitulo: number; codigo: "recorde" | "eu_voltei"; titulo: string; total: number; ultima: string | null; alcancado: boolean; proxima: false }
  | { tipo: "ciclo"; id: string; capitulo: number; semanas: number; titulo: string; data: string | null; alcancado: boolean; proxima: boolean };

export type Jornada = {
  /** Desenho semana a semana (fases, pausas e retornos); ausente em telas antigas. */
  caminho?: CaminhoJornada;
  capitulos: Array<Capitulo & { nos: NoJornada[]; alcancados: number; total: number }>;
  /** Índice (na lista achatada de nós) ANTES do qual fica o “Você está aqui”. */
  posicao: number;
  nos: NoJornada[];
  proxima: Medalha | null;
};

/** Rótulo do ciclo: 26 semanas = 6 meses, 52 = 1 ano, 78 = 1 ano e meio… */
export function rotuloCiclo(semanas: number): string {
  const meses = Math.round((semanas / 52) * 12);
  if (meses < 12) return `${meses} meses de acompanhamento`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return `${anos} ${anos === 1 ? "ano" : "anos"}${resto ? " e meio" : ""} de acompanhamento`;
}

/**
 * Ciclos alcançados e o próximo. Conta semanas do calendário desde o início
 * do acompanhamento; semana em pausa combinada não é semana de acompanhamento.
 */
export function ciclos(semanas: Pick<Semana, "inicio" | "pausada">[], passo = 26): Array<{ semanas: number; data: string | null; alcancado: boolean }> {
  const ativas = semanas.filter((w) => !w.pausada);
  const out: Array<{ semanas: number; data: string | null; alcancado: boolean }> = [];
  for (let n = passo; n <= ativas.length; n += passo) out.push({ semanas: n, data: somarDias(ativas[n - 1].inicio, 6), alcancado: true });
  const prox = (Math.floor(ativas.length / passo) + 1) * passo;
  out.push({ semanas: prox, data: null, alcancado: false });
  return out;
}

export function montarJornada(e: {
  medalhas: Medalha[];
  proxima: Medalha | null;
  conquistas: Array<{ codigo: string; conquistado_em: string }>;
  semanas: Pick<Semana, "inicio" | "pausada">[];
}): Jornada {
  const recorrente = (codigo: "recorde" | "eu_voltei", capitulo: number): NoJornada => {
    const xs = e.conquistas.filter((c) => c.codigo === codigo).map((c) => c.conquistado_em).sort();
    return { tipo: "recorrente", id: codigo, capitulo, codigo, titulo: CONTEUDO[codigo].nome, total: xs.length, ultima: xs.at(-1) ?? null, alcancado: xs.length > 0, proxima: false };
  };
  const nos: NoJornada[] = [];
  for (const cap of CAPITULOS) {
    const doCap = e.medalhas.filter((m) => CAPITULO_DA_MEDALHA[m.codigo as keyof typeof CAPITULO_DA_MEDALHA] === cap.numero);
    for (const m of doCap) nos.push({ tipo: "medalha", id: m.codigo, capitulo: cap.numero, medalha: m, alcancado: m.conquistada, proxima: e.proxima?.codigo === m.codigo });
    if (cap.numero === 3) nos.push(recorrente("recorde", 3));
    if (cap.numero === 4) nos.push(recorrente("eu_voltei", 4));
    if (cap.numero === 5) {
      for (const c of ciclos(e.semanas)) nos.push({ tipo: "ciclo", id: `ciclo-${c.semanas}`, capitulo: 5, semanas: c.semanas, titulo: rotuloCiclo(c.semanas), data: c.data, alcancado: c.alcancado, proxima: false });
    }
  }
  let ultimo = -1;
  nos.forEach((n, i) => {
    if (n.tipo === "medalha" && n.alcancado && !NAO_MOVEM_O_MARCADOR.has(n.medalha.codigo)) ultimo = i;
  });
  const medalhasAbertas = nos.some((n) => n.tipo === "medalha" && !n.alcancado && n.medalha.disponivel);
  if (!medalhasAbertas) nos.forEach((n, i) => {
    if (n.tipo === "ciclo" && n.alcancado) ultimo = i;
  });
  return {
    nos,
    posicao: ultimo + 1,
    proxima: e.proxima,
    capitulos: CAPITULOS.map((c) => {
      const ns = nos.filter((n) => n.capitulo === c.numero);
      return { ...c, nos: ns, alcancados: ns.filter((n) => n.alcancado).length, total: ns.length };
    }),
  };
}

// ---------------------------------------------------------------------------
// Linha do tempo
// ---------------------------------------------------------------------------
export type EventoJornada = {
  chave: string;
  data: string;
  tipo: "medalha" | "recorde" | "retomada" | "meta" | "reconhecimento" | "ciclo" | "descoberta";
  titulo: string;
  detalhe: string | null;
  /** Só para mensagens escritas pelo personal. */
  autor?: "personal";
  codigo?: string;
};

/** Junta eventos de outras fontes (ex.: descobertas) mantendo a ordem da linha do tempo. */
export function juntarEventos(a: EventoJornada[], b: EventoJornada[]): EventoJornada[] {
  return [...a, ...b].sort((x, y) => (x.data < y.data ? 1 : x.data > y.data ? -1 : x.chave < y.chave ? -1 : 1));
}

export function linhaDoTempo(e: {
  conquistas: Array<{ id: string; codigo: string; titulo: string; descricao: string | null; conquistado_em: string; dados?: { recordes?: Array<{ exercicio: string }>; diasAfastado?: number } }>;
  semanas: Pick<Semana, "inicio" | "meta" | "pontos" | "status" | "pausada" | "atual">[];
  /** AAAA-MM-DD: a semana atual não ganha data no futuro. */
  hoje: string;
  reconhecimentos: Array<{ id: string; mensagem: string; created_at: string }>;
  ciclosAlcancados?: Array<{ semanas: number; data: string | null }>;
}): EventoJornada[] {
  const out = new Map<string, EventoJornada>();
  const add = (ev: EventoJornada) => {
    if (!out.has(ev.chave)) out.set(ev.chave, ev);
  };
  for (const c of e.conquistas) {
    if (c.codigo === "recorde") add({ chave: `c:${c.id}`, data: c.conquistado_em, tipo: "recorde", titulo: "Novo recorde pessoal", detalhe: c.dados?.recordes?.length ? c.dados.recordes.map((r) => r.exercicio).join(", ") : c.descricao, codigo: c.codigo });
    else if (c.codigo === "eu_voltei") add({ chave: `c:${c.id}`, data: c.conquistado_em, tipo: "retomada", titulo: "Eu voltei", detalhe: c.dados?.diasAfastado ? `Retomada depois de ${c.dados.diasAfastado} dias.` : CONTEUDO.eu_voltei.mensagem, codigo: c.codigo });
    else if (c.codigo === "desafio_concluido") add({ chave: `c:${c.id}`, data: c.conquistado_em, tipo: "medalha", titulo: c.titulo, detalhe: c.descricao ?? CONTEUDO.desafio_concluido.mensagem, codigo: c.codigo });
    else add({ chave: `m:${c.codigo}`, data: c.conquistado_em, tipo: "medalha", titulo: nomeDaConquista(c.codigo, c.titulo), detalhe: CONTEUDO[c.codigo as CodigoConquista]?.mensagem ?? c.descricao, codigo: c.codigo });
  }
  for (const w of e.semanas) {
    if (w.status !== "cumprida" || w.pausada || !w.meta) continue;
    add({ chave: `meta:${w.inicio}`, data: `${w.atual ? e.hoje : somarDias(w.inicio, 6)}T15:00:00Z`, tipo: "meta", titulo: "Meta da semana cumprida", detalhe: `${w.meta} ${w.meta === 1 ? "treino" : "treinos"} na semana de ${w.inicio.slice(8, 10)}/${w.inicio.slice(5, 7)}.` });
  }
  for (const r of e.reconhecimentos) add({ chave: `r:${r.id}`, data: r.created_at, tipo: "reconhecimento", titulo: "Mensagem do Montinho", detalhe: r.mensagem, autor: "personal" });
  for (const c of e.ciclosAlcancados ?? []) if (c.data) add({ chave: `ciclo:${c.semanas}`, data: `${c.data}T15:00:00Z`, tipo: "ciclo", titulo: rotuloCiclo(c.semanas), detalhe: "Marco de tempo de acompanhamento." });
  return [...out.values()].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.chave < b.chave ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Caminho semana a semana (desenho do mapa): fases do protocolo, pausas e
// retornos. Cada semana vira um ponto; a cor é a fase da semana.
// ---------------------------------------------------------------------------
export type SemanaCaminho = {
  inicio: string;
  status: Semana["status"];
  treinos: number;
  /** Fase da maioria dos treinos da semana (null = sem fase registrada). */
  fase: string | null;
  /** Começo de uma fase diferente da semana com treino anterior. */
  novaFase: string | null;
  /** Semana em que o aluno voltou depois de 14+ dias parado. */
  retorno: boolean;
  /** Dias parado antes da volta (quando houver). */
  diasParado: number | null;
};

export type CaminhoJornada = {
  semanas: SemanaCaminho[];
  faseAtual: string | null;
  /** Fases concluídas (medalhas de fase), na ordem. */
  fasesConcluidas: Array<{ fase: string; data: string }>;
  retornos: number;
};

export function caminhoDaJornada(e: {
  semanas: Pick<Semana, "inicio" | "status" | "concluidas" | "parciais" | "extras">[];
  sessoes: Array<{ iniciado_em: string; status: string; fase?: string | null; conta_aderencia?: boolean }>;
  conquistas: Array<{ codigo: string; conquistado_em: string; dados?: { diasAfastado?: number } | null }>;
}): CaminhoJornada {
  const local = (iso: string) => dataLocal(iso);
  const validas = e.sessoes.filter((s) => s.conta_aderencia !== false && s.status === "concluida");
  let anterior: string | null = null;
  const semanas: SemanaCaminho[] = e.semanas.map((w) => {
    const fim = somarDias(w.inicio, 6);
    const daSemana = validas.filter((s) => {
      const d = local(s.iniciado_em);
      return d >= w.inicio && d <= fim;
    });
    const conta = new Map<string, number>();
    for (const s of daSemana) if (s.fase) conta.set(s.fase, (conta.get(s.fase) ?? 0) + 1);
    const fase = [...conta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const novaFase = fase && fase !== anterior ? fase : null;
    if (fase) anterior = fase;
    const volta = e.conquistas.find((c) => c.codigo === "eu_voltei" && local(c.conquistado_em) >= w.inicio && local(c.conquistado_em) <= fim);
    return { inicio: w.inicio, status: w.status, treinos: daSemana.length, fase, novaFase, retorno: !!volta, diasParado: volta?.dados?.diasAfastado ?? null };
  });
  const NOME: Record<string, string> = { completou_adaptacao: "adaptacao", completou_intensificacao: "intensificacao", completou_consolidacao: "consolidacao" };
  const fasesConcluidas = e.conquistas.filter((c) => NOME[c.codigo]).sort((a, b) => (a.conquistado_em < b.conquistado_em ? -1 : 1)).map((c) => ({ fase: NOME[c.codigo], data: c.conquistado_em }));
  return { semanas, faseAtual: anterior, fasesConcluidas, retornos: e.conquistas.filter((c) => c.codigo === "eu_voltei").length };
}
