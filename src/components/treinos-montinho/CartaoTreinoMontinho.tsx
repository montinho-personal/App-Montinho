"use client";

// Um “Treino do Montinho” para o aluno: título, quando ele fez, foco, a narrativa,
// a lista dos exercícios e “▶ Fazer este treino” (treino livre já com a meta).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataBR } from "@/lib/format";
import { resumoItem, tecnicasDoTreino, totalDeSeries, type TreinoMontinho } from "@/lib/treino/treinos-montinho";

const novaChave = () => `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function CartaoTreinoMontinho({ t, podeFazer = true, extraCorpo, compacto = false }: { t: TreinoMontinho; podeFazer?: boolean; /** No treino extra: o “como está o corpo” escolhido (sem ele, o botão espera). */ extraCorpo?: string | null; compacto?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const tecs = tecnicasDoTreino(t.itens);

  async function fazer() {
    setIndo(true);
    setErro(null);
    const r = await fetch(`/api/treinos-montinho/${t.id}/comecar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_key: novaChave(), ...(extraCorpo !== undefined ? { extra: extraCorpo ? { corpo: extraCorpo } : null } : {}) }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!r?.ok || !j.id) {
      setIndo(false);
      return setErro(j.error ?? "Não deu para começar agora.");
    }
    router.push(`/aluno/livre/${j.id}`);
  }

  return (
    <article className="space-y-3 rounded-2xl border border-accent/40 bg-card p-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wide text-accent">🔥 Treino que o Montinho fez{t.feito_em ? ` · ${dataBR(t.feito_em)}` : ""}</p>
        <h2 className="text-lg font-black">{t.titulo}</h2>
        <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
          {t.foco ? <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent">🎯 {t.foco}</span> : null}
          <span className="rounded-full border border-border px-2 py-0.5 text-fg-muted">{t.itens.length} exercícios · {totalDeSeries(t.itens)} séries</span>
          {tecs.map((x) => <span key={x} className="rounded-full border border-border px-2 py-0.5 text-fg-muted">⚡ {x}</span>)}
        </p>
      </header>
      {t.narrativa ? <p className={`whitespace-pre-line text-sm leading-relaxed ${compacto && !aberto ? "line-clamp-3" : ""}`}>{t.narrativa}</p> : null}
      <button type="button" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="text-xs font-semibold text-accent underline underline-offset-2">{aberto ? "Esconder os exercícios" : `Ver os ${t.itens.length} exercícios`}</button>
      {aberto ? (
        <ol className="space-y-1 rounded-xl bg-bg/40 p-3 text-sm">
          {t.itens.map((i, k) => (
            <li key={k} className="flex gap-2"><span className="w-5 shrink-0 font-bold text-fg-subtle">{k + 1}.</span><span className="min-w-0 flex-1"><span className="font-semibold">{i.nome}</span> <span className="text-xs text-fg-muted">· {resumoItem(i)}{i.bloco ? " · ⚡ bi-set" : ""}</span></span></li>
          ))}
        </ol>
      ) : null}
      {erro ? <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm">{erro}</p> : null}
      {podeFazer ? <button type="button" disabled={indo || (extraCorpo !== undefined && (!extraCorpo || extraCorpo === "dor"))} onClick={() => void fazer()} className="touch w-full rounded-xl bg-accent px-3 py-3 font-black text-bg disabled:opacity-60">{indo ? "Abrindo…" : extraCorpo !== undefined && !extraCorpo ? "Escolha acima como está o seu corpo" : extraCorpo === "dor" ? "Com dor forte, nada de extra hoje" : extraCorpo !== undefined ? "▶ Fazer como treino extra" : "▶ Fazer este treino"}</button> : null}
    </article>
  );
}
