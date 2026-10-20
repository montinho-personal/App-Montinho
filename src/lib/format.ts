export function brl(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

const FMT_DATA_BR = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

/** Data no padrão brasileiro, sempre no fuso de Brasília (igual no servidor e no navegador). */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  // "AAAA-MM-DD" é uma data de calendário: não passa por fuso.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : FMT_DATA_BR.format(d);
}

export function diasAte(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff =
    (new Date(iso).getTime() - new Date().setHours(0, 0, 0, 0)) /
    (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

export function tempoRelativo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const seg = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seg < 60) return "agora";
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `há ${d}d`;
  return dataBR(iso);
}

export function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
