// ============================================================================
// Vitrine de medalhas (Conquistas 3.0): as 14 medalhas únicas em ordem de
// jornada SUGERIDA (nenhuma depende de outra), com o progresso real — sempre
// a partir do que foi registrado e pelas mesmas funções que concedem
// (criterios.ts). Recordes e “Eu voltei” repetem: ficam em seções próprias.
// Nada aqui grava; a gravação continua em data/conquistas.
// ============================================================================

import { proximoFeriado } from "./feriados";
import { totalDeSeries } from "./volume-series";
import { mesesComTreino } from "./acompanhamento";
import { JANELAS_CARDIO } from "./cardio-horario";
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
  { codigo: "acompanhamento_3_meses", selo: "3 m" },
  { codigo: "acompanhamento_6_meses", selo: "6 m" },
  { codigo: "acompanhamento_1_ano", selo: "1 ano" },
  { codigo: "monitoramento_4", selo: "📏4" },
  { codigo: "monitoramento_8", selo: "📏8" },
  { codigo: "monitoramento_12", selo: "📏12" },
  { codigo: "monitoramento_26", selo: "📏26" },
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
  { codigo: "strava_conectado", selo: "⌚" },
  { codigo: "compartilhou_primeiro", selo: "📣" },
  { codigo: "diario_de_bordo", selo: "📸" },
  { codigo: "vitrine_de_trofeus", selo: "🏆" },
  { codigo: "inspiracao_galera", selo: "🔥" },
  { codigo: "trouxe_amigo", selo: "🤝" },
  { codigo: "criador_desafios", selo: "⚔️" },
  { codigo: "campeao_desafio", selo: "🥇" },
  { codigo: "palavra_cumprida", selo: "✅" },
  { codigo: "semana_compartilhada", selo: "7📸" },
  { codigo: "cards_10", selo: "10📸" },
  { codigo: "cards_20", selo: "20📸" },
  { codigo: "cards_30", selo: "30📸" },
  { codigo: "trofeus_compartilhados_10", selo: "10🏆" },
  { codigo: "trofeus_compartilhados_20", selo: "20🏆" },
  { codigo: "trofeus_compartilhados_30", selo: "30🏆" },
  { codigo: "trofeus_compartilhados_50", selo: "50🏆" },
  // Autoconhecimento: respostas certas no “Mito ou verdade?” (50 só com 50+ perguntas no app)
  { codigo: "quiz_1", selo: "1✓" },
  { codigo: "quiz_10", selo: "10✓" },
  { codigo: "quiz_30", selo: "30✓" },
  { codigo: "quiz_50", selo: "50✓" },
  { codigo: "desafiante_nato", selo: "🔥" },
  // Montinho Cardio (500 e 1.000 ainda desligados: não aparecem)
  { codigo: "cardio_1", selo: "❤️" },
  { codigo: "cardio_2", selo: "2❤️" },
  { codigo: "cardio_3", selo: "3❤️" },
  { codigo: "cardio_10", selo: "10❤️" },
  { codigo: "cardio_25", selo: "25❤️" },
  { codigo: "cardio_50", selo: "50❤️" },
  { codigo: "cardio_100", selo: "100" },
  { codigo: "cardio_250", selo: "250" },
  { codigo: "cardio_semana_ritmo", selo: "⚡" },
  { codigo: "cardio_meta_semana", selo: "100%" },
  { codigo: "cardio_4_semanas", selo: "4×" },
  { codigo: "cardio_folego_extra", selo: "150%" },
  { codigo: "cardio_dobro", selo: "2×" },
  { codigo: "cardio_uma_hora", selo: "60′" },
  { codigo: "cardio_meia_noite", selo: "0h" },
  { codigo: "cardio_madrugada", selo: "<5h" },
  { codigo: "cardio_4h", selo: "4h" },
  { codigo: "cardio_10km", selo: "10km" },
  { codigo: "cardio_escada_1h", selo: "🪜60′" },
  // Mobilidade e alongamento (0116)
  { codigo: "mobilidade_superiores", selo: "💪🧘" },
  { codigo: "mobilidade_inferiores", selo: "🦵🧘" },
  { codigo: "mobilidade_completa", selo: "🧘" },
  { codigo: "mobilidade_7_superiores", selo: "7💪" },
  { codigo: "mobilidade_7_inferiores", selo: "7🦵" },
  // Feriados (o troféu ganho leva o nome do feriado)
  { codigo: "feriado_musculacao", selo: "🎉💪" },
  { codigo: "feriado_cardio", selo: "🎉❤️" },
  { codigo: "feriado_combo", selo: "🎉+1" },
  // Dia em dobro
  { codigo: "dois_folegos", selo: "2❤️‍🔥" },
  { codigo: "combo_completo", selo: "💪❤️" },
  { codigo: "dose_dupla", selo: "2💪" },
  // Combo em sequência: dias seguidos com musculação + 20 min de cardio
  { codigo: "combo_3", selo: "3d" },
  { codigo: "combo_5", selo: "5d" },
  { codigo: "combo_7", selo: "7d" },
  { codigo: "combo_10", selo: "10d" },
  { codigo: "combo_30", selo: "30d" },
  // Volume total
  { codigo: "series_500", selo: "500" },
  { codigo: "series_1000", selo: "1k" },
];

