// ============================================================================
// Troféus ao alcance (pedido do Montinho, 26/10/2026): quais troféus a pessoa
// consegue ganhar NESTE treino e nos próximos dias, e o que precisa fazer.
//
// Só lê o progresso que a vitrine já mede (vitrine.ts), com as mesmas regras
// que concedem (regras.ts / criterios.ts). Nada aqui grava nem promete: cada
// item diz o que fazer, e o troféu sai pelas regras de sempre ao concluir.
// Troféus que dependem do personal (fases, vídeo, avaliação) ou de terceiros
// (desafios, convites) ficam de fora: a pessoa não consegue decidir sozinha.
// ============================================================================

import { inicioDaSemana, somarDias, type ResultadoAderencia } from "@/lib/aderencia/calcular";
import { exercicioJaIsometrico, familiaTecnica, MARCOS_TECNICA, TECNICAS_MEDALHA, type CodigoConquista, type FamiliaTecnica } from "./regras";
import type { Medalha, ProgressoCardio } from "./vitrine";

export type ItemAlcance = {
  codigo: CodigoConquista;
  titulo: string;
  selo: string;
  /** O que fazer, em uma frase. */
  oQueFazer: string;
  /** Quando dá (só na lista dos próximos dias). */
  quando?: string;
};

type Aderencia = Pick<ResultadoAderencia, "sequencia" | "semanaAtual">;

/**
 * Ações fora do treino que também dão troféu (pedido do Montinho, 28/10/2026:
 * “todos… desde treinos, até conhecimento, compartilhamento, indicação”).
 */
export type AcoesAlcance = {
  /** Semanas diferentes com o card do fim do treino enviado (Diário de Bordo). */
  semanasDiario: number;
  /** O card do fim do treino desta semana já foi enviado. */
  diarioEstaSemana: boolean;
  /** Troféus diferentes já compartilhados pelo card da medalha (Vitrine de Troféus). */
  trofeusCompartilhados: string[];
  /** Já enviou algum card (alguém pode abrir o link dele). */
  jaCompartilhou: boolean;
  /** O convite AMIGO-… está liberado para a pessoa. */
  podeIndicar: boolean;
  /** Treinos de musculação que contam hoje (concluído, ou extra/livre com séries). */
  musculacoesHoje: number;
  /** Cardios de 10 min ou mais hoje. */
  cardiosHoje: number;
  /** Cardios válidos até hoje (marcos de quantidade). */
  cardiosFeitos: number;
};

/** Itens que dá para ganhar ainda hoje (o resto é “nos próximos dias”). */
export function ehDeHoje(quando?: string): boolean {
  return !!quando && /^(Agora|Hoje|No próximo treino|No próximo cardio)$/.test(quando);
}
type ExercicioTecnica = { nome: string; tecnica?: string | null };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const MARCOS_TREINOS: CodigoConquista[] = ["primeiro_treino", "treinos_10", "treinos_25", "treinos_50"];
/** Marcos de quantidade de cardio ligados (500 e 1.000 ainda desligados). */
const MARCOS_CARDIO_ALCANCE = [1, 2, 3, 10, 25, 50, 100, 250] as const;
const MARCOS_SEMANAS: CodigoConquista[] = ["semanas_consistentes_4", "semanas_consistentes_5", "semanas_consistentes_6", "semanas_consistentes_8", "semanas_consistentes_10", "semanas_consistentes_12"];

function porCodigo(ms: Medalha[]) {
  const m = new Map(ms.map((x) => [x.codigo, x]));
  const aberta = (c: CodigoConquista) => {
    const x = m.get(c);
    return x && !x.conquistada ? x : null;
  };
  const falta = (x: Medalha) => (x.alvo ?? 0) - (x.atual ?? 0);
  return { aberta, falta };
}

const item = (m: Medalha, oQueFazer: string, quando?: string): ItemAlcance => ({ codigo: m.codigo, titulo: m.titulo, selo: m.selo, oQueFazer, ...(quando ? { quando } : {}) });

/** Técnicas novas de uma lista de exercícios (as que ainda não contaram). */
export function tecnicasNovas(exercicios: ExercicioTecnica[], feitas: ReadonlySet<FamiliaTecnica>): FamiliaTecnica[] {
  const novas = new Set<FamiliaTecnica>();
  for (const e of exercicios) {
    const f = familiaTecnica(e.tecnica);
    if (!f || feitas.has(f)) continue;
    if (f === "isometria" && exercicioJaIsometrico(e.nome)) continue;
    novas.add(f);
  }
  return [...novas];
}

