// ============================================================================
// Exercício por TEMPO ou por REPETIÇÕES (PURO, testado).
// Sem coluna nova no banco: a prescrição em tempo é escrita com a unidade
// (“30s”, “45s/60s”, “1min”), e isometria é sempre por tempo. Na execução, o
// número registrado na série é a duração em segundos.
// ============================================================================

import { duracaoFixa } from "@/lib/tempo/estimar";

const partes = (reps: string) => reps.split("/").map((p) => p.trim()).filter(Boolean);

/** A prescrição é por tempo? (isometria, ou todas as partes com unidade de tempo) */
export function ehPorTempo(ex: { reps?: string | null; tecnica?: string | null }): boolean {
  if (ex.tecnica === "isometria") return true;
  const ps = partes(ex.reps ?? "");
  return ps.length > 0 && ps.every((p) => duracaoFixa(p) != null);
}

/** Converte a prescrição: repetições → tempo (“30” → “30s”) ou tempo → repetições (“30s” → “30”). */
export function converterMedida(reps: string, paraTempo: boolean): string {
  return partes(reps)
    .map((p) => {
      if (paraTempo) {
        if (duracaoFixa(p) != null) return p;
        const n = p.match(/\d+/g)?.map(Number).filter((x) => x > 0) ?? [];
        return n.length ? `${Math.max(...n)}s` : "30s";
      }
      const seg = duracaoFixa(p);
      return seg != null ? String(seg) : p;
    })
    .join("/");
}

/** Segundos previstos da série (null se não houver). */
export function segundosPrevistos(reps: string | null | undefined): number | null {
  const p = partes(reps ?? "")[0];
  return p ? (duracaoFixa(p) ?? (Number(p.match(/\d+/)?.[0]) || null)) : null;
}

/** “45 s”, “1 min 30 s”. */
export function formatarSegundos(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}
