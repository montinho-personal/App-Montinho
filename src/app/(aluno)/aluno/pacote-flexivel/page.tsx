// “Pacote Flexível · 10 aulas” (pedido do Montinho, 29/10/2026): a consultoria
// online completa + aulas presenciais para usar quando der, sem horário fixo. Sem preço (dá para
// parcelar; valores pelo WhatsApp). Textos em src/lib/montinho/apresentacao.ts.
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { BRAND } from "@/config/brand";
import { Logo } from "@/components/brand/Logo";
import { Voltar } from "@/components/ui/Voltar";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { CompartilharPagina } from "@/components/montinho/CompartilharPagina";
import { BarraFixaCta } from "@/components/montinho/BarraFixaCta";
import { PACOTE_FLEXIVEL as P } from "@/lib/montinho/apresentacao";

export const metadata = { title: "Pacote Flexível" };

export default async function PacoteFlexivelPage() {
  const sessao = await requireAlunoPage();
  const whatsapp = BRAND.contact.whatsapp;
  const visitante = ehVisitante(sessao);
  const botao = whatsapp ? <FalarComMontinho origem="pacote" whatsapp={whatsapp} visitante={visitante} /> : null;
  // Chamada no meio do texto: na hora que dá vontade, o botão está ali.
  const chamada = (c: { texto: string; botao: string }) =>
    whatsapp ? (
      <div className="space-y-2 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-center">
        <p className="font-bold">{c.texto}</p>
        <FalarComMontinho origem="pacote" whatsapp={whatsapp} visitante={visitante} texto={c.botao} />
      </div>
    ) : null;
  return (
    <div className="space-y-8 pb-24">
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
      <section className="space-y-3 rounded-3xl border border-accent/40 bg-[linear-gradient(160deg,#2a2415_0%,#111111_80%)] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Tudo junto</p>
        <h2 className="text-2xl font-extrabold leading-tight">{P.consultoria.titulo}</h2>
        <p className="text-sm leading-relaxed text-fg-muted">{P.consultoria.texto}</p>
        <ul className="space-y-2">
          {P.consultoria.itens.map((v) => <li key={v} className="flex gap-2 text-sm leading-relaxed"><span aria-hidden className="text-accent">✓</span>{v}</li>)}
        </ul>
        <p className="rounded-xl border border-accent/50 bg-bg/60 px-3 py-2 text-center text-sm font-bold">5 meses de consultoria online <span className="text-accent">+</span> 10 aulas presenciais</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold leading-tight">{P.aula.titulo}</h2>
        <p className="text-sm leading-relaxed text-fg-muted">{P.aula.texto}</p>
        <div className="grid gap-3">
          {P.aula.itens.map((a) => (
            <div key={a.titulo} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-bold"><span aria-hidden>{a.icone}</span> {a.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{a.texto}</p>
            </div>
          ))}
        </div>
        {chamada(P.chamadas.aula)}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold leading-tight">Feito para quem…</h2>
        {P.paraQuem.map((q) => (
          <div key={q.titulo} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-bold"><span aria-hidden>{q.icone}</span> {q.titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{q.texto}</p>
          </div>
        ))}
        {chamada(P.chamadas.paraQuem)}
      </section>
      <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
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
        {chamada(P.chamadas.jeitos)}
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
      {whatsapp ? <BarraFixaCta origem="pacote" whatsapp={whatsapp} visitante={visitante} texto={P.barra.texto} detalhe={P.barra.detalhe} botao={P.barra.botao} /> : null}
    </div>
  );
}
