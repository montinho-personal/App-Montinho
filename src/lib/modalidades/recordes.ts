// ============================================================================
// Recordes pessoais (Multimodalidade, fase 4) — regras PURAS e JUSTAS.
//  • Força: por exercício e por número EXATO de repetições (1RM, 2RM, 3RM,
//    5RM, 10RM). 80 kg × 5 nunca vira “1RM de 80 kg”, e mais carga com outro
//    número de repetições não conta como evolução daquele RM.
//  • Marcas anotadas (marcas_pessoais) entram na mesma linha do tempo.
//  • Benchmarks: por benchmark + versão + condição (RX × Scaled nunca juntos;
//    adaptado fora), com o melhor, o anterior e a diferença.
//  • “Primeiro movimento técnico”: só a lista (registrada pelo personal).
// ============================================================================
import { diferenca, pontuacao, textoResultado, type ResultadoBloco } from "./resultado";

export const REPS_DO_RM = [1, 2, 3, 5, 10] as const;
export type Rm = (typeof REPS_DO_RM)[number];

export type SerieForca = { chave: string; nome: string; data: string; carga: number; reps: number };
export type MarcaPessoal = { id?: string; chave: string; nome: string; tipo: "1rm" | "2rm" | "3rm" | "5rm" | "10rm" | "max_reps" | "tempo" | "distancia" | "calorias" | "primeiro"; valor: number | null; unidade: "kg" | "reps" | "seg" | "m" | "cal" | null; data: string; condicao?: "rx" | "scaled" | "adaptado" | null; origem?: "aluno" | "personal"; observacoes?: string | null };

export type PontoRecorde = { data: string; valor: number };
export type LinhaRecorde = {
  chave: string;
  nome: string;
  rm: Rm;
  atual: number;
  data: string;
  anterior: number | null;
  ganhoKg: number | null;
  ganhoPct: number | null;
  /** Cada vez que a marca subiu (o gráfico). */
  historico: PontoRecorde[];
};

const arred = (n: number, casas = 1) => Math.round(n * 10 ** casas) / 10 ** casas;

/** Recordes de força por exercício e RM exato, a partir das séries feitas + marcas anotadas. */
export function recordesDeForca(series: SerieForca[], marcas: MarcaPessoal[] = []): LinhaRecorde[] {
  type Ev = { chave: string; nome: string; rm: Rm; data: string; valor: number };
  const eventos: Ev[] = [];
  for (const s of series) {
    if (!(s.carga > 0) || !REPS_DO_RM.includes(s.reps as Rm)) continue;
    eventos.push({ chave: s.chave, nome: s.nome, rm: s.reps as Rm, data: s.data, valor: s.carga });
  }
  for (const m of marcas) {
    const rm = Number(m.tipo.replace("rm", ""));
    if (!m.tipo.endsWith("rm") || !REPS_DO_RM.includes(rm as Rm) || !(Number(m.valor) > 0)) continue;
    eventos.push({ chave: m.chave, nome: m.nome, rm: rm as Rm, data: m.data, valor: Number(m.valor) });
  }
  const grupos = new Map<string, Ev[]>();
  for (const e of eventos) {
    const k = `${e.chave}|${e.rm}`;
    grupos.set(k, [...(grupos.get(k) ?? []), e]);
  }
  const out: LinhaRecorde[] = [];
  for (const lista of grupos.values()) {
    lista.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.valor - b.valor));
    const historico: PontoRecorde[] = [];
    for (const e of lista) {
      const melhor = historico.at(-1)?.valor ?? 0;
      if (e.valor > melhor) {
        if (historico.at(-1)?.data === e.data) historico[historico.length - 1] = { data: e.data, valor: e.valor };
        else historico.push({ data: e.data, valor: e.valor });
      }
    }
    const atual = historico.at(-1)!;
    const anterior = historico.length > 1 ? historico[historico.length - 2].valor : null;
    out.push({
      chave: lista[0].chave,
      nome: lista[lista.length - 1].nome,
      rm: lista[0].rm,
      atual: atual.valor,
      data: atual.data,
      anterior,
      ganhoKg: anterior != null ? arred(atual.valor - anterior) : null,
      ganhoPct: anterior ? arred(((atual.valor - anterior) / anterior) * 100) : null,
      historico,
    });
  }
  return out.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.nome.localeCompare(b.nome, "pt-BR")));
}

