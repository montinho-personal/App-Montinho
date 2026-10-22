// ============================================================================
// Relatório curto da conclusão do treino (PURO, testado).
//  • Completou tudo? (séries feitas ÷ planejadas)
//  • Volume total (kg × reps das séries válidas) vs o último treino da mesma
//    letra e vs a média dos últimos (até 4) treinos dessa letra.
//  • Exercícios que melhoraram / ficaram iguais / ficaram abaixo (melhor série
//    estimada pela fórmula de Epley, comparada à última vez do exercício).
//  • Maior peso de hoje e recordes da vida (maior carga já registrada).
// Linguagem neutra quando cai: oscilar é normal.
// ============================================================================

import { normalizarNome } from "@/lib/grupos";
import { REGRAS_CONQUISTAS } from "@/lib/conquistas/regras";

type SerieLike = { tipo: string; carga_kg: number | null; reps: number | null };
type ExLike = { biblioteca_id: string | null; nome: string; series: SerieLike[] };
export type SessaoRelatorio = {
  id: string;
  treino_id: string | null;
  letra: string | null;
  status: string;
  iniciado_em: string;
  finalizado_em: string | null;
  duracao_seg: number | null;
  series_concluidas: number;
  series_planejadas: number;
  exercicios: ExLike[];
};

export type RelatorioConclusao = {
  completo: boolean;
  pct: number;
  volumeKg: number;
  repsTotais: number;
  duracaoMin: number | null;
  /** vs o último treino da mesma letra. */
  anterior: { volumePct: number | null; duracaoDifMin: number | null; seriesDif: number } | null;
  /** vs a média dos últimos treinos da mesma letra (mín. 2). */
  media: { volumePct: number; treinos: number } | null;
  exercicios: { melhorou: number; igual: number; abaixo: number; comparaveis: number };
  maiorPeso: { exercicio: string; carga: number; recordeVida: boolean } | null;
  recordesVida: Array<{ exercicio: string; carga: number; antes: number }>;
};

const chave = (e: Pick<ExLike, "biblioteca_id" | "nome">) => e.biblioteca_id || normalizarNome(e.nome);
const validas = (e: ExLike) => e.series.filter((s) => s.tipo === "valida" && (s.reps ?? 0) > 0);
// Força estimada (Epley) só vale de 1 a 12 repetições — igual ao relatório.
const epley = (c: number, r: number) => (r >= 1 && r <= 12 ? c * (1 + r / 30) : null);

function volume(s: SessaoRelatorio): { kg: number; reps: number } {
  let kg = 0;
  let reps = 0;
  for (const e of s.exercicios)
    for (const x of validas(e)) {
      reps += x.reps ?? 0;
      kg += (x.carga_kg ?? 0) * (x.reps ?? 0);
    }
  return { kg: Math.round(kg), reps };
}

function melhorSerie(e: ExLike): number | null {
  let m: number | null = null;
  for (const x of validas(e)) {
    const v = (x.carga_kg ?? 0) > 0 ? epley(x.carga_kg!, x.reps!) : null;
    if (v != null) m = Math.max(m ?? 0, v);
  }
  return m;
}

const maiorCarga = (e: ExLike) => Math.max(0, ...validas(e).map((x) => x.carga_kg ?? 0));
const pct = (hoje: number, antes: number) => (antes > 0 ? Math.round(((hoje - antes) / antes) * 100) : null);
const quando = (s: SessaoRelatorio) => s.finalizado_em ?? s.iniciado_em;

/** Cargas máximas do histórico importado (planilha), antes do app. */
export type BaseImportada = { nome: string; bibliotecaId: string | null; carga: number; data: string };

