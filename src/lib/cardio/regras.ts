// ============================================================================
// Montinho Cardio — regras PURAS (testadas em regras.test.ts).
//
// Filosofia: o objetivo não é fazer MAIS cardio, é cumprir o cardio CERTO
// com constância. Por isso:
//   • 1 cardio válido por dia (pedacinhos do mesmo dia se somam e viram um só);
//   • vale com 10+ minutos e, se havia prescrição, pelo menos 50% dela;
//   • “não realizado” nunca conta; parcial conta como cardio, mas não fecha a
//     sessão prescrita da semana sozinho se ficou abaixo de 50%;
//   • minutos além do prescrito não dão nada a mais (meta = prescrição).
// Fontes de cardio: registro do aluno/personal (cardio_registros), extras de
// cardio liberados pelo personal (sessão modo 'extra') e o Strava. Uma mesma
// atividade nunca é contada duas vezes (o Strava sai se já há registro perto).
// ============================================================================

import type { CardioPrescricao, CardioRegistro, IntensidadeCardio, ModalidadeCardio } from "@/lib/supabase/types-extended";
import { dataLocal, inicioDaSemana, somarDias } from "@/lib/aderencia/calcular";

export const LIMITES_CARDIO = {
  /** Mínimo de minutos para um dia de cardio valer. */
  minutosMin: 10,
  /** Parte do prescrito que precisa ser feita para valer. */
  fracaoMin: 0.5,
  /** Tolerância da meta de minutos da semana (“100% no Plano”). */
  toleranciaMeta: 0.1,
  /** Dias sem cardio para valer o “Voltei a Respirar” (igual ao “Eu voltei”). */
  diasRetomada: 14,
  /** “Uma Hora de Chalalá”: precisa de prescrição de 60+ min; não passar do prescrito além disto. */
  umaHoraMin: 60,
  toleranciaUmaHora: 0.1,
  /** Fôlego de Ferro: semanas seguidas cumprindo a prescrição. */
  semanasFerro: 4,
  /** Strava perto de um registro (mesmo dia, até 3 h de diferença) = a mesma atividade. */
  horasMesmaAtividade: 3,
} as const;

/** Marcos por quantidade de cardios (dias válidos). 500 e 1.000 já existem no banco, ainda desligados. */
export const MARCOS_CARDIO = [1, 2, 3, 10, 25, 50, 100, 250] as const;
export const MARCOS_CARDIO_FUTUROS = [500, 1000] as const;
export const MARCOS_FUTUROS_LIGADOS = false;

export type OrigemCardio = "app" | "personal" | "extra" | "strava";

/** Um cardio feito, venha de onde vier. */
export type CardioFeito = {
  id: string;
  origem: OrigemCardio;
  modalidade: ModalidadeCardio;
  status: CardioRegistro["status"];
  duracaoMin: number;
  planejadoMin: number | null;
  intensidadePlanejada: IntensidadeCardio | null;
  intensidade: IntensidadeCardio | null;
  esforco: number | null;
  /** AAAA-MM-DD em Brasília. */
  data: string;
  realizadoEm: string;
  prescricaoId: string | null;
  sessionId: string | null;
  distanciaKm: number | null;
  fcMedia: number | null;
  fcMax: number | null;
  observacoes: string | null;
  /** Só registros do app/personal podem ser corrigidos pelo aluno. */
  editavel: boolean;
};

export function deRegistro(r: CardioRegistro): CardioFeito {
  return {
    id: r.id,
    origem: r.origem,
    modalidade: r.modalidade,
    status: r.status,
    duracaoMin: r.status === "nao_realizado" ? 0 : r.duracao_min,
    planejadoMin: r.planejado_min,
    intensidadePlanejada: r.intensidade_planejada,
    intensidade: r.intensidade,
    esforco: r.esforco,
    data: r.data,
    realizadoEm: r.realizado_em,
    prescricaoId: r.prescricao_id,
    sessionId: r.session_id,
    distanciaKm: r.distancia_km == null ? null : Number(r.distancia_km),
    fcMedia: r.fc_media,
    fcMax: r.fc_max,
    observacoes: r.observacoes,
    editavel: r.origem === "app",
  };
}

