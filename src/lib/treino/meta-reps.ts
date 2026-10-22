// ============================================================================
// Meta de repetições do personal no treino ativo.
//
// O campo de reps já vem com o que o aluno fez da última vez. A meta é o que
// o personal prescreveu para aquela série (ex.: 20/15/12/10): o aluno tenta
// chegar nela e, se der, passa. Não chegou? Registra o que fez — o ajuste
// continua com as sugestões que o app já faz.
// ============================================================================

export type MetaReps = { min: number; max: number };

/** “12” → 12–12; “10-12”, “10 a 12”, “10–12” → 10–12. Texto livre (“falha”, “30s”) → null. */
export function lerMeta(prescrito: string | null | undefined): MetaReps | null {
  const t = (prescrito ?? "").trim().toLowerCase();
  const m = /^(\d{1,3})(?:\s*(?:-|–|a|até)\s*(\d{1,3}))?(?:\s*reps?)?$/.exec(t);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  if (!a || !b) return null;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

/** Meta de cada série válida, na ordem: pirâmide numa linha (“20/15/12/10”) ou série a série. */
export function metasPorSerie(prescritas: string[]): Array<MetaReps | null> {
  return prescritas.map(lerMeta);
}

export const rotuloMeta = (m: MetaReps) => (m.min === m.max ? String(m.min) : `${m.min}–${m.max}`);

/** Valor digitado/pré-preenchido em relação à meta. */
export function situacaoMeta(reps: string, meta: MetaReps | null): "abaixo" | "na_meta" | "acima" | null {
  if (!meta) return null;
  const n = Number(String(reps).replace(",", "."));
  if (!reps.trim() || !Number.isFinite(n) || n <= 0) return null;
  if (n < meta.min) return "abaixo";
  return n > meta.max ? "acima" : "na_meta";
}

/** Aviso do exercício: só aparece quando o que veio da última vez ficou abaixo da meta em alguma série. */
export function avisoMeta(metas: Array<MetaReps | null>, valores: string[]): string | null {
  const validas = metas.filter((m): m is MetaReps => m !== null);
  if (!validas.length) return null;
  const algumaAbaixo = metas.some((m, i) => situacaoMeta(valores[i] ?? "", m) === "abaixo");
  if (!algumaAbaixo) return null;
  return "Os números vêm do seu último treino. Tente chegar na meta de cada série — e, se der, passe dela. Não chegou? Registre o que fez: o app sugere o ajuste.";
}