export function relatorioDaConclusao(hoje: SessaoRelatorio, historico: SessaoRelatorio[], base: BaseImportada[] = []): RelatorioConclusao {
  const antes = historico
    .filter((s) => s.id !== hoje.id && s.status !== "em_andamento" && quando(s) < quando(hoje))
    .sort((a, b) => (quando(a) < quando(b) ? 1 : -1));
  const mesmaLetra = antes.filter((s) => (hoje.treino_id && s.treino_id === hoje.treino_id) || (!!hoje.letra && s.letra === hoje.letra)).filter((s) => s.status === "concluida");

  const v = volume(hoje);
  const duracaoMin = hoje.duracao_seg && hoje.duracao_seg >= 60 && hoje.duracao_seg < 6 * 3600 ? Math.round(hoje.duracao_seg / 60) : null;
  const pctFeito = hoje.series_planejadas > 0 ? Math.min(100, Math.round((hoje.series_concluidas / hoje.series_planejadas) * 100)) : 100;
  // Treino feito pela metade não se compara em volume (seria injusto).
  const comparaVolume = pctFeito >= 80;
  const ult = mesmaLetra[0];
  const vUlt = ult ? volume(ult) : null;
  const durUlt = ult?.duracao_seg && ult.duracao_seg < 6 * 3600 ? Math.round(ult.duracao_seg / 60) : null;
  const anterior = ult ? { volumePct: comparaVolume && vUlt && vUlt.kg > 0 && v.kg > 0 ? pct(v.kg, vUlt.kg) : null, duracaoDifMin: duracaoMin != null && durUlt != null ? duracaoMin - durUlt : null, seriesDif: hoje.series_concluidas - ult.series_concluidas } : null;

  const ultimos = mesmaLetra.slice(0, 4).map((s) => volume(s).kg).filter((k) => k > 0);
  const media = comparaVolume && ultimos.length >= 2 && v.kg > 0 ? { volumePct: pct(v.kg, ultimos.reduce((a, b) => a + b, 0) / ultimos.length) ?? 0, treinos: ultimos.length } : null;

  // Por exercício: última vez em que foi feito (qualquer treino).
  const exs = { melhorou: 0, igual: 0, abaixo: 0, comparaveis: 0 };
  const recordesVida: RelatorioConclusao["recordesVida"] = [];
  let maiorPeso: RelatorioConclusao["maiorPeso"] = null;
  for (const e of hoje.exercicios) {
    const k = chave(e);
    const anteriores = antes.flatMap((s) => s.exercicios.filter((x) => chave(x) === k));
    const hojeM = melhorSerie(e);
    const ultM = anteriores.map(melhorSerie).find((m) => m != null) ?? null;
    if (hojeM != null && ultM != null) {
      exs.comparaveis++;
      if (hojeM > ultM * 1.01) exs.melhorou++;
      else if (hojeM < ultM * 0.95) exs.abaixo++;
      else exs.igual++;
    }
    const carga = maiorCarga(e);
    const doImportado = base.filter((b) => b.data < quando(hoje).slice(0, 10) && ((!!e.biblioteca_id && b.bibliotecaId === e.biblioteca_id) || normalizarNome(b.nome) === normalizarNome(e.nome))).map((b) => b.carga);
    const antesMax = Math.max(0, ...anteriores.map(maiorCarga), ...doImportado);
    // Recorde da vida: mesmo critério do relatório e das medalhas (2+ registros anteriores).
    const registrosAntes = anteriores.filter((x) => maiorCarga(x) > 0).length + doImportado.length;
    const recorde = carga > 0 && antesMax > 0 && carga > antesMax && registrosAntes >= REGRAS_CONQUISTAS.registrosParaRecorde;
    if (recorde) recordesVida.push({ exercicio: e.nome, carga, antes: antesMax });
    if (carga > 0 && (!maiorPeso || carga > maiorPeso.carga)) maiorPeso = { exercicio: e.nome, carga, recordeVida: recorde };
  }

  return { completo: hoje.status === "concluida" && pctFeito >= 100, pct: pctFeito, volumeKg: v.kg, repsTotais: v.reps, duracaoMin, anterior, media, exercicios: exs, maiorPeso, recordesVida };
}