/** Junta as fontes sem contar a mesma atividade duas vezes. */
export function juntarCardios(registros: CardioFeito[], extras: CardioFeito[], strava: CardioFeito[]): CardioFeito[] {
  const comSessao = new Set(registros.map((r) => r.sessionId).filter(Boolean));
  const extrasOk = extras.filter((x) => !comSessao.has(x.id));
  const manuais = [...registros, ...extrasOk].filter((r) => r.status !== "nao_realizado");
  const janela = LIMITES_CARDIO.horasMesmaAtividade * 3_600_000;
  const stravaOk = strava.filter((s) => !manuais.some((m) => m.data === s.data && Math.abs(Date.parse(m.realizadoEm) - Date.parse(s.realizadoEm)) <= janela));
  return [...registros, ...extrasOk, ...stravaOk].sort((a, b) => (a.realizadoEm < b.realizadoEm ? -1 : 1));
}

export type DiaCardio = { data: string; minutos: number; planejadoMin: number | null; valido: boolean; /** Instante em que o dia passou a valer. */ validoEm: string | null; ids: string[] };

/** Agrupa por dia (Brasília). Pedacinhos do mesmo dia se somam: 1 dia = no máximo 1 cardio. */
export function diasDeCardio(feitos: CardioFeito[]): DiaCardio[] {
  const porDia = new Map<string, CardioFeito[]>();
  for (const f of feitos) {
    if (f.status === "nao_realizado" || f.duracaoMin <= 0) continue;
    porDia.set(f.data, [...(porDia.get(f.data) ?? []), f]);
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([data, fs]) => {
      const ordem = [...fs].sort((a, b) => (a.realizadoEm < b.realizadoEm ? -1 : 1));
      const planejados = ordem.map((f) => f.planejadoMin).filter((n): n is number => n != null);
      const planejadoMin = planejados.length ? Math.max(...planejados) : null;
      const precisa = Math.max(LIMITES_CARDIO.minutosMin, planejadoMin ? Math.ceil(planejadoMin * LIMITES_CARDIO.fracaoMin) : 0);
      let soma = 0;
      let validoEm: string | null = null;
      for (const f of ordem) {
        soma += f.duracaoMin;
        if (!validoEm && soma >= precisa) validoEm = f.realizadoEm;
      }
      return { data, minutos: soma, planejadoMin, valido: !!validoEm, validoEm, ids: ordem.map((f) => f.id) };
    });
}

type PrescricaoVigencia = Pick<CardioPrescricao, "id" | "frequencia_semanal" | "duracao_min" | "created_at" | "desativado_em" | "ativo"> & { minutos_semana?: number | null };

/** Minutos da semana de uma prescrição (o total que o personal/visitante definiu, ou vezes × duração). */
export const minutosDaPrescricao = (p: Pick<PrescricaoVigencia, "frequencia_semanal" | "duracao_min" | "minutos_semana">) => p.minutos_semana ?? p.frequencia_semanal * p.duracao_min;

/** Prescrições que valiam no fim da semana (as trocas no meio da semana valem para a semana toda). */
export function prescricoesDaSemana<T extends PrescricaoVigencia>(prescricoes: T[], inicio: string, hoje: string): T[] {
  const fim = somarDias(inicio, 6) < hoje ? somarDias(inicio, 6) : hoje;
  return prescricoes.filter((p) => dataLocal(p.created_at) <= fim && (!p.desativado_em || dataLocal(p.desativado_em) > fim));
}

export type StatusSemanaCardio = "sem_prescricao" | "pausada" | "cumprida" | "parcial" | "sem_cardio" | "em_andamento";

