// WhatsApp do visitante no cadastro (obrigatório).
// Brasil: com DDD, com ou sem +55, espaços, parênteses e traço → “+55 11 98106-3409”
// (o mesmo formato do cadastro feito pelo personal).
// Outros países: começando com + (ou 00) e o código do país → “+351 912345678”
// guardado como “+<código e número>” (8 a 15 dígitos, padrão internacional E.164).

export const MSG_WHATSAPP = "Digite seu WhatsApp com DDD, ex.: (11) 98765-4321. Fora do Brasil? Comece com + e o código do país, ex.: +351 912 345 678.";

/** Número formatado, ou null quando não é um número válido (Brasil com DDD ou internacional com +código do país). */
export function whatsappBR(entrada: string): string | null {
  const bruto = entrada.trim();
  let d = bruto.replace(/\D/g, "");
  const internacional = bruto.startsWith("+") || /^00[1-9]/.test(bruto);
  if (internacional) {
    if (bruto.startsWith("00")) d = d.replace(/^00/, "");
    if (!d.startsWith("55")) {
      // Código do país não começa com 0; total de 8 a 15 dígitos (E.164).
      if (d[0] === "0" || d.length < 8 || d.length > 15) return null;
      return `+${d}`;
    }
  }
  if (d.startsWith("0055")) d = d.slice(2);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1); // “011 9…”
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = d.slice(0, 2);
  const n = d.slice(2);
  if (ddd[0] === "0" || ddd[1] === "0") return null; // DDDs vão de 11 a 99, sem zero
  if (n.length === 9 && n[0] !== "9") return null; // celular com 9 dígitos começa com 9
  return `+55 ${ddd} ${n.slice(0, n.length - 4)}-${n.slice(-4)}`;
}
