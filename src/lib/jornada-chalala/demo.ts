// ============================================================================
// Dados FICTÍCIOS do protótipo “A Jornada do Chalalá”.
//
// Nada aqui é inventado na apresentação: as sessões abaixo são fictícias, mas
// passam pelo MOTOR REAL (aderência → conquistas → vitrine → jornada → caminho
// → linha do tempo). O protótipo consome exatamente o que a tela definitiva
// consumirá; só a origem dos dados muda.
// ============================================================================

import { calcularAderencia, dataLocal } from "@/lib/aderencia/calcular";
import { detectarConquistas, type SessaoConquista } from "@/lib/conquistas/regras";
import { proximaMedalha, vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { caminhoDaJornada, ciclos, linhaDoTempo, montarJornada, type EventoJornada, type Jornada } from "@/lib/conquistas/jornada";

export type Cenario = "completo" | "retorno";

/** Aluna fictícia: “Joana” (nome e histórico inventados para a demonstração). */
export const NOME_DEMO = "Joana";
export const HOJE_DEMO = "2026-10-21";
const INICIO = "2026-05-04";

/** Dias (contados a partir do início) em que houve treino concluído, por cenário. */
const DIAS: Record<Cenario, number[]> = {
  // 24 semanas com rotina regular: 3 treinos por semana, com algumas semanas de 2.
  completo: [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25, 28, 30, 32, 35, 37, 39, 42, 44, 46, 49, 51, 53, 56, 58, 60, 63, 65, 67, 70, 72, 74, 77, 79, 84, 86, 91, 93, 95, 98, 100, 102, 105, 107, 109, 112, 114, 116, 119, 121, 123, 126, 128, 130, 133, 135, 137, 140, 142, 144, 147, 149, 151, 154, 156, 158, 161, 163, 165, 168],
  // Mesmo começo, pausa combinada (viagem) de 2 semanas, 3 semanas paradas sem combinar e volta.
  retorno: [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25, 28, 30, 32, 35, 37, 39, 42, 44, 46, 49, 51, 53, 56, 58, 60, 63, 65, 67, 70, 72, 74, 98, 100, 102, 105, 107, 109, 112, 114, 116, 119, 121, 123, 126, 128, 130, 133, 135, 137, 140, 142, 144, 147, 149, 151, 154, 156, 158, 161, 163, 165, 168],
};

const somar = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const fase = (dia: number) => (dia < 42 ? "adaptacao" : dia < 112 ? "intensificacao" : "consolidacao");
const LETRAS = ["A", "B", "C"];
const NOMES = ["Pernas · Glúteo", "Peito · Tríceps", "Costas · Bíceps"];
const TECNICAS = ["normal", "piramide", "biset", "dropset", "rest_pause", "cluster", "superset"];

function sessoesDemo(c: Cenario): SessaoConquista[] {
  return DIAS[c].map((dia, i) => {
    const data = somar(INICIO, dia);
    const curto = i % 11 === 7;
    const carga = 20 + Math.floor(i / 14) * 2.5;
    return {
      id: `demo-${c}-${i}`,
      iniciado_em: `${data}T22:10:00Z`,
      status: "concluida",
      modo: curto ? "reduzido" : "normal",
      series_planejadas: curto ? 12 : 20,
      series_concluidas: curto ? 12 : i % 9 === 4 ? 21 : 20,
      treino_id: `t-${LETRAS[i % 3]}`,
      letra: LETRAS[i % 3],
      nome_treino: NOMES[i % 3],
      duracao_seg: curto ? 1900 : 3300,
      checkin_pre: null,
      conta_aderencia: true,
      origem: "app",
      fase: fase(dia),
      exercicios: [
        { exercicio_id: `ex-${i % 3}`, nome: NOMES[i % 3].split(" · ")[0], tecnica: i >= 20 ? TECNICAS[i % TECNICAS.length] : "normal", series: [10, 10, 9, 8].map((r) => ({ tipo: "valida", carga_kg: carga, reps: r })) },
      ],
    };
  });
}

export type DadosChalala = {
  nome: string;
  hoje: string;
  jornada: Jornada;
  eventos: EventoJornada[];
  conquistas: Array<{ codigo: string; conquistado_em: string; titulo: string }>;
  semanas: number;
  treinos: number;
  retornos: number;
};

/** Monta tudo com o motor real a partir das sessões fictícias. */
export function dadosChalala(cenario: Cenario): DadosChalala {
  const sessoes = sessoesDemo(cenario);
  const pausas = cenario === "retorno" ? [{ inicio: somar(INICIO, 76), fim: somar(INICIO, 89), tipo: "viagem" }] : [];
  const aderencia = calcularAderencia({ inicio: INICIO, hoje: HOJE_DEMO, metas: [{ desde: INICIO, meta: 3, origem: "personal" }], sessoes, pausas });
  const detectadas = detectarConquistas({ sessoes, aderencia, relatorioVistoEm: `${somar(INICIO, 45)}T20:00:00Z`, hoje: HOJE_DEMO });
  const conquistas = detectadas.map((d, i) => ({ id: `c-${i}`, codigo: d.codigo, titulo: d.titulo, descricao: d.descricao, conquistado_em: d.data, dados: d.dados }));
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje: HOJE_DEMO });
  const jornada: Jornada = { ...montarJornada({ medalhas, proxima: proximaMedalha(medalhas), conquistas, semanas: aderencia.semanas }), caminho: caminhoDaJornada({ semanas: aderencia.semanas, sessoes, conquistas }) };
  const reconhecimentos = [{ id: "r1", mensagem: "Joana, vi que você fez a versão curta num dia corrido em vez de faltar. É exatamente isso. Chalalá!", created_at: `${somar(INICIO, 59)}T15:00:00Z` }];
  const eventos = linhaDoTempo({ conquistas, semanas: aderencia.semanas, hoje: HOJE_DEMO, reconhecimentos, ciclosAlcancados: ciclos(aderencia.semanas).filter((c) => c.alcancado) });
  return {
    nome: NOME_DEMO,
    hoje: HOJE_DEMO,
    jornada,
    eventos,
    conquistas,
    semanas: aderencia.semanas.filter((w) => !w.pausada).length,
    treinos: sessoes.length,
    retornos: conquistas.filter((c) => c.codigo === "eu_voltei").length,
  };
}

export const hojeDemoLocal = () => dataLocal(new Date(`${HOJE_DEMO}T12:00:00Z`));
