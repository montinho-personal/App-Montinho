"use client";

// “Minha História”: a linha do tempo como diário de expedição. Mesmos eventos
// reais de `linhaDoTempo` (medalhas, recordes, metas, retomadas, mensagens do
// personal, marcos). Cada mês é uma página; mensagens escritas pelo Montinho
// são diferenciadas das automáticas. Nada é inventado: data e origem vêm do
// evento.
import type { EventoJornada } from "@/lib/conquistas/jornada";
import { Personagem } from "./Personagens";

const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
const fmtMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long", year: "numeric" });
const ICONE: Record<EventoJornada["tipo"], string> = { medalha: "🏅", recorde: "📈", retomada: "↺", meta: "✓", reconhecimento: "✉", ciclo: "⚑", descoberta: "💡" };
const ORIGEM: Record<EventoJornada["tipo"], string> = { medalha: "medalha automática", recorde: "recorde registrado", retomada: "retomada registrada", meta: "meta da semana", reconhecimento: "mensagem do Montinho", ciclo: "marco de acompanhamento", descoberta: "descoberta" };

export function MinhaHistoria({ eventos, nome }: { eventos: EventoJornada[]; nome: string }) {
  const porMes = new Map<string, EventoJornada[]>();
  for (const e of eventos) {
    const bruto = fmtMes.format(new Date(e.data));
    const k = bruto.charAt(0).toUpperCase() + bruto.slice(1);
    porMes.set(k, [...(porMes.get(k) ?? []), e]);
  }
  if (!porMes.size) return <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">A história começa no primeiro treino registrado.</p>;
  return (
    <div className="space-y-4" aria-label="Minha História">
      <div className="flex items-end gap-2">
        <Personagem id="montinho" tamanho={64} />
        <div className="rounded-2xl rounded-bl-sm border border-accent/40 bg-[#171B21] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Diário de expedição</p>
          <p className="text-sm font-bold">A história de {nome}, página por página.</p>
          <p className="text-[11px] text-fg-muted">Só acontecimentos reais, com data. Mensagens do Montinho vêm marcadas.</p>
        </div>
      </div>
      {[...porMes.entries()].map(([mes, evs], i) => (
        <section key={mes} className="relative overflow-hidden rounded-3xl border border-border bg-[#1b1f26] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" aria-label={mes}>
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-accent/70 via-accent/30 to-transparent" aria-hidden />
          <div className="absolute right-3 top-3 rounded-full border border-border px-2 py-0.5 text-[10px] font-mono text-fg-subtle" aria-hidden>pág. {porMes.size - i}</div>
          <h3 className="pl-2 text-sm font-black">{mes}</h3>
          <ol className="mt-2 space-y-2 pl-2">
            {evs.map((e) => {
              const pessoal = e.autor === "personal";
              return (
                <li key={e.chave} className={`flex gap-3 rounded-2xl p-2.5 ${pessoal ? "border border-accent/50 bg-accent/10" : "bg-[#171B21]"}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base ${pessoal ? "bg-accent text-bg" : "border border-border text-fg-muted"}`} aria-hidden>{ICONE[e.tipo]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold leading-tight">
                      {e.titulo}
                      <span className="font-mono text-[10px] font-normal text-fg-subtle">{fmtDia.format(new Date(e.data))}</span>
                    </p>
                    {e.detalhe ? <p className={`mt-0.5 text-xs ${pessoal ? "italic text-fg" : "text-fg-muted"}`}>{pessoal ? `“${e.detalhe}”` : e.detalhe}</p> : null}
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-fg-subtle">{ORIGEM[e.tipo]}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
