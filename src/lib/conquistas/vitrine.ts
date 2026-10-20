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
};

/** Jornada sugerida (ordem visual). Critérios são independentes da ordem. */
export const ORDEM: Array<{ codigo: CodigoConquista; selo: string }> = [
  { codigo: "primeiro_treino", selo: "1º" },
  { codigo: "criando_raizes", selo: "Raiz" },
  { codigo: "primeira_meta_semanal", selo: "Meta" },
  { codigo: "relatorio_mensal", selo: "Eu" },
  { codigo: "treinos_10", selo: "10" },
  { codigo: "primeiro_mes", selo: "1 mês" },
  { codigo: "constancia_vida_real", selo: "3/4" },
  { codigo: "semanas_consistentes_4", selo: "4 sem" },
  { codigo: "treinos_25", selo: "25" },
  { codigo: "semanas_consistentes_8", selo: "8 sem" },
  { codigo: "acompanhamento_12_semanas", selo: "12 sem" },
  { codigo: "constancia_verdade", selo: "8/12" },
  { codigo: "treinos_50", selo: "50" },
  { codigo: "recomeco_consistente", selo: "Volta" },
];

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
      case "semanas_consistentes_8": return semanas(8);
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
    const fr = m.alvo ? (m.atual ?? 0) / m.alvo : 0.3;
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
