"use client";

// Cartão de oferta dos planos (pedido do Montinho, 30/10/2026): Consultoria e
// Pacote Flexível, só com botão para o WhatsApp. Aparece no Início e no fim do
// treino, respeitando o limite (visitante 1×/dia, aluno 1×/semana), as pausas
// e nunca com dor recente. Regras em src/lib/ofertas/regras.ts; o que lembrar
// fica no aparelho (localStorage).
import Link from "next/link";
import { useEffect, useState } from "react";
import { eventoGa } from "@/components/analytics/ga";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { escolherOferta, textoDaOferta, type HistoricoOferta, type Oferta } from "@/lib/ofertas/regras";
import type { ContextoOferta } from "@/lib/data/ofertas";

const CHAVE = "montinho-ofertas";
const ler = (): HistoricoOferta => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as HistoricoOferta;
  } catch {
    return {};
  }
};
const gravar = (h: HistoricoOferta) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(h));
  } catch {}
};
const diaDoAno = () => Math.floor(Date.now() / 86_400_000);

export function OfertaPlano({ tela, whatsapp, semDor = true }: { tela: "inicio" | "fim_treino"; whatsapp: string; /** false = a tela já sabe que há dor/desconforto hoje. */ semDor?: boolean }) {
  const [estado, setEstado] = useState<{ ctx: ContextoOferta; oferta: Oferta } | null>(null);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    if (!semDor) return;
    let vivo = true;
    void fetch("/api/ofertas", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { contexto: ContextoOferta | null } | null) => {
        const ctx = j?.contexto;
        if (!vivo || !ctx) return;
        const historico = ler();
        const oferta = escolherOferta({ ofertas: ctx.ofertas, publico: ctx.publico, agora: Date.now(), historico, dor: ctx.dor, diaDoAno: diaDoAno(), preferida: ctx.motivo?.oferta ?? null });
        if (!oferta) return;
        gravar({ ...historico, ultimaVista: Date.now() });
        setEstado({ ctx, oferta });
        eventoGa("oferta_plano", { oferta: oferta.id, tela, acao: "vista", motivo: ctx.motivo?.oferta === oferta.id ? ctx.motivo.chave : "padrao" });
        if (ctx.publico === "visitante") void fetch("/api/visitante/cta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cta: oferta.id, tipo: "exibido", tela }), keepalive: true }).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [tela, semDor]);

  if (!estado || fechado) return null;
  const { ctx, oferta } = estado;
  const padrao = textoDaOferta(oferta, { publico: ctx.publico, nome: ctx.nome, treinos: ctx.treinos });
  // Com um motivo do momento (carga parada, renovação, pouco tempo, dias do visitante), o texto fala disso.
  const t = ctx.motivo?.oferta === oferta.id ? { ...padrao, titulo: ctx.motivo.titulo, texto: ctx.motivo.texto } : padrao;
  const visitante = ctx.publico === "visitante";

  function marcar(campo: "dispensada" | "clicada") {
    const h = ler();
    gravar({ ...h, [campo]: { ...(h[campo] ?? {}), [oferta.id]: Date.now() } });
  }
  function agoraNao() {
    marcar("dispensada");
    setFechado(true);
    eventoGa("oferta_plano", { oferta: oferta.id, tela, acao: "dispensada" });
    if (visitante) void fetch("/api/visitante/cta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cta: oferta.id, tipo: "dispensado", tela }), keepalive: true }).catch(() => undefined);
  }

  return (
    <section aria-label="Oferta do Montinho" className="relative space-y-3 overflow-hidden rounded-2xl border border-accent/50 bg-[linear-gradient(160deg,#2a2415_0%,#111111_85%)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{oferta.id === "pacote" ? "Pacote Flexível · 10 aulas" : "Consultoria online"}</p>
      <h2 className="text-lg font-extrabold leading-snug">{t.titulo}</h2>
      <p className="text-sm leading-relaxed text-fg-muted">{t.texto}</p>
      {oferta.promo ? <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm font-bold text-success">🎁 {oferta.promo}</p> : null}
      <FalarComMontinho origem={oferta.id} whatsapp={whatsapp} visitante={visitante} texto={t.botao} onClick={() => { marcar("clicada"); eventoGa("oferta_plano", { oferta: oferta.id, tela, acao: "clicada" }); }} />
      <div className="flex items-center justify-between gap-2 text-sm">
        <Link href="/aluno/planos" className="alvo font-semibold text-accent underline-offset-2 hover:underline">Ver todos os planos →</Link>
        <button type="button" onClick={agoraNao} className="alvo text-fg-muted hover:text-fg">Agora não</button>
      </div>
    </section>
  );
}
