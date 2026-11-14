// ============================================================================
// “Copiar resumo da fase” (pedido do Montinho, 14/11/2026): o JSON que o
// Montinho Strategy lê no “Colar do app” para montar o documento de troca de
// fase. Regras PURAS. Formato fixo (formato/versao); o que não tem dado = null.
// Datas sempre no dia de Brasília (as datas de início/fim chegam prontas).
//  • treinosFeitos = treinos da ficha concluídos no período (regra da aderência);
//    parciais e extras à parte; importado nunca conta.
//  • treinosPrevistos = soma das metas das semanas (segunda) dentro do período,
//    sem semanas pausadas; aderenciaPct = pontos ÷ meta dessas semanas.
//  • exercícios principais = os da ficha feitos 2+ vezes no período (até 10, os
//    mais feitos primeiro); início/fim = melhor série (maior carga, depois mais
//    reps) da 1ª e da última vez. Sem ficha, valem todos.
//  • séries por grupo por semana = séries válidas feitas (sem aquecimento), em
//    qualquer treino, pelo músculo principal.
// ============================================================================
import { classificarSessao, inicioDaSemana, somarDias, type Semana, type SessaoAderencia } from "@/lib/aderencia/calcular";
import { GRUPOS_SEM_VOLUME, normalizarNome } from "@/lib/grupos";

export const FORMATO_RESUMO = "montinho-resumo-fase" as const;
export const VERSAO_RESUMO = 1 as const;
export const MAX_EXERCICIOS_RESUMO = 10;
const TIPOS_VALIDOS = ["valida", "dropset", "rest_pause", "cluster", "isometria"];

export type SerieResumo = { tipo: string | null; carga_kg: number | null; reps: number | null };
export type ExercicioResumoEntrada = { nome: string; grupo: string | null; series: SerieResumo[] };
export type SessaoResumo = SessaoAderencia & { conta_aderencia?: boolean | null; data: string; origem?: string | null; exercicios: ExercicioResumoEntrada[] };
export type MedidaResumo = {
  data: string;
  peso_kg?: number | null; gordura_pct?: number | null; massa_magra_kg?: number | null; massa_muscular_kg?: number | null;
  cintura_cm?: number | null; quadril_cm?: number | null; abdomen_cm?: number | null; braco_cm?: number | null;
  coxa_cm?: number | null; peito_cm?: number | null; panturrilha_cm?: number | null;
};
export type CheckInResumo = {
  data: string; origem?: string | null; pulso_pulou?: boolean | null;
  pulso_energia?: string | null; pulso_recuperacao?: string | null; pulso_motivacao?: string | null; pulso_sono?: string | null; pulso_dificuldades?: string[] | null;
  energia?: number | null; sono?: number | null; dor?: number | null; motivacao?: number | null; estresse?: number | null;
};

export type EntradaResumo = {
  aluno: { nome: string; objetivo: string | null; nivel: string | null };
  protocolo: { nome: string | null; fase: string | null } | null;
  inicio: string;
  fim: string;
  geradoEm: string;
  sessoes: SessaoResumo[];
  semanas: Semana[];
  /** Nomes dos exercícios da ficha ativa (para escolher os principais). */
  ficha: string[];
  medidas: MedidaResumo[];
  fotos: string[];
  checkins: CheckInResumo[];
};

type Ponto = { data: string; cargaKg: number | null; reps: number | null };
export type ResumoFase = {
  formato: typeof FORMATO_RESUMO;
  versao: typeof VERSAO_RESUMO;
  geradoEm: string;
  aluno: { nome: string; objetivo: string | null; nivel: string | null };
  periodo: { inicio: string; fim: string; semanas: number };
  protocolo: { nome: string | null; fase: string | null } | null;
  treinosFeitos: number;
  treinosPrevistos: number | null;
  aderenciaPct: number | null;
  treinosParciais: number;
  treinosExtras: number;
  semanasCompletas: number;
  exercicios: Array<{ nome: string; grupo: string | null; vezes: number; inicio: Ponto; fim: Ponto; variacaoKg: number | null; variacaoPct: number | null }>;
  seriesPorGrupoSemana: Array<{ semana: string; grupos: Record<string, number> }>;
  corpo: { inicio: Medidas | null; fim: Medidas | null };
  fotos: { quantidade: number; datas: string[] };
  checkins: Array<{ data: string; energia: string | null; recuperacao: string | null; motivacao: string | null; sono: string | null; dificuldades: string[] | null; escala1a10: { energia: number | null; sono: number | null; dor: number | null; motivacao: number | null; estresse: number | null } | null }>;
};
type Medidas = { data: string; pesoKg: number | null; gorduraPct: number | null; massaMagraKg: number | null; massaMuscularKg: number | null; cinturaCm: number | null; quadrilCm: number | null; abdomenCm: number | null; bracoCm: number | null; coxaCm: number | null; peitoCm: number | null; panturrilhaCm: number | null };

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const dentro = (d: string, a: string, b: string) => d >= a && d <= b;
const conta = (s: SessaoResumo) => s.origem !== "importado" && s.conta_aderencia !== false && s.status !== "abandonada";

