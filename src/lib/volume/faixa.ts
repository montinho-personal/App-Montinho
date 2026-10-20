// Meta de volume digitada como texto no montador: “8-12”, “8 a 12”, “8–12”,
// “8/12”, “8 12” ou só “12”. Puro (testado).
import type { MetaVolume } from "./calcular";

export const LIMITE_META = 80;

/** null = texto inválido; "vazio" = apagar a meta do grupo. */
export function lerFaixa(texto: string): MetaVolume | "vazio" | null {
  const t = texto.trim().toLowerCase();
  if (!t) return "vazio";
  const m = t.match(/^(\d{1,2})(?:\s*(?:-|–|—|a|até|ate|\/|\s)\s*(\d{1,2}))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] != null ? Number(m[2]) : a;
  if (a > LIMITE_META || b > LIMITE_META) return null;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export const textoFaixa = (m: MetaVolume | null | undefined) => (!m ? "" : m.max > m.min ? `${m.min}-${m.max}` : String(m.min));
