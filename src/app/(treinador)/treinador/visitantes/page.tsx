export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/env";
import { requireTreinadorPage } from "@/lib/auth/session";
import { listarConvites, listarVisitantes } from "@/lib/data/visitantes";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { dataBR, descreverPrazo, estadoDoAcesso, gerarCodigo } from "@/lib/visitante/acesso";
import { ConvitesClient } from "./ConvitesClient";
import { AcoesVisitante } from "./AcoesVisitante";

export const metadata = { title: "Visitantes" };

const OBJETIVO: Record<string, string> = { hipertrofia: "Massa muscular", emagrecimento: "Emagrecer", condicionamento: "Condicionamento", forca: "Força", saude: "Saúde", outro: "Outro" };

export default async function VisitantesPage() {
  if (!FEATURES.modoVisitante) notFound();
  await requireTreinadorPage();
  const [convites, visitantes] = await Promise.all([listarConvites(), listarVisitantes()]);
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

      <ConvitesClient
        sugestao={gerarCodigo("DESAFIO")}
        base={base}
        convites={convites.map((c) => ({ id: c.id, codigo: c.codigo, prazo: descreverPrazo(c), usos: c.usos, max_usos: c.max_usos, ativo: c.ativo, valido_ate: c.valido_ate ? dataBR(c.valido_ate) : null, origem: c.origem }))}
      />

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
