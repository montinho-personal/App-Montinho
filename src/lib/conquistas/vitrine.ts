// ============================================================================
// Vitrine de medalhas (Conquistas 3.0): as 14 medalhas únicas em ordem de
// jornada SUGERIDA (nenhuma depende de outra), com o progresso real — sempre
// a partir do que foi registrado e pelas mesmas funções que concedem
// (criterios.ts). Recordes e “Eu voltei” repetem: ficam em seções próprias.
// Nada aqui grava; a gravação continua em data/conquistas.
// ============================================================================

import { classificarSessao, dataLocal, type ResultadoAderencia } from "@/lib/aderencia/calcular";
import { avaliarJanela, avaliarPrimeiroMes, avaliarRaizes, avaliarRecomeco, LIMITES, sessoesValidas } from "./criterios";
import { CONTEUDO } from "./conteudo";
import type { CodigoConquista, SessaoConquista } from "./regras";
import { exerciciosComCarga, LIMITES_ALEM, LIMITES_COMECO, LIMITES_FASE, MARCOS_TECNICA, TECNICAS_MEDALHA, tecnicasFeitas, type FamiliaTecnica } from "./regras";

export type Medalha = {
  codigo: CodigoConquista;
  titulo: string;
  /** Texto curto dentro da medalha. */
  selo: string;
  conquistada: boolean;
  data: string | null;
  /** Progresso até a medalha (null = não se mede em números). */
  atual: number | null;
  alvo: number | null;
  /** O que falta, em linguagem simples (só para as não conquistadas). */
  falta: string | null;
  /** Conquistada nos últimos 7 dias. */
  nova: boolean;
  /** false = a janela já passou ou só se aplica depois de uma pausa: não é “próxima”. */
  disponivel: boolean;
  /** Detalhe do que a pessoa fez (ex.: quais técnicas avançadas). */
  detalhe?: string | null;
};

/** Jornada sugerida (ordem visual). Critérios são independentes da ordem. */
export const ORDEM: Array<{ codigo: CodigoConquista; selo: string }> = [
  // Começo
  { codigo: "primeiro_treino", selo: "1º" },
  { codigo: "missao_cumprida", selo: "100%" },
  { codigo: "cada_quilo_conta", selo: "kg" },
  { codigo: "ponto_de_partida", selo: "Medida" },
  { codigo: "criando_raizes", selo: "Raiz" },
  { codigo: "terceiro_especial", selo: "3×" },
  { codigo: "primeira_meta_semanal", selo: "Meta" },
  { codigo: "olhar_de_aguia", selo: "Vídeo" },
  { codigo: "voltei_pro_jogo", selo: "Volta" },
  { codigo: "relatorio_mensal", selo: "Eu" },
  { codigo: "treinos_10", selo: "10" },
  { codigo: "primeiro_mes", selo: "1 mês" },
  { codigo: "constancia_vida_real", selo: "3/4" },
  { codigo: "semanas_consistentes_4", selo: "4 sem" },
  { codigo: "semanas_consistentes_5", selo: "5 sem" },
  { codigo: "semanas_consistentes_6", selo: "6 sem" },
  { codigo: "treinos_25", selo: "25" },
  { codigo: "semanas_consistentes_8", selo: "8 sem" },
  { codigo: "semanas_consistentes_10", selo: "10 sem" },
  { codigo: "semanas_consistentes_12", selo: "12" },
  { codigo: "acompanhamento_12_semanas", selo: "12 sem" },
  { codigo: "constancia_verdade", selo: "8/12" },
  { codigo: "treinos_50", selo: "50" },
  { codigo: "recomeco_consistente", selo: "Volta" },
  // Além do necessário
  { codigo: "fiz_o_necessario", selo: "Feito" },
  { codigo: "fui_alem", selo: "+1" },
  { codigo: "uma_a_mais", selo: "+10" },
  { codigo: "nunca_deixei_pra_depois", selo: "5×" },
  { codigo: "milha_extra", selo: "5+" },
  { codigo: "sempre_um_a_mais", selo: "15+" },
  // Técnicas avançadas
  { codigo: "primeira_tecnica", selo: "T1" },
  { codigo: "tecnicas_2", selo: "T2" },
  { codigo: "tecnicas_3", selo: "T3" },
  { codigo: "tecnicas_4", selo: "T4" },
  { codigo: "tecnicas_5", selo: "T5" },
  { codigo: "tecnicas_7", selo: "T7" },
  { codigo: "tecnicas_10", selo: "T10" },
  { codigo: "mestre_tecnicas", selo: "★T" },
  // Fases do protocolo
  { codigo: "completou_adaptacao", selo: "F1" },
  { codigo: "chegou_intensificacao", selo: "F2" },
  { codigo: "completou_intensificacao", selo: "F2✓" },
  { codigo: "completou_consolidacao", selo: "F3✓" },
  { codigo: "protocolo_completo", selo: "Ciclo" },
  // Além do necessário: madrugada
  { codigo: "treino_samurai", selo: "4h30" },
];

