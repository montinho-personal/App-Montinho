"use client";

// Depois dos 30 dias do visitante (pedido do Montinho, 24/10/2026): o treino
// trava e, ao tocar em “Começar”, abre o convite para o WhatsApp com a oferta.
// O mesmo convite aparece sozinho 1 vez a cada vez que o app é aberto.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { registrarCliqueGa } from "@/components/analytics/ga";
import { prazoRestante } from "@/lib/visitante/campanhas";

export type TravaVisitante = {
  ctaId: string;
  ref: string;
  titulo: string;
  texto: string;
  botao: string;
  href: string;
  expiraEm: string | null;
  /** Até quando o app fica aberto só para ver (dd/mm/aaaa). */
  abertoAte: string | null;
};

const Ctx = createContext<{ travado: boolean; abrir: () => void }>({ travado: false, abrir: () => undefined });

/** Nos botões de começar treino: se travado, abre o convite em vez de começar. */
export function useTravaVisitante() {
  return useContext(Ctx);
}

const enviar = (cta: string, tipo: "exibido" | "clicado", tela: string) =>
  fetch("/api/visitante/cta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cta, tipo, tela }), keepalive: true }).catch(() => undefined);

export function TravaVisitanteProvider({ trava, children }: { trava: TravaVisitante | null; children: React.ReactNode }) {
  const [tela, setTela] = useState<"comecar" | "popup" | null>(null);
  const jaAbriu = useRef(false);
  // Abre sozinho 1 vez por visita ao app (sessão do navegador).
  useEffect(() => {
    if (!trava || jaAbriu.current) return;
    jaAbriu.current = true;
    let visto = false;
    try {
      visto = sessionStorage.getItem("montinho:oferta-fim") === "1";
      sessionStorage.setItem("montinho:oferta-fim", "1");
    } catch {}
    if (!visto) {
      const t = window.setTimeout(() => setTela("popup"), 600);
      return () => window.clearTimeout(t);
    }
  }, [trava]);
  useEffect(() => {
    if (trava && tela) void enviar(trava.ctaId, "exibido", tela);
  }, [trava, tela]);
  return (
    <Ctx.Provider value={{ travado: !!trava, abrir: () => setTela("comecar") }}>
      {children}
      {trava && tela ? <ModalTrava trava={trava} tela={tela} onFechar={() => setTela(null)} /> : null}
    </Ctx.Provider>
  );
}

function ModalTrava({ trava, tela, onFechar }: { trava: TravaVisitante; tela: "comecar" | "popup"; onFechar: () => void }) {
  const [agora] = useState(() => new Date());
  const desconto = trava.ctaId === "oferta_desconto";
  return (
    <div role="dialog" aria-modal="true" aria-label="Seus 30 dias terminaram" className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_70%)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{tela === "comecar" ? "Treino travado" : "Seus 30 dias terminaram"}</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="alvo -mr-1 -mt-1 text-fg-muted hover:text-fg">✕</button>
        </div>
        {tela === "comecar" ? <p className="mt-1 text-sm text-fg-muted">Seus 30 dias de treino no app terminaram. Para voltar a treinar, fale com o Montinho:</p> : null}
        <h2 className={`mt-2 font-black leading-tight ${desconto ? "text-2xl" : "text-xl"}`}>{trava.titulo}</h2>
        <p className="mt-2 text-sm text-fg-muted">{trava.texto}</p>
        {trava.expiraEm ? <p className="mt-3 text-sm font-bold text-accent">⏳ {prazoRestante(trava.expiraEm, agora)}</p> : null}
        <a
          href={trava.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void enviar(trava.ctaId, "clicado", tela);
            registrarCliqueGa(trava.ref, tela);
          }}
          className="alvo mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg"
        >
          💬 {trava.botao}
        </a>
        {trava.abertoAte ? <p className="mt-3 text-center text-xs text-fg-subtle">O app continua aberto até {trava.abertoAte} para você ver sua evolução, o ranking e as suas conquistas.</p> : null}
        <button type="button" onClick={onFechar} className="alvo mt-2 w-full text-center text-xs text-fg-muted underline-offset-2 hover:underline">
          Agora não
        </button>
      </div>
    </div>
  );
}

/** O mesmo convite como cartão fixo (faixa do topo de cada tela e tela de app fechado). */
export function ConviteFimCard({ trava, tela, titulo }: { trava: TravaVisitante; tela: "aviso" | "encerrado"; titulo: string }) {
  const registrado = useRef(false);
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    if (!registrado.current) {
      registrado.current = true;
      void enviar(trava.ctaId, "exibido", tela);
    }
    const t = window.setTimeout(() => setAgora(new Date()), 0);
    return () => window.clearTimeout(t);
  }, [trava.ctaId, tela]);
  return (
    <section aria-label="Oferta" className="rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_75%)] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{titulo}</p>
      <h2 className="mt-1 text-lg font-black leading-tight">{trava.titulo}</h2>
      <p className="mt-1 text-sm text-fg-muted">{trava.texto}</p>
      {trava.expiraEm && agora ? <p className="mt-2 text-sm font-bold text-accent">⏳ {prazoRestante(trava.expiraEm, agora)}</p> : null}
      <a
        href={trava.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void enviar(trava.ctaId, "clicado", tela);
          registrarCliqueGa(trava.ref, tela);
        }}
        className="alvo mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg"
      >
        💬 {trava.botao}
      </a>
      {tela === "aviso" && trava.abertoAte ? <p className="mt-2 text-center text-xs text-fg-subtle">Treinos travados · o app fica aberto só para ver até {trava.abertoAte}.</p> : null}
    </section>
  );
}
