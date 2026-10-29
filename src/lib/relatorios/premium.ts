// ============================================================================
// Relatório Premium de Evolução de Carga — contas puras (sem rede).
//
// Documento “planejamento exclusivo” do lado da evolução: para cada exercício,
// carga e força estimada do começo ao fim do período, agrupado por músculo,
// com destaques, marcos (recordes), volume por semana e consistência.
//
// Regras (as mesmas do resto do app):
//  • Mesmo exercício = mesmo nome normalizado (como o gráfico por exercício),
//    juntando o histórico importado de outro app nos dias sem registro.
//  • Carga do dia = maior carga das séries válidas (aquecimento fora).
//  • Força estimada = Epley, só de 1 a 12 repetições.
//  • Evolução = carga do último dia × carga do primeiro dia do período.
//    Precisa de 2 dias com carga; sem isso, “ainda sem comparação”.
//  • Marco (recorde) = carga maior que todas as anteriores, com 2+ treinos
//    anteriores (mesmo critério do aviso no treino e das medalhas).
//  • Rótulos neutros: nada de “ideal”, “fraco” ou “sobrecarga”.
// ============================================================================

import { GRUPO_LABEL, normalizarNome } from "@/lib/grupos";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { REGRAS_CONQUISTAS } from "@/lib/conquistas/regras";
import { dataLocal, inicioDaSemana, somarDias } from "@/lib/aderencia/calcular";
import { evolucaoExercicio, seriesPorExercicio, type PontoEvolucao, type ResumoEvolucao } from "./calcular";

export type PeriodoPremium = "tudo" | "90" | "30";
export const PERIODOS_PREMIUM: Array<{ v: PeriodoPremium; rotulo: string }> = [
  { v: "tudo", rotulo: "Desde o início" },
  { v: "90", rotulo: "Últimos 90 dias" },
  { v: "30", rotulo: "Últimos 30 dias" },
];

export type ExercicioPremium = {
  chave: string;
  nome: string;
  grupo: string;
  grupoRotulo: string;
  pontos: PontoEvolucao[];
  dias: number;
  inicial: { data: string; carga: number };
  atual: { data: string; carga: number };
  melhor: { data: string; carga: number };
  deltaKg: number;
  deltaPct: number | null;
  e1rmInicial: number | null;
  e1rmAtual: number | null;
  e1rmDeltaPct: number | null;
  tonelagem: number;
};

export type GrupoPremium = { grupo: string; rotulo: string; exercicios: ExercicioPremium[]; subiram: number; mediaPct: number | null; tonelagem: number };
export type MarcoPremium = { data: string; exercicio: string; carga: number; anterior: number };
export type SemanaVolume = { inicio: string; tonelagem: number; treinos: number };

