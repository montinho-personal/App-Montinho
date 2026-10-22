// Painel de leads (Modo Visitante): monta a lista a partir de quem entrou por
// convite (acessos_visitante), inclusive quem já virou aluno. RLS: só treinador.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { mockProfiles } from "@/lib/mock/db";
import type { EventoCtaPainel, Lead, StatusLead } from "@/lib/visitante/leads";
import { CTAS, type CtaId } from "@/lib/visitante/ctas";

export type CrmConfig = { webhook_url: string | null; ativo: boolean; token: string };
export type EnvioCrm = { id: number; evento: string; criado_em: string; enviado_em: string | null; tentativas: number; codigo: number | null; ultimo_erro: string | null };

type LinhaAcesso = {
  aluno_id: string;
  inicio: string;
  fim: string | null;
  convite: { codigo: string; origem: string | null } | null;
  campanha: { nome: string } | null;
  aluno: { id: string; modalidade: string; created_at: string; profile: { nome: string | null; email: string | null } | null; perfil: { objetivo: string | null; onboarding_concluido_em: string | null } | null } | null;
};

export async function carregarLeads(): Promise<{ leads: Lead[]; eventos: EventoCtaPainel[] }> {
  if (isDemoMode()) {
    const s = demoStore();
    const leads = s.alunos
      .filter((a) => a.modalidade === "visitante")
      .map((a): Lead => {
        const feitas = s.sessions.filter((x) => x.aluno_id === a.id && x.status !== "em_andamento" && (x.series_concluidas ?? 0) > 0);
        return { id: a.id, nome: mockProfiles.find((p) => p.id === a.profile_id)?.nome ?? "Visitante", email: mockProfiles.find((p) => p.id === a.profile_id)?.email ?? null, cadastroEm: a.created_at, convite: "DEMO-30", origem: "instagram", desafio: "Desafio 7 Dias Chalalá", acessoFim: null, onboarding: true, objetivo: "hipertrofia", treinosFeitos: feitas.length, ultimoTreino: feitas.map((x) => x.iniciado_em).sort().at(-1) ?? null, whatsapp: null, status: "novo", anotacao: null, convertido: false };
      });
    return { leads, eventos: [] };
  }
  const db = await getDb();
  const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: acessos } = await db
    .from("acessos_visitante")
    .select("aluno_id, inicio, fim, convite:convites(codigo, origem), campanha:campanhas(nome), aluno:alunos(id, modalidade, created_at, profile:profiles(nome, email), perfil:perfil_visitante(objetivo, onboarding_concluido_em))")
    .order("inicio", { ascending: false })
    .limit(1000);
  const linhas = (acessos ?? []) as unknown as LinhaAcesso[];
  const ids = linhas.map((l) => l.aluno_id);
  if (!ids.length) return { leads: [], eventos: [] };
  const [{ data: status }, { data: sessoes }, { data: eventos }] = await Promise.all([
    db.from("leads_status").select("aluno_id, status, anotacao").in("aluno_id", ids),
    db.from("training_sessions").select("aluno_id, iniciado_em, status, series_concluidas").in("aluno_id", ids).gt("series_concluidas", 0).neq("status", "em_andamento").limit(10000),
    db.from("cta_eventos").select("aluno_id, cta, tipo, created_at").in("aluno_id", ids).gte("created_at", desde).order("created_at", { ascending: false }).limit(20000),
  ]);
  const st = new Map((status ?? []).map((x) => [x.aluno_id as string, x as { status: StatusLead; anotacao: string | null }]));
  const leads = linhas.map((l): Lead => {
    const feitas = (sessoes ?? []).filter((x) => x.aluno_id === l.aluno_id);
    const clique = (eventos ?? []).find((e) => e.aluno_id === l.aluno_id && e.tipo === "clicado");
    const ref = clique ? (CTAS[clique.cta as CtaId]?.ref ?? clique.cta) : null;
    return {
      id: l.aluno_id,
      nome: l.aluno?.profile?.nome ?? "Visitante",
      email: l.aluno?.profile?.email ?? null,
      cadastroEm: l.aluno?.created_at ?? l.inicio,
      convite: l.convite?.codigo ?? null,
      origem: l.convite?.origem ?? null,
      desafio: l.campanha?.nome ?? null,
      acessoFim: l.fim,
      onboarding: Boolean(l.aluno?.perfil?.onboarding_concluido_em),
      objetivo: l.aluno?.perfil?.objetivo ?? null,
      treinosFeitos: feitas.length,
      ultimoTreino: feitas.map((x) => x.iniciado_em as string).sort().at(-1) ?? null,
      whatsapp: clique && ref ? { ref, em: clique.created_at as string } : null,
      status: st.get(l.aluno_id)?.status ?? (l.aluno?.modalidade === "consultoria" ? "virou_aluno" : "novo"),
      anotacao: st.get(l.aluno_id)?.anotacao ?? null,
      convertido: l.aluno?.modalidade === "consultoria",
    };
  });
  return { leads, eventos: (eventos ?? []) as EventoCtaPainel[] };
}

export async function lerCrm(): Promise<{ config: CrmConfig | null; envios: EnvioCrm[] }> {
  if (isDemoMode()) return { config: { webhook_url: null, ativo: false, token: "demo-token-0000" }, envios: [] };
  const db = await getDb();
  const [{ data: config }, { data: envios }] = await Promise.all([
    db.from("crm_config").select("webhook_url, ativo, token").eq("id", 1).maybeSingle(),
    db.from("crm_fila").select("id, evento, criado_em, enviado_em, tentativas, codigo, ultimo_erro").order("criado_em", { ascending: false }).limit(20),
  ]);
  return { config: (config as CrmConfig | null) ?? null, envios: (envios ?? []) as EnvioCrm[] };
}
