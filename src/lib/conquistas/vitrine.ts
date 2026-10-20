// ============================================================================
// Vitrine de medalhas: as conquistas únicas (não repetem) em ordem de jornada,
// com o progresso real até a próxima — sempre a partir do que foi registrado.
// Recordes e “Eu voltei” repetem: ficam fora da grade (recordes têm bloco
// próprio). Nada aqui grava; a gravação continua em data/conquistas.
// ============================================================================

import { classificarSessao, dataLocal, type ResultadoAderencia } from "@/lib/aderencia/calcular";
import { CATALOGO, REGRAS_CONQUISTAS, type CodigoConquista, type SessaoConquista } from "./regras";

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
};

const ORDEM: Array<{ codigo: CodigoConquista; selo: string }> = [
  { codigo: "primeiro_treino", selo: "1º" },
  { codigo: "primeira_meta_semanal", selo: "Meta" },
  { codigo: "relatorio_mensal", selo: "Eu" },
  { codigo: "treinos_10", selo: "10" },
  { codigo: "semanas_consistentes_4", selo: "4 sem" },
  { codigo: "primeiro_mes", selo: "1 mês" },
  { codigo: "treinos_25", selo: "25" },
  { codigo: "semanas_consistentes_8", selo: "8 sem" },
  { codigo: "acompanhamento_12_semanas", selo: "12 sem" },
  { codigo: "treinos_50", selo: "50" },
];

const dias = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

export function vitrineDeMedalhas(e: {
  conquistas: Array<{ codigo: string; conquistado_em: string }>;
  sessoes: SessaoConquista[];
  aderencia: Pick<ResultadoAderencia, "sequencia" | "semanaAtual"> & { semanas?: ResultadoAderencia["semanas"] };
  hoje: string;
}): Medalha[] {
  const ganhas = new Map<string, string>();
  for (const c of e.conquistas) if (!ganhas.has(c.codigo) || c.conquistado_em < ganhas.get(c.codigo)!) ganhas.set(c.codigo, c.conquistado_em);

  const contam = e.sessoes.filter((s) => s.status !== "em_andamento" && s.conta_aderencia !== false);
  const concluidas = contam.filter((s) => classificarSessao(s) === "concluida").length;
  const validas = contam.filter((s) => ["concluida", "parcial"].includes(classificarSessao(s))).map((s) => dataLocal(s.iniciado_em)).sort();
  const seq = e.aderencia.sequencia;
  const meta = e.aderencia.semanaAtual?.meta ?? null;
  // Mesma conta da regra (regras.ts): semanas com meta, sem pausa e com ao menos um treino.
  const participando = e.aderencia.semanas
    ? e.aderencia.semanas.filter((w) => w.meta && !w.pausada && w.concluidas + w.parciais > 0).length
    : seq.semanasParticipando;

  const progresso = (c: CodigoConquista): { atual: number | null; alvo: number | null; falta: string | null } => {
    const treinos = (n: number) => ({ atual: Math.min(concluidas, n), alvo: n, falta: `Faltam ${Math.max(0, n - concluidas)} treino(s) concluído(s).` });
    const semanas = (n: number) => ({ atual: Math.min(seq.atual, n), alvo: n, falta: `Cumpra a meta semanal ${n} semanas seguidas — você está em ${seq.atual}.` });
    switch (c) {
      case "primeiro_treino": return { atual: Math.min(concluidas, 1), alvo: 1, falta: "Conclua seu primeiro treino." };
      case "primeira_meta_semanal": return { atual: Math.min(seq.semanasCumpridas, 1), alvo: 1, falta: meta ? `Faça ${meta} treino(s) numa mesma semana.` : "Cumpra a meta de treinos de uma semana." };
      case "relatorio_mensal": return { atual: null, alvo: null, falta: "Abra “Ver minha evolução completa” em Evolução." };
      case "treinos_10": return treinos(10);
      case "treinos_25": return treinos(25);
      case "treinos_50": return treinos(50);
      case "semanas_consistentes_4": return semanas(4);
      case "semanas_consistentes_8": return semanas(8);
      case "acompanhamento_12_semanas": return { atual: Math.min(participando, 12), alvo: 12, falta: `Treine com acompanhamento por 12 semanas — você está em ${Math.min(participando, 12)}.` };
      case "primeiro_mes": {
        const d = validas.length ? dias(validas[0], e.hoje) : 0;
        const faltaDias = Math.max(0, REGRAS_CONQUISTAS.diasPrimeiroMes - d);
        const faltaTreinos = Math.max(0, REGRAS_CONQUISTAS.treinosPrimeiroMes - validas.length);
        return { atual: Math.min(d, REGRAS_CONQUISTAS.diasPrimeiroMes), alvo: REGRAS_CONQUISTAS.diasPrimeiroMes, falta: validas.length ? `Continue treinando: faltam ${faltaDias} dia(s)${faltaTreinos ? ` e ${faltaTreinos} treino(s)` : ""}.` : "Comece pelo primeiro treino." };
      }
      default: return { atual: null, alvo: null, falta: null };
    }
  };

  return ORDEM.map(({ codigo, selo }) => {
    const data = ganhas.get(codigo) ?? null;
    const p = progresso(codigo);
    return {
      codigo,
      titulo: CATALOGO[codigo].titulo,
      selo,
      conquistada: !!data,
      data,
      atual: data ? p.alvo : p.atual,
      alvo: p.alvo,
      falta: data ? null : p.falta,
      nova: !!data && dias(dataLocal(data), e.hoje) <= 7,
    };
  });
}

/** A próxima medalha: a não conquistada mais perto de sair (maior fração; empate → ordem da jornada). */
export function proximaMedalha(ms: Medalha[]): Medalha | null {
  const abertas = ms.filter((m) => !m.conquistada);
  if (!abertas.length) return null;
  // Já completa mas ainda não registrada (sai no próximo treino) não é “próxima”.
  const fr = (m: Medalha) => (m.alvo ? ((m.atual ?? 0) >= m.alvo ? -0.5 : (m.atual ?? 0) / m.alvo) : -1);
  return abertas.reduce((a, b) => (fr(b) > fr(a) ? b : a));
}