/** Medalhas de técnica que caem com `novas` técnicas a mais. */
function marcosDeTecnica(ms: Medalha[], feitas: number, novas: FamiliaTecnica[], oQueFazer: string, quando?: string): ItemAlcance[] {
  if (!novas.length) return [];
  const { aberta } = porCodigo(ms);
  return MARCOS_TECNICA.filter(([, n]) => n > feitas && n <= feitas + novas.length)
    .map(([c]) => aberta(c))
    .filter((m): m is Medalha => !!m)
    .map((m) => item(m, oQueFazer, quando));
}

/** Semana: quantos pontos faltam para a meta (null = sem meta ou já cumprida). */
function faltaNaSemana(a: Aderencia): number | null {
  const w = a.semanaAtual;
  if (!w || !w.meta || w.pausada || w.status === "cumprida") return null;
  return Math.max(0, Math.ceil(w.meta - w.pontos));
}

/** Medalhas que caem quando a meta desta semana fecha. */
function marcosDaSemana(ms: Medalha[], a: Aderencia, oQueFazer: string, quando?: string): ItemAlcance[] {
  const { aberta } = porCodigo(ms);
  const out: ItemAlcance[] = [];
  const primeira = aberta("primeira_meta_semanal");
  if (primeira) out.push(item(primeira, oQueFazer, quando));
  // Semana atual ainda não cumprida: a sequência vira atual + 1 quando fechar.
  const seguidas = a.sequencia.atual + 1;
  const marco = MARCOS_SEMANAS.map((c) => aberta(c)).find((m) => m?.alvo === seguidas);
  if (marco) out.push(item(marco, `${oQueFazer} São ${seguidas} semanas seguidas.`, quando));
  return out;
}

// ---------------------------------------------------------------------------
// Neste treino
// ---------------------------------------------------------------------------

export type TreinoAlcance = {
  exercicios: ExercicioTecnica[];
  /** Treino extra (conta para “Além do necessário”, não para os marcos da ficha). */
  extra: boolean;
  /** Versão curta (“meu treino possível hoje”). */
  reduzido: boolean;
};

/**
 * Troféus que ESTE treino pode dar, se for concluído como diz cada item.
 * O Treino do Samurai fica de fora: depende do horário que o servidor grava
 * ao começar (ver `samuraiNoTreino`).
 */
export function trofeusNoTreino(e: { medalhas: Medalha[]; aderencia: Aderencia; tecnicasFeitas: ReadonlySet<FamiliaTecnica>; treino: TreinoAlcance }): ItemAlcance[] {
  const { aberta, falta } = porCodigo(e.medalhas);
  const out: ItemAlcance[] = [];
  const t = e.treino;

  if (t.extra) {
    const fui = aberta("fui_alem");
    if (fui) out.push(item(fui, "Conclua este treino extra."));
    for (const c of ["milha_extra", "sempre_um_a_mais"] as const) {
      const m = aberta(c);
      if (m && m.atual !== null && falta(m) === 1) out.push(item(m, "Conclua este treino extra."));
    }
    return out;
  }

  const marco = MARCOS_TREINOS.map((c) => aberta(c)).find((m) => !!m);
  if (marco && falta(marco) === 1) out.push(item(marco, marco.codigo === "primeiro_treino" ? "Conclua este treino (pelo menos metade das séries)." : `Conclua este treino: é o seu treino nº ${marco.alvo}.`));

  const missao = aberta("missao_cumprida");
  if (missao) out.push(item(missao, "Faça todas as séries do treino."));
  const terceiro = aberta("terceiro_especial");
  if (terceiro && falta(terceiro) === 1) out.push(item(terceiro, "Faça 80% ou mais das séries."));
  const quilo = aberta("cada_quilo_conta");
  if (quilo && t.exercicios.length >= 3) out.push(item(quilo, "Anote a carga (kg) de 3 exercícios."));

  if (t.reduzido) {
    const necessario = aberta("fiz_o_necessario");
    if (necessario) out.push(item(necessario, "Conclua a versão curta."));
    const nunca = aberta("nunca_deixei_pra_depois");
    if (nunca && nunca.atual !== null && falta(nunca) === 1) out.push(item(nunca, "Conclua a versão curta."));
  }

  if (faltaNaSemana(e.aderencia) === 1) out.push(...marcosDaSemana(e.medalhas, e.aderencia, "Conclua este treino e feche a meta da semana."));

  const novas = tecnicasNovas(t.exercicios, e.tecnicasFeitas);
  out.push(...marcosDeTecnica(e.medalhas, e.tecnicasFeitas.size, novas, `Registre as séries de ${novas.map((f) => TECNICAS_MEDALHA[f]).join(", ")}: ${novas.length === 1 ? "técnica nova" : "técnicas novas"} para você.`));
  return out;
}

