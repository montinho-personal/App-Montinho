"use client";

// Academia da Tribo — janela de NOVIDADE no Início (pedido do Montinho, 05/11/2026:
// “deixar mais em evidência”). Abre 1× por aparelho no lançamento (enquanto dura o
// destaque) e 1× na inauguração. Espera outra janela fechar antes de aparecer.
import { useEffect, useState } from "react";
import Link from "next/link";
import { AcademiaIlustracao } from "./AcademiaIlustracao";
import { etapaDe, infoModelo, pctDaObra, textoInauguracao, toneladas, type DadosObra, type DestaqueHome } from "@/lib/academia/regras";

const chave = (id: string, tipo: string) => `montinho-obra-novidade:${id}:${tipo}`;

export function NovidadeAcademia({ ativa, inaugurada, destaque }: { ativa: DadosObra | null; inaugurada: DadosObra | null; destaque: DestaqueHome }) {
  const alvo = destaque.inauguracao && inaugurada ? { obra: inaugurada, tipo: "inauguracao" as const } : destaque.lancamento && ativa ? { obra: ativa, tipo: "lancamento" as const } : null;
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!alvo) return;
    let visto = false;
    try {
      visto = !!localStorage.getItem(chave(alvo.obra.id, alvo.tipo));
    } catch {
      visto = true; // sem armazenamento: não insiste
    }
    if (visto) return;
    let tentativas = 0;
    const t = setInterval(() => {
      tentativas++;
      // Espera a outra janela (troféu, notificações…) fechar; desiste depois de ~40 s.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        if (tentativas > 30) clearInterval(t);
        return;
      }
      clearInterval(t);
      setAberto(true);
      try {
        localStorage.setItem(chave(alvo.obra.id, alvo.tipo), new Date().toISOString());
      } catch {
        // ignora
      }
    }, 1300);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decide uma vez por obra
  }, [alvo?.obra.id, alvo?.tipo]);

  if (!alvo || !aberto) return null;
  const o = alvo.obra;
  const inaug = alvo.tipo === "inauguracao";
  const pct = pctDaObra(o.total_kg, o.meta_kg);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="novidade-obra-titulo" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => setAberto(false)}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-accent bg-bg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <AcademiaIlustracao etapa={inaug ? 7 : etapaDe(pct).n} pavimentos={infoModelo(o.modelo).pavimentos} className="block h-auto w-full" titulo={o.nome} />
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-black text-bg shadow motion-safe:animate-pulse">✨ NOVIDADE</span>
        </div>
        <div className="space-y-3 p-5">
          <h2 id="novidade-obra-titulo" className="text-xl font-black leading-tight">
            {inaug ? `🎉 INAUGURAMOS A ${o.nome.toUpperCase()}!` : "🏗️ A TRIBO VAI CONSTRUIR UMA ACADEMIA!"}
          </h2>
          {inaug ? (
            <p className="text-sm">{textoInauguracao(o)}</p>
          ) : (
            <>
              <p className="text-sm">
                A obra da <b>{o.nome}</b> começou do zero. <b>Cada treino de musculação que você concluir</b> soma as toneladas que você levantou e ajuda a erguer a academia, tijolo por tijolo.
              </p>
              <ul className="space-y-1 text-sm text-fg-muted">
                <li>🧱 Meta da tribo: {toneladas(o.meta_kg)} toneladas movimentadas</li>
                <li>🏗️ 8 etapas: do terreno à inauguração</li>
                <li>🏆 Quem ajudar entra para a história como construtor</li>
              </ul>
            </>
          )}
          <Link href={inaug ? `/aluno/academia/${o.id}` : "/aluno/academia"} onClick={() => setAberto(false)} className="alvo flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-black text-bg">
            {inaug ? "Conhecer a academia" : "PARTICIPAR DA CONSTRUÇÃO"}
          </Link>
          <button type="button" onClick={() => setAberto(false)} className="w-full py-1 text-sm text-fg-muted">
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}
