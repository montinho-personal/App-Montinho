// ============================================================================
// Plano de tempo da sessão em andamento (07/11/2026, caso de um aluno que
// juntou exercícios em bi-set e o relógio do treino não acompanhou).
// O plano parte da foto do treino tirada no “Começar” e recebe por cima o que
// o aluno mudou na hora: bi-set montado por ele (`prescricao.bloco_aluno`,
// os dois ficam lado a lado e alternam, sem descanso entre eles) e
// “＋ Exercício extra” (soma o tempo dele). Sem mudanças, devolve a foto igual.
// ============================================================================

type Prescrito = { id: string; tecnica?: string | null; bloco?: string | null };
type LinhaSessao = { id: string; exercicio_id: string | null; prescricao?: unknown };

const blocoDoAluno = (se: LinhaSessao) => ((se.prescricao as { bloco_aluno?: string | null } | null)?.bloco_aluno ?? null) || null;

export function planoDaSessao<P extends Prescrito>(base: P[], sessao: LinhaSessao[] | null | undefined, extras: P[] = []): P[] {
  if (!sessao?.length) return base;
  const temBiset = sessao.some((se) => blocoDoAluno(se));
  const extrasDaSessao = extras.filter((x) => sessao.some((se) => se.id === x.id) && !base.some((b) => b.id === x.id));
  if (!temBiset && !extrasDaSessao.length) return base;

  // Ordem da sessão; troca dividida em duas linhas = o mesmo exercício uma vez só.
  const usados = new Set<string>();
  const lista: P[] = [];
  for (const se of sessao) {
    const p = base.find((x) => x.id === se.exercicio_id) ?? extrasDaSessao.find((x) => x.id === se.id);
    if (!p || usados.has(p.id)) continue;
    usados.add(p.id);
    const b = blocoDoAluno(se);
    lista.push(b ? { ...p, tecnica: "biset", bloco: `aluno-${b}` } : p);
  }
  // O que a sessão não tem (ex.: foto antiga) continua no fim, como estava.
  for (const p of base) if (!usados.has(p.id)) lista.push(p);

  // Os do mesmo bi-set do aluno ficam lado a lado.
  const out: P[] = [];
  const feitos = new Set<number>();
  lista.forEach((x, i) => {
    if (feitos.has(i)) return;
    feitos.add(i);
    out.push(x);
    const b = x.bloco && String(x.bloco).startsWith("aluno-") ? x.bloco : null;
    if (!b) return;
    lista.forEach((y, j) => {
      if (!feitos.has(j) && y.bloco === b) {
        feitos.add(j);
        out.push(y);
      }
    });
  });
  return out;
}
