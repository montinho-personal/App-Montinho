// Google Analytics 4 — só funciona depois do aceite no aviso de cookies.
// Nunca enviar nome, e-mail, telefone, dados de saúde nem ids de pessoas.
type Gtag = (...args: unknown[]) => void;

function gtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  return typeof g === "function" ? g : null;
}

/** Toque num convite para o WhatsApp: só o código de origem (APP-…) e a tela. */
export function registrarCliqueGa(ref: string, tela: string) {
  gtag()?.("event", "whatsapp_click", { cta_ref: ref, tela });
}

/** Evento simples sem dado pessoal (ex.: "sign_up" no cadastro por convite). */
export function eventoGa(nome: string, params: Record<string, string | number> = {}) {
  gtag()?.("event", nome, params);
}