/** Treino do Samurai: o servidor gravou o início entre 3h59 e 4h30 e a medalha ainda não saiu. */
export function samuraiNoTreino(medalhas: Medalha[], noHorario: boolean): ItemAlcance | null {
  const m = porCodigo(medalhas).aberta("treino_samurai");
  return m && noHorario ? item(m, "Você começou na janela do Samurai: conclua o treino.") : null;
}

// ---------------------------------------------------------------------------
// Nos próximos dias (tela de troféus)
// ---------------------------------------------------------------------------

export const DIAS_ALCANCE = 7;

/**
 * Troféus que dá para ganhar nos próximos 7 dias seguindo o plano: os que
 * faltam poucos treinos (cabem no ritmo da meta semanal), os da meta desta
 * semana, as técnicas novas que já estão na ficha e as ações de um toque.
 */
export function trofeusNosProximosDias(e: { medalhas: Medalha[]; aderencia: Aderencia; tecnicasFeitas: ReadonlySet<FamiliaTecnica>; hoje: string; treinos: Array<{ letra: string; exercicios: ExercicioTecnica[] }>; /** Montinho Cardio: marcos de quantidade e a semana de cardio. */ cardio?: ProgressoCardio | null; /** Compartilhar, indicar, desafios e o dia em dobro. */ acoes?: AcoesAlcance | null }): ItemAlcance[] {
  const { aberta, falta } = porCodigo(e.medalhas);
  const out: ItemAlcance[] = [];
  const meta = e.aderencia.semanaAtual?.meta ?? null;
  const porSemana = Math.max(1, meta ?? 3);
  const proximo = "No próximo treino";
  const emTreinos = (n: number) => (n === 1 ? proximo : `Em ${plural(n, "treino", "treinos")}`);

  const marco = MARCOS_TREINOS.map((c) => aberta(c)).find((m) => !!m);
  if (marco && falta(marco) <= porSemana) out.push(item(marco, marco.codigo === "primeiro_treino" ? "Conclua seu primeiro treino." : `Conclua mais ${plural(falta(marco), "treino", "treinos")} (você está em ${marco.atual}).`, emTreinos(falta(marco))));

  const missao = aberta("missao_cumprida");
  if (missao) out.push(item(missao, "Faça todas as séries de um treino.", proximo));
  const terceiro = aberta("terceiro_especial");
  if (terceiro && falta(terceiro) <= porSemana) out.push(item(terceiro, `Faça ${plural(falta(terceiro), "treino", "treinos")} com 80% ou mais das séries.`, emTreinos(falta(terceiro))));
  const quilo = aberta("cada_quilo_conta");
  if (quilo) out.push(item(quilo, "Anote a carga (kg) de 3 exercícios no mesmo treino.", proximo));

  // Meta desta semana: dá se os treinos que faltam cabem nos dias que restam.
  const faltaSemana = faltaNaSemana(e.aderencia);
  const fimSemana = somarDias(inicioDaSemana(e.hoje), 6);
  const diasRestantes = Math.round((Date.parse(`${fimSemana}T12:00:00Z`) - Date.parse(`${e.hoje}T12:00:00Z`)) / 86_400_000) + 1;
  if (faltaSemana && faltaSemana <= diasRestantes) out.push(...marcosDaSemana(e.medalhas, e.aderencia, `Faça mais ${plural(faltaSemana, "treino", "treinos")} e feche a meta da semana.`, "Até domingo"));

  // 12 semanas de acompanhamento: falta só esta semana ter treino.
  const doze = aberta("acompanhamento_12_semanas");
  const w = e.aderencia.semanaAtual;
  if (doze && doze.atual === 11 && w?.meta && !w.pausada && w.concluidas + w.parciais === 0) out.push(item(doze, "Treine pelo menos uma vez nesta semana.", "Até domingo"));

  // Técnicas novas que já estão na ficha (cada treino da ficha conta uma vez).
  const vistas = new Set(e.tecnicasFeitas);
  const onde: string[] = [];
  const novas: FamiliaTecnica[] = [];
  for (const t of e.treinos) {
    const n = tecnicasNovas(t.exercicios, vistas);
    if (!n.length) continue;
    n.forEach((f) => vistas.add(f));
    novas.push(...n);
    onde.push(`${n.map((f) => TECNICAS_MEDALHA[f]).join(", ")} no Treino ${t.letra}`);
  }
  out.push(...marcosDeTecnica(e.medalhas, e.tecnicasFeitas.size, novas, `Faça ${onde.join("; ")}.`, "Quando fizer esses treinos"));

  // Cardio: o próximo marco de quantidade (até 3 cardios de distância) e a semana prescrita.
  const c = e.cardio;
  if (c && (c.feitos > 0 || c.temPrescricao)) {
    const marcoCardio = MARCOS_CARDIO_ALCANCE.map((n) => aberta(`cardio_${n}` as CodigoConquista)).find((m) => !!m);
    if (marcoCardio && falta(marcoCardio) <= 3) {
      const n = falta(marcoCardio);
      out.push(item(marcoCardio, c.feitos === 0 ? "Faça seu primeiro cardio de 10 minutos ou mais no Montinho Cardio." : `Faça mais ${plural(n, "cardio", "cardios")} de 10 minutos ou mais (1 por dia) no Montinho Cardio.`, n === 1 ? "No próximo cardio" : `Em ${plural(n, "cardio", "cardios")}`));
    }
    // Já bateu a meta de minutos da semana: o Fôlego Extra (150%) e o Dobro (200%) ficam ao alcance.
    const sm = c.semanaMin;
    if (c.temPrescricao && sm && sm.alvoMin > 0 && sm.minutos >= sm.alvoMin * 0.9) {
      for (const [codigo, fator, nome] of [["cardio_folego_extra", 1.5, "150%"], ["cardio_dobro", 2, "o dobro"]] as const) {
        const m = aberta(codigo);
        const faltaMin = Math.ceil(sm.alvoMin * fator - sm.minutos);
        if (m && faltaMin > 0 && faltaMin <= sm.alvoMin * 0.6) {
          out.push(item(m, `Meta da semana batida! Mais ${faltaMin} min de cardio e você chega a ${nome} do prescrito.`, "Até domingo"));
          break;
        }
      }
    }
    const s = c.semana;
    if (c.temPrescricao && s && (s.faltaSessoes > 0 || s.faltaMin > 0)) {
      const oQue = s.metaMinutos && s.faltaMin > 0 ? `Faltam ${s.faltaMin} min de cardio para fechar a semana.` : `Falta${s.faltaSessoes > 1 ? "m" : ""} ${plural(s.faltaSessoes, "cardio", "cardios")} para fechar a semana.`;
      const ritmo = aberta("cardio_semana_ritmo");
      if (ritmo && s.faltaSessoes > 0 && s.faltaSessoes <= diasRestantes) out.push(item(ritmo, oQue, "Até domingo"));
      const plano = aberta("cardio_meta_semana");
      // 100% no Plano é pelos minutos da semana.
      if (plano && s.faltaMin > 0) out.push(item(plano, `Faltam ${s.faltaMin} min de cardio para bater 100% da semana.`, "Até domingo"));
      const ferro = aberta("cardio_4_semanas");
      if (ferro && (c.seguidas ?? 0) === 3) out.push(item(ferro, `${oQue} São 4 semanas seguidas de cardio.`, "Até domingo"));
    }
  }

  // De um toque, sem treino.
  const relatorio = aberta("relatorio_mensal");
  if (relatorio) out.push(item(relatorio, "Abra “Ver minha evolução completa” na tela Evolução.", "Agora"));
  const strava = aberta("strava_conectado");
  if (strava) out.push(item(strava, "No Perfil, conecte seu relógio pelo Strava.", "Agora"));
  const compartilhou = aberta("compartilhou_primeiro");
  if (compartilhou) out.push(item(compartilhou, "Compartilhe o card do fim do treino, de uma medalha ou de uma descoberta do Conhecimento.", "Agora"));
  const partida = aberta("ponto_de_partida");
  if (partida) out.push(item(partida, "Em Evolução → “Minhas medidas e avaliações”, registre suas medidas ou envie uma avaliação.", "Agora"));

  const a = e.acoes;
  if (a) out.push(...trofeusDasAcoes(e.medalhas, a));
  return out;
}

