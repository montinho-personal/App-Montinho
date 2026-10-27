export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { ofertaDoConvite } from "@/lib/visitante/mensagem-convite";
import { notFound } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireTreinadorPage } from "@/lib/auth/session";
import { listarConvites, listarDesafios, listarVisitantes } from "@/lib/data/visitantes";
import { DesafiosClient } from "./DesafiosClient";
import { dataLocal } from "@/lib/aderencia/calcular";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { dataBR, descreverPrazo, estadoDoAcesso, gerarCodigo } from "@/lib/visitante/acesso";
import { ConvitesClient } from "./ConvitesClient";
import { AcoesVisitante } from "./AcoesVisitante";
import { BoasVindasWhatsapp } from "./BoasVindasWhatsapp";
import { mensagemBoasVindas } from "@/lib/visitante/boas-vindas-whatsapp";
import { indicacoesPorVisitante } from "@/lib/data/campanhas";
import { treinosParaMontar } from "@/lib/data/treinos-enviados";
import { TreinosParaMontar } from "./TreinosParaMontar";
import { usoDosTreinosProntos } from "@/lib/data/uso-prontos";
import { UsoTreinosProntos } from "./UsoTreinosProntos";
import { descontosAAplicar } from "@/lib/data/indicacao";
import { DescontosIndicacao } from "./DescontosIndicacao";

export const metadata = { title: "Visitantes" };

const OBJETIVO: Record<string, string> = { hipertrofia: "Massa muscular", emagrecimento: "Emagrecer", condicionamento: "Condicionamento", forca: "Força", saude: "Saúde", outro: "Outro" };

