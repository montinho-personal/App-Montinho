// ============================================================================
// Comparativo “antes × agora” no montador (18/11/2026, pedido do Montinho:
// “preciso ter sempre o comparativo entre o treino de adaptação e o de
// intensificação… e de protocolo para protocolo, sempre comparando o treino
// anterior com o que estou montando”). Regras PURAS: recebem o protocolo de
// partida (uma versão salva) e o que está na tela, e dizem o que entrou, saiu,
// mudou e ficou igual — por treino, por exercício e por músculo (séries/semana).
// Rótulos neutros: só “subiu/desceu/igual”, nunca “melhor/pior”.
// ============================================================================

export type ExercicioComparavel = {
  nome: string;
  /** Séries válidas (sem aquecimento). */
  series: number;
  reps: string;
  /** Nome da técnica (vazio/“Tradicional” = sem técnica). */
  tecnica: string;
  descansoSeg: number | null;
};
export type TreinoComparavel = { letra: string; nome: string; ativo: boolean; vezesPorSemana: number; exercicios: ExercicioComparavel[] };
export type ProtocoloComparavel = { fase: string | null; treinos: TreinoComparavel[] };

export type ItemComparado =
  | { tipo: "entrou"; nome: string; agora: string; veioDe?: string }
  | { tipo: "saiu"; nome: string; antes: string; foiPara?: string }
  | { tipo: "mudou"; nome: string; antes: string; agora: string; detalhes: string[] }
  | { tipo: "igual"; nome: string; agora: string };

export type TreinoComparado = {
  letra: string;
  nome: string;
  status: "novo" | "saiu" | "mudou" | "igual";
  seriesAntes: number;
  seriesAgora: number;
  itens: ItemComparado[];
};

