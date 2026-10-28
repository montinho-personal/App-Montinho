"use client";

// Grade de medalhas (destaque ou coleção completa) + detalhe educativo e
// card de compartilhamento. Só medalhas conquistadas geram card.
import { LENDARIAS } from "@/lib/conquistas/regras";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { MedalhaIcone } from "./MedalhaIcone";
import { DetalheMedalha } from "./DetalheMedalha";
import { CONTEUDO } from "@/lib/conquistas/conteudo";
import type { Medalha } from "@/lib/conquistas/vitrine";
import type { DadosCard, ModeloId } from "@/lib/chalala/card";
import { CelebracaoMedalha } from "@/components/chalala/CelebracaoMedalha";
import { useFecharComVoltar } from "@/lib/useFecharComVoltar";
import { useMontado } from "@/lib/ui/montado";

const EditorCard = dynamic(() => import("@/components/chalala/EditorCard"), { ssr: false });
const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const diaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

/** Card da medalha: nome, selo desenhado, data e frase curta. Nada privado. */
export function cardDaMedalha(m: Medalha): { dados: DadosCard; modelo: ModeloId; ref: string } {
  return { ref: `medalha:${m.codigo}`, dados: { data: m.data ? diaLocal(m.data) : null, conquistaTitulo: CONTEUDO[m.codigo].nome, medalhaSelo: m.selo, conquistaFrase: CONTEUDO[m.codigo].mensagem }, modelo: "C" };
}

/** Detalhe numa janela que sobe de baixo: aparece na hora, sem precisar rolar a lista de medalhas. */
function JanelaDetalhe({ onFechar, children }: { onFechar: () => void; children: React.ReactNode }) {
  useFecharComVoltar(true, onFechar);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onFechar]);
  const montado = useMontado();
  if (!montado) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <div className="relative max-h-[88vh] w-full overflow-y-auto overscroll-contain rounded-t-2xl sm:max-w-md sm:rounded-2xl">{children}</div>
    </div>,
    document.body
  );
}

/** Unidade do número de cada família de medalhas (singular, plural). */
function unidade(codigo: string): [string, string] | null {
  if (codigo.startsWith("combo_")) return ["dia", "dias"];
  if (codigo.startsWith("series_")) return ["série", "séries"];
  if (codigo.startsWith("treinos_") || codigo === "primeiro_treino" || codigo === "terceiro_especial") return ["treino", "treinos"];
  if (codigo.startsWith("semanas_") || codigo.startsWith("acompanhamento_") || codigo.startsWith("constancia_") || codigo === "criando_raizes") return ["semana", "semanas"];
  if (/^cardio_\d+$/.test(codigo)) return ["cardio", "cardios"];
  if (codigo.startsWith("tecnicas_") || codigo === "mestre_tecnicas") return ["técnica", "técnicas"];
  return null;
}

/** Resumo do que falta: número quando a medalha se mede em números; senão, o texto do que fazer. */
export function quantoFalta(m: Pick<Medalha, "codigo" | "atual" | "alvo" | "falta" | "disponivel">): string | null {
  if (m.alvo) {
    const n = Math.max(0, m.alvo - (m.atual ?? 0));
    const u = unidade(m.codigo);
    const num = n.toLocaleString("pt-BR");
    return `${n === 1 ? "falta" : "faltam"} ${num}${u ? ` ${n === 1 ? u[0] : u[1]}` : ""}`;
  }
  return m.falta;
}

export function VitrineMedalhas({ medalhas, nome, reconhecimentos = {}, inicial = null, comPrevia = false }: { medalhas: Medalha[]; nome: string; reconhecimentos?: Record<string, { mensagem: string; data: string }>; inicial?: string | null; /** Personal: botão para ver a comemoração como o aluno vê. */ comPrevia?: boolean }) {
  const [aberta, setAberta] = useState<string | null>(inicial);
  const [editor, setEditor] = useState<{ dados: DadosCard; modelo: ModeloId; ref?: string } | null>(null);
  const [previa, setPrevia] = useState<Medalha | null>(null);
  const sel = medalhas.find((m) => m.codigo === aberta) ?? null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-2" aria-label="Medalhas">
        {medalhas.map((m) => (
          <li key={m.codigo}>
            <button type="button" onClick={() => setAberta(aberta === m.codigo ? null : m.codigo)} aria-expanded={aberta === m.codigo} className={`relative flex w-full flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors ${aberta === m.codigo ? "border-accent/60 bg-card" : "border-transparent hover:bg-card"} ${!m.conquistada && !m.disponivel ? "opacity-60" : ""}`}>
              {m.nova ? <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-[9px] font-bold uppercase text-bg">Nova</span> : null}
              <MedalhaIcone selo={m.selo} conquistada={m.conquistada} atual={m.atual} alvo={m.alvo} nova={m.nova} lendaria={LENDARIAS.has(m.codigo)} />
              <span className={`text-[11px] font-semibold leading-tight ${m.conquistada ? "text-fg" : "text-fg-muted"}`}>{m.titulo}</span>
              <span className="text-[10px] text-fg-subtle">{m.conquistada && m.data ? fmtData.format(new Date(m.data)) : m.alvo ? `${m.atual ?? 0}/${m.alvo}` : m.disponivel ? "a conquistar" : "momento próprio"}</span>
              {/* Quanto falta, visível sem precisar tocar (pedido do Montinho, 28/10/2026). */}
              {!m.conquistada ? <span className="line-clamp-3 text-[10px] leading-snug text-fg-muted">{quantoFalta(m)}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {sel && !previa ? (
        <JanelaDetalhe onFechar={() => setAberta(null)}>
          <DetalheMedalha key={sel.codigo} m={sel} reconhecimento={reconhecimentos[sel.codigo] ?? null} className="rounded-b-none sm:rounded-b-xl" onFechar={() => setAberta(null)} onGerarCard={sel.conquistada ? () => setEditor(cardDaMedalha(sel)) : undefined} onVerComoAluno={comPrevia && sel.conquistada ? () => setPrevia(sel) : undefined} />
        </JanelaDetalhe>
      ) : null}
      {previa ? <CelebracaoMedalha previa conquistas={[{ codigo: previa.codigo, titulo: previa.titulo, descricao: null, conquistado_em: previa.data ?? new Date().toISOString(), dados: {} }]} nome={nome} onFechar={() => setPrevia(null)} /> : null}
      {editor ? <EditorCard dados={editor.dados} modeloInicial={editor.modelo} nome={nome} origem="historico" refEvento={editor.ref ?? null} onFechar={() => setEditor(null)} /> : null}
    </>
  );
}
