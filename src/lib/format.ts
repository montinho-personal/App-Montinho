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

const FMT_DIA_ISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * Dias de calendário (Brasília) de hoje até a data: 0 = hoje é o último dia, 1 = amanhã,
 * negativo = já passou. Auditoria 29/10/2026: com o servidor em UTC, depois das 21h o
 * último dia virava “acesso encerrado / vencido há 1d”.
 */
export function diasAte(iso: string | null | undefined, agora: Date = new Date()): number | null {
  if (!iso) return null;
  const alvo = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : FMT_DIA_ISO.format(new Date(iso));
  const hoje = FMT_DIA_ISO.format(agora);
  return Math.round((Date.parse(`${alvo}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86_400_000);
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