/** “Mais desafiadores”: troféus de disciplina, que só saem com meses de treino. */
export const DESAFIADORAS: CodigoConquista[] = ["semanas_consistentes_12", "semanas_consistentes_10", "semanas_consistentes_8", "constancia_verdade", "protocolo_completo", "acompanhamento_12_semanas", "treinos_50", "mestre_tecnicas", "treino_samurai", "cardio_100", "cardio_250", "cardio_4_semanas", "cardio_dobro", "combo_30", "series_1000", "acompanhamento_6_meses", "acompanhamento_1_ano", "cards_30", "trofeus_compartilhados_50", "quiz_50", "cardio_4h", "cardio_10km", "cardio_escada_1h", "monitoramento_12", "monitoramento_26"];

const dias = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
/** “Falta 1 treino” / “Faltam 3 treinos”: o verbo concorda com o número. */
const faltaN = (n: number, um: string, varios: string) => `${n === 1 ? "Falta" : "Faltam"} ${plural(n, um, varios)}`;

type Aderencia = Pick<ResultadoAderencia, "sequencia" | "semanaAtual" | "semanas">;

/** Resumo do Montinho Cardio para o progresso dos troféus de cardio. */
export type ProgressoCardio = {
  feitos: number;
  temPrescricao: boolean;
  prescricaoLonga: boolean;
  /** Semana de cardio em andamento (só com prescrição e ainda não cumprida): quanto falta. */
  semana?: { faltaSessoes: number; faltaMin: number; metaMinutos: boolean } | null;
  /** Semanas seguidas cumprindo o cardio, antes desta (Fôlego de Ferro). */
  seguidas?: number;
  /** Minutos desta semana × prescritos (Fôlego Extra / Dobro de Fôlego). */
  semanaMin?: { minutos: number; alvoMin: number } | null;
  /** Dias seguidos com musculação + 20 min de cardio, até hoje (Combo em sequência). */
  comboSeguidos?: number;
};

/** Progresso dos troféus de compartilhar e do “Mito ou verdade?” (quando a tela tem esses dados). */
export type ProgressoExtras = { cardsCompartilhados?: number; trofeusCompartilhados?: number; quizCertas?: number; quizTotal?: number; /** Mobilidade: dias seguidos agora de cada protocolo. */ mobilidade?: { superiores: number; inferiores: number }; /** Monitoramento: semanas seguidas com medidas e se a semana atual já tem. */ monitoramento?: { seguidas: number; estaSemana: boolean } };

