// Entrega de uma novidade ao CRM do personal (webhook). Sem cookies, sem
// redirecionamento, com tempo limite. O token vai no cabeçalho para o CRM
// (ou o Zapier/Make) poder conferir que veio do app.
export const VERSAO_PAYLOAD = 1;

export async function entregarWebhook(url: string, token: string, payload: unknown): Promise<{ ok: boolean; codigo: number | null; erro: string | null }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Montinho-Token": token, "User-Agent": "Montinho-App/1" },
      body: JSON.stringify({ origem: "app-montinho", versao: VERSAO_PAYLOAD, ...(payload as object) }),
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    return { ok: r.status >= 200 && r.status < 300, codigo: r.status, erro: r.status >= 200 && r.status < 300 ? null : `Resposta ${r.status}` };
  } catch (e) {
    return { ok: false, codigo: null, erro: e instanceof Error ? e.message.slice(0, 200) : "Falha de conexão" };
  }
}
