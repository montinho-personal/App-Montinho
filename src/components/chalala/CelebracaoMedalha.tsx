"use client";

// Medalha nova na hora de concluir o treino: tela cheia, "toque para abrir",
// a medalha gira e aparece com confete e vibração. Uma por vez quando há mais
// de uma. Respeita "animações desligadas" e "reduzir movimento".
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import { CONTEUDO, nomeDaConquista } from "@/lib/conquistas/conteudo";
import { ORDEM } from "@/lib/conquistas/vitrine";
import type { CodigoConquista } from "@/lib/conquistas/regras";
import type { ConquistaRow } from "@/lib/data/conquistas";

const SELO_EXTRA: Record<string, string> = { recorde: "★", eu_voltei: "↺" };
const CORES = ["#e3cd8a", "#ba9e50", "#4ade80", "#f3e6bd", "#ffffff", "#f59e0b"];

function seloDe(codigo: string): string {
  return ORDEM.find((o) => o.codigo === codigo)?.selo ?? SELO_EXTRA[codigo] ?? "★";
}

export function CelebracaoMedalha({ conquistas, nome, animacoes = true, onFechar }: { conquistas: ConquistaRow[]; nome?: string; animacoes?: boolean; onFechar: () => void }) {
  const [i, setI] = useState(0);
  const [aberta, setAberta] = useState(false);
  const atual = conquistas[i];
  // Confete com posições fixas por medalha (sem Math.random no render).
  const confete = useMemo(() => Array.from({ length: 36 }, (_, k) => ({ left: `${(k * 37) % 100}%`, dx: `${((k * 53) % 120) - 60}px`, delay: `${(k % 9) * 0.09}s`, cor: CORES[k % CORES.length] })), []);
  if (!atual || typeof document === "undefined") return null;
  const primeiroNome = (nome ?? "").split(" ")[0];
  const mensagem = atual.codigo === "recorde" ? atual.descricao : (CONTEUDO[atual.codigo as CodigoConquista]?.mensagem ?? atual.descricao);

  function abrir() {
    setAberta(true);
    try {
      if (animacoes) navigator.vibrate?.([80, 60, 160]);
    } catch {
      // vibração é opcional
    }
  }

  function proxima() {
    if (i + 1 < conquistas.length) {
      setI(i + 1);
      setAberta(false);
    } else onFechar();
  }

  return createPortal(
    <div className={`fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/85 px-6 backdrop-blur-sm ${animacoes ? "" : "sem-animacao"}`} role="dialog" aria-modal="true" aria-label="Nova medalha">
      {aberta ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {confete.map((c, k) => (
            <span key={`${i}-${k}`} className="confete" style={{ left: c.left, background: c.cor, animationDelay: c.delay, ["--dx" as string]: c.dx }} />
          ))}
        </div>
      ) : null}

      <div className="relative w-full max-w-sm text-center">
        {conquistas.length > 1 ? <p className="mb-2 text-xs font-semibold text-fg-subtle">Medalha {i + 1} de {conquistas.length}</p> : null}
        {!aberta ? (
          <button type="button" onClick={abrir} className="mx-auto flex flex-col items-center gap-4 rounded-3xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" aria-label="Abrir a medalha">
            <span className="medalha-chamar relative grid h-40 w-40 place-items-center rounded-full border-4 border-dashed border-accent/70 bg-accent/10 text-6xl shadow-[0_0_60px_rgba(186,158,80,0.45)]">🏅</span>
            <span className="text-xl font-extrabold">{primeiroNome ? `${primeiroNome}, você` : "Você"} desbloqueou uma medalha!</span>
            <span className="animate-pulse rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-bg">Toque para abrir</span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="medalha-revelar relative">
              <span aria-hidden className="chalala-brilho absolute inset-0 rounded-full bg-accent/50" />
              <MedalhaIcone selo={seloDe(atual.codigo)} conquistada atual={null} alvo={null} tamanho={168} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Nova medalha</p>
            <h2 className="text-2xl font-extrabold leading-tight">{nomeDaConquista(atual.codigo, atual.titulo)}</h2>
            <p className="text-sm text-fg-muted">{mensagem}</p>
            <button type="button" onClick={proxima} className="touch mt-2 w-full rounded-xl bg-accent px-5 py-3 font-bold text-bg">
              {i + 1 < conquistas.length ? "Próxima medalha →" : "Chalalá! Continuar"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
