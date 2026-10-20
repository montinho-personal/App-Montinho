// ============================================================================
// Montinho Evolução Inteligente — motor DETERMINÍSTICO de comparação.
//
// Transforma registros reais em descobertas verificáveis. Nada aqui é texto
// gerado por IA: números, critérios e confiança vêm só dos registros.
//
// Comparabilidade (o que NÃO se compara):
// • Exercício diferente. Identidade: mesmo exercício prescrito (exercicio_id)
//   ou mesmo item da biblioteca (biblioteca_id). Só pelo nome quando nenhum
//   dos dois tem biblioteca → confiança moderada. Biblioteca diferente =
//   equipamento/variação diferente (supino barra × halter) → não compara.
// • Tipo de série diferente (aquecimento nunca; drop, rest-pause, cluster,
//   isometria só com o mesmo tipo e com confiança moderada).
// • Técnica prescrita diferente no exercício (ex.: dia de drop-set).
// • Lado diferente (unilateral direito × esquerdo × ambos).
// • Sessão em que o aluno relatou dor/desconforto (anterior ou atual).
// • Carga por halter × carga total: só se compara o MESMO exercício, que tem
//   a mesma convenção de registro; entre exercícios diferentes, nunca.
// Assistência: o app não registra assistência por série; exercícios
// assistidos são itens próprios da biblioteca e, por isso, não se misturam.
// ============================================================================

import type { SerieTipo } from "@/lib/supabase/types-sessoes";
import { REGRAS_CONQUISTAS } from "@/lib/conquistas/regras";

export const VERSAO_MOTOR = 1;

export const CONFIG_PADRAO = {
  /** Mínimo de sessões anteriores comparáveis para falar em “média”. */
  minParaMedia: 3,
  /** Quantas sessões anteriores entram na média (as mais recentes). */
  janelaMedia: 4,
  /** Quanto acima da média (em repetições) para destacar. */
  margemMedia: 1,
  /** Registros anteriores para recorde: o MESMO critério das conquistas. */
  registrosParaRecorde: REGRAS_CONQUISTAS.registrosParaRecorde,
};
export type ConfigMotor = typeof CONFIG_PADRAO;

export type SerieReg = { serie: number; tipo: SerieTipo | string; carga: number | null; reps: number | null; lado?: string | null };
export type IdentidadeExercicio = { exercicioId: string | null; bibliotecaId: string | null; nome: string; tecnica?: string | null };
export type ExecucaoAnterior = IdentidadeExercicio & { sessaoId: string; data: string; dor?: boolean; series: SerieReg[] };

export type Confianca = "alta" | "moderada" | "insuficiente";
export type TipoDescoberta = "recorde_carga" | "recorde_reps" | "mais_carga" | "mais_reps" | "acima_media";

export type Descoberta = {
  tipo: TipoDescoberta;
  confianca: Exclude<Confianca, "insuficiente">;
  exercicio: string;
  titulo: string;
  mensagem: string;
  atual: { carga: number; reps: number; serie: number };
  anterior: { carga: number; reps: number; data: string; sessaoId: string; serie: number } | null;
  media: { reps: number; carga: number; sessoes: number } | null;
  criterio: string;
  versao: number;
};

const PRIORIDADE: Record<TipoDescoberta, number> = { recorde_carga: 5, recorde_reps: 4, mais_carga: 3, mais_reps: 2, acima_media: 1 };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const kg = (n: number) => `${String(Math.round(n * 100) / 100).replace(".", ",")} kg`;
const reps = (n: number) => `${n} ${n === 1 ? "repetição" : "repetições"}`;

/** Mesmo exercício? alta = identidade estável; moderada = só nome; insuficiente = não compara. */
export function mesmaIdentidade(a: IdentidadeExercicio, b: IdentidadeExercicio): Confianca {
  if ((a.tecnica ?? "nenhuma") !== (b.tecnica ?? "nenhuma")) return "insuficiente";
  if (a.bibliotecaId && b.bibliotecaId) return a.bibliotecaId === b.bibliotecaId ? "alta" : "insuficiente";
  if (a.exercicioId && b.exercicioId && a.exercicioId === b.exercicioId) return "alta";
  if (a.bibliotecaId || b.bibliotecaId) return "insuficiente"; // um tem biblioteca, o outro não: variação desconhecida
  return norm(a.nome) === norm(b.nome) ? "moderada" : "insuficiente";
}