/** Melhor série da sessão no exercício: maior carga; empate (ou sem carga) → mais repetições. */
export function melhorSerie(series: SerieResumo[]): { cargaKg: number | null; reps: number | null } | null {
  let melhor: { cargaKg: number | null; reps: number | null } | null = null;
  for (const s of series) {
    if (s.tipo === "aquecimento" || !(Number(s.reps) > 0)) continue;
    const c = Number(s.carga_kg) > 0 ? Number(s.carga_kg) : null;
    const r = Number(s.reps);
    if (!melhor || (c ?? 0) > (melhor.cargaKg ?? 0) || ((c ?? 0) === (melhor.cargaKg ?? 0) && r > (melhor.reps ?? 0))) melhor = { cargaKg: c, reps: r };
  }
  return melhor;
}

function medidas(m: MedidaResumo | undefined): Medidas | null {
  if (!m) return null;
  return { data: m.data, pesoKg: n(m.peso_kg), gorduraPct: n(m.gordura_pct), massaMagraKg: n(m.massa_magra_kg), massaMuscularKg: n(m.massa_muscular_kg), cinturaCm: n(m.cintura_cm), quadrilCm: n(m.quadril_cm), abdomenCm: n(m.abdomen_cm), bracoCm: n(m.braco_cm), coxaCm: n(m.coxa_cm), peitoCm: n(m.peito_cm), panturrilhaCm: n(m.panturrilha_cm) };
}
const temMedida = (m: MedidaResumo) => [m.peso_kg, m.gordura_pct, m.massa_magra_kg, m.massa_muscular_kg, m.cintura_cm, m.quadril_cm, m.abdomen_cm, m.braco_cm, m.coxa_cm, m.peito_cm, m.panturrilha_cm].some((v) => typeof v === "number");

