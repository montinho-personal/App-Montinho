export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/env";
import { requireTreinadorPage } from "@/lib/auth/session";
import { carregarLeads, lerCrm } from "@/lib/data/leads";
import { funil, resumoCtas } from "@/lib/visitante/leads";
import { CTAS, type CtaId } from "@/lib/visitante/ctas";
import { ROTULO_CTA_AVALIACAO } from "@/lib/visitante/avaliacao";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { LeadsClient } from "./LeadsClient";
import { CrmClient } from "./CrmClient";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  if (!FEATURES.modoVisitante) notFound();
  await requireTreinadorPage();
  const [{ leads, eventos }, crm] = await Promise.all([carregarLeads(), lerCrm()]);
  const f = funil(leads);
  const ctas = resumoCtas(eventos);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-fg-muted mt-1">Quem entrou por convite, até onde chegou e quem pediu para falar com você.</p>
        </div>
        {/* Download de arquivo (rota da API), não navegação entre páginas. */}
        <a href="/api/treinador/leads/exportar" download className="alvo inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm hover:border-accent/40">Baixar planilha (Excel)</a>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Funil</CardTitle>
        </CardHeader>
        <CardBody>
          <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {f.map((e, i) => (
              <li key={e.etapa} className="rounded-xl border border-border p-3">
                <p className="text-2xl font-bold">{e.total}</p>
                <p className="text-xs text-fg-muted">{e.etapa}</p>
                {i > 0 && e.pct !== null ? <p className="mt-1 text-xs font-semibold text-accent">{e.pct}%</p> : null}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Convites para o WhatsApp (últimos 90 dias)</CardTitle>
          <p className="text-sm text-fg-muted mt-1">A mensagem que chega no seu WhatsApp termina com o código, por exemplo [APP-CONSTANCIA]. Assim você sabe de onde veio a conversa.</p>
        </CardHeader>
        <CardBody>
          {ctas.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-fg-muted">
                  <th className="py-1 text-left font-normal">Convite</th>
                  <th className="py-1 text-right font-normal">Apareceu</th>
                  <th className="py-1 text-right font-normal">Tocaram</th>
                  <th className="py-1 text-right font-normal">Dispensaram</th>
                  <th className="py-1 text-right font-normal">% que tocou</th>
                </tr>
              </thead>
              <tbody>
                {ctas.map((c) => (
                  <tr key={c.cta} className="border-t border-border">
                    <td className="py-2">
                      {CTAS[c.cta as CtaId]?.titulo ?? ROTULO_CTA_AVALIACAO[c.cta] ?? c.cta} <span className="text-xs text-fg-subtle">{CTAS[c.cta as CtaId]?.ref}</span>
                    </td>
                    <td className="py-2 text-right">{c.exibidos}</td>
                    <td className="py-2 text-right font-semibold">{c.clicados}</td>
                    <td className="py-2 text-right text-fg-muted">{c.dispensados}</td>
                    <td className="py-2 text-right text-fg-muted">{c.taxa === null ? "—" : `${c.taxa}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-fg-muted">Nenhum convite apareceu ainda.</p>
          )}
        </CardBody>
      </Card>

      <LeadsClient leads={leads} />
      <CrmClient config={crm.config} envios={crm.envios} />
    </div>
  );
}
