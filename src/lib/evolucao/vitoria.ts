// ============================================================================
// Inteligência de Pequenas Vitórias: UMA evolução real por semana (últimos 7
// dias), na ordem de prioridade combinada com o Montinho. Sem evidência,
// nenhuma vitória é inventada (retorna null e a tela mostra texto neutro).
// ============================================================================

import { somarDias, type Semana } from "@/lib/aderencia/calcular";
import { POR_QUE, type Descoberta } from "./motor";

export type TipoVitoria = "meta" | "desempenho" | "regularidade" | "retomada" | "recorde" | "historico";
export type Vitoria = { tipo: TipoVitoria; titulo: string; mensagem: string; dados: string[]; porQue: string; ate: string };

const pct = (pontos: number, meta: number) => (meta ? Math.round((pontos / meta) * 100) : null);

export function pequenaVitoria(e: {
  semanas: Semana[];
  /** Descobertas por sessão (data AAAA-MM-DD). */
  sessoes: Array<{ dia: string; descobertas: Descoberta[] }>;
  /** Datas (AAAA-MM-DD) de “Eu voltei”. */
  retomadas: string[];
  hoje: string;
}): Vitoria | null {
  const desde = somarDias(e.hoje, -6);
  const naJanela = e.sessoes.filter((s) => s.dia >= desde && s.dia <= e.hoje);
  const altas = naJanela.flatMap((s) => s.descobertas.filter((d) => d.confianca === "alta").map((d) => ({ ...d, dia: s.dia })));
  const fechadas = e.semanas.filter((w) => !w.atual && w.meta && !w.pausada);
  const atual = e.semanas.find((w) => w.atual) ?? null;
  const ultimaFechada = e.semanas.filter((w) => !w.atual).at(-1) ?? null;

  // 1. Meta prescrita cumprida (esta semana, ou a que terminou dentro da janela).
  const semanaMeta = atual?.status === "cumprida" ? atual : ultimaFechada?.status === "cumprida" && somarDias(ultimaFechada.inicio, 6) >= desde ? ultimaFechada : null;
  if (semanaMeta?.meta) {
    return { tipo: "meta", titulo: "Meta da semana cumprida", mensagem: `Você fez os ${semanaMeta.meta} treinos planejados para a semana.`, dados: [`Semana de ${semanaMeta.inicio.slice(8, 10)}/${semanaMeta.inicio.slice(5, 7)}: ${String(semanaMeta.concluidas + semanaMeta.parciais * 0.5).replace(".", ",")} de ${semanaMeta.meta} treinos (extras não contam).`], porQue: POR_QUE.consistencia, ate: e.hoje };
  }
  // 2. Melhora consistente de desempenho: evolução confiável em 2+ exercícios.
  const exercicios = [...new Set(altas.filter((d) => !d.tipo.startsWith("recorde")).map((d) => d.exercicio))];
  if (exercicios.length >= 2) {
    return { tipo: "desempenho", titulo: "Desempenho em alta", mensagem: `Você melhorou em ${exercicios.length} exercícios nos últimos 7 dias.`, dados: altas.filter((d) => !d.tipo.startsWith("recorde")).slice(0, 4).map((d) => `${d.exercicio}: ${d.anterior ? `${String(d.anterior.carga).replace(".", ",")} kg × ${d.anterior.reps} → ` : ""}${String(d.atual.carga).replace(".", ",")} kg × ${d.atual.reps}`), porQue: POR_QUE.mais_reps, ate: e.hoje };
  }
  // 3. Regularidade: meta em 3 das últimas 4 semanas fechadas.
  const ult4 = fechadas.slice(-4);
  const cumpridas = ult4.filter((w) => w.status === "cumprida").length;
  if (ult4.length === 4 && cumpridas >= 3) {
    return { tipo: "regularidade", titulo: "Regularidade", mensagem: `Você cumpriu sua meta em ${cumpridas} das últimas 4 semanas.`, dados: ult4.map((w) => `Semana de ${w.inicio.slice(8, 10)}/${w.inicio.slice(5, 7)}: ${w.status === "cumprida" ? "meta cumprida" : "semana diferente"}`), porQue: POR_QUE.consistencia, ate: e.hoje };
  }
  // 4. Retorno após uma pausa.
  const volta = e.retomadas.filter((d) => d >= desde && d <= e.hoje).sort().at(-1);
  if (volta) return { tipo: "retomada", titulo: "Você voltou", mensagem: "Você retomou os treinos depois de uma pausa. Isso conta muito.", dados: [`Retomada em ${volta.slice(8, 10)}/${volta.slice(5, 7)}.`], porQue: "Interrupções acontecem. Retomar permite reconstruir a rotina, sem culpa e sem cobrança pelo período de ausência.", ate: e.hoje };
  // 5. Nova marca comparável.
  const rec = altas.find((d) => d.tipo.startsWith("recorde"));
  if (rec) return { tipo: "recorde", titulo: "Nova marca pessoal", mensagem: `${rec.exercicio}: ${rec.mensagem}`, dados: [rec.criterio], porQue: POR_QUE.recorde_carga, ate: e.hoje };
  // 6. Evolução em relação ao próprio histórico.
  const a = fechadas.slice(-4), b = fechadas.slice(-8, -4);
  const pa = pct(a.reduce((n, w) => n + w.pontos, 0), a.reduce((n, w) => n + (w.meta ?? 0), 0));
  const pb = pct(b.reduce((n, w) => n + w.pontos, 0), b.reduce((n, w) => n + (w.meta ?? 0), 0));
  if (a.length === 4 && b.length === 4 && pa != null && pb != null && pa - pb >= 10) {
    return { tipo: "historico", titulo: "Mais constante", mensagem: `Sua aderência subiu de ${pb}% para ${pa}% (últimas 4 semanas × as 4 anteriores).`, dados: ["Aderência = treinos válidos ÷ meta da semana; semanas em pausa combinada ficam de fora."], porQue: POR_QUE.consistencia, ate: e.hoje };
  }
  const uma = altas[0];
  if (uma) return { tipo: "historico", titulo: "Você evoluiu", mensagem: `${uma.exercicio}: ${uma.mensagem}`, dados: [uma.criterio], porQue: POR_QUE[uma.tipo], ate: e.hoje };
  return null;
}

export const VITORIA_NEUTRA = "Continue registrando seus treinos. Com mais informações, conseguiremos identificar tendências da sua evolução.";