export function resumoDaFase(e: EntradaResumo): ResumoFase {
  const { inicio, fim } = e;
  const sessoes = e.sessoes.filter((s) => dentro(s.data, inicio, fim)).sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  const validas = sessoes.filter((s) => s.origem !== "importado" && s.conta_aderencia !== false);
  const classe = validas.map((s) => classificarSessao(s));

  // Semanas (segunda) do período.
  const seg0 = inicioDaSemana(inicio);
  const segs: string[] = [];
  for (let w = seg0; w <= fim; w = somarDias(w, 7)) segs.push(w);
  const semanas = e.semanas.filter((w) => segs.includes(w.inicio) && !w.pausada && w.meta);
  const meta = semanas.reduce((t, w) => t + (w.meta ?? 0), 0);
  const pontos = semanas.reduce((t, w) => t + w.pontos, 0);

  // Exercícios principais.
  const ficha = new Set(e.ficha.map((x) => normalizarNome(x)));
  const porEx = new Map<string, { nome: string; grupo: string | null; vezes: Array<{ data: string; s: { cargaKg: number | null; reps: number | null } }> }>();
  for (const s of sessoes.filter(conta)) {
    for (const ex of s.exercicios) {
      const k = normalizarNome(ex.nome);
      if (ficha.size && !ficha.has(k)) continue;
      const m = melhorSerie(ex.series);
      if (!m) continue;
      const atual = porEx.get(k) ?? { nome: ex.nome, grupo: ex.grupo, vezes: [] };
      const ja = atual.vezes.find((v) => v.data === s.data);
      if (ja) {
        if ((m.cargaKg ?? 0) > (ja.s.cargaKg ?? 0) || ((m.cargaKg ?? 0) === (ja.s.cargaKg ?? 0) && (m.reps ?? 0) > (ja.s.reps ?? 0))) ja.s = m;
      } else atual.vezes.push({ data: s.data, s: m });
      porEx.set(k, atual);
    }
  }
  const exercicios = [...porEx.values()]
    .filter((x) => x.vezes.length >= 2)
    .sort((a, b) => b.vezes.length - a.vezes.length || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, MAX_EXERCICIOS_RESUMO)
    .map((x) => {
      const a = x.vezes[0];
      const b = x.vezes.at(-1)!;
      const variacaoKg = a.s.cargaKg != null && b.s.cargaKg != null ? n(b.s.cargaKg - a.s.cargaKg) : null;
      const variacaoPct = a.s.cargaKg && b.s.cargaKg != null ? Math.round(((b.s.cargaKg - a.s.cargaKg) / a.s.cargaKg) * 1000) / 10 : null;
      return { nome: x.nome, grupo: x.grupo, vezes: x.vezes.length, inicio: { data: a.data, ...a.s }, fim: { data: b.data, ...b.s }, variacaoKg, variacaoPct };
    });

  // Séries por grupo por semana.
  const seriesPorGrupoSemana = segs.map((semana) => {
    const grupos: Record<string, number> = {};
    for (const s of sessoes.filter((x) => conta(x) && inicioDaSemana(x.data) === semana)) {
      for (const ex of s.exercicios) {
        if (!ex.grupo || GRUPOS_SEM_VOLUME.includes(ex.grupo as never)) continue;
        const q = ex.series.filter((x) => x.tipo == null || TIPOS_VALIDOS.includes(x.tipo)).filter((x) => Number(x.reps) > 0 || Number(x.carga_kg) > 0).length;
        if (q) grupos[ex.grupo] = (grupos[ex.grupo] ?? 0) + q;
      }
    }
    return { semana, grupos };
  });

  // Corpo: o registro mais perto do início (até ele, senão o 1º do período) e o último do período.
  const meds = e.medidas.filter(temMedida).sort((a, b) => (a.data < b.data ? -1 : 1));
  const mIni = meds.filter((m) => m.data <= inicio).at(-1) ?? meds.find((m) => dentro(m.data, inicio, fim));
  const mFim = meds.filter((m) => dentro(m.data, inicio, fim) && m !== mIni).at(-1);

  const fotos = [...new Set(e.fotos.filter((d) => dentro(d, inicio, fim)))].sort();
  const checkins = e.checkins
    .filter((c) => dentro(c.data, inicio, fim) && !c.pulso_pulou)
    .sort((a, b) => (a.data < b.data ? -1 : 1))
    .map((c) => {
      const antigo = [c.energia, c.sono, c.dor, c.motivacao, c.estresse].some((v) => typeof v === "number");
      return {
        data: c.data,
        energia: c.pulso_energia ?? null,
        recuperacao: c.pulso_recuperacao ?? null,
        motivacao: c.pulso_motivacao ?? null,
        sono: c.pulso_sono ?? null,
        dificuldades: c.pulso_dificuldades?.length ? c.pulso_dificuldades : null,
        escala1a10: antigo ? { energia: c.energia ?? null, sono: c.sono ?? null, dor: c.dor ?? null, motivacao: c.motivacao ?? null, estresse: c.estresse ?? null } : null,
      };
    })
    .filter((c) => c.energia || c.recuperacao || c.motivacao || c.sono || c.dificuldades || c.escala1a10);

  return {
    formato: FORMATO_RESUMO,
    versao: VERSAO_RESUMO,
    geradoEm: e.geradoEm,
    aluno: e.aluno,
    periodo: { inicio, fim, semanas: segs.length },
    protocolo: e.protocolo,
    treinosFeitos: classe.filter((c) => c === "concluida").length,
    treinosPrevistos: meta || null,
    aderenciaPct: meta ? Math.round((pontos / meta) * 100) : null,
    treinosParciais: classe.filter((c) => c === "parcial").length,
    treinosExtras: classe.filter((c) => c === "extra").length,
    semanasCompletas: semanas.filter((w) => w.status === "cumprida").length,
    exercicios,
    seriesPorGrupoSemana,
    corpo: { inicio: medidas(mIni), fim: medidas(mFim) },
    fotos: { quantidade: fotos.length, datas: fotos },
    checkins,
  };
}

export type TrechoDeFase = { fase: string | null; inicio: string; fim: string; atual: boolean };

/** Períodos de cada fase pelo histórico de versões (mais recente primeiro). `versoes` = { data (dia de Brasília), fase }. */
export function trechosDeFase(versoes: Array<{ data: string; fase: string | null }>, hoje: string): TrechoDeFase[] {
  const ord = [...versoes].sort((a, b) => (a.data < b.data ? -1 : 1));
  const trechos: Array<{ fase: string | null; inicio: string }> = [];
  for (const v of ord) if (!trechos.length || trechos.at(-1)!.fase !== (v.fase ?? null)) trechos.push({ fase: v.fase ?? null, inicio: v.data });
  return trechos
    .map((t, i) => ({ fase: t.fase, inicio: t.inicio, fim: trechos[i + 1] ? somarDias(trechos[i + 1].inicio, -1) : hoje, atual: i === trechos.length - 1 }))
    .filter((t) => t.fim >= t.inicio)
    .reverse();
}