export default async function VisitantesPage() {
  if (!FEATURES.modoVisitante) notFound();
  await requireTreinadorPage();
  const [convites, visitantes, desafios, indicacoes, paraMontar, usoProntos] = await Promise.all([listarConvites(), listarVisitantes(), listarDesafios(), indicacoesPorVisitante().catch(() => new Map()), treinosParaMontar().catch(() => []), usoDosTreinosProntos().catch(() => [])]);
  const descontos = await descontosAAplicar().catch(() => []);
  const nomeVisitante = new Map(visitantes.map((v) => [v.id, (v.profile?.nome ?? "").split(" ")[0]]));
  const nomeDesafio = new Map(desafios.map((d) => [d.id, d.nome]));
  const curta = (d: string | null) => (d ? d.split("-").reverse().join("/") : null);
  const hoje = dataLocal(new Date());
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "app-montinho.vercel.app";
  const base = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const ativos = visitantes.filter((v) => estadoDoAcesso(v.acesso?.fim ?? null).estado !== "vencido").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Visitantes</h1>
        <p className="text-sm text-fg-muted mt-1">
          Pessoas que entraram por código de convite. {visitantes.length} no total · {ativos} com acesso em dia.
        </p>
      </header>

      <Card id="treinos-para-montar" className={paraMontar.length ? "border-accent/50" : undefined}>
        <CardHeader>
          <CardTitle className="text-base">📨 Treinos para montar {paraMontar.length ? <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs text-bg">{paraMontar.length}</span> : null}</CardTitle>
        </CardHeader>
        <CardBody>
          <TreinosParaMontar itens={paraMontar} />
        </CardBody>
      </Card>

      <Card id="descontos-indicacao" className={descontos.length ? "border-success/50" : undefined}>
        <CardHeader>
          <CardTitle className="text-base">🎁 Descontos de indicação a aplicar {descontos.length ? <span className="ml-1 rounded-full bg-success px-2 py-0.5 text-xs text-bg">{descontos.length}</span> : null}</CardTitle>
        </CardHeader>
        <CardBody>
          <DescontosIndicacao itens={descontos} />
          <p className="mt-2 text-[11px] text-fg-subtle">Cada amigo indicado que fecha vale 10% para quem indicou (aluno ou visitante), somando até 30% no mesmo plano, sem prazo. Ao marcar “usado”, saem os mais antigos; o que passou de 30% fica para a próxima.</p>
        </CardBody>
      </Card>

      <ConvitesClient
        sugestao={gerarCodigo("DESAFIO")}
        base={base}
        desafios={desafios.filter((d) => d.ativa && d.meta_treinos).map((d) => ({ id: d.id, nome: d.nome }))}
        convites={convites.map((c) => ({ id: c.id, codigo: c.codigo, prazo: descreverPrazo(c), oferta: ofertaDoConvite(c), usos: c.usos, max_usos: c.max_usos, ativo: c.ativo, valido_ate: c.valido_ate ? dataBR(c.valido_ate) : null, origem: c.origem, desafio: c.campanha_id ? (nomeDesafio.get(c.campanha_id) ?? null) : null }))}
      />

      <DesafiosClient
        hoje={hoje}
        desafios={desafios.map((d) => ({ id: d.id, nome: d.nome, periodo: d.inicio && d.fim ? `${curta(d.inicio)} a ${curta(d.fim)}` : "Sem período", meta: d.meta_treinos, participantes: d.participantes, concluidos: d.concluidos }))}
      />

      <UsoTreinosProntos uso={usoProntos} demo={isDemoMode()} />

      <Card>
        <CardHeader>
          <CardTitle>Quem entrou</CardTitle>
        </CardHeader>
        <CardBody>
          {visitantes.length === 0 ? (
            <p className="text-sm text-fg-muted">Ninguém entrou ainda. Crie um convite acima e mande o link.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visitantes.map((v) => {
                const e = estadoDoAcesso(v.acesso?.fim ?? null);
                const prazo = e.estado === "permanente" ? "Sem prazo" : e.estado === "vencido" ? `Terminou em ${dataBR(e.fim)}` : `Até ${dataBR(e.fim)} (${e.diasRestantes} ${e.diasRestantes === 1 ? "dia" : "dias"})`;
                return (
                  <li key={v.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{v.profile?.nome ?? "Sem nome"}</p>
                      <p className="text-xs text-fg-muted">
                        {v.convite_codigo ? `Convite ${v.convite_codigo} · ` : ""}
                        {prazo}
                        {v.perfil?.objetivo ? ` · ${OBJETIVO[v.perfil.objetivo] ?? v.perfil.objetivo}` : ""}
                        {v.perfil?.frequencia_semanal ? ` · ${v.perfil.frequencia_semanal}×/semana` : ""}
                        {v.perfil?.onboarding_concluido_em ? "" : " · questionário pendente"}
                        {v.perfil?.interesse_desafios ? " · quer ser avisado de desafios" : ""}
                      </p>
                      {indicacoes.get(v.id)?.amigos || indicacoes.get(v.id)?.convidadoPor ? (
                        <p className="text-xs font-semibold text-accent">
                          {indicacoes.get(v.id)?.amigos ? `🤝 Convidou ${indicacoes.get(v.id)!.amigos} ${indicacoes.get(v.id)!.amigos === 1 ? "amigo" : "amigos"} · ganhou +${indicacoes.get(v.id)!.diasGanhos} dias` : ""}
                          {indicacoes.get(v.id)?.amigos && indicacoes.get(v.id)?.convidadoPor ? " · " : ""}
                          {indicacoes.get(v.id)?.convidadoPor ? `Entrou pelo convite de ${nomeVisitante.get(indicacoes.get(v.id)!.convidadoPor!) || "outro visitante"}` : ""}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <BoasVindasWhatsapp
                          id={v.id}
                          telefone={v.telefone ?? null}
                          mensagem={mensagemBoasVindas({
                            nome: v.profile?.nome ?? null,
                            objetivo: v.perfil?.objetivo ?? null,
                            frequenciaSemanal: v.perfil?.frequencia_semanal ?? null,
                            acessoAte: e.estado === "permanente" || e.estado === "vencido" ? null : dataBR(e.fim),
                            appUrl: base,
                          })}
                        />
                      </div>
                    </div>
                    <AcoesVisitante id={v.id} vencido={e.estado === "vencido"} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