/** Compartilhamento, indicação, desafios e o dia em dobro. */
function trofeusDasAcoes(medalhas: Medalha[], a: AcoesAlcance): ItemAlcance[] {
  const { aberta } = porCodigo(medalhas);
  const out: ItemAlcance[] = [];
  const diario = aberta("diario_de_bordo");
  if (diario && !a.diarioEstaSemana && a.semanasDiario === 3) out.push(item(diario, "Compartilhe o card do fim do treino nesta semana: é a 4ª semana diferente.", "No próximo treino"));
  const vitrine = aberta("vitrine_de_trofeus");
  if (vitrine) {
    const faltam = 5 - a.trofeusCompartilhados.length;
    const jaShared = new Set(a.trofeusCompartilhados);
    const podeCompartilhar = medalhas.filter((m) => m.conquistada && !jaShared.has(m.codigo)).length;
    if (faltam > 0 && podeCompartilhar >= faltam) out.push(item(vitrine, `Compartilhe ${plural(faltam, "troféu que você já ganhou", "troféus diferentes que você já ganhou")} (no troféu, “Compartilhar conquista”). Você está em ${a.trofeusCompartilhados.length} de 5.`, "Agora"));
  }
  const inspiracao = aberta("inspiracao_galera");
  if (inspiracao && a.jaCompartilhou) out.push(item(inspiracao, "Mande um card seu no WhatsApp ou nos Stories: quando alguém abrir o link, o troféu sai.", "Agora"));
  const amigo = aberta("trouxe_amigo");
  if (amigo && a.podeIndicar) out.push(item(amigo, "Mande seu convite AMIGO-… (Perfil → Indicar amigos): quando o amigo se cadastrar, o troféu sai.", "Agora"));
  const criador = aberta("criador_desafios");
  if (criador) out.push(item(criador, "Em Ranking → Desafios, crie um desafio e convide alguém. O troféu sai no fim do desafio.", "Ao fim do desafio"));

  // Dia em dobro (só o que ainda dá para fechar hoje, ou o combo no próximo dia de treino).
  const combo = aberta("combo_completo");
  if (combo) {
    if (a.musculacoesHoje > 0 && a.cardiosHoje === 0) out.push(item(combo, "Você já treinou hoje: faça 10 minutos ou mais de cardio e fecha o combo.", "Hoje"));
    else if (a.cardiosHoje > 0 && a.musculacoesHoje === 0) out.push(item(combo, "Você já fez cardio hoje: conclua um treino de musculação e fecha o combo.", "Hoje"));
    else if (a.musculacoesHoje === 0) out.push(item(combo, "No mesmo dia, conclua um treino de musculação e faça 10 minutos ou mais de cardio.", "No próximo treino"));
  }
  const dois = aberta("dois_folegos");
  if (dois && a.cardiosHoje === 1) out.push(item(dois, "Faça mais um cardio de 10 minutos ou mais hoje (ex.: um de manhã e outro à noite).", "Hoje"));
  const dupla = aberta("dose_dupla");
  if (dupla && a.musculacoesHoje === 1) out.push(item(dupla, "Com a recuperação em dia, um 2º treino hoje (extra ou livre) dá a Dose Dupla.", "Hoje"));
  return out;
}