/** “Mais desafiadores”: troféus de disciplina, que só saem com meses de treino. */
export const DESAFIADORAS: CodigoConquista[] = ["semanas_consistentes_12", "semanas_consistentes_10", "semanas_consistentes_8", "constancia_verdade", "protocolo_completo", "acompanhamento_12_semanas", "treinos_50", "mestre_tecnicas", "treino_samurai"];

const dias = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

type Aderencia = Pick<ResultadoAderencia, "sequencia" | "semanaAtual" | "semanas">;

export function vitrineDeMedalhas(e: { conquistas: Array<{ codigo: string; conquistado_em: string }>; sessoes: SessaoConquista[]; aderencia: Aderencia; hoje: string }): Medalha[] {
  const ganhas = new Map<string, string>();
  for (const c of e.conquistas) if (!ganhas.has(c.codigo) || c.conquistado_em < ganhas.get(c.codigo)!) ganhas.set(c.codigo, c.conquistado_em);

  const validas = sessoesValidas(e.sessoes);
  const concluidas = validas.filter((s) => classificarSessao(s) === "concluida").length;
  const seq = e.aderencia.sequencia;
  const meta = e.aderencia.semanaAtual?.meta ?? null;
  // Mesma conta da regra: semanas com meta, sem pausa e com ao menos um treino.
  const participando = e.aderencia.semanas.filter((w) => w.meta && !w.pausada && w.concluidas + w.parciais > 0).length;

  // Além do necessário: treinos curtos concluídos, extras e séries além das prescritas.
  const daApp = e.sessoes.filter((s) => s.conta_aderencia !== false && s.status !== "em_andamento");
  const curtos = daApp.filter((s) => s.modo === "reduzido" && classificarSessao(s) === "concluida").length;
  const extras = daApp.filter((s) => classificarSessao(s) === "extra").length;
  // Técnicas avançadas já feitas (cada uma conta uma vez).
  const ordemTecnicas = tecnicasFeitas(e.sessoes).map((t) => TECNICAS_MEDALHA[t.familia]);
  const feitas = new Set(tecnicasFeitas(e.sessoes).map((t) => t.familia));
  /** Quais técnicas contaram para a medalha (as n primeiras feitas) ou, se ainda falta, quais já foram feitas. */
  const detalheTecnica = (c: CodigoConquista, ganha: boolean): string | null => {
    const n = MARCOS_TECNICA.find(([x]) => x === c)?.[1];
    if (!n || !ordemTecnicas.length) return null;
    const nomes = ganha ? ordemTecnicas.slice(0, n) : ordemTecnicas;
    return ganha ? `${nomes.length === 1 ? "Técnica" : "Técnicas"}: ${nomes.join(", ")}.` : `Você já fez: ${nomes.join(", ")}.`;
  };
  // Fase atual (a do treino concluído mais recente) e quantos treinos seguidos nela.
  const comFase = daApp.filter((s) => s.status === "concluida" && s.fase).sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  const faseAtual = comFase.reduce<{ fase: string; treinos: number } | null>((acc, s) => (acc && acc.fase === s.fase ? { fase: acc.fase, treinos: acc.treinos + 1 } : { fase: s.fase!, treinos: 1 }), null);
  const seriesExtras = daApp.filter((s) => s.modo !== "extra" && classificarSessao(s) === "concluida").reduce((a, s) => a + Math.max(0, (s.series_concluidas || 0) - (s.series_planejadas || 0)), 0);

  const progresso = (c: CodigoConquista): { atual: number | null; alvo: number | null; falta: string | null; disponivel: boolean } => {
    const treinos = (n: number) => ({ atual: Math.min(concluidas, n), alvo: n, falta: `Faltam ${plural(Math.max(0, n - concluidas), "treino concluído", "treinos concluídos")}, seguindo o seu plano.`, disponivel: true });
    const semanas = (n: number) => ({ atual: Math.min(seq.atual, n), alvo: n, falta: `Cumpra a meta semanal ${n} semanas seguidas — você está em ${seq.atual}.`, disponivel: true });
    switch (c) {
      case "primeiro_treino": return { atual: Math.min(concluidas, 1), alvo: 1, falta: "Conclua seu primeiro treino (pelo menos metade das séries).", disponivel: true };
      case "primeira_meta_semanal": return { atual: Math.min(seq.semanasCumpridas, 1), alvo: 1, falta: meta ? `Faça os ${plural(meta, "treino", "treinos")} da sua meta numa mesma semana.` : "Cumpra a meta de treinos de uma semana.", disponivel: true };
      case "relatorio_mensal": return { atual: null, alvo: null, falta: "Abra “Ver minha evolução completa” na tela Evolução.", disponivel: true };
      case "treinos_10": return treinos(10);
      case "treinos_25": return treinos(25);
      case "treinos_50": return treinos(50);
      case "semanas_consistentes_4": return semanas(4);
      case "semanas_consistentes_5": return semanas(5);
      case "semanas_consistentes_6": return semanas(6);
      case "semanas_consistentes_8": return semanas(8);
      case "semanas_consistentes_10": return semanas(10);
      case "semanas_consistentes_12": return semanas(12);
      case "acompanhamento_12_semanas": return { atual: Math.min(participando, 12), alvo: 12, falta: `Treine em 12 semanas do acompanhamento (não precisam ser seguidas) — você está em ${Math.min(participando, 12)}.`, disponivel: true };
      case "criando_raizes": {
        const a = avaliarRaizes(e.aderencia.semanas, validas, e.hoje);
        return a.disponivel
          ? { atual: a.atual, alvo: a.alvo, falta: a.atual ? "Você já treinou em uma semana. Volte a treinar na próxima semana planejada." : "Treine em duas semanas diferentes nas suas primeiras semanas de acompanhamento.", disponivel: true }
          : { atual: null, alvo: null, falta: "Essa medalha é das primeiras semanas de acompanhamento.", disponivel: false };
      }
      case "constancia_vida_real":
      case "constancia_verdade": {
        const cfg = c === "constancia_vida_real" ? LIMITES.vidaReal : LIMITES.verdade;
        const a = avaliarJanela(e.aderencia.semanas, validas, cfg);
        return { atual: a.atual, alvo: cfg.alvo, falta: `Cumpra a meta em ${cfg.alvo} das últimas ${cfg.janela} semanas — agora são ${a.atual ?? 0}. Uma semana diferente não zera o caminho.`, disponivel: true };
      }
      case "recomeco_consistente": {
        const a = avaliarRecomeco(validas, e.hoje);
        return a.disponivel
          ? { atual: 1, alvo: 2, falta: `Você voltou! Treine também em outra semana até ${String(a.evidencia.ate).slice(8, 10)}/${String(a.evidencia.ate).slice(5, 7)}.`, disponivel: true }
          : { atual: null, alvo: null, falta: "Só acontece depois de uma pausa de 14 dias ou mais: se precisar parar, voltar e treinar em duas semanas diferentes conquista essa medalha.", disponivel: false };
      }
      case "primeiro_mes": {
        const a = avaliarPrimeiroMes(validas, e.hoje);
        if (!a.disponivel) return { atual: null, alvo: null, falta: "Essa medalha é do primeiro mês de acompanhamento.", disponivel: false };
        const ev = a.evidencia as { semanas?: number; diasPassados?: number };
        const partes = [
          (a.atual ?? 0) < LIMITES.primeiroMes.treinos ? plural(LIMITES.primeiroMes.treinos - (a.atual ?? 0), "treino", "treinos") : null,
          (ev.semanas ?? 0) < LIMITES.primeiroMes.semanas ? `treinar em ${plural(LIMITES.primeiroMes.semanas - (ev.semanas ?? 0), "semana diferente", "semanas diferentes")}` : null,
        ].filter(Boolean);
        const faltaDias = Math.max(0, LIMITES.primeiroMes.diasMinimos - (ev.diasPassados ?? 0));
        return { atual: a.atual, alvo: a.alvo, falta: validas.length ? `${partes.length ? `Falta: ${partes.join(" e ")}.` : "Treinos e semanas já estão certos."}${faltaDias ? ` A medalha sai em ${plural(faltaDias, "dia", "dias")}.` : ""}` : "Comece pelo primeiro treino.", disponivel: true };
      }
      case "fiz_o_necessario":
      case "nunca_deixei_pra_depois": {
        const n = c === "fiz_o_necessario" ? 1 : LIMITES_ALEM.curtos;
        return curtos ? { atual: Math.min(curtos, n), alvo: n, falta: `Faltam ${plural(n - Math.min(curtos, n), "treino", "treinos")} na versão curta, nos dias corridos.`, disponivel: true } : { atual: null, alvo: null, falta: "Num dia corrido, use “meu treino possível hoje” (quando o Montinho liberar na sua ficha) e conclua a versão curta.", disponivel: false };
      }
      case "fui_alem":
      case "milha_extra":
      case "sempre_um_a_mais": {
        const n = c === "fui_alem" ? 1 : c === "milha_extra" ? LIMITES_ALEM.extras : LIMITES_ALEM.extrasMuitos;
        return extras ? { atual: Math.min(extras, n), alvo: n, falta: `Faltam ${plural(n - Math.min(extras, n), "treino extra", "treinos extras")}, dentro do combinado com o Montinho.`, disponivel: true } : { atual: null, alvo: null, falta: "Quando o Montinho liberar treinos extras para você, eles aparecem em “Treino extra”.", disponivel: false };
      }
      case "primeira_tecnica":
      case "tecnicas_2":
      case "tecnicas_3":
      case "tecnicas_4":
      case "tecnicas_5":
      case "tecnicas_7":
      case "tecnicas_10":
      case "mestre_tecnicas": {
        const n = MARCOS_TECNICA.find(([x]) => x === c)?.[1] ?? 1;
        const faltam = feitas.size ? Object.entries(TECNICAS_MEDALHA).filter(([f]) => !feitas.has(f as FamiliaTecnica)).map(([, nome]) => nome) : [];
        return {
          atual: Math.min(feitas.size, n),
          alvo: n,
          falta: `Faltam ${plural(n - Math.min(feitas.size, n), "técnica avançada diferente", "técnicas avançadas diferentes")}. Elas aparecem quando o Montinho coloca na sua ficha.${c === "mestre_tecnicas" && faltam.length ? ` Ainda não fez: ${faltam.join(", ")}.` : ""}`,
          disponivel: true,
        };
      }
      case "chegou_intensificacao":
        return { atual: null, alvo: null, falta: "Quando o Montinho passar o seu protocolo para a fase de intensificação, conclua o primeiro treino dela.", disponivel: true };
      case "completou_adaptacao":
      case "completou_intensificacao":
      case "completou_consolidacao": {
        const fase = c.replace("completou_", "");
        const naFase = faseAtual?.fase === fase ? faseAtual.treinos : 0;
        return naFase
          ? { atual: Math.min(naFase, LIMITES_FASE.minTreinos), alvo: LIMITES_FASE.minTreinos, falta: naFase < LIMITES_FASE.minTreinos ? `Faltam ${plural(LIMITES_FASE.minTreinos - naFase, "treino", "treinos")} nesta fase. A medalha sai quando o Montinho passar para a próxima.` : "Treinos da fase feitos! A medalha sai quando o Montinho passar para a próxima fase.", disponivel: true }
          : { atual: null, alvo: null, falta: "As fases são definidas pelo Montinho no seu protocolo. Conclua pelo menos 4 treinos na fase e a medalha sai quando ela mudar.", disponivel: true };
      }
      case "treino_samurai":
        return { atual: null, alvo: null, falta: "O app confere sozinho o horário de início do treino. Dica: só vale a pena madrugar com o sono em dia.", disponivel: true };
      case "protocolo_completo":
        return { atual: null, alvo: null, falta: `Complete adaptação, intensificação e consolidação em sequência (${LIMITES_FASE.minTreinos}+ treinos em cada), sem ficar 14 dias ou mais sem treinar.`, disponivel: true };
      case "missao_cumprida": {
        const melhor = daApp.filter((s) => classificarSessao(s) === "concluida" && s.series_planejadas > 0).reduce((m, s) => Math.max(m, Math.round((s.series_concluidas / s.series_planejadas) * 100)), 0);
        return { atual: Math.min(melhor, 100), alvo: 100, falta: melhor ? `Seu melhor treino teve ${Math.min(melhor, 100)}% das séries. Faça todas as séries num treino.` : "Faça todas as séries propostas num treino.", disponivel: true };
      }
      case "cada_quilo_conta": {
        const max = daApp.filter((s) => classificarSessao(s) === "concluida").reduce((m, s) => Math.max(m, exerciciosComCarga(s)), 0);
        return { atual: Math.min(max, LIMITES_COMECO.exerciciosComCarga), alvo: LIMITES_COMECO.exerciciosComCarga, falta: `Anote a carga (kg) de ${LIMITES_COMECO.exerciciosComCarga} exercícios no mesmo treino${max ? ` — seu máximo até agora foi ${max}` : ""}.`, disponivel: true };
      }
      case "terceiro_especial": {
        const bons = daApp.filter((s) => classificarSessao(s) === "concluida" && s.series_planejadas > 0 && s.series_concluidas / s.series_planejadas >= LIMITES_COMECO.pctSeries / 100).length;
        return { atual: Math.min(bons, LIMITES_COMECO.treinosBons), alvo: LIMITES_COMECO.treinosBons, falta: `Faltam ${plural(Math.max(0, LIMITES_COMECO.treinosBons - bons), "treino", "treinos")} com ${LIMITES_COMECO.pctSeries}% ou mais das séries.`, disponivel: true };
      }
      case "ponto_de_partida":
        return { atual: null, alvo: null, falta: null, disponivel: true }; // o “como conquistar” já explica (e o detalhe tem o botão)
      case "olhar_de_aguia":
        return { atual: null, alvo: null, falta: null, disponivel: true }; // idem: botão do WhatsApp no detalhe
      case "voltei_pro_jogo":
        return { atual: null, alvo: null, falta: "Só acontece no começo: se nos primeiros 30 dias você ficar de 7 a 13 dias sem treinar, volte e conclua um treino.", disponivel: false };
      case "uma_a_mais":
        return { atual: Math.min(seriesExtras, LIMITES_ALEM.seriesExtras), alvo: LIMITES_ALEM.seriesExtras, falta: `Faltam ${plural(LIMITES_ALEM.seriesExtras - Math.min(seriesExtras, LIMITES_ALEM.seriesExtras), "série extra", "séries extras")}. Use “+ Série extra” quando o app convidar e você estiver bem.`, disponivel: seriesExtras > 0 };
      default: return { atual: null, alvo: null, falta: null, disponivel: true };
    }
  };

  return ORDEM.map(({ codigo, selo }) => {
    const data = ganhas.get(codigo) ?? null;
    const p = progresso(codigo);
    return {
      codigo,
      titulo: CONTEUDO[codigo].nome,
      selo,
      conquistada: !!data,
      data,
      atual: data ? p.alvo : p.atual,
      alvo: p.alvo,
      falta: data ? null : p.falta,
      nova: !!data && dias(dataLocal(data), e.hoje) <= 7,
      disponivel: !!data || p.disponivel,
      detalhe: detalheTecnica(codigo, !!data),
    };
  });
}

