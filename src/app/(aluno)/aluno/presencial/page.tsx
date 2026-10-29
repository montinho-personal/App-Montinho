// “Personal presencial” — como é treinar com o Montinho do lado (textos em
// src/lib/montinho/apresentacao.ts, do site). Sem preço: valores pelo WhatsApp.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { BRAND } from "@/config/brand";
import { Logo } from "@/components/brand/Logo";
import { Voltar } from "@/components/ui/Voltar";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { CompartilharPagina } from "@/components/montinho/CompartilharPagina";
import { PRESENCIAL } from "@/lib/montinho/apresentacao";

export const metadata = { title: "Personal presencial" };

export default async function PresencialPage() {
  const sessao = await requireAlunoPage();
  const botao = BRAND.contact.whatsapp ? <FalarComMontinho origem="presencial" whatsapp={BRAND.contact.whatsapp} visitante={ehVisitante(sessao)} /> : null;
  return (
    <div className="space-y-8 pb-6">
      <div className="flex items-center justify-between gap-2">
        <Voltar href="/aluno/perfil" />
        <CompartilharPagina origem="presencial" />
      </div>
      <header className="space-y-4 pt-2 text-center">
        <Logo height={56} className="mx-auto" />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">{PRESENCIAL.chamada}</p>
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight">{PRESENCIAL.titulo}</h1>
      </header>
      <section className="space-y-3">
        <p className="text-[17px] leading-relaxed text-fg-muted">{PRESENCIAL.intro}</p>
        {botao}
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold leading-tight">Como funciona</h2>
        <ol className="space-y-2">
          {PRESENCIAL.passos.map((p, i) => (
            <li key={p.titulo} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-bg">{i + 1}</span>
              <span>
                <span className="block font-bold">{p.titulo}</span>
                <span className="mt-1 block text-sm leading-relaxed text-fg-muted">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="rounded-2xl border border-accent/40 bg-grain-strong p-4 text-sm leading-relaxed">📱 {PRESENCIAL.app}</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold leading-tight">Dois formatos</h2>
        {PRESENCIAL.formatos.map((f) => {
          const corpo = (
            <>
              <p className="font-bold">{f.nome}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{f.texto}</p>
              {"href" in f ? <p className="mt-2 text-sm font-bold text-accent">Conhecer o Pacote Flexível →</p> : null}
            </>
          );
          return "href" in f && f.href ? (
            <Link key={f.nome} href={f.href} className="block rounded-2xl border border-accent/60 bg-card p-4">{corpo}</Link>
          ) : (
            <div key={f.nome} className="rounded-2xl border border-border bg-card p-4">{corpo}</div>
          );
        })}
      </section>
      <section className="space-y-3">
        {botao}
        <p className="text-center text-xs text-fg-subtle">A primeira conversa é gratuita e sem compromisso.</p>
      </section>
    </div>
  );
}
