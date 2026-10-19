export function brl(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
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