export type ComparativoProtocolo = {
  diasAntes: number;
  diasAgora: number;
  treinosSemanaAntes: number;
  treinosSemanaAgora: number;
  seriesSemanaAntes: number;
  seriesSemanaAgora: number;
  entraram: number;
  sairam: number;
  mudaram: number;
  iguais: number;
  tecnicasAntes: number;
  tecnicasAgora: number;
  porTreino: TreinoComparado[];
  /** Nada mudou em nada. */
  identico: boolean;
};

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const semTecnica = (t: string) => !t || norm(t) === "tradicional" || norm(t) === "normal";
const repsBonito = (r: string) => (r || "").replace(/-/g, "–");
const segTxt = (s: number | null) => (s == null ? "" : s >= 120 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/** “4 × 10–12 · Drop-set” */
export function textoExercicio(e: ExercicioComparavel): string {
  return [`${e.series} × ${repsBonito(e.reps) || "—"}`, semTecnica(e.tecnica) ? "" : e.tecnica].filter(Boolean).join(" · ");
}

function detalhesDaMudanca(a: ExercicioComparavel, d: ExercicioComparavel): string[] {
  const out: string[] = [];
  if (a.series !== d.series) out.push(`séries ${a.series} → ${d.series}`);
  if (norm(a.reps) !== norm(d.reps)) out.push(`reps ${repsBonito(a.reps) || "—"} → ${repsBonito(d.reps) || "—"}`);
  const ta = semTecnica(a.tecnica) ? "" : a.tecnica;
  const td = semTecnica(d.tecnica) ? "" : d.tecnica;
  if (norm(ta) !== norm(td)) out.push(!ta ? `+ ${td}` : !td ? `sem ${ta}` : `${ta} → ${td}`);
  if (a.descansoSeg != null && d.descansoSeg != null && a.descansoSeg !== d.descansoSeg) out.push(`descanso ${segTxt(a.descansoSeg)} → ${segTxt(d.descansoSeg)}`);
  return out;
}

const ativos = (p: ProtocoloComparavel) => p.treinos.filter((t) => t.ativo && t.exercicios.length > 0);
const seriesDoTreino = (t: TreinoComparavel) => t.exercicios.reduce((n, e) => n + e.series, 0);
const tecnicas = (p: ProtocoloComparavel) => ativos(p).reduce((n, t) => n + t.exercicios.filter((e) => !semTecnica(e.tecnica)).length, 0);

export function compararProtocolos(antes: ProtocoloComparavel, agora: ProtocoloComparavel): ComparativoProtocolo {
  const A = ativos(antes);
  const D = ativos(agora);
  const mapaA = new Map(A.map((t) => [t.letra, t]));
  const mapaD = new Map(D.map((t) => [t.letra, t]));
  // Onde cada exercício estava/está (para “mudou de treino”).
  const letrasDe = (lista: TreinoComparavel[]) => {
    const m = new Map<string, string[]>();
    for (const t of lista) for (const e of t.exercicios) m.set(norm(e.nome), [...(m.get(norm(e.nome)) ?? []), t.letra]);
    return m;
  };
  const ondeA = letrasDe(A);
  const ondeD = letrasDe(D);
  let entraram = 0, sairam = 0, mudaram = 0, iguais = 0;
  const porTreino: TreinoComparado[] = [];
  const letras = [...new Set([...A.map((t) => t.letra), ...D.map((t) => t.letra)])].sort();
  for (const letra of letras) {
    const a = mapaA.get(letra);
    const d = mapaD.get(letra);
    const itens: ItemComparado[] = [];
    const exA = a?.exercicios ?? [];
    const exD = d?.exercicios ?? [];
    const usados = new Set<number>();
    for (const e of exD) {
      const i = exA.findIndex((x, k) => !usados.has(k) && norm(x.nome) === norm(e.nome));
      if (i < 0) {
        const outro = (ondeA.get(norm(e.nome)) ?? []).find((l) => l !== letra);
        itens.push({ tipo: "entrou", nome: e.nome, agora: textoExercicio(e), ...(outro ? { veioDe: outro } : {}) });
        entraram++;
        continue;
      }
      usados.add(i);
      const det = detalhesDaMudanca(exA[i], e);
      if (det.length) {
        itens.push({ tipo: "mudou", nome: e.nome, antes: textoExercicio(exA[i]), agora: textoExercicio(e), detalhes: det });
        mudaram++;
      } else {
        itens.push({ tipo: "igual", nome: e.nome, agora: textoExercicio(e) });
        iguais++;
      }
    }
    exA.forEach((x, k) => {
      if (usados.has(k)) return;
      const outro = (ondeD.get(norm(x.nome)) ?? []).find((l) => l !== letra);
      itens.push({ tipo: "saiu", nome: x.nome, antes: textoExercicio(x), ...(outro ? { foiPara: outro } : {}) });
      sairam++;
    });
    const status: TreinoComparado["status"] = !a ? "novo" : !d ? "saiu" : itens.some((x) => x.tipo !== "igual") ? "mudou" : "igual";
    porTreino.push({ letra, nome: (d ?? a)!.nome, status, seriesAntes: a ? seriesDoTreino(a) : 0, seriesAgora: d ? seriesDoTreino(d) : 0, itens });
  }
  const porSemana = (lista: TreinoComparavel[]) => lista.reduce((n, t) => n + seriesDoTreino(t) * t.vezesPorSemana, 0);
  const vezes = (lista: TreinoComparavel[]) => lista.reduce((n, t) => n + t.vezesPorSemana, 0);
  const r = {
    diasAntes: A.length,
    diasAgora: D.length,
    treinosSemanaAntes: vezes(A),
    treinosSemanaAgora: vezes(D),
    seriesSemanaAntes: porSemana(A),
    seriesSemanaAgora: porSemana(D),
    entraram,
    sairam,
    mudaram,
    iguais,
    tecnicasAntes: tecnicas(antes),
    tecnicasAgora: tecnicas(agora),
    porTreino,
  };
  return { ...r, identico: !entraram && !sairam && !mudaram && r.diasAntes === r.diasAgora && r.treinosSemanaAntes === r.treinosSemanaAgora };
}

export type MusculoComparado = { grupo: string; label: string; antes: number; agora: number; dif: number };

/** Séries por semana de cada músculo, antes × agora (só os que aparecem em algum dos dois). */
export function compararMusculos(antes: Array<{ grupo: string; label: string; total: number }>, agora: Array<{ grupo: string; label: string; total: number }>): MusculoComparado[] {
  const m = new Map<string, MusculoComparado>();
  const r1 = (n: number) => Math.round(n * 10) / 10;
  for (const l of antes) m.set(l.grupo, { grupo: l.grupo, label: l.label, antes: r1(l.total), agora: 0, dif: 0 });
  for (const l of agora) m.set(l.grupo, { ...(m.get(l.grupo) ?? { grupo: l.grupo, label: l.label, antes: 0, agora: 0, dif: 0 }), label: l.label, agora: r1(l.total) });
  return [...m.values()]
    .map((x) => ({ ...x, dif: r1(x.agora - x.antes) }))
    .filter((x) => x.antes > 0 || x.agora > 0)
    .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif) || b.agora - a.agora);
}

/**
 * Protocolo de partida para comparar (o “treino de onde se sai”): a versão salva mais recente com
 * fase DIFERENTE da que está sendo montada (ex.: montando a Intensificação → a última da Adaptação).
 * Sem nenhuma de outra fase, a versão salva mais recente (o que o aluno vê hoje).
 */
export function versaoDePartida<T extends { fase: string | null; created_at: string }>(versoes: T[], faseAtual: string | null): T | null {
  const ordenadas = [...versoes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (!ordenadas.length) return null;
  return ordenadas.find((v) => (v.fase ?? "") !== (faseAtual ?? "")) ?? ordenadas[0];
}
