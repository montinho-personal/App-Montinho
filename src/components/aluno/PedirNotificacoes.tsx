"use client";
// Pedido do Montinho (29/10/2026): enquanto as notificações não estiverem ativadas
// NESTE celular, um aviso aparece 1 vez por dia ao abrir o app, com o botão de
// ativar ali mesmo (o mesmo do Perfil, `LembretePush`). Não aparece no meio do
// treino/cardio/mobilidade nem quando o aparelho não aceita notificações.
// “Agora não” = só amanhã de novo. Ativou = nunca mais (neste aparelho).
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LembretePush, detectarPush, type EstadoPush } from "./LembretePush";

const CHAVE = "montinho-pedir-notificacoes";
const hojeBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const EM_ATIVIDADE = /^\/aluno\/(treino|livre|mobilidade|extra)\//;

export function PedirNotificacoes({ extra = null, ativo = true }: { extra?: string | null; ativo?: boolean }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!ativo || EM_ATIVIDADE.test(caminho ?? "")) return;
    let vivo = true;
    let t: number | undefined;
    try {
      if (localStorage.getItem(CHAVE) === hojeBR()) return;
    } catch {
      return;
    }
    detectarPush()
      .then((e: EstadoPush) => {
        if (!vivo || e === "ligado" || e === "sem_suporte" || e === "nao_configurado") return;
        t = window.setTimeout(() => {
          try {
            localStorage.setItem(CHAVE, hojeBR());
          } catch {}
          setAberto(true);
        }, 1500);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
      if (t) window.clearTimeout(t);
    };
  }, [ativo, caminho]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6" role="dialog" aria-modal="true" aria-labelledby="pedir-notif-titulo" onClick={() => setAberto(false)}>
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-accent/50 bg-bg p-4 shadow-2xl motion-safe:animate-[chalala-pop_400ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <p id="pedir-notif-titulo" className="text-lg font-extrabold">🔔 Ative as notificações do Montinho</p>
        <p className="text-sm text-fg-muted">Assim você recebe os lembretes dos troféus, do cardio e os avisos especiais — mesmo com o app fechado.</p>
        {extra ? <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold">{extra}</p> : null}
        <LembretePush completo onEstado={(e) => e === "ligado" && window.setTimeout(() => setAberto(false), 1200)} />
        <button type="button" onClick={() => setAberto(false)} className="w-full py-2 text-sm text-fg-muted">
          Agora não
        </button>
        <p className="text-center text-[11px] text-fg-subtle">Também dá para ativar depois em Perfil → Notificações.</p>
      </div>
    </div>
  );
}
