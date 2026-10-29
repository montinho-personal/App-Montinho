// “Pacote Flexível · 10 aulas” (pedido do Montinho, 29/10/2026): aulas
// presenciais para usar quando der, sem horário fixo. Sem preço (dá para
// parcelar; valores pelo WhatsApp). Textos em src/lib/montinho/apresentacao.ts.
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { BRAND } from "@/config/brand";
import { Logo } from "@/components/brand/Logo";
import { Voltar } from "@/components/ui/Voltar";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { CompartilharPagina } from "@/components/montinho/CompartilharPagina";
import { PACOTE_FLEXIVEL as P } from "@/lib/montinho/apresentacao";

export const metadata = { title: "Pacote Flexível" };

export default async function PacoteFlexivelPage() {
  const sessao = await requireAlunoPage();
  const botao = BRAND.contact.whatsapp ? <FalarComMontinho origem="pacote" whatsapp={BRAND.contact.whatsapp} visitante={ehVisitante(sessao)} /> : null;
  return (
    <div className="space-y-8 pb-6">
      <div className="flex items-center justify-between gap-2">
        <Voltar href="/aluno/perfil" />
        <CompartilharPagina origem="pacote" />
      </div>
      <header className="space-y-4 pt-2 text-center">
        <Logo height={56} className="mx-auto" />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">{P.chamada}</p>
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight">{P.titulo}</h1>
      </header>
      <section className="space-y-3">
        <p className="text-[17px] leading-relaxed text-fg-muted">{P.intro}</p>
        {botao}
        <p className="text-center text-xs text-fg-subtle">Dá para parcelar. Os valores eu passo no WhatsApp.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold leading-tight">Feito para quem…</h2>
        {P.paraQuem.map((q) => (
          <div key={q.titulo} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-bold"><span aria-hidden>{q.icone}</span> {q.titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{q.texto}</p>
          </div>
        ))}
      </section>
      <section className="space-y-3 rounded-3xl border border-accent/40 bg-[linear-gradient(160deg,#2a2415_0%,#111111_80%)] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Do seu jeito</p>
        <h2 className="text-2xl font-extrabold leading-tight">Como usar as 10 aulas</h2>
        <ul className="space-y-3">
          {P.jeitos.map((j) => (
            <li key={j.titulo} className="flex gap-3">
              <span aria-hidden className="text-2xl">{j.icone}</span>
              <span>
                <span className="block font-bold">{j.titulo}</span>
                <span className="block text-sm leading-relaxed text-fg-muted">{j.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-3">
        <div className="rounded-2xl border border-success/40 bg-card p-4">
          <h2 className="font-extrabold">✅ O que você ganha</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {P.vantagens.map((v) => <li key={v} className="flex gap-2"><span aria-hidden className="text-success">✓</span>{v}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-extrabold">⚠️ Para ser sincero</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
            {P.atencao.map((v) => <li key={v} className="flex gap-2"><span aria-hidden>•</span>{v}</li>)}
          </ul>
        </div>
      </section>
      <section className="space-y-3">
        <p className="text-center text-lg font-bold leading-snug">{P.fecho}</p>
        {botao}
      </section>
    </div>
  );
}
