// ============================================================================
// Minha Jornada — organização VISUAL das conquistas: a estrada, as paradas
// laterais, os capítulos e a posição do aluno. Tudo é derivado do motor
// oficial (vitrine/regras/conquistas gravadas): aqui não se concede nada.
//
// Estrada principal + paradas laterais (aprovado pelo Montinho em 24/10/2026):
// • ESTRADA: só as medalhas do caminho, que vêm numa sequência natural
//   (primeiro treino, metas, semanas seguidas, 10/25/50 treinos, fases…).
//   As conquistadas aparecem na ordem em que foram ganhas; as que faltam vêm
//   depois. Nunca fica medalha apagada no meio de acesas.
// • PORTÕES: o capítulo muda ao conquistar 10 treinos (Ponte), 25 treinos
//   (Mirante), 50 treinos ou 12 semanas de acompanhamento (Montanhas) e 6
//   meses (Horizonte), em sequência. Cada medalha conquistada fica no
//   capítulo em que o aluno estava quando a ganhou.
// • MISSÕES EM ABERTO: medalha da estrada de um capítulo que já ficou para
//   trás e ainda dá para conquistar — sai da estrada e vira um cartão.
// • PARADAS (🎁): as medalhas paralelas (técnicas, Além do necessário,
//   Samurai, abrir a evolução, avaliação, recordes, retomadas…) ficam presas
//   ao ponto da estrada em que o aluno estava quando ganhou. Nunca seguram
//   ninguém.
// • “Você está aqui” = logo depois da última medalha acesa da estrada.
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

/** A estrada principal, capítulo a capítulo, na ordem natural (o 1º de cada capítulo 2–4 é o portão). */
export const ESTRADA: Record<1 | 2 | 3 | 4, CodigoConquista[]> = {
  1: ["primeiro_treino", "terceiro_especial", "primeira_meta_semanal", "criando_raizes"],
  2: ["treinos_10", "primeiro_mes", "constancia_vida_real", "semanas_consistentes_4", "semanas_consistentes_5", "completou_adaptacao"],
  3: ["treinos_25", "semanas_consistentes_6", "chegou_intensificacao", "semanas_consistentes_8", "completou_intensificacao"],
  4: ["acompanhamento_12_semanas", "treinos_50", "semanas_consistentes_10", "constancia_verdade", "semanas_consistentes_12", "completou_consolidacao", "protocolo_completo"],
};
/** Portões: conquistar QUALQUER um destes leva ao capítulo (em sequência: 2 → 3 → 4 → 5). */
export const PORTOES: Record<2 | 3 | 4 | 5, string[]> = { 2: ["treinos_10"], 3: ["treinos_25"], 4: ["treinos_50", "acompanhamento_12_semanas"], 5: ["ciclo-26"] };
/** Medalhas de constância: a explicação vem com o Mestre Oogway (Guardião do Ritmo). */
export const MEDALHAS_DO_RITMO: ReadonlySet<string> = new Set(["primeira_meta_semanal", "criando_raizes", "primeiro_mes", "constancia_vida_real", "constancia_verdade", "acompanhamento_12_semanas", "semanas_consistentes_4", "semanas_consistentes_5", "semanas_consistentes_6", "semanas_consistentes_8", "semanas_consistentes_10", "semanas_consistentes_12", "completou_adaptacao", "chegou_intensificacao", "completou_intensificacao", "completou_consolidacao", "protocolo_completo", "cardio_semana_ritmo", "cardio_meta_semana", "cardio_4_semanas"]);

const CAP_DA_ESTRADA = new Map<string, number>(Object.entries(ESTRADA).flatMap(([c, xs]) => xs.map((x) => [x, Number(c)] as const)));
/** Capítulo de origem de uma medalha da estrada (null = medalha paralela). */
export const capituloDaEstrada = (codigo: string): number | null => CAP_DA_ESTRADA.get(codigo) ?? null;