const valida = (s: SerieReg): s is SerieReg & { carga: number; reps: number } => (s.carga ?? 0) > 0 && (s.reps ?? 0) > 0;
const compativel = (a: SerieReg, b: SerieReg) => a.tipo === b.tipo && (a.lado ?? "ambos") === (b.lado ?? "ambos") && a.tipo !== "aquecimento" && a.tipo !== "isometria";

/** Histórico comparável com a série atual, do mais recente para o mais antigo. */
function comparaveis(atual: IdentidadeExercicio & { serie: SerieReg; dor?: boolean }, historico: ExecucaoAnterior[]) {
  return historico
    .filter((h) => !h.dor)
    .map((h) => ({ h, conf: mesmaIdentidade(atual, h), series: h.series.filter((s) => valida(s) && compativel(s, atual.serie)) as Array<SerieReg & { carga: number; reps: number }> }))
    .filter((x) => x.conf !== "insuficiente" && x.series.length)
    .sort((a, b) => (a.h.data < b.h.data ? 1 : -1));
}

/** Avalia UMA série recém-concluída. Lista vazia = nada a destacar (o que é normal). */
export function avaliarSerie(atual: IdentidadeExercicio & { serie: SerieReg; dor?: boolean }, historico: ExecucaoAnterior[], cfg: ConfigMotor = CONFIG_PADRAO): Descoberta[] {
  const s = atual.serie;
  if (atual.dor || !valida(s) || s.tipo === "aquecimento" || s.tipo === "isometria") return [];
  const hist = comparaveis(atual, historico);
  if (!hist.length) return []; // primeiro registro comparável: nada a comparar
  const base = (conf: Confianca) => (s.tipo === "valida" && conf === "alta" ? "alta" : "moderada") as Descoberta["confianca"];
  const out: Descoberta[] = [];
  const nova = (tipo: TipoDescoberta, conf: Descoberta["confianca"], titulo: string, mensagem: string, criterio: string, anterior: Descoberta["anterior"], media: Descoberta["media"] = null) =>
    out.push({ tipo, confianca: conf, exercicio: atual.nome, titulo, mensagem, atual: { carga: s.carga, reps: s.reps, serie: s.serie }, anterior, media, criterio, versao: VERSAO_MOTOR });
  const confHist = hist.every((x) => x.conf === "alta") ? "alta" : "moderada";

  // Recordes: mesmo critério das conquistas (2+ registros anteriores comparáveis).
  if (hist.length >= cfg.registrosParaRecorde) {
    const todas = hist.flatMap((x) => x.series.map((y) => ({ ...y, data: x.h.data, sessaoId: x.h.sessaoId })));
    const maxCarga = Math.max(...todas.map((y) => y.carga));
    const ref = todas.find((y) => y.carga === maxCarga)!;
    if (s.carga > maxCarga) {
      nova("recorde_carga", base(confHist), "Nova marca pessoal!", `Você superou sua maior carga registrada neste exercício: ${kg(s.carga)} (antes ${kg(maxCarga)}).`, `Maior carga entre ${hist.length} sessões comparáveis (mesmo exercício e tipo de série).`, { carga: ref.carga, reps: ref.reps, data: ref.data, sessaoId: ref.sessaoId, serie: ref.serie });
    } else {
      const mesmas = todas.filter((y) => y.carga === s.carga);
      if (mesmas.length) {
        const maxReps = Math.max(...mesmas.map((y) => y.reps));
        const r = mesmas.find((y) => y.reps === maxReps)!;
        if (s.reps > maxReps) nova("recorde_reps", base(confHist), "Nova marca pessoal!", `Mais repetições do que nunca com ${kg(s.carga)}: ${s.reps} (antes ${maxReps}).`, `Maior número de repetições com a mesma carga em ${hist.length} sessões comparáveis.`, { carga: r.carga, reps: r.reps, data: r.data, sessaoId: r.sessaoId, serie: r.serie });
      }
    }
  }

  // Última sessão comparável: mesma ordem de série (alta) ou, sem ela, mesma carga (moderada).
  const ult = hist[0];
  const mesmaOrdem = ult.series.find((y) => y.serie === s.serie);
  const conf = mesmaOrdem ? base(ult.conf) : "moderada";
  const ref = mesmaOrdem ?? [...ult.series].filter((y) => y.carga === s.carga).sort((a, b) => b.reps - a.reps)[0];
  if (ref) {
    const ant = { carga: ref.carga, reps: ref.reps, data: ult.h.data, sessaoId: ult.h.sessaoId, serie: ref.serie };
    if (s.carga === ref.carga && s.reps > ref.reps) {
      const d = s.reps - ref.reps;
      nova("mais_reps", conf, "Você evoluiu!", `Na última vez, você fez ${reps(ref.reps)} com ${kg(ref.carga)}. Hoje fez ${s.reps} — ${d === 1 ? "uma repetição a mais" : `${d} repetições a mais`} com a mesma carga.`, mesmaOrdem ? `Mesma série (${s.serie}ª) da última sessão comparável.` : "Mesma carga na última sessão comparável (ordem da série diferente).", ant);
    } else if (mesmaOrdem && s.carga > ref.carga && s.reps >= ref.reps) {
      nova("mais_carga", conf, "Você evoluiu!", `Na última vez: ${kg(ref.carga)} × ${ref.reps}. Hoje: ${kg(s.carga)} × ${s.reps} — o mesmo número de repetições (ou mais) com uma carga maior.`, `Mesma série (${s.serie}ª) da última sessão comparável, com repetições iguais ou maiores.`, ant);
    }
  }

  // Média recente: mesma carga e mesma ordem de série, nas últimas N sessões comparáveis.
  const janela = hist.slice(0, cfg.janelaMedia).map((x) => x.series.find((y) => y.serie === s.serie && y.carga === s.carga)).filter((y): y is NonNullable<typeof y> => !!y);
  if (janela.length >= cfg.minParaMedia) {
    const media = Math.round((janela.reduce((a, y) => a + y.reps, 0) / janela.length) * 10) / 10;
    if (s.reps >= media + cfg.margemMedia && !out.some((d) => d.tipo === "mais_reps" || d.tipo.startsWith("recorde"))) {
      nova("acima_media", base(confHist), "Acima da sua média!", `Nas últimas ${janela.length} sessões comparáveis, sua média foi de ${String(media).replace(".", ",")} repetições com ${kg(s.carga)}. Hoje você fez ${s.reps}.`, `Média da ${s.serie}ª série com a mesma carga em ${janela.length} sessões comparáveis.`, null, { reps: media, carga: s.carga, sessoes: janela.length });
    }
  }
  return out.sort((a, b) => PRIORIDADE[b.tipo] - PRIORIDADE[a.tipo]);
}