/** Agrupa os RMs do mesmo exercício (para a tabela “Meus recordes”). */
export function porExercicio(linhas: LinhaRecorde[]): Array<{ chave: string; nome: string; ultimaData: string; rms: LinhaRecorde[] }> {
  const m = new Map<string, LinhaRecorde[]>();
  for (const l of linhas) m.set(l.chave, [...(m.get(l.chave) ?? []), l]);
  return [...m.entries()]
    .map(([chave, rms]) => ({ chave, nome: rms[0].nome, ultimaData: rms.reduce((d, r) => (r.data > d ? r.data : d), ""), rms: rms.sort((a, b) => a.rm - b.rm) }))
    .sort((a, b) => (a.ultimaData < b.ultimaData ? 1 : -1));
}

export type ResultadoBenchmark = ResultadoBloco & { data: string; benchmark: string; benchmark_versao?: number | null };
export type LinhaBenchmark = {
  benchmark: string;
  versao: number;
  condicao: "rx" | "scaled";
  melhor: ResultadoBenchmark;
  ultimo: ResultadoBenchmark;
  /** Diferença do último para o anterior comparável (“−0:42”, “+2 rounds”). */
  diferenca: string | null;
  melhorou: boolean;
  vezes: number;
  historico: Array<{ data: string; texto: string; pontos: number }>;
};

/** Benchmarks por benchmark + versão + condição; adaptado e sem pontuação ficam fora. */
export function recordesDeBenchmark(resultados: ResultadoBenchmark[]): LinhaBenchmark[] {
  const grupos = new Map<string, ResultadoBenchmark[]>();
  for (const r of resultados) {
    if (r.condicao !== "rx" && r.condicao !== "scaled") continue;
    if (pontuacao(r) == null) continue;
    const k = `${r.benchmark}|${r.benchmark_versao ?? 1}|${r.condicao}`;
    grupos.set(k, [...(grupos.get(k) ?? []), r]);
  }
  const out: LinhaBenchmark[] = [];
  for (const lista of grupos.values()) {
    lista.sort((a, b) => (a.data < b.data ? -1 : 1));
    const melhor = lista.reduce((m, r) => ((pontuacao(r) ?? 0) > (pontuacao(m) ?? 0) ? r : m));
    const ultimo = lista[lista.length - 1];
    const anterior = lista.length > 1 ? lista[lista.length - 2] : null;
    out.push({
      benchmark: ultimo.benchmark,
      versao: ultimo.benchmark_versao ?? 1,
      condicao: ultimo.condicao as "rx" | "scaled",
      melhor,
      ultimo,
      diferenca: anterior ? diferenca(ultimo, anterior) : null,
      melhorou: !!anterior && (pontuacao(ultimo) ?? 0) > Math.max(...lista.slice(0, -1).map((r) => pontuacao(r) ?? 0)),
      vezes: lista.length,
      historico: lista.map((r) => ({ data: r.data, texto: textoResultado(r), pontos: pontuacao(r) ?? 0 })),
    });
  }
  return out.sort((a, b) => (a.ultimo.data < b.ultimo.data ? 1 : -1));
}

/** Recordes de força que nasceram numa data (para o card “Novo recorde pessoal”). */
export function recordesDoDia(linhas: LinhaRecorde[], data: string): LinhaRecorde[] {
  return linhas.filter((l) => l.data === data && l.anterior != null);
}

/** “1RM”, “5RM”. */
export const rotuloRm = (rm: Rm) => `${rm}RM`;