export type SemanaCardio = {
  inicio: string;
  alvoSessoes: number;
  alvoMin: number;
  sessoes: number;
  minutos: number;
  /** Dia em que bateu as sessões / os minutos (para a data do troféu). */
  sessoesEm: string | null;
  minutosEm: string | null;
  /** Semana cumprida: todas as sessões OU os minutos (em menos dias também vale). */
  cumpridaEm: string | null;
  metaMinutos: boolean;
  status: StatusSemanaCardio;
  atual: boolean;
  /** A prescrição começou no meio desta semana: não cumprir não quebra a sequência. */
  inicioPrescricao: boolean;
};

export function semanasDeCardio(entrada: { prescricoes: PrescricaoVigencia[]; feitos: CardioFeito[]; hoje: string; semanasPausadas?: string[]; desde?: string | null }): SemanaCardio[] {
  const { prescricoes, hoje } = entrada;
  const dias = diasDeCardio(entrada.feitos);
  const pausadas = new Set(entrada.semanasPausadas ?? []);
  const datas = [...prescricoes.map((p) => dataLocal(p.created_at)), ...dias.map((d) => d.data)].sort();
  if (!datas.length) return [];
  const atual = inicioDaSemana(hoje);
  const out: SemanaCardio[] = [];
  for (let w = inicioDaSemana(entrada.desde && entrada.desde < datas[0] ? entrada.desde : datas[0]); w <= atual; w = somarDias(w, 7)) {
    const fim = somarDias(w, 6);
    const vale = prescricoesDaSemana(prescricoes, w, hoje);
    const alvoSessoes = Math.min(7, vale.reduce((t, p) => t + p.frequencia_semanal, 0));
    const alvoMin = vale.reduce((t, p) => t + minutosDaPrescricao(p), 0);
    const daSemana = dias.filter((d) => d.data >= w && d.data <= fim);
    const validos = daSemana.filter((d) => d.valido).sort((a, b) => ((a.validoEm ?? "") < (b.validoEm ?? "") ? -1 : 1));
    const minutos = daSemana.reduce((t, d) => t + d.minutos, 0);
    const sessoesEm = alvoSessoes && validos.length >= alvoSessoes ? validos[alvoSessoes - 1].validoEm : null;
    let minutosEm: string | null = null;
    if (alvoMin) {
      const precisa = alvoMin * (1 - LIMITES_CARDIO.toleranciaMeta);
      let soma = 0;
      for (const f of entrada.feitos.filter((x) => x.data >= w && x.data <= fim && x.status !== "nao_realizado").sort((a, b) => (a.realizadoEm < b.realizadoEm ? -1 : 1))) {
        soma += f.duracaoMin;
        if (soma >= precisa) { minutosEm = f.realizadoEm; break; }
      }
    }
    const ehAtual = w === atual;
    const inicioPrescricao = vale.some((p) => dataLocal(p.created_at) > w);
    const cumpridaEm = [sessoesEm, minutosEm].filter((x): x is string => !!x).sort()[0] ?? null;
    const status: StatusSemanaCardio = !alvoSessoes
      ? "sem_prescricao"
      : pausadas.has(w)
        ? "pausada"
        : cumpridaEm
          ? "cumprida"
          : ehAtual
            ? "em_andamento"
            : validos.length
              ? "parcial"
              : "sem_cardio";
    out.push({ inicio: w, alvoSessoes, alvoMin, sessoes: validos.length, minutos, sessoesEm, minutosEm, cumpridaEm, metaMinutos: !!minutosEm, status, atual: ehAtual, inicioPrescricao });
  }
  return out;
}

/** Resumo da semana para a tela do aluno (“Sua semana de cardio”). */
export function resumoSemana(s: SemanaCardio | undefined): { pct: number | null; faltamMin: number; faltamSessoes: number } {
  if (!s || !s.alvoMin) return { pct: null, faltamMin: 0, faltamSessoes: 0 };
  const batida = s.status === "cumprida";
  return {
    pct: batida ? 100 : Math.min(100, Math.round((s.minutos / s.alvoMin) * 100)),
    faltamMin: batida ? 0 : Math.max(0, s.alvoMin - s.minutos),
    faltamSessoes: batida ? 0 : Math.max(0, s.alvoSessoes - s.sessoes),
  };
}

