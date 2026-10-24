// ============================================================================
// Strava — chamadas à API oficial (só no servidor). As chaves do app ficam nas
// variáveis de ambiente da Vercel (STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET),
// nunca no código. Documentação: developers.strava.com.
// ============================================================================

import type { AtividadeStrava } from "./combinar";

const BASE = "https://www.strava.com";
/** Leitura das atividades, inclusive as marcadas como “só eu” (o treino da academia costuma ser privado). */
export const ESCOPO = "read,activity:read_all";

export const stravaConfigurado = () => Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

export function urlAutorizar(redirectUri: string, state: string): string {
  const q = new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID ?? "", redirect_uri: redirectUri, response_type: "code", approval_prompt: "auto", scope: ESCOPO, state });
  return `${BASE}/oauth/authorize?${q}`;
}

export type TokensStrava = { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number; firstname?: string; lastname?: string } };

async function token(corpo: Record<string, string>): Promise<TokensStrava> {
  const r = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, ...corpo }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Strava recusou a autorização (${r.status})`);
  return (await r.json()) as TokensStrava;
}

export const trocarCodigo = (code: string) => token({ code, grant_type: "authorization_code" });
export const renovarToken = (refresh: string) => token({ refresh_token: refresh, grant_type: "refresh_token" });

async function get<T>(caminho: string, accessToken: string): Promise<T> {
  const r = await fetch(`${BASE}/api/v3${caminho}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (r.status === 401) throw new Error("STRAVA_NAO_AUTORIZADO");
  if (r.status === 429) throw new Error("O Strava pediu uma pausa (muitos pedidos). Tente de novo em alguns minutos.");
  if (!r.ok) throw new Error(`Strava respondeu ${r.status}`);
  return (await r.json()) as T;
}

export const listarAtividades = (accessToken: string, after: number, before: number, pagina = 1, porPagina = 30) => get<Array<AtividadeStrava & { distance?: number | null; total_elevation_gain?: number | null }>>(`/athlete/activities?after=${after}&before=${before}&per_page=${porPagina}&page=${pagina}`, accessToken);

export type AtividadeDetalhe = AtividadeStrava & { calories?: number | null; device_name?: string | null };
export const detalheAtividade = (accessToken: string, id: number) => get<AtividadeDetalhe>(`/activities/${id}`, accessToken);

/** Desconecta o app na conta do aluno no Strava (melhor esforço). */
export async function desautorizar(accessToken: string): Promise<void> {
  await fetch(`${BASE}/oauth/deauthorize`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }).catch(() => undefined);
}
