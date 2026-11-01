"use client";

// Como colocar o app na tela do celular (pedido do Montinho, 01/11/2026:
// “informação clara de como baixar o app, passo a passo para Android e Apple”).
// O app não está na App Store/Play Store: é instalado pelo navegador (PWA).
// Abre na aba do aparelho da pessoa; no Android com o Chrome oferecendo a
// instalação, mostra o botão “Instalar agora” (um toque). Já instalado (aberto
// pelo ícone), avisa que está tudo certo.
import { useEffect, useState } from "react";

type Sistema = "iphone" | "android";
type Aparelho = { sistema: Sistema | null; instalado: boolean; foraDoSafari: boolean };
type PedidoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function detectarAparelho(): Aparelho {
  if (typeof window === "undefined") return { sistema: null, instalado: false, foraDoSafari: false };
  const ua = navigator.userAgent;
  const iphone = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  // No iPhone, só o Safari mostra “Adicionar à Tela de Início” de um jeito simples.
  const foraDoSafari = iphone && /CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV|WhatsApp/i.test(ua);
  return { sistema: iphone ? "iphone" : android ? "android" : null, instalado, foraDoSafari };
}

const PASSOS: Record<Sistema, Array<{ icone: string; texto: React.ReactNode }>> = {
  iphone: [
    { icone: "🧭", texto: <>Abra o link do app no <b>Safari</b> (o navegador da bússola azul). Precisa ser o Safari.</> },
    { icone: "⬆️", texto: <>Toque em <b>Compartilhar</b>: o quadrado com a setinha para cima, na barra de baixo da tela.</> },
    { icone: "➕", texto: <>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</> },
    { icone: "✅", texto: <>Toque em <b>Adicionar</b>, no canto de cima. Pronto: o ícone do Montinho aparece junto com seus apps.</> },
  ],
  android: [
    { icone: "🌐", texto: <>Abra o link do app no <b>Chrome</b>.</> },
    { icone: "⋮", texto: <>Toque nos <b>3 pontinhos</b>, no canto de cima, à direita.</> },
    { icone: "📲", texto: <>Toque em <b>Instalar app</b> (em alguns celulares aparece <b>Adicionar à tela inicial</b>).</> },
    { icone: "✅", texto: <>Confirme em <b>Instalar</b>. Pronto: o ícone do Montinho aparece junto com seus apps.</> },
  ],
};

export function ComoInstalar() {
  const [aparelho, setAparelho] = useState<Aparelho>({ sistema: null, instalado: false, foraDoSafari: false });
  const [aba, setAba] = useState<Sistema>("iphone");
  const [pedido, setPedido] = useState<PedidoInstalar | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    const a = detectarAparelho();
    // Lido só no navegador (o servidor não sabe qual é o celular).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAparelho(a);
    if (a.sistema) setAba(a.sistema);
    setLink(window.location.origin);
    const guardar = (e: Event) => {
      e.preventDefault();
      setPedido(e as PedidoInstalar);
    };
    const instalou = () => setAparelho((x) => ({ ...x, instalado: true }));
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalou);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalou);
    };
  }, []);

  async function instalarAgora() {
    if (!pedido) return;
    await pedido.prompt();
    const r = await pedido.userChoice.catch(() => null);
    if (r?.outcome === "accepted") setAparelho((x) => ({ ...x, instalado: true }));
    setPedido(null);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* sem permissão para copiar: o link continua escrito na tela */
    }
  }

  if (aparelho.instalado) {
    return (
      <div className="space-y-2 rounded-2xl border border-success/50 bg-success/10 p-4">
        <p className="text-lg font-black">✅ O app já está no seu celular</p>
        <p className="text-sm text-fg-muted">Você abriu pelo ícone da tela. É sempre por ele que você deve entrar: assim o app fica em tela cheia e as notificações funcionam.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 text-sm">
        <p className="font-bold">📲 Não precisa de App Store nem de Play Store</p>
        <p className="mt-1 text-fg-muted">O app do Montinho é instalado direto pelo navegador, em 1 minuto. Depois ele fica na tela do celular com o ícone, igual aos outros apps.</p>
      </div>

      {pedido ? (
        <button type="button" onClick={() => void instalarAgora()} className="alvo flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-4 text-base font-black text-bg">
          📲 Instalar agora
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Seu celular">
        {(["iphone", "android"] as Sistema[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={aba === s} onClick={() => setAba(s)} className={`alvo rounded-lg py-2.5 text-sm font-bold ${aba === s ? "bg-accent text-bg" : "text-fg-muted"}`}>
            {s === "iphone" ? "🍎 iPhone" : "🤖 Android"}
            {aparelho.sistema === s ? <span className="ml-1 text-[11px] font-semibold opacity-80">(o seu)</span> : null}
          </button>
        ))}
      </div>

      {aba === "iphone" && aparelho.foraDoSafari ? (
        <div className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          <p className="font-bold">⚠️ Você está fora do Safari</p>
          <p className="mt-1 text-fg-muted">Copie o link abaixo, abra o <b>Safari</b>, cole na barra de endereço e siga os passos.</p>
        </div>
      ) : null}

      <ol className="space-y-2" aria-label={aba === "iphone" ? "Passo a passo no iPhone" : "Passo a passo no Android"}>
        {PASSOS[aba].map((p, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-bg">{i + 1}</span>
            <span className="min-w-0 flex-1 text-sm leading-snug">
              <span aria-hidden className="mr-1">{p.icone}</span>
              {p.texto}
            </span>
          </li>
        ))}
      </ol>

      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-semibold text-fg-muted">Link do app</p>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-lg bg-bg px-3 py-2 font-mono text-sm">{link || "https://app-montinho.vercel.app"}</span>
          <button type="button" onClick={() => void copiar()} className="alvo shrink-0 rounded-lg border border-accent/60 px-3 py-2 text-sm font-bold text-accent">
            {copiado ? "✓ Copiado" : "📋 Copiar"}
          </button>
        </div>
      </div>

      <div className="space-y-1 rounded-xl bg-bg/60 p-3 text-xs text-fg-muted">
        <p>✅ Depois, abra sempre pelo ícone na tela e faça seu login.</p>
        <p>🔔 Quando o app pedir, ative as notificações para receber os lembretes e os recados do Montinho. No iPhone, elas só funcionam abrindo pelo ícone.</p>
      </div>
    </div>
  );
}