// ----------------------------------------------------------------------------
// Troféus (o sistema é o mesmo da musculação: aqui só se diz QUANDO cada um
// aconteceu; a gravação deduplica por código + referência).
// ----------------------------------------------------------------------------
export type CodigoCardio =
  | "cardio_1" | "cardio_2" | "cardio_3" | "cardio_10" | "cardio_25" | "cardio_50" | "cardio_100" | "cardio_250" | "cardio_500" | "cardio_1000"
  | "cardio_uma_hora" | "cardio_semana_ritmo" | "cardio_meta_semana" | "cardio_4_semanas" | "cardio_voltei";

export const CODIGOS_CARDIO: CodigoCardio[] = ["cardio_1", "cardio_2", "cardio_3", "cardio_10", "cardio_25", "cardio_50", "cardio_100", "cardio_250", "cardio_500", "cardio_1000", "cardio_uma_hora", "cardio_semana_ritmo", "cardio_meta_semana", "cardio_4_semanas", "cardio_voltei"];

export type TrofeuCardio = { codigo: CodigoCardio; referencia: string; data: string; descricao: string; evidencia: Record<string, unknown> };

export type EntradaCardio = { prescricoes: PrescricaoVigencia[]; feitos: CardioFeito[]; semanasPausadas?: string[] };

const fmtData = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function trofeusDoCardio(e: EntradaCardio, hoje: string): TrofeuCardio[] {
  const out: TrofeuCardio[] = [];
  const dias = diasDeCardio(e.feitos).filter((d) => d.valido);
  const marcos = [...MARCOS_CARDIO, ...(MARCOS_FUTUROS_LIGADOS ? MARCOS_CARDIO_FUTUROS : [])];
  for (const n of marcos) {
    const d = dias[n - 1];
    if (d) out.push({ codigo: `cardio_${n}` as CodigoCardio, referencia: "1", data: d.validoEm!, descricao: n === 1 ? "Seu primeiro cardio registrado." : `${n} cardios feitos.`, evidencia: { dia: d.data, total: n } });
  }

  // Uma Hora de Chalalá: só para quem tem prescrição de 60+ min e sem passar dela.
  const umaHora = e.feitos.find(
    (f) =>
      f.status === "concluido" &&
      f.planejadoMin != null &&
      f.planejadoMin >= LIMITES_CARDIO.umaHoraMin &&
      f.duracaoMin >= LIMITES_CARDIO.umaHoraMin &&
      f.duracaoMin <= Math.ceil(f.planejadoMin * (1 + LIMITES_CARDIO.toleranciaUmaHora))
  );
  if (umaHora) out.push({ codigo: "cardio_uma_hora", referencia: "1", data: umaHora.realizadoEm, descricao: `${umaHora.duracaoMin} min de cardio, como o personal prescreveu.`, evidencia: { registro: umaHora.id, prescrito: umaHora.planejadoMin } });

  // Semanas: Semana no Ritmo (sessões), 100% no Plano (minutos), Fôlego de Ferro (4 seguidas).
  const semanas = semanasDeCardio({ prescricoes: e.prescricoes, feitos: e.feitos, hoje, semanasPausadas: e.semanasPausadas });
  const ritmo = semanas.find((s) => s.sessoesEm);
  if (ritmo) out.push({ codigo: "cardio_semana_ritmo", referencia: "1", data: ritmo.sessoesEm!, descricao: `Todos os ${ritmo.alvoSessoes} cardios prescritos na semana de ${fmtData(ritmo.inicio)}.`, evidencia: { semana: ritmo.inicio, alvo: ritmo.alvoSessoes } });
  const plano = semanas.find((s) => s.minutosEm);
  if (plano) out.push({ codigo: "cardio_meta_semana", referencia: "1", data: plano.minutosEm!, descricao: `Meta de ${plano.alvoMin} min cumprida na semana de ${fmtData(plano.inicio)}.`, evidencia: { semana: plano.inicio, alvoMin: plano.alvoMin } });
  let seq = 0;
  for (const s of semanas) {
    if (s.status === "cumprida") {
      seq++;
      if (seq === LIMITES_CARDIO.semanasFerro) {
        out.push({ codigo: "cardio_4_semanas", referencia: "1", data: s.cumpridaEm!, descricao: `${LIMITES_CARDIO.semanasFerro} semanas seguidas cumprindo o cardio prescrito.`, evidencia: { ate: s.inicio } });
        break;
      }
    } else if (s.status === "parcial" || s.status === "sem_cardio") {
      // Semana em que a prescrição começou no meio não quebra.
      if (!s.inicioPrescricao) seq = 0;
    }
  }

  // Voltei a Respirar: dia válido depois de 14+ dias sem cardio (repete, uma por volta).
  for (let i = 1; i < dias.length; i++) {
    const gap = (Date.parse(dias[i].data) - Date.parse(dias[i - 1].data)) / 86_400_000;
    if (gap >= LIMITES_CARDIO.diasRetomada) out.push({ codigo: "cardio_voltei", referencia: dias[i].data, data: dias[i].validoEm!, descricao: `De volta ao cardio depois de ${gap} dias.`, evidencia: { dias: gap } });
  }
  return out;
}