/**
 * Próximas medalhas, da principal para as demais. Pontua proximidade (fração
 * do progresso) e o momento da jornada (as primeiras abertas pesam mais).
 * Fora: as já completas que ainda vão ser registradas, as indisponíveis e as
 * que dependem só de tempo/clique sem relação com o plano.
 */
export function proximasMedalhas(ms: Medalha[], limite = 3): Medalha[] {
  const ganhas = ms.filter((m) => m.conquistada).length;
  const pontos = (m: Medalha, i: number) => {
    // Medalha sem número (ex.: abrir a evolução) só pesa depois do primeiro treino.
    const fr = m.alvo ? (m.atual ?? 0) / m.alvo : ganhas > 0 ? 0.3 : 0;
    const momento = i <= ganhas + 3 ? 0.25 : 0;
    return fr + momento;
  };
  return ms
    .map((m, i) => ({ m, p: pontos(m, i), i }))
    .filter(({ m }) => !m.conquistada && m.disponivel && !(m.alvo && (m.atual ?? 0) >= m.alvo))
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .slice(0, limite)
    .map(({ m }) => m);
}

export function proximaMedalha(ms: Medalha[]): Medalha | null {
  return proximasMedalhas(ms, 1)[0] ?? null;
}

/**
 * Até 10 medalhas em destaque na tela principal: conquistas recentes (30 dias),
 * as próximas, depois marcos já conquistados. Mantém a ordem da jornada.
 */
export function medalhasEmDestaque(ms: Medalha[], hoje: string, limite = 10): Medalha[] {
  const escolhidas = new Set<CodigoConquista>();
  const add = (xs: Medalha[]) => xs.forEach((m) => escolhidas.size < limite && escolhidas.add(m.codigo));
  add(ms.filter((m) => m.conquistada && m.data && dias(dataLocal(m.data), hoje) <= 30));
  add(proximasMedalhas(ms, 3));
  add([...ms.filter((m) => m.conquistada)].reverse());
  add(ms.filter((m) => m.disponivel));
  add(ms);
  return ms.filter((m) => escolhidas.has(m.codigo));
}
