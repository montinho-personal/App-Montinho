"use client";

// Incentivo da indicação premiada (0102/0103) em momentos do app que combinam
// com chamar alguém (fim do treino, conquistas, ranking, cardio, início).
// Mostra a escada 1 amigo = 10%, 2 = 20%, 3 = 30%, com o que a pessoa já
// conquistou aceso. “Agora não” esconde naquele lugar por 7 dias (no aparelho).
import { useEffect, useState } from "react";
import Link from "next/link";
import { eventoGa } from "@/components/analytics/ga";
import { ESCADA_DESCONTO, textoDoMomento, type MomentoIndicacao } from "@/lib/indicacao/desconto";

const DIAS_ESCONDIDO = 7;
const chave = (m: MomentoIndicacao) => `montinho-indicacao-escondida:${m}`;

export function IncentivoIndicacao({ momento, aluno, fecharam = 0 }: { momento: MomentoIndicacao; /** Aluno que já paga (desconto na renovação); senão visitante. */ aluno: boolean; fecharam?: number }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    let escondido = false;
    try {
      const ate = Number(localStorage.getItem(chave(momento)) ?? 0);
      escondido = ate > Date.now();
    } catch {
      /* sem armazenamento: mostra */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só no aparelho (localStorage)
    setVisivel(!escondido);
    if (!escondido) eventoGa("indicacao_incentivo_visto", { tela: momento });
  }, [momento]);
  if (!visivel || fecharam >= 3) return null;
  const { titulo, texto } = textoDoMomento(momento, aluno);
  const agoraNao = () => {
    try {
      localStorage.setItem(chave(momento), String(Date.now() + DIAS_ESCONDIDO * 86_400_000));
    } catch {
      /* ignore */
    }
    setVisivel(false);
  };
  return (
    <section aria-label="Indique um amigo" className="rounded-2xl border border-accent/50 bg-[linear-gradient(160deg,#2a2415_0%,#171717_75%)] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">🎁 Indicação premiada</p>
      <h2 className="mt-1 text-lg font-black leading-tight">{titulo}</h2>
      <p className="mt-1 text-sm text-fg-muted">{texto}</p>
      <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Quanto você ganha">
        {ESCADA_DESCONTO.map((e) => {
          const feito = fecharam >= e.amigos;
          return (
            <li key={e.amigos} className={`rounded-xl border px-2 py-2 text-center ${feito ? "border-success bg-success/15" : "border-accent/40 bg-bg/40"}`}>
              <span className={`block text-xl font-black ${feito ? "text-success" : "text-accent"}`}>{e.pct}%</span>
              <span className="block text-[11px] text-fg-muted">{e.amigos} {e.amigos === 1 ? "amigo" : "amigos"}{feito ? " ✓" : ""}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11px] text-fg-subtle">Vale quando o amigo fecha um plano com o Montinho. Os descontos somam, sem prazo.</p>
      <div className="mt-3 flex items-center gap-3">
        <Link href="/aluno/indicar" onClick={() => eventoGa("indicacao_incentivo_clicado", { tela: momento })} className="alvo flex min-h-11 flex-1 items-center justify-center rounded-xl bg-accent px-4 font-bold text-bg">
          Indicar um amigo
        </Link>
        <button type="button" onClick={agoraNao} className="alvo text-sm text-fg-muted underline underline-offset-4">Agora não</button>
      </div>
    </section>
  );
}
