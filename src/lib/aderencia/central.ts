// ============================================================================
// Central de aderência do personal: linha por aluno e sinais OBSERVÁVEIS para
// acompanhamento (nunca rótulos psicológicos). Regras explícitas e testadas.
// ============================================================================

import { dataLocal, somarDias, tendencia, type ResultadoAderencia } from "./calcular";

export type Sinal = {
  tipo: "sem_treino_recente" | "queda_frequencia" | "retomou" | "meta_sequencia" | "em_pausa" | "sem_prescricao";
  texto: string;
  /** reconhecer = sugestão de parabenizar; acompanhar = merece contato humano; info = contexto. */
  natureza: "acompanhar" | "reconhecer" | "info";
};

export type LinhaCentral = {
  alunoId: string;
  nome: string;
  meta: number | null;
  semanaPontos: number;
  aderencia28: number | null;
  tendencia: number | null;
  ultimaSessao: string | null;
  diasDesdeUltima: number | null;
  proximaPrevista: string | null;
  sinais: Sinal[];
};

export const REGRAS_CENTRAL = {
  diasSemTreino: 10,
  quedaPontos: 20,
  pausaParaRetomada: 14,
  janelaRetomada: 7,
  sequenciaReconhecer: 4,
};

const dias = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);

export function linhaCentral(
  aluno: { id: string; nome: string },
  r: ResultadoAderencia,
  ultimaSessao: string | null,
  hoje: string,
  datasSessoes: string[]
): LinhaCentral {
  const sinais: Sinal[] = [];
  const semana = r.semanaAtual;
  const desde = ultimaSessao ? dias(dataLocal(ultimaSessao), hoje) : null;
  const tend = tendencia(r);
  const emPausa = !!semana?.pausada || r.dias[hoje]?.tipos.includes("pausa");

  if (emPausa) sinais.push({ tipo: "em_pausa", texto: "Em pausa combinada", natureza: "info" });
  if (!semana?.meta) sinais.push({ tipo: "sem_prescricao", texto: "Sem treino prescrito nesta semana", natureza: "info" });
  if (!emPausa && semana?.meta && (desde === null || desde >= REGRAS_CENTRAL.diasSemTreino))
    sinais.push({ tipo: "sem_treino_recente", texto: desde === null ? "Nenhum treino registrado ainda" : `${desde} dias sem registrar treino`, natureza: "acompanhar" });
  if (tend !== null && tend <= -REGRAS_CENTRAL.quedaPontos) sinais.push({ tipo: "queda_frequencia", texto: `Aderência ${-tend} pontos abaixo das 4 semanas anteriores`, natureza: "acompanhar" });

  // Retomada: treinou nos últimos 7 dias depois de ≥ 14 dias sem treinar.
  const ord = [...new Set(datasSessoes)].sort();
  for (let i = ord.length - 1; i > 0; i--) {
    if (dias(ord[i], hoje) > REGRAS_CENTRAL.janelaRetomada) break;
    if (dias(ord[i - 1], ord[i]) >= REGRAS_CENTRAL.pausaParaRetomada) {
      sinais.push({ tipo: "retomou", texto: `Voltou a treinar após ${dias(ord[i - 1], ord[i])} dias`, natureza: "reconhecer" });
      break;
    }
  }
  if (r.sequencia.atual >= REGRAS_CENTRAL.sequenciaReconhecer) sinais.push({ tipo: "meta_sequencia", texto: `${r.sequencia.atual} semanas seguidas com a meta cumprida`, natureza: "reconhecer" });

  const proxima = Object.values(r.dias)
    .filter((d) => d.data >= hoje && d.data <= somarDias(hoje, 13) && d.tipos.includes("previsto"))
    .map((d) => d.data)
    .sort()[0] ?? null;

  return {
    alunoId: aluno.id,
    nome: aluno.nome,
    meta: semana?.meta ?? null,
    semanaPontos: semana?.pontos ?? 0,
    aderencia28: r.indices.d28.pct,
    tendencia: tend,
    ultimaSessao,
    diasDesdeUltima: desde,
    proximaPrevista: proxima,
    sinais,
  };
}

export type OrdemCentral = "queda" | "tempo_sem_treino" | "melhora" | "retomaram" | "nome";

export function ordenarCentral(linhas: LinhaCentral[], ordem: OrdemCentral): LinhaCentral[] {
  const v = [...linhas];
  const nulos = (x: number | null, fallback: number) => (x === null ? fallback : x);
  switch (ordem) {
    case "queda":
      return v.sort((a, b) => nulos(a.tendencia, 999) - nulos(b.tendencia, 999));
    case "melhora":
      return v.sort((a, b) => nulos(b.tendencia, -999) - nulos(a.tendencia, -999));
    case "tempo_sem_treino":
      return v.sort((a, b) => nulos(b.diasDesdeUltima, 9999) - nulos(a.diasDesdeUltima, 9999));
    case "retomaram":
      return v.sort((a, b) => Number(b.sinais.some((s) => s.tipo === "retomou")) - Number(a.sinais.some((s) => s.tipo === "retomou")));
    default:
      return v.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
}
