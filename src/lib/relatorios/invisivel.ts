// ============================================================================
// Evolução invisível — progresso além do espelho, sempre separando
//   DADO (o que foi registrado) de INTERPRETAÇÃO (o que isso sugere).
// Nunca conclui nada a partir de um registro isolado: cada regra exige
// registros comparáveis suficientes e declara o critério.
// ============================================================================

import { classificarSessao, dataLocal, somarDias, type ResultadoAderencia } from "@/lib/aderencia/calcular";
import { recordesDaSessao, type SessaoConquista } from "@/lib/conquistas/regras";
import { e1rmEpley } from "./calcular";
import { normalizarNome } from "@/lib/grupos";

export type TipoInvisivel = "frequencia" | "regularidade" | "reps_mesma_carga" | "desempenho" | "retomada" | "metas";
export type ItemInvisivel = { tipo: TipoInvisivel; titulo: string; dado: string; interpretacao: string; criterio: string };

export const REGRAS_INVISIVEL = { minDiferencaTreinos: 2, minSessoesExercicio: 4, minGanhoE1rm: 0.05, maxRepsE1rm: 12, semanasRegularidade: 8, minPctRegularidade: 75, diasRetomada: 14 };

const fmtKg = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const mediana = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

export function evolucaoInvisivel(e: { sessoes: SessaoConquista[]; aderencia: ResultadoAderencia | null; dias: number; hoje: string; inicioAcompanhamento: string }): ItemInvisivel[] {
  const out: ItemInvisivel[] = [];
  const desde = somarDias(e.hoje, -(e.dias - 1));
  const antesDesde = somarDias(desde, -e.dias);
  const validas = e.sessoes.filter((s) => s.status !== "em_andamento").sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  const concluidas = validas.filter((s) => classificarSessao(s) === "concluida");
  const naJanela = (s: SessaoConquista, a: string, b: string) => {
    const d = dataLocal(s.iniciado_em);
    return d >= a && d <= b;
  };

  // 1. Mais sessões que no período anterior equivalente (só se o anterior estava todo dentro do acompanhamento).
  if (e.inicioAcompanhamento <= antesDesde) {
    const agora = concluidas.filter((s) => naJanela(s, desde, e.hoje)).length;
    const antes = concluidas.filter((s) => naJanela(s, antesDesde, somarDias(desde, -1))).length;
    if (agora - antes >= REGRAS_INVISIVEL.minDiferencaTreinos)
      out.push({ tipo: "frequencia", titulo: "Mais treinos que no período anterior", dado: `${agora} ${agora === 1 ? "treino concluído" : "treinos concluídos"} nos últimos ${e.dias} dias; ${antes} nos ${e.dias} dias anteriores.`, interpretacao: "Sua frequência aumentou em relação ao período anterior equivalente.", criterio: `Compara períodos de mesmo tamanho; diferença mínima de ${REGRAS_INVISIVEL.minDiferencaTreinos} treinos.` });
  }

  // 2. Regularidade ao longo dos meses.
  const sem = e.aderencia?.semanas.filter((w) => !w.atual && w.meta && !w.pausada).slice(-12) ?? [];
  if (sem.length >= REGRAS_INVISIVEL.semanasRegularidade) {
    const cumpridas = sem.filter((w) => w.status === "cumprida").length;
    const pct = Math.round((cumpridas / sem.length) * 100);
    if (pct >= REGRAS_INVISIVEL.minPctRegularidade)
      out.push({ tipo: "regularidade", titulo: "Regularidade ao longo dos meses", dado: `Meta semanal cumprida em ${cumpridas} das últimas ${sem.length} semanas com treino prescrito.`, interpretacao: "Você vem sustentando a rotina por meses, não só em semanas isoladas.", criterio: `Pelo menos ${REGRAS_INVISIVEL.semanasRegularidade} semanas com prescrição e ${REGRAS_INVISIVEL.minPctRegularidade}% ou mais cumpridas (pausas não entram).` });
  }

  // 3. Metas pessoais atingidas no período.
  const doPeriodo = e.aderencia?.semanas.filter((w) => w.inicio >= somarDias(desde, -6) && w.status === "cumprida") ?? [];
  if (doPeriodo.length >= 2)
    out.push({ tipo: "metas", titulo: "Metas semanais atingidas", dado: `Meta da semana cumprida ${doPeriodo.length} ${doPeriodo.length === 1 ? "vez" : "vezes"} no período.`, interpretacao: "Você está cumprindo o que combinou com o personal.", criterio: "Semanas em que os treinos válidos alcançaram a meta individual." });

  // 4. Mais repetições com a mesma carga (registros comparáveis; reaproveita a regra de recordes).
  const reps: string[] = [];
  for (let i = 0; i < validas.length; i++) {
    if (!naJanela(validas[i], desde, e.hoje)) continue;
    for (const r of recordesDaSessao(validas[i], validas.slice(0, i))) if (r.tipo === "reps") reps.push(`${r.exercicio}: ${r.agora} repetições com ${fmtKg(r.carga ?? 0)} em ${ddmm(dataLocal(validas[i].iniciado_em))} (antes, no máximo ${r.antes})`);
  }
  if (reps.length)
    out.push({ tipo: "reps_mesma_carga", titulo: "Mais repetições com a mesma carga", dado: [...new Set(reps)].slice(0, 3).join(" · "), interpretacao: "Isso sugere uma melhora do seu desempenho nesses exercícios, considerando registros comparáveis.", criterio: "Mesma carga, mesmo exercício, com pelo menos 2 registros anteriores; não conta treino com dor relatada." });

  // 5. Desempenho em exercício comparável (estimativa de força), com ressalva.
  const porEx = new Map<string, { nome: string; pontos: Array<{ data: string; e1rm: number }> }>();
  for (const s of validas) {
    if (s.feedback_percepcao === "dor") continue;
    for (const ex of s.exercicios ?? []) {
      const melhor = Math.max(0, ...ex.series.filter((x) => x.tipo === "valida" && (x.reps ?? 0) > 0 && (x.reps ?? 0) <= REGRAS_INVISIVEL.maxRepsE1rm).map((x) => e1rmEpley(x.carga_kg, x.reps) ?? 0));
      if (!melhor) continue;
      const k = ex.exercicio_id ?? normalizarNome(ex.nome);
      const b = porEx.get(k) ?? { nome: ex.nome, pontos: [] };
      b.pontos.push({ data: dataLocal(s.iniciado_em), e1rm: melhor });
      porEx.set(k, b);
    }
  }
  const ganhos: Array<{ nome: string; de: number; para: number; n: number }> = [];
  for (const { nome, pontos } of porEx.values()) {
    const janela = pontos.filter((p) => p.data >= antesDesde);
    if (janela.length < REGRAS_INVISIVEL.minSessoesExercicio) continue;
    const meio = Math.floor(janela.length / 2);
    const de = mediana(janela.slice(0, meio).map((p) => p.e1rm));
    const para = mediana(janela.slice(meio).map((p) => p.e1rm));
    if (de > 0 && para / de - 1 >= REGRAS_INVISIVEL.minGanhoE1rm) ganhos.push({ nome, de, para, n: janela.length });
  }
  ganhos.sort((a, b) => b.para / b.de - a.para / a.de);
  if (ganhos.length)
    out.push({ tipo: "desempenho", titulo: "Desempenho melhor em exercícios comparáveis", dado: ganhos.slice(0, 3).map((g) => `${g.nome}: força estimada de ${fmtKg(Math.round(g.de))} para ${fmtKg(Math.round(g.para))} (${g.n} sessões)`).join(" · "), interpretacao: "A tendência dos seus registros sugere ganho de força nesses exercícios. É uma estimativa: técnica, cansaço e amplitude também mudam os números.", criterio: `Fórmula de Epley em séries de até ${REGRAS_INVISIVEL.maxRepsE1rm} repetições; mediana da 1ª metade × 2ª metade de pelo menos ${REGRAS_INVISIVEL.minSessoesExercicio} sessões; ganho mínimo de ${REGRAS_INVISIVEL.minGanhoE1rm * 100}%.` });

  // 6. Retorno após pausa.
  for (let i = validas.length - 1; i > 0; i--) {
    const b = dataLocal(validas[i].iniciado_em);
    if (b < desde) break;
    const a = dataLocal(validas[i - 1].iniciado_em);
    const gap = Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
    if (gap >= REGRAS_INVISIVEL.diasRetomada) {
      out.push({ tipo: "retomada", titulo: "Você retomou a rotina", dado: `Voltou a treinar em ${ddmm(b)}, depois de um intervalo sem registros.`, interpretacao: "Retomar depois de uma pausa é parte da consistência — e foi o que você fez.", criterio: `Treino depois de ${REGRAS_INVISIVEL.diasRetomada} dias ou mais sem registros.` });
      break;
    }
  }
  return out;
}