/** A descoberta principal (só confiança alta vira aviso forte; moderada pode virar aviso discreto se pedido). */
export function principal(ds: Descoberta[], opts: { aceitarModerada?: boolean; soRecordes?: boolean } = {}): Descoberta | null {
  return ds.find((d) => (d.confianca === "alta" || opts.aceitarModerada) && (!opts.soRecordes || d.tipo.startsWith("recorde"))) ?? null;
}

// ---------------------------------------------------------------------------
// Resumo ao concluir o exercício
// ---------------------------------------------------------------------------
export type ResumoExercicio = {
  exercicio: string;
  series: number;
  melhor: { carga: number; reps: number; serie: number } | null;
  comparacao: Descoberta | null;
  mensagem: string;
};

export function resumirExercicio(id: IdentidadeExercicio & { dor?: boolean }, seriesHoje: SerieReg[], historico: ExecucaoAnterior[], cfg: ConfigMotor = CONFIG_PADRAO): ResumoExercicio {
  const feitas = seriesHoje.filter((s) => s.tipo !== "aquecimento" && ((s.reps ?? 0) > 0 || (s.carga ?? 0) > 0));
  const validas = feitas.filter(valida);
  const melhor = [...validas].sort((a, b) => b.carga - a.carga || b.reps - a.reps)[0] ?? null;
  let comparacao: Descoberta | null = null;
  for (const s of validas) {
    const d = principal(avaliarSerie({ ...id, serie: s }, historico, cfg));
    if (d && (!comparacao || PRIORIDADE[d.tipo] > PRIORIDADE[comparacao.tipo])) comparacao = d;
  }
  return {
    exercicio: id.nome,
    series: feitas.length,
    melhor: melhor ? { carga: melhor.carga, reps: melhor.reps, serie: melhor.serie } : null,
    comparacao,
    mensagem: comparacao
      ? comparacao.tipo === "mais_carga" ? "Boa evolução! Você manteve as repetições usando uma carga maior." : comparacao.mensagem
      : feitas.length ? "Exercício registrado. Manter o planejado também é parte da evolução." : "Exercício registrado.",
  };
}