export type NoJornada =
  | { tipo: "medalha"; id: string; capitulo: number; medalha: Medalha; alcancado: boolean; proxima: boolean; portao: boolean }
  | { tipo: "ciclo"; id: string; capitulo: number; semanas: number; titulo: string; data: string | null; alcancado: boolean; proxima: boolean; portao: boolean };

/** Uma medalha paralela (ou recorde/retomada, com quantas vezes) presa a um ponto da estrada. */
export type ItemParada = { codigo: string; titulo: string; total: number; data: string; medalha: Medalha | null };
export type Parada = { /** id do nó da estrada; null = antes do primeiro (começo da trilha). */ apos: string | null; itens: ItemParada[] };

export type Jornada = {
  /** Desenho semana a semana (fases, pausas e retornos); ausente em telas antigas. */
  caminho?: CaminhoJornada;
  capitulos: Array<Capitulo & { nos: NoJornada[]; alcancados: number; total: number }>;
  /** Índice (na lista achatada da estrada) ANTES do qual fica o “Você está aqui” = medalhas da estrada acesas. */
  posicao: number;
  /** A estrada inteira, capítulo a capítulo. */
  nos: NoJornada[];
  proxima: Medalha | null;
  /** Capítulo em que o aluno está (pelos portões). */
  capituloAtual: number;
  paradas: Parada[];
  /** Medalhas da estrada de capítulos que ficaram para trás e ainda dá para conquistar. */
  missoesEmAberto: Medalha[];
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

const dataDoNo = (n: NoJornada): string | null => (n.tipo === "medalha" ? n.medalha.data : n.data ? `${n.data}T15:00:00Z` : null);

export function montarJornada(e: {
  medalhas: Medalha[];
  proxima: Medalha | null;
  conquistas: Array<{ codigo: string; conquistado_em: string }>;
  semanas: Pick<Semana, "inicio" | "pausada">[];
}): Jornada {
  const porCodigo = new Map(e.medalhas.map((m) => [m.codigo as string, m]));
  // Estrada candidata: medalhas do caminho + ciclos de tempo (capítulo 5).
  const candidatos: NoJornada[] = [];
  const ehPortao = (id: string) => Object.values(PORTOES).some((xs) => xs.includes(id));
  for (const [cap, xs] of Object.entries(ESTRADA)) {
    for (const c of xs) {
      const m = porCodigo.get(c);
      if (m) candidatos.push({ tipo: "medalha", id: c, capitulo: Number(cap), medalha: m, alcancado: m.conquistada, proxima: false, portao: ehPortao(c) });
    }
  }
  for (const c of ciclos(e.semanas)) candidatos.push({ tipo: "ciclo", id: `ciclo-${c.semanas}`, capitulo: 5, semanas: c.semanas, titulo: rotuloCiclo(c.semanas), data: c.data, alcancado: c.alcancado, proxima: false, portao: ehPortao(`ciclo-${c.semanas}`) });

  // Quando cada portão foi aberto (em sequência): capítulo do aluno em cada data.
  const dataDe = (id: string) => {
    const n = candidatos.find((x) => x.id === id);
    return n && n.alcancado ? dataDoNo(n) : null;
  };
  const aberturas: Array<{ cap: number; data: string }> = [];
  let ultima = "";
  for (const cap of [2, 3, 4, 5] as const) {
    const datas = PORTOES[cap].map(dataDe).filter((d): d is string => !!d).sort();
    if (!datas.length) break;
    ultima = datas[0] > ultima ? datas[0] : ultima;
    aberturas.push({ cap, data: ultima });
  }
  const capituloAtual = aberturas.at(-1)?.cap ?? 1;
  const capNaData = (d: string) => aberturas.filter((a) => a.data <= d).at(-1)?.cap ?? 1;

  // Monta a estrada: acesas no capítulo em que o aluno estava (pela data, em ordem);
  // as que faltam, no capítulo de origem (só do atual em diante).
  // O portão que abriu um capítulo fica no começo desse capítulo (mesmo que outro abra junto).
  const capDaAcesa = (n: NoJornada) => {
    const d = dataDoNo(n) ?? "";
    const abriu = aberturas.find((a) => PORTOES[a.cap as 2 | 3 | 4 | 5].includes(n.id) && a.data === d);
    return abriu ? abriu.cap : capNaData(d);
  };
  // Ciclos de tempo só ficam acesos no capítulo 5 (o tempo sozinho não anda a estrada):
  // antes disso, “6 meses” aparece apagado como o portão do Horizonte.
  if (capituloAtual < 5) {
    for (let i = candidatos.length - 1; i >= 0; i--) {
      const n = candidatos[i];
      if (n.tipo !== "ciclo") continue;
      if (n.id === "ciclo-26") candidatos[i] = { ...n, alcancado: false, data: null };
      else candidatos.splice(i, 1);
    }
    if (!candidatos.some((n) => n.id === "ciclo-26")) candidatos.push({ tipo: "ciclo", id: "ciclo-26", capitulo: 5, semanas: 26, titulo: rotuloCiclo(26), data: null, alcancado: false, proxima: false, portao: true });
  }
  const acesas = candidatos.filter((n) => n.alcancado).map((n) => ({ ...n, capitulo: capDaAcesa(n) }));
  const ordemOriginal = new Map(candidatos.map((n, i) => [n.id, i]));
  acesas.sort((a, b) => a.capitulo - b.capitulo || (dataDoNo(a) ?? "").localeCompare(dataDoNo(b) ?? "") || Number(b.portao) - Number(a.portao) || ordemOriginal.get(a.id)! - ordemOriginal.get(b.id)!);
  const disponivel = (n: NoJornada) => n.tipo === "ciclo" || n.medalha.disponivel;
  const faltam = candidatos.filter((n) => !n.alcancado && disponivel(n) && n.capitulo >= capituloAtual);
  const missoesEmAberto = candidatos.filter((n): n is Extract<NoJornada, { tipo: "medalha" }> => n.tipo === "medalha" && !n.alcancado && n.medalha.disponivel && n.capitulo < capituloAtual).map((n) => n.medalha);
  const proximaId = faltam.find((n) => n.tipo === "medalha")?.id ?? null;
  const nos: NoJornada[] = [];
  for (const cap of CAPITULOS) {
    nos.push(...acesas.filter((n) => n.capitulo === cap.numero));
    nos.push(...faltam.filter((n) => n.capitulo === cap.numero).map((n) => ({ ...n, proxima: n.id === proximaId })));
  }
  const posicao = acesas.length;

  // Paradas laterais: medalhas paralelas conquistadas + recordes/retomadas,
  // presas à última medalha acesa da estrada até a data em que aconteceram.
  const ancora = (d: string) => acesas.filter((n) => (dataDoNo(n) ?? "") <= d).at(-1)?.id ?? null;
  const itens: Array<ItemParada & { apos: string | null }> = [];
  for (const m of e.medalhas) {
    if (!m.conquistada || !m.data || CAP_DA_ESTRADA.has(m.codigo)) continue;
    itens.push({ apos: ancora(m.data), codigo: m.codigo, titulo: m.titulo, total: 1, data: m.data, medalha: m });
  }
  for (const codigo of ["recorde", "eu_voltei"] as const) {
    const grupos = new Map<string | null, string[]>();
    for (const c of e.conquistas.filter((x) => x.codigo === codigo)) {
      const a = ancora(c.conquistado_em);
      grupos.set(a, [...(grupos.get(a) ?? []), c.conquistado_em]);
    }
    for (const [apos, datas] of grupos) itens.push({ apos, codigo, titulo: CONTEUDO[codigo].nome, total: datas.length, data: datas.sort()[0], medalha: null });
  }
  const paradas: Parada[] = [];
  for (const it of itens.sort((a, b) => a.data.localeCompare(b.data))) {
    const { apos, ...item } = it;
    const p = paradas.find((x) => x.apos === apos);
    if (p) p.itens.push(item);
    else paradas.push({ apos, itens: [item] });
  }

  return {
    nos,
    posicao,
    proxima: e.proxima,
    capituloAtual,
    paradas,
    missoesEmAberto,
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
