"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { caminhoAnonimo } from "@/lib/analytics/caminho";

// Google Analytics 4 com aviso de cookies (LGPD): nada carrega antes do
// “Aceitar”. Consentimento padrão negado; sem anúncios; sem ids de pessoas.
const CHAVE = "montinho-cookies";
type Escolha = "aceito" | "recusado" | null;

function lerEscolha(): Escolha {
  try {
    const v = window.localStorage.getItem(CHAVE);
    return v === "aceito" || v === "recusado" ? v : null;
  } catch {
    return null;
  }
}
function ouvir(cb: () => void) {
  window.addEventListener("montinho-cookies", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("montinho-cookies", cb);
    window.removeEventListener("storage", cb);
  };
}
function escolher(v: "aceito" | "recusado") {
  try {
    window.localStorage.setItem(CHAVE, v);
  } catch {
    /* sem storage: vale só nesta visita */
  }
  window.dispatchEvent(new Event("montinho-cookies"));
}

type Win = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; __montinhoGa?: boolean };

function carregarGa(id: string) {
  const w = window as Win;
  if (w.__montinhoGa) return;
  w.__montinhoGa = true;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  w.gtag("consent", "update", { analytics_storage: "granted" });
  w.gtag("js", new Date());
  w.gtag("config", id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export function ConsentimentoAnalytics({ id }: { id: string }) {
  const escolha = useSyncExternalStore(ouvir, lerEscolha, () => "recusado" as Escolha);
  const pathname = usePathname();

  useEffect(() => {
    if (escolha !== "aceito") return;
    carregarGa(id);
    const caminho = caminhoAnonimo(pathname || "/");
    (window as Win).gtag?.("event", "page_view", { page_path: caminho, page_location: `${window.location.origin}${caminho}`, page_title: document.title });
  }, [escolha, id, pathname]);

  if (escolha !== null) return null;
  return (
    <div role="dialog" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-[60] p-3 md:p-4">
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-4 shadow-2xl">
        <p className="text-sm text-fg">
          Usamos o Google Analytics para entender como o app é usado e melhorar a experiência. Ele só é ativado se você aceitar, e nunca recebe seu nome, e-mail ou dados de saúde.{" "}
          <Link href="/privacidade" className="alvo text-accent underline-offset-2 hover:underline">Saiba mais</Link>
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => escolher("aceito")} className="alvo min-h-11 flex-1 rounded-lg bg-accent px-4 text-sm font-semibold text-bg">Aceitar</button>
          <button type="button" onClick={() => escolher("recusado")} className="alvo min-h-11 flex-1 rounded-lg border border-border px-4 text-sm text-fg-muted">Agora não</button>
        </div>
      </div>
    </div>
  );
}