/** Quantos cardios faltam para o próximo troféu de quantidade. */
export function proximoMarco(feitos: CardioFeito[]): { feitos: number; proximo: number | null; faltam: number } {
  const n = diasDeCardio(feitos).filter((d) => d.valido).length;
  const marcos = [...MARCOS_CARDIO, ...(MARCOS_FUTUROS_LIGADOS ? MARCOS_CARDIO_FUTUROS : [])];
  const proximo = marcos.find((m) => m > n) ?? null;
  return { feitos: n, proximo, faltam: proximo ? proximo - n : 0 };
}

// ----------------------------------------------------------------------------
// Sinais para o personal (ferramenta de acompanhamento, não diagnóstico).
// ----------------------------------------------------------------------------
export type NivelSinal = "atencao" | "acompanhar" | "reconhecer";
export type SinalCardio = { tipo: "adesao_baixa" | "queda" | "esforco_alto" | "ignorado" | "retomou" | "evolucao" | "meta_cumprida"; nivel: NivelSinal; texto: string; data: string };

export function sinaisDoCardio(semanas: SemanaCardio[], feitos: CardioFeito[], hoje: string): SinalCardio[] {
  const out: SinalCardio[] = [];
  const fechadas = semanas.filter((s) => !s.atual && s.alvoSessoes > 0 && s.status !== "pausada");
  const pct = (s: SemanaCardio) => Math.min(1, s.sessoes / s.alvoSessoes);
  const ultima = fechadas.at(-1);
  if (ultima && pct(ultima) < 0.5 && !ultima.inicioPrescricao)
    out.push({ tipo: "adesao_baixa", nivel: "atencao", texto: `Fez ${ultima.sessoes} de ${ultima.alvoSessoes} cardios prescritos na semana de ${fmtData(ultima.inicio)}.`, data: ultima.inicio });
  if (fechadas.length >= 4) {
    const recentes = fechadas.slice(-2);
    const antes = fechadas.slice(-6, -2);
    const media = (xs: SemanaCardio[]) => xs.reduce((t, s) => t + pct(s), 0) / xs.length;
    if (antes.length >= 2 && media(antes) >= 0.75 && media(recentes) < media(antes) * 0.6)
      out.push({ tipo: "queda", nivel: "acompanhar", texto: `Cardio caiu nas últimas 2 semanas (${Math.round(media(recentes) * 100)}% × ${Math.round(media(antes) * 100)}% antes).`, data: recentes.at(-1)!.inicio });
  }
  const quinze = somarDias(hoje, -14);
  const recentes = feitos.filter((f) => f.data >= quinze);
  const pesados = recentes.filter((f) => f.status !== "nao_realizado" && f.esforco != null && f.esforco >= 8 && (f.intensidadePlanejada === "leve" || f.intensidadePlanejada === "moderada"));
  if (pesados.length >= 2)
    out.push({ tipo: "esforco_alto", nivel: "atencao", texto: `Investigar: esforço ${Math.max(...pesados.map((f) => f.esforco!))}/10 em cardio prescrito como ${pesados[0].intensidadePlanejada} (${pesados.length} vezes em 14 dias).`, data: pesados.at(-1)!.data });
  const naoFeitos = recentes.filter((f) => f.status === "nao_realizado").length;
  const zeradas = fechadas.slice(-2).filter((s) => s.sessoes === 0 && !s.inicioPrescricao).length;
  if (naoFeitos >= 3 || zeradas === 2)
    out.push({ tipo: "ignorado", nivel: "acompanhar", texto: zeradas === 2 ? "Nenhum cardio nas 2 últimas semanas, com cardio prescrito." : `${naoFeitos} cardios marcados como não realizados em 14 dias.`, data: hoje });
  const dias = diasDeCardio(feitos).filter((d) => d.valido);
  for (let i = dias.length - 1; i >= 1; i--) {
    if (dias[i].data < somarDias(hoje, -7)) break;
    const gap = (Date.parse(dias[i].data) - Date.parse(dias[i - 1].data)) / 86_400_000;
    if (gap >= LIMITES_CARDIO.diasRetomada) {
      out.push({ tipo: "retomou", nivel: "reconhecer", texto: `Voltou ao cardio depois de ${gap} dias.`, data: dias[i].data });
      break;
    }
  }
  const quatro = fechadas.slice(-4);
  if (quatro.length === 4 && quatro.every((s) => s.status === "cumprida"))
    out.push({ tipo: "evolucao", nivel: "reconhecer", texto: "Evolução: cumpriu o cardio prescrito nas últimas 4 semanas.", data: quatro.at(-1)!.inicio });
  else if (ultima?.status === "cumprida")
    out.push({ tipo: "meta_cumprida", nivel: "reconhecer", texto: `Cumpriu o cardio da semana de ${fmtData(ultima.inicio)}.`, data: ultima.inicio });
  return out;
}