export type RelatorioPremium = {
  inicio: string;
  fim: string;
  semanas: number;
  treinos: number;
  series: number;
  tonelagem: number;
  minutos: number;
  exerciciosComparaveis: number;
  exerciciosQueSubiram: number;
  mediaPct: number | null;
  exercicios: ExercicioPremium[];
  grupos: GrupoPremium[];
  destaques: ExercicioPremium[];
  marcos: MarcoPremium[];
  volumeSemanal: SemanaVolume[];
  semDados: boolean;
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const pct = (de: number, para: number) => (de > 0 ? r1(((para - de) / de) * 100) : null);
const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

/** Início do período: data de início do acompanhamento ou os últimos N dias. */
export function inicioDoPeriodo(periodo: PeriodoPremium, hoje: string, inicioAcompanhamento: string): string {
  if (periodo === "tudo") return inicioAcompanhamento < hoje ? inicioAcompanhamento : hoje;
  const n = periodo === "90" ? 90 : 30;
  const desde = somarDias(hoje, -(n - 1));
  return desde > inicioAcompanhamento ? desde : inicioAcompanhamento;
}

export function relatorioPremium(input: { sessoes: SessaoCompleta[]; resumos?: ResumoEvolucao[]; inicio: string; fim: string }): RelatorioPremium {
  const { inicio, fim } = input;
  const resumos = (input.resumos ?? []).filter((r) => r.data >= inicio && r.data <= fim);
  const concluidas = input.sessoes.filter((s) => s.status === "concluida");
  const doDia = (s: SessaoCompleta) => dataLocal(s.finalizado_em ?? s.iniciado_em); // dia de Brasília
  const noPeriodo = concluidas.filter((s) => doDia(s) >= inicio && doDia(s) <= fim);

  // Totais do período
  let series = 0;
  let ton = 0;
  let minutos = 0;
  const volume = new Map<string, SemanaVolume>();
  for (const s of noPeriodo) {
    const semana = inicioDaSemana(dataLocal(s.finalizado_em ?? s.iniciado_em));
    const v = volume.get(semana) ?? { inicio: semana, tonelagem: 0, treinos: 0 };
    v.treinos += 1;
    if (s.duracao_seg && s.duracao_seg >= 300 && s.duracao_seg <= 4 * 3600) minutos += s.duracao_seg / 60;
    for (const e of s.exercicios)
      for (const x of e.series) {
        if (x.tipo === "aquecimento") continue;
        series += 1;
        if (x.carga_kg != null && x.reps != null) {
          ton += x.carga_kg * x.reps;
          v.tonelagem += x.carga_kg * x.reps;
        }
      }
    volume.set(semana, v);
  }
  // Semanas sem treino também aparecem (barra zero), do início ao fim.
  const volumeSemanal: SemanaVolume[] = [];
  for (let w = inicioDaSemana(inicio); w <= inicioDaSemana(fim); w = somarDias(w, 7)) {
    const v = volume.get(w);
    volumeSemanal.push({ inicio: w, tonelagem: Math.round(v?.tonelagem ?? 0), treinos: v?.treinos ?? 0 });
  }

  // Por exercício (histórico inteiro para os marcos; pontos só do período)
  const mapa = seriesPorExercicio(concluidas);
  const grupoDe = new Map<string, string>();
  for (const s of concluidas) for (const e of s.exercicios) if (e.grupo_muscular) grupoDe.set(normalizarNome(e.nome), e.grupo_muscular);
  const chaves = new Set<string>([...mapa.keys(), ...resumos.map((r) => normalizarNome(r.exercicio_nome))]);
  const nomeDe = (k: string) => mapa.get(k)?.nome ?? resumos.find((r) => normalizarNome(r.exercicio_nome) === k)?.exercicio_nome ?? k;

  const exercicios: ExercicioPremium[] = [];
  const marcos: MarcoPremium[] = [];
  for (const k of chaves) {
    const todos = evolucaoExercicio(concluidas, k, input.resumos ?? []).filter((p) => p.cargaMax != null && p.cargaMax > 0);
    // Marcos: nova maior carga com 2+ dias anteriores registrados.
    let max = 0;
    todos.forEach((p, i) => {
      const c = p.cargaMax!;
      if (i >= REGRAS_CONQUISTAS.registrosParaRecorde && c > max && p.data >= inicio && p.data <= fim) marcos.push({ data: p.data, exercicio: nomeDe(k), carga: c, anterior: max });
      max = Math.max(max, c);
    });
    const pontos = todos.filter((p) => p.data >= inicio && p.data <= fim);
    if (pontos.length < 2) continue;
    const ini = pontos[0];
    const fimP = pontos.at(-1)!;
    const melhor = pontos.reduce((a, b) => (b.cargaMax! > a.cargaMax! ? b : a));
    const e1 = pontos.filter((p) => p.e1rmMax != null);
    const grupo = grupoDe.get(k) ?? "nao_classificado";
    exercicios.push({
      chave: k,
      nome: nomeDe(k),
      grupo,
      grupoRotulo: GRUPO_LABEL[grupo as keyof typeof GRUPO_LABEL] ?? "Outros",
      pontos,
      dias: pontos.length,
      inicial: { data: ini.data, carga: ini.cargaMax! },
      atual: { data: fimP.data, carga: fimP.cargaMax! },
      melhor: { data: melhor.data, carga: melhor.cargaMax! },
      deltaKg: r1(fimP.cargaMax! - ini.cargaMax!),
      deltaPct: pct(ini.cargaMax!, fimP.cargaMax!),
      e1rmInicial: e1.length >= 2 ? r1(e1[0].e1rmMax!) : null,
      e1rmAtual: e1.length >= 2 ? r1(e1.at(-1)!.e1rmMax!) : null,
      e1rmDeltaPct: e1.length >= 2 ? pct(e1[0].e1rmMax!, e1.at(-1)!.e1rmMax!) : null,
      tonelagem: Math.round(pontos.reduce((n, p) => n + p.tonelagem, 0)),
    });
  }
  exercicios.sort((a, b) => b.dias - a.dias || a.nome.localeCompare(b.nome, "pt-BR"));

  const porGrupo = new Map<string, ExercicioPremium[]>();
  for (const e of exercicios) porGrupo.set(e.grupo, [...(porGrupo.get(e.grupo) ?? []), e]);
  const grupos: GrupoPremium[] = [...porGrupo.entries()]
    .map(([grupo, exs]) => ({
      grupo,
      rotulo: exs[0].grupoRotulo,
      exercicios: [...exs].sort((a, b) => (b.deltaPct ?? -999) - (a.deltaPct ?? -999)),
      subiram: exs.filter((e) => e.deltaKg > 0).length,
      mediaPct: (() => {
        const m = mediana(exs.map((e) => e.deltaPct).filter((v): v is number => v != null));
        return m == null ? null : r1(m);
      })(),
      tonelagem: exs.reduce((n, e) => n + e.tonelagem, 0),
    }))
    .sort((a, b) => b.tonelagem - a.tonelagem);

  const comparaveis = exercicios.filter((e) => e.deltaPct != null);
  const med = mediana(comparaveis.map((e) => e.deltaPct!));
  return {
    inicio,
    fim,
    semanas: volumeSemanal.length,
    treinos: noPeriodo.length,
    series,
    tonelagem: Math.round(ton),
    minutos: Math.round(minutos),
    exerciciosComparaveis: comparaveis.length,
    exerciciosQueSubiram: exercicios.filter((e) => e.deltaKg > 0).length,
    mediaPct: med == null ? null : r1(med),
    exercicios,
    grupos,
    destaques: exercicios.filter((e) => e.deltaKg > 0).sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0) || b.deltaKg - a.deltaKg).slice(0, 5),
    marcos: marcos.sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 12),
    volumeSemanal,
    semDados: noPeriodo.length === 0 && resumos.length === 0,
  };
}
