"use client";

// Ativar as notificações neste aparelho (Web Push). Pede permissão só quando a
// pessoa toca no botão. No iPhone, o navegador só permite notificações com o app
// adicionado à Tela de Início. `completo`: versão do Perfil/painel (Chalalá +
// lembrete); `compacto`: aviso curto na tela do treino.

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MINUTOS_SEM_ATIVIDADE } from "@/lib/push/mensagem";
import { enviarEvento } from "@/components/chalala/evento";

export type EstadoPush = "carregando" | "sem_suporte" | "iphone_instalar" | "nao_configurado" | "desligado" | "ligado" | "bloqueado" | "ativando";

function base64ParaBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function detectar(): Promise<EstadoPush> {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return ios && !instalado ? "iphone_instalar" : "sem_suporte";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "nao_configurado";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "ligado" : "desligado";
}

export function LembretePush({ compacto = false, completo = false, treinador = false, onEstado }: { compacto?: boolean; completo?: boolean; treinador?: boolean; onEstado?: (e: EstadoPush) => void }) {
  const [estado, setEstadoInterno] = useState<EstadoPush>("carregando");
  const setEstado = (e: EstadoPush) => {
    setEstadoInterno(e);
    onEstado?.(e);
  };
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    detectar()
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado("sem_suporte"));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!treinador) enviarEvento({ tipo: "chalala_push_permission_granted", origem: compacto ? "treino" : "personal" });
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
    if (!treinador) enviarEvento({ tipo: "chalala_push_permission_revoked" });
  }

  if (estado === "carregando") return null;
  if (estado === "sem_suporte" || estado === "nao_configurado") {
    if (!completo) return null;
    return (
      <p className="rounded-lg border border-border px-3 py-2.5 text-xs text-fg-muted">
        {estado === "sem_suporte" ? "Este navegador não recebe notificações. No Android, use o Chrome; no iPhone, o Safari com o app na Tela de Início (iOS 16.4 ou mais novo)." : "As notificações ainda não foram configuradas no servidor."}
      </p>
    );
  }
  if (compacto && estado === "ligado") return null; // na tela do treino, só aparece enquanto não estiver ativo

  const explicacao = treinador
    ? "Ative para testar no seu celular como as notificações chegam para os alunos."
    : completo
      ? `Para receber o Chalalá no celular (mesmo com o app fechado) e o aviso de treino esquecido aberto há ${MINUTOS_SEM_ATIVIDADE} min.`
      : `Se você começar um treino e ficar ${MINUTOS_SEM_ATIVIDADE} minutos sem registrar nada, o app avisa para você finalizar.`;
  const chamada = completo ? "Notificações no celular" : "Quer um lembrete se esquecer de finalizar o treino?";

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${estado === "ligado" ? "border-success/40" : "border-accent/40 bg-accent/5"}`}>
      <div className="flex items-start gap-2">
        <Icon name="bell" className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1 space-y-1.5">
          {estado === "ligado" ? (
            <>
              <p className="font-semibold">{completo ? "Notificações ativadas neste aparelho" : "Lembrete de treino em aberto: ativado neste aparelho"}</p>
              <p className="text-xs text-fg-muted">{explicacao}</p>
              <button type="button" onClick={desativar} className="alvo text-xs text-fg-subtle underline-offset-2 hover:underline">
                Desativar
              </button>
            </>
          ) : estado === "iphone_instalar" ? (
            <>
              <p className="font-semibold">{chamada}</p>
              <p className="text-xs text-fg-muted">
                No iPhone, primeiro adicione o app à Tela de Início: toque em <strong>Compartilhar</strong> (quadrado com seta) → <strong>Adicionar à Tela de Início</strong>. Depois abra o Montinho por esse ícone e ative aqui.
              </p>
            </>
          ) : estado === "bloqueado" ? (
            <>
              <p className="font-semibold">Notificações bloqueadas</p>
              <p className="text-xs text-fg-muted">Para receber, libere as notificações do Montinho nas configurações do navegador ou do celular (Configurações → Notificações → Montinho/Chrome) e volte aqui.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">{chamada}</p>
              {!compacto ? <p className="text-xs text-fg-muted">{explicacao}</p> : null}
              <button type="button" onClick={ativar} disabled={estado === "ativando"} className="touch rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-bg disabled:opacity-60">
                {estado === "ativando" ? "Ativando…" : completo ? "Ativar neste celular" : "Ativar lembretes"}
              </button>
              {erro ? <p className="text-xs text-red">{erro}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