export function vitrineDeMedalhas(e: { conquistas: Array<{ codigo: string; conquistado_em: string }>; sessoes: SessaoConquista[]; aderencia: Aderencia; hoje: string; cardio?: ProgressoCardio | null; extras?: ProgressoExtras | null }): Medalha[] {
  const ganhas = new Map<string, string>();
  for (const c of e.conquistas) if (!ganhas.has(c.codigo) || c.conquistado_em < ganhas.get(c.codigo)!) ganhas.set(c.codigo, c.conquistado_em);

  const validas = sessoesValidas(e.sessoes);
  const concluidas = validas.filter((s) => classificarSessao(s) === "concluida").length;
  const seq = e.aderencia.sequencia;
  const meta = e.aderencia.semanaAtual?.meta ?? null;
  // Mesma conta da regra: semanas com meta, sem pausa e com ao menos um treino.
  const mesesTreinados = mesesComTreino(e.sessoes);
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
    const treinos = (n: number) => ({ atual: Math.min(concluidas, n), alvo: n, falta: `${faltaN(Math.max(0, n - concluidas), "treino concluído", "treinos concluídos")}, seguindo o seu plano.`, disponivel: true });
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
      case "acompanhamento_3_meses":
      case "acompanhamento_6_meses":
      case "acompanhamento_1_ano": {
        const n = c === "acompanhamento_1_ano" ? 12 : Number(c.split("_")[1]);
        const m = Math.min(mesesTreinados, n);
        return { atual: m, alvo: n, falta: `Treine em ${n} meses diferentes (blocos de 30 dias desde o 1º treino; não precisam ser seguidos) — você está em ${plural(m, "mês", "meses")}.`, disponivel: true };
      }
      case "retomada_30":
        return { atual: null, alvo: null, falta: "Só acontece depois de 30 dias ou mais sem treinar: volte e faça um treino.", disponivel: false };
      case "quiz_1":
      case "quiz_10":
      case "quiz_30":
      case "quiz_50": {
        const n = Number(c.slice(5));
        const certas = e.extras?.quizCertas;
        return { atual: certas == null ? null : Math.min(certas, n), alvo: certas == null ? null : n, falta: `${certas == null ? `Acerte ${n === 1 ? "uma resposta" : `${n} respostas`}` : faltaN(Math.max(0, n - certas), "resposta certa", "respostas certas")} no “Mito ou verdade?” da tela Conhecimento (vale a primeira resposta de cada).`, disponivel: true };
      }
      case "semana_compartilhada":
        return { atual: null, alvo: null, falta: "Cumpra a meta da semana e compartilhe (ou baixe) o card do fim de CADA treino dela.", disponivel: true };
      case "cards_10":
      case "cards_20":
      case "cards_30": {
        const n = Number(c.slice(6));
        const feitos = e.extras?.cardsCompartilhados;
        return { atual: feitos == null ? null : Math.min(feitos, n), alvo: feitos == null ? null : n, falta: `${feitos == null ? `Compartilhe o card do fim do treino de ${n} treinos diferentes` : `${faltaN(Math.max(0, n - feitos), "treino", "treinos")} com o card do fim compartilhado`}.`, disponivel: true };
      }
      case "trofeus_compartilhados_10":
      case "trofeus_compartilhados_20":
      case "trofeus_compartilhados_30":
      case "trofeus_compartilhados_50": {
        const n = Number(c.split("_").at(-1));
        const feitos = e.extras?.trofeusCompartilhados;
        return { atual: feitos == null ? null : Math.min(feitos, n), alvo: feitos == null ? null : n, falta: `${feitos == null ? `Compartilhe ${n} troféus diferentes` : faltaN(Math.max(0, n - feitos), "troféu diferente", "troféus diferentes") + " para compartilhar"} (abra o troféu e toque em “📲 Compartilhar”).`, disponivel: true };
      }
      case "cardio_madrugada":
      case "cardio_4h":
      case "cardio_meia_noite": {
        const j = JANELAS_CARDIO[c];
        return { atual: null, alvo: null, falta: `Comece o cardio no app (▶ Começar do cronômetro) ${j.texto}, horário de Brasília — 1 minuto depois já não vale. Só com o sono em dia.`, disponivel: (e.cardio?.feitos ?? 0) > 0 || !!e.cardio?.temPrescricao };
      }
      case "cardio_10km":
        return { atual: null, alvo: null, falta: "Some 10 km no mesmo dia em esteira, caminhada, corrida ou HIIT (anote a distância no registro).", disponivel: (e.cardio?.feitos ?? 0) > 0 || !!e.cardio?.temPrescricao };
      case "mobilidade_superiores":
      case "mobilidade_inferiores":
        return { atual: null, alvo: null, falta: `Em Treinar → 🧘 Mobilidade, comece a de ${c === "mobilidade_superiores" ? "Superiores" : "Inferiores"} no app e conclua (cerca de 22 minutos).`, disponivel: true };
      case "mobilidade_completa":
        return { atual: null, alvo: null, falta: "Conclua no app os dois protocolos de mobilidade: superiores e inferiores.", disponivel: true };
      case "monitoramento_4":
      case "monitoramento_8":
      case "monitoramento_12":
      case "monitoramento_26": {
        const n = Number(c.slice(14));
        const m = e.extras?.monitoramento;
        if (!m) return { atual: null, alvo: n, falta: `Registre medidas ou uma avaliação uma vez por semana, ${n} semanas seguidas.`, disponivel: true };
        const atual = Math.min(m.seguidas, n);
        return { atual, alvo: n, falta: `Medidas ou avaliação uma vez por semana, ${n} semanas seguidas — você está em ${plural(atual, "semana", "semanas")}.${m.estaSemana ? " Esta semana já valeu!" : " Falta registrar esta semana."}`, disponivel: true };
      }
      case "mobilidade_7_superiores":
      case "mobilidade_7_inferiores": {
        const seq = e.extras?.mobilidade?.[c === "mobilidade_7_superiores" ? "superiores" : "inferiores"] ?? 0;
        return { atual: Math.min(seq, 7), alvo: 7, falta: `Faça a mobilidade de ${c === "mobilidade_7_superiores" ? "superiores" : "inferiores"} no app 7 dias seguidos — agora: ${Math.min(seq, 7)} de 7.`, disponivel: true };
      }
      case "cardio_escada_1h":
        return { atual: null, alvo: null, falta: "Some 60 minutos de escada no mesmo dia (partes de 10+ minutos).", disponivel: (e.cardio?.feitos ?? 0) > 0 || !!e.cardio?.temPrescricao };
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
        return curtos ? { atual: Math.min(curtos, n), alvo: n, falta: `${faltaN(n - Math.min(curtos, n), "treino", "treinos")} na versão curta, nos dias corridos.`, disponivel: true } : { atual: null, alvo: null, falta: "Num dia corrido, use “meu treino possível hoje” (quando o Montinho liberar na sua ficha) e conclua a versão curta.", disponivel: false };
      }
      case "fui_alem":
      case "milha_extra":
      case "sempre_um_a_mais": {
        const n = c === "fui_alem" ? 1 : c === "milha_extra" ? LIMITES_ALEM.extras : LIMITES_ALEM.extrasMuitos;
        return extras ? { atual: Math.min(extras, n), alvo: n, falta: `${faltaN(n - Math.min(extras, n), "treino extra", "treinos extras")}, dentro do combinado com o Montinho.`, disponivel: true } : { atual: null, alvo: null, falta: "Quando o Montinho liberar treinos extras para você, eles aparecem em “Treino extra”.", disponivel: false };
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
          falta: `${faltaN(n - Math.min(feitas.size, n), "técnica avançada diferente", "técnicas avançadas diferentes")}. Elas aparecem quando o Montinho coloca na sua ficha.${c === "mestre_tecnicas" && faltam.length ? ` Ainda não fez: ${faltam.join(", ")}.` : ""}`,
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
          ? { atual: Math.min(naFase, LIMITES_FASE.minTreinos), alvo: LIMITES_FASE.minTreinos, falta: naFase < LIMITES_FASE.minTreinos ? `${faltaN(LIMITES_FASE.minTreinos - naFase, "treino", "treinos")} nesta fase. A medalha sai quando o Montinho passar para a próxima.` : "Treinos da fase feitos! A medalha sai quando o Montinho passar para a próxima fase.", disponivel: true }
          : { atual: null, alvo: null, falta: "As fases são definidas pelo Montinho no seu protocolo. Conclua pelo menos 4 treinos na fase e a medalha sai quando ela mudar.", disponivel: true };
      }
      case "compartilhou_primeiro":
        return { atual: null, alvo: null, falta: "Gere o card no fim do treino ou numa medalha e toque em Compartilhar.", disponivel: true };
      case "diario_de_bordo":
        return { atual: null, alvo: null, falta: "Compartilhe o card do fim do treino em 4 semanas diferentes.", disponivel: true };
      case "vitrine_de_trofeus":
        return { atual: null, alvo: null, falta: "Compartilhe 5 troféus diferentes (pelo card da medalha).", disponivel: true };
      case "inspiracao_galera":
        return { atual: null, alvo: null, falta: "Compartilhe um card: quando alguém abrir o link dele, o troféu sai.", disponivel: true };
      case "trouxe_amigo":
        return { atual: null, alvo: null, falta: "Convide um amigo pelo seu link AMIGO-…: quando ele se cadastrar, o troféu sai.", disponivel: true };
      case "criador_desafios":
        return { atual: null, alvo: null, falta: "Em Ranking → Desafios, crie um desafio e convide alguém. Ao chegar ao fim com pelo menos mais uma pessoa, o troféu sai.", disponivel: true };
      case "campeao_desafio":
        return { atual: null, alvo: null, falta: "Termine em 1º lugar um desafio “Quem treina mais” ou “Madrugadores”.", disponivel: true };
      case "palavra_cumprida":
        return { atual: null, alvo: null, falta: "Cumpra a meta de um desafio de “Meta de treinos” ou “Semana em dia”.", disponivel: true };
      case "desafiante_nato":
        return { atual: null, alvo: null, falta: "Participe até o fim de 3 desafios entre amigos.", disponivel: true };
      case "cardio_1":
      case "cardio_2":
      case "cardio_3":
      case "cardio_10":
      case "cardio_25":
      case "cardio_50":
      case "cardio_100":
      case "cardio_250":
      case "cardio_500":
      case "cardio_1000": {
        const n = Number(c.split("_")[1]);
        const feitos = e.cardio?.feitos ?? 0;
        // Sem cardio prescrito nem registrado, não disputa a “próxima medalha” com a musculação.
        return { atual: Math.min(feitos, n), alvo: n, falta: `${faltaN(n - Math.min(feitos, n), "cardio", "cardios")} (1 por dia, 10 minutos ou mais) em Montinho Cardio.`, disponivel: feitos > 0 || !!e.cardio?.temPrescricao };
      }
      case "cardio_semana_ritmo":
      case "cardio_meta_semana":
      case "cardio_4_semanas":
        return e.cardio?.temPrescricao
          ? { atual: null, alvo: null, falta: c === "cardio_4_semanas" ? "Cumpra o cardio prescrito em 4 semanas seguidas." : c === "cardio_semana_ritmo" ? "Faça todos os cardios prescritos numa semana." : "Chegue aos minutos de cardio prescritos para a semana.", disponivel: true }
          : { atual: null, alvo: null, falta: "Quando o Montinho prescrever cardio para você, a meta da semana aparece em Montinho Cardio.", disponivel: false };
      case "cardio_folego_extra":
      case "cardio_dobro":
        return e.cardio?.temPrescricao
          ? { atual: null, alvo: null, falta: c === "cardio_dobro" ? "Some numa semana o dobro dos minutos de cardio prescritos." : "Some numa semana o prescrito e mais a metade (150% dos minutos).", disponivel: true }
          : { atual: null, alvo: null, falta: "Quando o Montinho prescrever cardio para você, dá para ir além da meta da semana.", disponivel: false };
      case "dois_folegos":
        return { atual: null, alvo: null, falta: "Faça 2 cardios no mesmo dia, cada um com 10 minutos ou mais (ex.: um de manhã e outro à noite).", disponivel: true };
      case "combo_completo":
        return { atual: null, alvo: null, falta: "No mesmo dia, conclua um treino de musculação e faça 10 minutos ou mais de cardio.", disponivel: true };
      case "combo_3":
      case "combo_5":
      case "combo_7":
      case "combo_10":
      case "combo_30": {
        const n = Number(c.slice(6));
        const atual = Math.min(e.cardio?.comboSeguidos ?? 0, n);
        return { atual, alvo: n, falta: `Musculação e 20 minutos ou mais de cardio no mesmo dia, ${n} dias seguidos — você está em ${plural(atual, "dia", "dias")}.`, disponivel: true };
      }
      case "series_500":
      case "series_1000": {
        const n = c === "series_500" ? 500 : 1000;
        const feitas = totalDeSeries(e.sessoes);
        return { atual: Math.min(feitas, n), alvo: n, falta: `${faltaN(Math.max(0, n - feitas), "série válida", "séries válidas")} — você já fez ${feitas.toLocaleString("pt-BR")}.`, disponivel: true };
      }
      case "feriado_musculacao":
      case "feriado_cardio":
      case "feriado_combo": {
        const p = proximoFeriado(e.hoje);
        const quando = p ? `${p.feriado.emoji} Próximo: ${p.feriado.nome}, ${p.dia.slice(8, 10)}/${p.dia.slice(5, 7)}. ` : "";
        const o = c === "feriado_musculacao" ? "conclua um treino de musculação" : c === "feriado_cardio" ? "faça 10 minutos ou mais de cardio" : "faça musculação e cardio";
        return { atual: null, alvo: null, falta: `${quando}No feriado, ${o}: o troféu leva o nome dele.`, disponivel: true };
      }
      case "dose_dupla":
        return { atual: null, alvo: null, falta: "Conclua 2 treinos de musculação no mesmo dia (o extra e o treino livre com séries também contam). Só com a recuperação em dia.", disponivel: true };
      case "cardio_uma_hora":
        return e.cardio?.prescricaoLonga
          ? { atual: null, alvo: null, falta: "Conclua o cardio de 60+ minutos prescrito, sem passar do tempo combinado.", disponivel: true }
          : { atual: null, alvo: null, falta: "Só existe quando o Montinho prescreve um cardio de 60 minutos ou mais. Fazer mais do que o prescrito não vale.", disponivel: false };
      case "cardio_voltei":
        return { atual: null, alvo: null, falta: "Só acontece depois de 14 dias ou mais sem cardio: volte e faça um cardio.", disponivel: false };
      case "strava_conectado":
        return { atual: null, alvo: null, falta: "No Perfil, em “Relógio (pelo Strava)”, marque a autorização e toque em “Conectar com o Strava”.", disponivel: true };
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
        return { atual: Math.min(bons, LIMITES_COMECO.treinosBons), alvo: LIMITES_COMECO.treinosBons, falta: `${faltaN(Math.max(0, LIMITES_COMECO.treinosBons - bons), "treino", "treinos")} com ${LIMITES_COMECO.pctSeries}% ou mais das séries.`, disponivel: true };
      }
      case "ponto_de_partida":
        return { atual: null, alvo: null, falta: null, disponivel: true }; // o “como conquistar” já explica (e o detalhe tem o botão)
      case "olhar_de_aguia":
        return { atual: null, alvo: null, falta: null, disponivel: true }; // idem: botão do WhatsApp no detalhe
      case "voltei_pro_jogo":
        return { atual: null, alvo: null, falta: "Só acontece no começo: se nos primeiros 30 dias você ficar de 7 a 13 dias sem treinar, volte e conclua um treino.", disponivel: false };
      case "uma_a_mais":
        return { atual: Math.min(seriesExtras, LIMITES_ALEM.seriesExtras), alvo: LIMITES_ALEM.seriesExtras, falta: `${faltaN(LIMITES_ALEM.seriesExtras - Math.min(seriesExtras, LIMITES_ALEM.seriesExtras), "série extra", "séries extras")}. Use “+ Série extra” quando o app convidar e você estiver bem.`, disponivel: seriesExtras > 0 };
      default: return { atual: null, alvo: null, falta: null, disponivel: true };
    }
  };

  // “Mestre do Conhecimento” (50) só aparece quando o app tiver 50 perguntas ou mais (ou já ganho).
  const quiz50 = (e.extras?.quizTotal ?? 0) >= 50 || ganhas.has("quiz_50");
  return ORDEM.filter(({ codigo }) => codigo !== "quiz_50" || quiz50).map(({ codigo, selo }) => {
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
      nova: !!data && dias(dataLocal(data), e.hoje) < 7, // últimos 7 dias (hoje + 6)
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
