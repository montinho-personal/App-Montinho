"use client";
// Missão de Hoje (Fase 1, 29/10/2026): o cartão principal do Início. A regra
// (o que mostrar) é pura em src/lib/inicio/missao.ts; aqui só a tela e a medição
// agregada: “viu” 1× por dia no aparelho e “tocou” no botão (evento interno
// `missao_vista`/`missao_clicada` + GA4 sem dado pessoal, só a variante).
import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { enviarEvento } from "@/components/chalala/evento";
import { eventoGa } from "@/components/analytics/ga";
import type { Missao } from "@/lib/inicio/missao";

type Props = {
  missao: Missao;
  /** Destino do botão (o treino da prescrição). */
  href: string;
  letra?: string | null;
  detalhe?: string | null;
  protocolo?: string | null;
  /** “Prefere outro treino hoje? Ver todos” (quando há mais de um treino). */
  verTodos?: boolean;
  children?: React.ReactNode;
};

export function MissaoDeHoje({ missao: m, href, letra, detalhe, protocolo, verTodos, children }: Props) {
  useEffect(() => {
    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const chave = `montinho-missao-vista:${hoje}:${m.variante}`;
    try {
      if (localStorage.getItem(chave)) return;
      localStorage.setItem(chave, "1");
    } catch {}
    enviarEvento({ tipo: "missao_vista", modelo: m.variante, origem: "inicio" });
    eventoGa("missao_vista", { variante: m.variante });
  }, [m.variante]);

  const clicou = () => {
    enviarEvento({ tipo: "missao_clicada", modelo: m.variante, origem: "inicio" });
    eventoGa("missao_clicada", { variante: m.variante });
  };
  const calmo = m.cta === null;

  return (
    <section aria-label="Sua missão de hoje" className={`space-y-3 rounded-2xl border p-4 ${calmo ? "border-success/40 bg-success/5" : "border-accent/60 bg-grain-strong shadow-[0_0_24px_rgba(201,168,90,0.18)]"}`}>
      <p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${calmo ? "text-success" : "text-accent"}`}>
        {calmo ? null : <span aria-hidden className="h-2 w-2 rounded-full bg-accent motion-safe:animate-pulse" />}
        {m.rotulo}
      </p>
      {protocolo && !calmo ? <p className="text-xs text-fg-muted">Protocolo: <span className="font-semibold text-fg">{protocolo}</span></p> : null}

      <div className="flex items-center gap-4">
        {letra && !calmo && m.variante !== "primeiro" ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent" aria-hidden>
            <span className="text-2xl font-black text-bg">{letra}</span>
          </div>
        ) : (
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${calmo ? "bg-success/15" : "bg-accent/15"}`} aria-hidden>
            {m.variante === "primeiro" ? "🌱" : m.variante === "pausa" ? "🌙" : m.variante === "descanso" ? "✅" : "💪"}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold leading-tight">{m.titulo}</h2>
          {detalhe && !calmo ? <p className="mt-0.5 text-sm text-fg-muted">{detalhe}</p> : null}
        </div>
      </div>

      <p className="text-sm text-fg-muted">{m.porque}</p>

      {m.passos ? (
        <ol className="grid gap-1.5">
          {m.passos.map((p, i) => (
            <li key={p} className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-bg">{i + 1}</span>
              {p}
            </li>
          ))}
        </ol>
      ) : null}

      {m.cuidado ? <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">💛 {m.cuidado}</p> : null}

      {m.cta ? (
        <Link href={href} onClick={clicou} className="touch inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-base font-extrabold uppercase tracking-wide text-bg hover:bg-accent-hover motion-safe:transition-transform motion-safe:active:scale-[0.98]">
          <Icon name="play" /> {m.cta}
        </Link>
      ) : (
        <Link href="/aluno/treinar" onClick={clicou} className="touch inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-fg-muted hover:text-fg">
          Ver meus treinos
        </Link>
      )}

      {m.linha ? <p className="text-center text-xs text-fg-muted">{m.linha}</p> : null}

      {m.cta && verTodos ? (
        <Link href="/aluno/treinar" className="block py-1 text-center text-sm text-fg-muted hover:text-fg">
          Prefere outro treino hoje? Ver todos
        </Link>
      ) : null}
      {children}
    </section>
  );
}
