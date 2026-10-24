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

// ----------------------------------------------------------------------------
// Passou da meta na última vez → hora de subir o peso (pedido do Montinho em
// 25/10/2026). Ex.: meta 15 e fez 20 com 10 kg → no treino seguinte o app
// avisa que já dá para aumentar o peso e voltar a fazer dentro da faixa.
// É convite, não ordem: o aluno decide, e com dor no check-in não aparece.
// ----------------------------------------------------------------------------

export type SeriePassou = { serie: number; reps: number; meta: MetaReps; cargaKg: number };

type SerieHoje = { serie: number; tipo: string };
type SerieUltima = { serie: number; reps: number | null; carga_kg: number | null; tipo: string };

/**
 * Séries de hoje em que, na última vez, a pessoa fez MAIS repetições que o topo
 * da meta, com carga anotada. Peso do corpo (sem carga) fica de fora.
 */
export function seriesQuePassaram(hoje: SerieHoje[], metas: Array<MetaReps | null>, ultima: SerieUltima[]): SeriePassou[] {
  const validas = ultima.filter((u) => u.tipo === "valida");
  const out: SeriePassou[] = [];
  hoje.forEach((s, i) => {
    const meta = metas[i];
    if (s.tipo !== "valida" || !meta) return;
    const u = validas.find((x) => x.serie === s.serie);
    if (!u || u.reps == null || u.carga_kg == null || u.carga_kg <= 0) return;
    if (u.reps > meta.max) out.push({ serie: s.serie, reps: u.reps, meta, cargaKg: u.carga_kg });
  });
  return out;
}

const kgBR = (n: number) => `${String(Math.round(n * 100) / 100).replace(".", ",")} kg`;

/** Texto do aviso no topo do exercício. */
export function textoSubirPeso(passou: SeriePassou[]): string | null {
  if (!passou.length) return null;
  const partes = passou.map((p) => `série ${p.serie}: ${p.reps} reps com ${kgBR(p.cargaKg)} (meta ${rotuloMeta(p.meta)})`);
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join("; ")} e ${partes.at(-1)}`;
  const onde = passou.length === 1 ? "nessa série" : "nessas séries";
  return `Na última vez você passou da meta — ${lista}. Hoje dá para subir um pouco o peso ${onde} (a próxima anilha ou o próximo halter) e fazer dentro da faixa. Se a execução não ficar firme, volte ao peso anterior.`;
}
