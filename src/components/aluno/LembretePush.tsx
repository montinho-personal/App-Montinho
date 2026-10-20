"use client";

// Ativar o lembrete de treino em aberto (notificação push). Pede permissão só
// quando o aluno toca no botão. No iPhone, o navegador só permite notificações
// com o app adicionado à Tela de Início.

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MINUTOS_SEM_ATIVIDADE } from "@/lib/push/mensagem";

type Estado = "carregando" | "sem_suporte" | "iphone_instalar" | "nao_configurado" | "desligado" | "ligado" | "bloqueado" | "ativando";

function base64ParaBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function detectar(): Promise<Estado> {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return ios && !instalado ? "iphone_instalar" : "sem_suporte";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "nao_configurado";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "ligado" : "desligado";
}

export function LembretePush({ compacto = false }: { compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    detectar()
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado("sem_suporte"));
    return () => {
      vivo = false;
    };
  }, []);

  async function ativar() {
    setErro(null);
    setEstado("ativando");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") return setEstado(permissao === "denied" ? "bloqueado" : "desligado");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
      const res = await fetch("/api/push/inscricao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error();
      setEstado("ligado");
    } catch {
      setErro("Não foi possível ativar agora. Tente de novo.");
      setEstado("desligado");
    }
  }

  async function desativar() {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/inscricao", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null);
      await sub.unsubscribe().catch(() => null);
    }
    setEstado("desligado");
  }

  if (estado === "carregando" || estado === "sem_suporte" || estado === "nao_configurado") return null;
  if (compacto && estado === "ligado") return null; // na tela do treino, só aparece enquanto não estiver ativo

  const explicacao = `Se você começar um treino e ficar ${MINUTOS_SEM_ATIVIDADE} minutos sem registrar nada, o app avisa para você finalizar.`;

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${estado === "ligado" ? "border-success/40" : "border-accent/40 bg-accent/5"}`}>
      <div className="flex items-start gap-2">
        <Icon name="bell" className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1 space-y-1.5">
          {estado === "ligado" ? (
            <>
              <p className="font-semibold">Lembrete de treino em aberto: ativado neste aparelho</p>
              <p className="text-xs text-fg-muted">{explicacao}</p>
              <button type="button" onClick={desativar} className="text-xs text-fg-subtle underline-offset-2 hover:underline">
                Desativar
              </button>
            </>
          ) : estado === "iphone_instalar" ? (
            <>
              <p className="font-semibold">Quer um lembrete se esquecer de finalizar o treino?</p>
              <p className="text-xs text-fg-muted">
                No iPhone, primeiro adicione o app à Tela de Início: toque em <strong>Compartilhar</strong> (quadrado com seta) → <strong>Adicionar à Tela de Início</strong>. Depois abra o Montinho por esse ícone e ative aqui.
              </p>
            </>
          ) : estado === "bloqueado" ? (
            <>
              <p className="font-semibold">Notificações bloqueadas</p>
              <p className="text-xs text-fg-muted">Para receber o lembrete, libere as notificações do Montinho nas configurações do navegador ou do celular.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Quer um lembrete se esquecer de finalizar o treino?</p>
              {!compacto ? <p className="text-xs text-fg-muted">{explicacao}</p> : null}
              <button type="button" onClick={ativar} disabled={estado === "ativando"} className="touch rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-bg disabled:opacity-60">
                {estado === "ativando" ? "Ativando…" : "Ativar lembretes"}
              </button>
              {erro ? <p className="text-xs text-red">{erro}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
