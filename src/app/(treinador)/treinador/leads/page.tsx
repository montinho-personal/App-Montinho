export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/env";
import { requireTreinadorPage } from "@/lib/auth/session";
import { carregarLeads, lerCrm } from "@/lib/data/leads";
import { funil, resumoCtas } from "@/lib/visitante/leads";
import { CTAS, type CtaId } from "@/lib/visitante/ctas";
import { ROTULO_CTA_AVALIACAO } from "@/lib/visitante/avaliacao";
import { ROTULO_CTA_PAGINAS } from "@/lib/montinho/apresentacao";
import { FalarAgora, LeadsClient } from "./LeadsClient";
import { comQuemFalar } from "@/lib/visitante/leads-prioridade";
import { CrmClient } from "./CrmClient";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  if (!FEATURES.modoVisitante) notFound();
  await requireTreinadorPage();
  const [{ leads, eventos }, crm] = await Promise.all([carregarLeads(), lerCrm()]);
  const f = funil(leads);
  const ctas = resumoCtas(eventos);

  const contatos = comQuemFalar(leads);
  const fRotulo = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const entraram = f[0]?.total ?? 0;
  const maior = Math.max(1, entraram);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="mt-1 text-sm text-fg-muted">Visitantes que podem virar alunos. Comece por quem está em “Fale agora”: o app já diz o motivo e deixa a mensagem pronta.</p>
      </header>

      <section aria-label="Fale agora" className="space-y-2">
        <h2 className="text-lg font-bold">📞 Fale agora {contatos.length ? <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs text-bg">{contatos.length}</span> : null}</h2>
        <FalarAgora contatos={contatos} />
      </section>

      <section aria-label="Funil" className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-bold">📈 Até onde as pessoas chegam</h2>
        <p className="text-xs text-fg-muted">
          {entraram ? `De ${fRotulo(entraram, "pessoa que entrou", "pessoas que entraram")}, ${fRotulo(f[2]?.total ?? 0, "fez", "fizeram")} o 1º treino e ${fRotulo(f[f.length - 1]?.total ?? 0, "virou aluno", "viraram alunos")}.` : "Ainda ninguém entrou por convite."}
        </p>
        <ol className="space-y-2">
          {f.map((e) => (
            <li key={e.etapa}>
              <div className="flex items-baseline justify-between text-xs">
                <span>{e.etapa}</span>
                <span className="font-bold">{e.total}{e.pct !== null && e.etapa !== f[0].etapa ? <span className="ml-1 font-normal text-fg-muted">({e.pct}%)</span> : null}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-border/60">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((e.total / maior) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Todos os leads" className="space-y-2">
        <h2 className="text-lg font-bold">👥 Todos os leads</h2>
        <p className="text-xs text-fg-muted">Toque na pessoa para ver os dados, mudar a situação (Novo, Em conversa, Interessado…) e anotar.</p>
        <LeadsClient leads={leads} />
      </section>

      <details className="rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-bold">📊 Quais convites do app mais trazem conversa (90 dias)</summary>
        <p className="mt-2 text-xs text-fg-muted">A mensagem que chega no seu WhatsApp termina com o código, por exemplo [APP-CONSTANCIA]. Assim você sabe de onde veio a conversa.</p>
        {ctas.length ? (
          <ul className="mt-3 space-y-2">
            {ctas.map((c) => (
              <li key={c.cta} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate">{CTAS[c.cta as CtaId]?.titulo ?? ROTULO_CTA_AVALIACAO[c.cta] ?? ROTULO_CTA_PAGINAS[c.cta] ?? c.cta}</span>
                  <span className="shrink-0 text-xs text-fg-muted"><strong className="text-fg">{c.clicados}</strong> de {c.exibidos} tocaram{c.taxa === null ? "" : ` (${c.taxa}%)`}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-border/60"><div className="h-full rounded-full bg-success" style={{ width: `${c.taxa ?? 0}%` }} /></div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">Nenhum convite apareceu ainda.</p>
        )}
      </details>

      <details className="rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-bold">⚙️ Planilha e ligação com o CRM</summary>
        <div className="mt-3 space-y-4">
          {/* Download de arquivo (rota da API), não navegação entre páginas. */}
          <a href="/api/treinador/leads/exportar" download className="alvo inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm hover:border-accent/40">⬇️ Baixar planilha (Excel)</a>
          <CrmClient config={crm.config} envios={crm.envios} />
        </div>
      </details>
    </div>
  );
}