// ---------------------------------------------------------------------------
// Chamada no lugar da ação (pedido do Montinho, 28/10/2026): ao abrir a tela
// de compartilhar, indicar, criar desafio… “se fizer isso agora, ganha o troféu”.
// ---------------------------------------------------------------------------
export type AcaoTrofeu = "card_treino" | "card_medalha" | "descoberta" | "indicar" | "desafio" | "strava" | "relatorio" | "medidas" | "cardio";
export type ChamadaTrofeu = { codigo: CodigoConquista; titulo: string; texto: string; /** true = ganha com esta ação; false = conta para o troféu. */ agora: boolean };

/** `abertas`: troféus ainda não ganhos (código → nome). `ref`: o troféu do card da medalha. */
export function chamadaDaAcao(acao: AcaoTrofeu, abertas: ReadonlyMap<CodigoConquista, string>, a: AcoesAlcance, ref?: string | null): ChamadaTrofeu | null {
  const ganha = (codigo: CodigoConquista, texto: string): ChamadaTrofeu | null => (abertas.has(codigo) ? { codigo, titulo: abertas.get(codigo)!, texto, agora: true } : null);
  const conta = (codigo: CodigoConquista, texto: string): ChamadaTrofeu | null => (abertas.has(codigo) ? { codigo, titulo: abertas.get(codigo)!, texto, agora: false } : null);
  const inspiracao = () => conta("inspiracao_galera", "Quando alguém abrir o link do seu card, você ganha o troféu");
  switch (acao) {
    case "card_treino": {
      const n = a.semanasDiario;
      return (
        ganha("compartilhou_primeiro", "Compartilhe ou baixe este card e ganhe o troféu") ??
        (!a.diarioEstaSemana && n === 3 ? ganha("diario_de_bordo", "4ª semana compartilhando o card do treino: compartilhe agora e ganhe o troféu") : null) ??
        (!a.diarioEstaSemana ? conta("diario_de_bordo", `Compartilhar este card conta a semana ${n + 1} de 4 para o troféu`) : null) ??
        inspiracao()
      );
    }
    case "card_medalha": {
      const n = a.trofeusCompartilhados.length;
      const novo = !!ref && !a.trofeusCompartilhados.includes(ref);
      return (
        ganha("compartilhou_primeiro", "Compartilhe ou baixe este card e ganhe o troféu") ??
        (novo && n + 1 >= 5 ? ganha("vitrine_de_trofeus", "5º troféu diferente compartilhado: compartilhe agora e ganhe o troféu") : null) ??
        (novo ? conta("vitrine_de_trofeus", `Compartilhar este troféu conta ${n + 1} de 5 para o troféu`) : null) ??
        inspiracao()
      );
    }
    case "descoberta":
      return ganha("compartilhou_primeiro", "Compartilhe esta descoberta e ganhe o troféu");
    case "indicar":
      return conta("trouxe_amigo", "Quando um amigo se cadastrar pelo seu link, você ganha o troféu");
    case "desafio":
      return conta("criador_desafios", "Crie o desafio e convide alguém: no fim dele, você ganha o troféu");
    case "strava":
      return ganha("strava_conectado", "Conecte o relógio e ganhe o troféu");
    case "relatorio":
      return ganha("relatorio_mensal", "Abra sua evolução completa e ganhe o troféu");
    case "medidas":
      return ganha("ponto_de_partida", "Registre suas medidas ou envie uma avaliação e ganhe o troféu");
    case "cardio": {
      if (a.musculacoesHoje > 0 && a.cardiosHoje === 0) {
        const c = ganha("combo_completo", "Você já treinou hoje: 10 minutos ou mais de cardio e você ganha o troféu");
        if (c) return c;
      }
      if (a.cardiosHoje === 1) {
        const c = ganha("dois_folegos", "Mais um cardio de 10 minutos ou mais hoje e você ganha o troféu");
        if (c) return c;
      }
      const proximo = MARCOS_CARDIO_ALCANCE.find((n) => n > a.cardiosFeitos);
      if (proximo && proximo === a.cardiosFeitos + 1 && a.cardiosHoje === 0) return ganha(`cardio_${proximo}` as CodigoConquista, "Faça um cardio de 10 minutos ou mais hoje e ganhe o troféu");
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Lembrete no celular (0104): o troféu mais perto vira 1 aviso no dia seguinte
// ---------------------------------------------------------------------------

/** Ordem do lembrete: o que depende de treinar/cardio primeiro; “Agora” (um toque) por último. */
const PESO_QUANDO = (q?: string) => (!q ? 3 : /próximo/i.test(q) ? 0 : /^Em \d/.test(q) ? 1 : /domingo/i.test(q) ? 2 : /^(Agora|Hoje)$/i.test(q) ? 9 : 4);

export type LembreteTrofeu = { codigo: CodigoConquista; titulo: string; corpo: string; url: string };

/** O lembrete do troféu mais perto (null quando não há nada perto). Texto curto, sem cobrança. */
export function lembreteDoAlcance(itens: ItemAlcance[]): LembreteTrofeu | null {
  const bons = itens.filter((i) => PESO_QUANDO(i.quando) < 9);
  if (!bons.length) return null;
  const i = [...bons].sort((a, b) => PESO_QUANDO(a.quando) - PESO_QUANDO(b.quando))[0];
  const cardio = i.codigo.startsWith("cardio_");
  const perto = i.quando && /próximo/i.test(i.quando) ? "Falta só 1" : "Falta pouco";
  return {
    codigo: i.codigo,
    titulo: `🏆 ${perto} para o troféu “${i.titulo}”!`,
    corpo: `${i.oQueFazer} Bora buscar? Chalalá!`,
    url: cardio ? "/aluno/cardio" : "/aluno/conquistas",
  };
}
