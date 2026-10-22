// WhatsApp do visitante no cadastro (obrigatório): número do Brasil com DDD.
// Aceita com ou sem +55, espaços, parênteses e traço. Guarda no formato
// “+55 11 98106-3409”, o mesmo do cadastro feito pelo personal.

/** Número formatado, ou null quando não é um celular/telefone do Brasil com DDD. */
export function whatsappBR(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1); // “011 9…”
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = d.slice(0, 2);
  const n = d.slice(2);
  if (ddd[0] === "0" || ddd[1] === "0") return null; // DDDs vão de 11 a 99, sem zero
  if (n.length === 9 && n[0] !== "9") return null; // celular com 9 dígitos começa com 9
  return `+55 ${ddd} ${n.slice(0, n.length - 4)}-${n.slice(-4)}`;
}