// ---------------------------------------------------------------------------
// Sessão inteira (tela de conclusão, pequenas vitórias, painel do personal)
// ---------------------------------------------------------------------------
export type ExecucaoSessao = ExecucaoAnterior;

/** Melhor descoberta de cada exercício da sessão, comparando só com sessões ANTERIORES. */
export function descobertasDaSessao(sessao: { sessaoId: string; data: string; dor?: boolean; exercicios: Array<IdentidadeExercicio & { series: SerieReg[] }> }, anteriores: ExecucaoAnterior[], cfg: ConfigMotor = CONFIG_PADRAO): Descoberta[] {
  const antes = anteriores.filter((a) => a.data < sessao.data && a.sessaoId !== sessao.sessaoId);
  const out: Descoberta[] = [];
  for (const ex of sessao.exercicios) {
    const r = resumirExercicio({ ...ex, dor: sessao.dor }, ex.series, antes, cfg);
    if (r.comparacao) out.push(r.comparacao);
  }
  return out.sort((a, b) => PRIORIDADE[b.tipo] - PRIORIDADE[a.tipo]);
}

// ---------------------------------------------------------------------------
// Limites de avisos durante o treino (padrão: 1 por exercício, 3 por sessão)
// ---------------------------------------------------------------------------
export type LimitesAviso = { porExercicio: number; porSessao: number };
export const LIMITES_PADRAO: LimitesAviso = { porExercicio: 1, porSessao: 3 };

export function podeAvisar(mostrados: Array<{ exercicio: string }>, exercicio: string, lim: LimitesAviso = LIMITES_PADRAO): boolean {
  if (mostrados.length >= lim.porSessao) return false;
  return mostrados.filter((m) => m.exercicio === exercicio).length < lim.porExercicio;
}

/** Texto educativo curto por tipo de descoberta (“Por que isso é importante?”). */
export const POR_QUE: Record<TipoDescoberta | "consistencia" | "volume", string> = {
  mais_reps: "Conseguir mais repetições com a mesma carga pode indicar melhora do desempenho nesse exercício. Para interpretar corretamente, técnica, esforço e condições de execução também contam.",
  mais_carga: "Manter as repetições com uma carga maior pode indicar melhora de desempenho no exercício. Isso não significa, sozinho, aumento de força máxima; técnica e esforço também influenciam.",
  acima_media: "Comparar com a sua própria média recente ajuda a separar um dia bom de uma tendência. Uma sessão acima da média é um bom sinal; a evolução se confirma com o tempo.",
  recorde_carga: "Reconhecer o próprio progresso pode fortalecer a percepção de competência. Mas um recorde isolado não comprova, sozinho, ganho de massa muscular.",
  recorde_reps: "Reconhecer o próprio progresso pode fortalecer a percepção de competência. Mas um recorde isolado não comprova, sozinho, ganho de massa muscular.",
  consistencia: "Treinar com a frequência do seu planejamento oferece oportunidades repetidas de prática e recuperação. A consistência é o que permite ao programa produzir adaptações ao longo do tempo.",
  volume: "O volume é uma variável importante da prescrição, mas precisa ser interpretado junto com intensidade, recuperação, execução e características individuais. Mais volume não é automaticamente melhor.",
};