/** Evolução do esforço percebido: média por semana (só registros com esforço). */
export function esforcoPorSemana(feitos: CardioFeito[]): Array<{ inicio: string; media: number; n: number }> {
  const m = new Map<string, number[]>();
  for (const f of feitos) {
    if (f.esforco == null || f.status === "nao_realizado") continue;
    const w = inicioDaSemana(f.data);
    m.set(w, [...(m.get(w) ?? []), f.esforco]);
  }
  return [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([inicio, xs]) => ({ inicio, media: Math.round((xs.reduce((t, x) => t + x, 0) / xs.length) * 10) / 10, n: xs.length }));
}

/** O cardio prescrito de hoje que ainda falta (pelos dias recomendados; sem dias = qualquer dia até bater a semana). */
export function pendentesHoje<T extends Pick<CardioPrescricao, "id" | "dias" | "frequencia_semanal" | "ativo" | "duracao_min"> & { minutos_semana?: number | null }>(prescricoes: T[], feitos: CardioFeito[], hoje: string): T[] {
  const dow = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const w = inicioDaSemana(hoje);
  // Meta de minutos da semana já batida (mesmo em menos dias): nada pendente.
  const alvo = prescricoes.filter((p) => p.ativo).reduce((t, p) => t + minutosDaPrescricao(p), 0);
  const feitosSemana = feitos.filter((f) => f.data >= w && f.data <= hoje && f.status !== "nao_realizado").reduce((t, f) => t + f.duracaoMin, 0);
  if (alvo && feitosSemana >= alvo * (1 - LIMITES_CARDIO.toleranciaMeta)) return [];
  return prescricoes.filter((p) => {
    if (!p.ativo) return false;
    if (feitos.some((f) => f.data === hoje && f.prescricaoId === p.id)) return false;
    const naSemana = feitos.filter((f) => f.prescricaoId === p.id && f.data >= w && f.data <= hoje && f.status !== "nao_realizado").length;
    if (naSemana >= p.frequencia_semanal) return false;
    return p.dias.length ? p.dias.includes(dow) : true;
  });
}
