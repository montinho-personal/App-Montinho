"use client";

// “📷 Não sabe o nome? Tire uma foto do aparelho” (pedido do Montinho,
// 04/11/2026: “em todos os locais em que dá para escolher um exercício”).
// Um componente só, usado no treino livre, no exercício extra, no montador do
// personal, no montador do visitante, nos extras prontos e no desafio.
// A foto vai reduzida para `api/livre/reconhecer`; a IA escolhe na biblioteca
// e a pessoa toca no certo (nada é escolhido sozinho).
//  • variante "cartao": o cartão dourado dentro da busca;
//  • variante "botao": um 📷 pequeno (ao lado do campo) que abre o resultado
//    numa janela por cima.
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { GRUPO_LABEL } from "@/lib/grupos";
import { VerExercicio, type MidiaExercicio } from "@/components/ui/VerExercicio";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export type ItemFoto = { id: string; nome: string; grupo?: GrupoMuscular | string | null; midia?: MidiaExercicio; passos?: string[] };

/** Lado maior da foto enviada: 1568 px é o tamanho que a IA aproveita inteiro (letreiro do aparelho legível). */
export const LADO_FOTO = 1568;

async function fotoReduzida(f: File): Promise<string> {
  const bmp = await createImageBitmap(f);
  const escala = Math.min(1, LADO_FOTO / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
}

type Estado = { fase: "livre" } | { fase: "lendo" } | { fase: "achou"; aparelho: string | null; itens: ItemFoto[] } | { fase: "nada"; motivo: string };

export function FotoDoAparelho({ itens, onEscolher, variante = "cartao", rotuloAcao = "Toque no exercício que você vai fazer:" }: { itens: ItemFoto[]; onEscolher: (item: ItemFoto) => void; variante?: "cartao" | "botao"; rotuloAcao?: string }) {
  const camera = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ fase: "livre" });
  const abrir = () => camera.current?.click();

  async function reconhecer(f: File | undefined) {
    if (!f) return;
    setEstado({ fase: "lendo" });
    try {
      const base64 = await fotoReduzida(f);
      const r = await fetch("/api/livre/reconhecer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64 }) });
      const j = (await r.json().catch(() => ({}))) as { ia?: boolean; aparelho?: string | null; opcoes?: Array<{ id: string }>; error?: string };
      if (!r.ok) return setEstado({ fase: "nada", motivo: j.error ?? "Não foi possível reconhecer agora." });
      if (j.ia === false) return setEstado({ fase: "nada", motivo: "O reconhecimento por foto não está ligado agora. Busque pelo nome." });
      const porId = new Map(itens.map((i) => [i.id, i]));
      const achados = (j.opcoes ?? []).map((o) => porId.get(o.id)).filter((x): x is ItemFoto => !!x);
      if (!achados.length) return setEstado({ fase: "nada", motivo: "Não reconheci esse aparelho. Tente outra foto com o aparelho inteiro (e a plaquinha com o nome, se tiver), ou busque pelo músculo." });
      setEstado({ fase: "achou", aparelho: j.aparelho ?? null, itens: achados });
    } catch {
      setEstado({ fase: "nada", motivo: "Sem conexão. Confira a internet e tente de novo." });
    } finally {
      if (camera.current) camera.current.value = "";
    }
  }

  const escolher = (i: ItemFoto) => {
    onEscolher(i);
    setEstado({ fase: "livre" });
  };

  const entrada = <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void reconhecer(e.target.files?.[0])} aria-hidden tabIndex={-1} />;

  const resultado =
    estado.fase === "lendo" ? (
      <p className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-3 text-sm" aria-live="polite">📷 Reconhecendo o aparelho…</p>
    ) : estado.fase === "achou" ? (
      <div className="space-y-2 rounded-xl border border-accent/50 bg-accent/10 p-3" aria-live="polite">
        <p className="text-sm font-semibold">{estado.aparelho ? `Parece ser: ${estado.aparelho}` : "Encontrei estes exercícios"}</p>
        <p className="text-xs text-fg-muted">{rotuloAcao}</p>
        <ul className="space-y-1.5">
          {estado.itens.map((r) => (
            <li key={r.id} className="flex items-center gap-3">
              {r.midia !== undefined || r.passos ? <VerExercicio nome={r.nome} midia={r.midia ?? null} passos={r.passos ?? []} /> : null}
              <button type="button" onClick={() => escolher(r)} className="alvo flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left">
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{r.nome}</span>{r.grupo ? <span className="block text-xs text-fg-subtle">{GRUPO_LABEL[r.grupo as GrupoMuscular] ?? r.grupo}</span> : null}</span>
                <Icon name="plus" size={18} className="shrink-0 text-accent" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 text-xs">
          <button type="button" onClick={abrir} className="alvo text-accent underline underline-offset-4">Tirar outra foto</button>
          <button type="button" onClick={() => setEstado({ fase: "livre" })} className="alvo text-fg-muted underline underline-offset-4">Nenhum desses</button>
        </div>
      </div>
    ) : estado.fase === "nada" ? (
      <div className="space-y-1 rounded-xl border border-border bg-bg/40 px-3 py-2.5 text-sm" aria-live="polite">
        <p>{estado.motivo}</p>
        <div className="flex gap-3 text-xs">
          <button type="button" onClick={abrir} className="alvo text-accent underline underline-offset-4">Tentar outra foto</button>
          <button type="button" onClick={() => setEstado({ fase: "livre" })} className="alvo text-fg-muted underline underline-offset-4">Fechar</button>
        </div>
      </div>
    ) : null;

  if (variante === "botao") {
    return (
      <>
        {entrada}
        <button type="button" onClick={abrir} className="alvo grid h-9 w-9 shrink-0 place-items-center rounded-md border border-accent/50 bg-accent/10 text-base" aria-label="Tirar foto do aparelho para achar o exercício" title="Não sabe o nome? Tire uma foto do aparelho">📷</button>
        {resultado && typeof document !== "undefined"
          ? createPortal(
              <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Exercícios do aparelho" onClick={() => estado.fase !== "lendo" && setEstado({ fase: "livre" })}>
                <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-3" onClick={(e) => e.stopPropagation()}>{resultado}</div>
              </div>,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <>
      {entrada}
      {estado.fase === "livre" ? (
        <button type="button" onClick={abrir} className="alvo flex w-full items-center gap-3 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2.5 text-left">
          <span className="text-2xl" aria-hidden>📷</span>
          <span><span className="block text-sm font-semibold text-accent">Não sabe o nome? Tire uma foto do aparelho</span><span className="block text-xs text-fg-muted">O app reconhece e mostra os exercícios que se fazem nele.</span></span>
        </button>
      ) : resultado}
    </>
  );
}
