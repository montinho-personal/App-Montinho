"use client";

// Medalha nova na hora de concluir o treino: tela cheia, "toque para abrir",
// a medalha gira e aparece com confete e vibração. Uma por vez quando há mais
// de uma. Respeita "animações desligadas" e "reduzir movimento".
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND } from "@/config/brand";
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import { cardDaMedalha } from "@/lib/conquistas/compartilhavel";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import type { ConquistaRow } from "@/lib/data/conquistas";
import { gerarImagemMedalha } from "./cardMedalha";
import { enviarEvento } from "./evento";
import { LENDARIAS } from "@/lib/conquistas/regras";

const CORES = ["#e3cd8a", "#ba9e50", "#4ade80", "#f3e6bd", "#ffffff", "#f59e0b"];
// Troféu lendário: confete de fogo e ouro, em dobro.
const CORES_LENDARIAS = ["#ffe9a8", "#f59e0b", "#ef4444", "#f5c451", "#ffffff", "#fb923c"];

function baixar(f: File) {
  const url = URL.createObjectURL(f);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export type ConquistaCelebravel = Pick<ConquistaRow, "codigo" | "titulo" | "descricao" | "conquistado_em" | "dados">;

export function CelebracaoMedalha({ conquistas, nome, animacoes = true, previa = false, onFechar }: { conquistas: ConquistaCelebravel[]; nome?: string; animacoes?: boolean; /** Personal vendo como o aluno vê (nada é gravado). */ previa?: boolean; onFechar: () => void }) {
  const [i, setI] = useState(0);
  const [aberta, setAberta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const atual = conquistas[i];
  // Confete com posições fixas por medalha (sem Math.random no render).
  const lendaria = !!atual && LENDARIAS.has(atual.codigo);
  const confete = useMemo(
    () => Array.from({ length: lendaria ? 90 : 36 }, (_, k) => ({ left: `${(k * 37) % 100}%`, dx: `${((k * 53) % 160) - 80}px`, delay: `${(k % 15) * (lendaria ? 0.12 : 0.06)}s`, cor: (lendaria ? CORES_LENDARIAS : CORES)[k % 6] })),
    [lendaria]
  );
  if (!atual || typeof document === "undefined") return null;
  const primeiroNome = (nome ?? "").split(" ")[0];
  const card = cardDaMedalha(atual, nome ?? "");

  async function compartilhar() {
    setEnviando(true);
    setAviso(null);
    let r: ResultadoCompartilhar;
    try {
      const f = await gerarImagemMedalha(card);
      r = await compartilharArquivo(navigator, f, card.legenda, baixar);
    } catch {
      r = "erro";
    }
    enviarEvento({ tipo: r === "baixado" ? "download" : r === "cancelado" ? "compartilhar_cancelado" : "compartilhar_nativo", modelo: atual.codigo, formato: "stories", origem: "medalha" });
    if (r !== "enviado_ao_sistema") setAviso(MENSAGEM_RESULTADO[r]);
    setEnviando(false);
  }

  function abrir() {
    setAberta(true);
    try {
      if (animacoes) navigator.vibrate?.(lendaria ? [120, 60, 120, 60, 120, 80, 500] : [80, 60, 160]);
    } catch {
      // vibração é opcional
    }
  }

  function proxima() {
    setAviso(null);
    if (i + 1 < conquistas.length) {
      setI(i + 1);
      setAberta(false);
    } else onFechar();
  }

  return createPortal(
    <div className={`fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-6 backdrop-blur-sm ${lendaria ? "bg-[radial-gradient(circle_at_50%_40%,rgba(120,40,8,0.92),rgba(0,0,0,0.95)_70%)]" : "bg-black/85"} ${animacoes ? "" : "sem-animacao"}`} role="dialog" aria-modal="true" aria-label={lendaria ? "Troféu lendário" : "Nova medalha"}>
      {lendaria ? <div aria-hidden className="raios-lendarios pointer-events-none absolute left-1/2 top-[42%] h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2" /> : null}
      {aberta ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {confete.map((c, k) => (
            <span key={`${i}-${k}`} className="confete" style={{ left: c.left, background: c.cor, animationDelay: c.delay, ["--dx" as string]: c.dx }} />
          ))}
        </div>
      ) : null}

      <div className="relative w-full max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG oficial */}
        <img src="/brand/logo.svg" alt="Montinho Personal Trainer" width={150} height={103} className="mx-auto mb-4 h-auto w-[150px]" />
        {previa ? <p className="mb-3 inline-block rounded-full border border-accent/60 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">👁 Pré-visualização · assim o aluno vê</p> : null}
        {conquistas.length > 1 ? <p className="mb-2 text-xs font-semibold text-fg-subtle">Medalha {i + 1} de {conquistas.length}</p> : null}
        {!aberta ? (
          <button type="button" onClick={abrir} className="mx-auto flex flex-col items-center gap-4 rounded-3xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" aria-label="Abrir a medalha">
            {lendaria ? (
              <>
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#f5c451]">Conquista lendária</span>
                <span className="medalha-chamar relative grid h-44 w-44 place-items-center rounded-full border-4 border-[#f59e0b] bg-[#f59e0b]/15 text-7xl shadow-[0_0_90px_rgba(245,158,11,0.7)]">🏆</span>
                <span className="text-2xl font-black">{primeiroNome ? `${primeiroNome}, você` : "Você"} conquistou um troféu lendário!</span>
              </>
            ) : (
              <>
                <span className="medalha-chamar relative grid h-40 w-40 place-items-center rounded-full border-4 border-dashed border-accent/70 bg-accent/10 text-6xl shadow-[0_0_60px_rgba(186,158,80,0.45)]">🏅</span>
                <span className="text-xl font-extrabold">{primeiroNome ? `${primeiroNome}, você` : "Você"} desbloqueou uma medalha!</span>
              </>
            )}
            <span className="animate-pulse rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-bg">Toque para abrir</span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="medalha-revelar relative">
              <span aria-hidden className={`chalala-brilho absolute inset-0 rounded-full ${lendaria ? "bg-[#f59e0b]/70" : "bg-accent/50"}`} />
              <MedalhaIcone selo={card.selo} conquistada atual={null} alvo={null} tamanho={lendaria ? 190 : 150} lendaria={lendaria} />
            </div>
            <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${lendaria ? "text-[#f5c451]" : "text-accent"}`}>{lendaria ? "Troféu lendário" : "Nova medalha"}</p>
            <h2 className="text-2xl font-extrabold leading-tight">{card.titulo}</h2>
            {card.destaque ? <p className="text-sm font-semibold text-accent">{card.destaque}</p> : null}
            <p className="mt-1 text-lg font-bold leading-snug">“{card.frase}”</p>
            {card.porque ? <p className="text-xs text-fg-muted">{card.porque}</p> : null}
            {lendaria ? <p className="rounded-full border border-[#f59e0b]/60 bg-[#f59e0b]/10 px-3 py-1 text-[11px] font-bold text-[#f5c451]">Só quem cumpre a meta 12 semanas seguidas chega aqui.</p> : null}
            <button type="button" onClick={() => void compartilhar()} disabled={enviando} className="touch mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-bg disabled:opacity-60">
              {enviando ? "Preparando a imagem…" : "📲 Compartilhar no Story / WhatsApp"}
            </button>
            {BRAND.contact.instagram ? <p className="text-xs text-fg-muted">No Story, marque @{BRAND.contact.instagram}: ele reposta.</p> : null}
            {aviso ? <p className="text-xs text-fg-muted">{aviso}</p> : null}
            <button type="button" onClick={proxima} className="touch w-full rounded-xl border border-border px-5 py-3 font-semibold text-fg">
              {i + 1 < conquistas.length ? "Próxima medalha →" : "Chalalá! Continuar"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
