// Envio Web Push para os aparelhos de uma pessoa (somente no servidor).
// A chave privada VAPID fica só no ambiente do servidor (VAPID_PRIVATE_KEY).
import webpush from "web-push";

export type Aparelho = { endpoint: string; p256dh: string; auth: string };
export type ResultadoEnvio = { ok: number; falha: number; expirados: string[] };

export function configurarVapid(): boolean {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://app-montinho.vercel.app", publica, privada);
  return true;
}

export async function enviarAosAparelhos(aparelhos: Aparelho[], payload: object, opts: { ttl: number; topic?: string }): Promise<ResultadoEnvio> {
  const r: ResultadoEnvio = { ok: 0, falha: 0, expirados: [] };
  for (const a of aparelhos) {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(payload), { TTL: opts.ttl, urgency: "normal", ...(opts.topic ? { topic: opts.topic } : {}) });
      r.ok++;
    } catch (e) {
      r.falha++;
      const status = (e as { statusCode?: number }).statusCode;
      // 404/410: o aparelho cancelou a inscrição ou a permissão foi revogada.
      if (status === 404 || status === 410) r.expirados.push(a.endpoint);
    }
  }
  return r;
}
