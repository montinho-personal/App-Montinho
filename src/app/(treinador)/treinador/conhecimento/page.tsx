// Montinho Desbloqueia — painel editorial do personal: conteúdos, status,
// versões, recomendação a alunos e números de uso (agregados).
import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";
import { listarConteudos, progressoDeTodos } from "@/lib/data/desbloqueia";
import { listarEventos } from "@/lib/data/conquistas";
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { analyticsDesbloqueia } from "@/lib/desbloqueia/analytics";
import { problemasEditoriais } from "@/lib/desbloqueia/motor";
import { FONTES } from "@/lib/desbloqueia/fontes";
import { CATALOGO } from "@/lib/conquistas/regras";
import { nomeDaConquista } from "@/lib/conquistas/conteudo";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { ConhecimentoClient } from "./ConhecimentoClient";

export const metadata = { title: "Montinho Desbloqueia" };
export const dynamic = "force-dynamic";

const TIPOS_DESB = new Set(["conhecimento_aberto", "quiz_respondido", "sugestao_vista", "sugestao_aberta", "descoberta_salva", "descoberta_compartilhada"]);

export default async function ConhecimentoPage() {
  await requireTreinadorPage();
  const desde = `${somarDias(dataLocal(new Date()), -90)}T00:00:00Z`;
  const [conteudos, progresso, eventos, alunos] = await Promise.all([listarConteudos(), progressoDeTodos(), listarEventos(desde), listAlunos()]);
  const ativos = alunos.filter((a) => a.status === "ativo");
  const ader = ativos.length ? await aderenciaDeTodos(ativos) : {};
  const analytics = analyticsDesbloqueia({
    conteudos,
    progresso,
    eventos: eventos.filter((e) => TIPOS_DESB.has(e.tipo)),
    alunosAtivos: ativos.map((a) => a.id),
    aderencia28: Object.fromEntries(ativos.map((a) => [a.id, ader[a.id]?.indices.d28.pct ?? null])),
  });
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Montinho Desbloqueia</p>
        <h1 className="text-2xl font-bold">Mitos, verdades e ciência</h1>
        <p className="mt-1 text-sm text-fg-muted">Edite, revise e publique as descobertas dos alunos. Cada gravação vira uma nova versão (o histórico fica). Orientações de segurança marcadas como essenciais nunca ficam bloqueadas para o aluno.</p>
      </header>
      <ConhecimentoClient
        conteudos={conteudos}
        problemas={Object.fromEntries(conteudos.map((c) => [c.id, problemasEditoriais(c, Object.keys(FONTES))]))}
        fontes={Object.values(FONTES).map((f) => ({ id: f.id, citacao: f.citacao }))}
        medalhas={(Object.keys(CATALOGO) as Array<keyof typeof CATALOGO>).map((k) => ({ id: k, nome: nomeDaConquista(k) }))}
        alunos={ativos.map((a) => ({ id: a.id, nome: a.profile?.nome ?? "Aluno" }))}
        analytics={analytics}
      />
    </div>
  );
}
