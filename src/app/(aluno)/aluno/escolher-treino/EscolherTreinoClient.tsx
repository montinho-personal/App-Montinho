"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { filtrarBases, type GrupoBase, type TreinoBase } from "@/lib/treino/treino-base";

const novaChave = () => `base-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function EscolherTreinoClient({ prontos, alunos }: { prontos: GrupoBase[]; alunos: GrupoBase[] }) {
  const router = useRouter();
  const [aba, setAba] = useState<"prontos" | "alunos">("prontos");
  const [q, setQ] = useState("");
  const [abertoGrupo, setAbertoGrupo] = useState<string | null>(null);
  const [vendo, setVendo] = useState<string | null>(null);
  const [comecando, setComecando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const grupos = useMemo(() => filtrarBases(aba === "prontos" ? prontos : alunos, q), [aba, prontos, alunos, q]);

  async function comecar(t: TreinoBase) {
    setComecando(t.chave);
    setErro(null);
    const r = await fetch("/api/meu-treino/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave: t.chave, client_key: novaChave() }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!r?.ok || !j.id) {
      setComecando(null);
      return setErro(j.error ?? "Não deu para começar agora.");
    }
    router.push(`/aluno/livre/${j.id}`);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {([["prontos", `🔥 Treinos prontos (${prontos.length})`], ["alunos", `⭐ Meus e 👥 dos alunos (${alunos.length})`]] as const).map(([id, rot]) => (
          <button key={id} type="button" aria-pressed={aba === id} onClick={() => { setAba(id); setAbertoGrupo(null); setQ(""); }} className={`rounded-xl border px-3 py-2 text-sm font-bold ${aba === id ? "border-accent bg-accent text-bg" : "border-border bg-card"}`}>{rot}</button>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={aba === "prontos" ? "Buscar: rainha, costas, glúteo…" : "Buscar pelo nome do aluno ou do treino"} aria-label="Buscar treino" />
      {erro ? <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm">{erro}</p> : null}
      {!grupos.length ? <p className="py-6 text-center text-sm text-fg-muted">Nada encontrado.</p> : null}
      <ul className="space-y-2">
        {grupos.map((g) => {
          const aberto = abertoGrupo === g.id || q.trim().length > 0;
          return (
            <li key={g.id} className="rounded-xl border border-border bg-card">
              <button type="button" aria-expanded={aberto} onClick={() => setAbertoGrupo(aberto && !q.trim() ? null : g.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                <span className="text-2xl" aria-hidden>{g.emoji}</span>
                <span className="min-w-0 flex-1"><span className="block font-bold">{g.titulo}</span><span className="block truncate text-xs text-fg-muted">{g.detalhe}</span></span>
                <span className="text-fg-subtle" aria-hidden>{aberto ? "▲" : "▼"}</span>
              </button>
              {aberto ? (
                <ul className="space-y-2 border-t border-border p-3">
                  {g.treinos.map((t) => (
                    <li key={t.chave} className="rounded-lg border border-border bg-bg/40 p-2.5">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t.titulo.replace(`${g.titulo} · `, "")}</span><span className="block text-xs text-fg-muted">{t.subtitulo}</span></span>
                        <button type="button" onClick={() => setVendo(vendo === t.chave ? null : t.chave)} className="shrink-0 text-xs font-semibold text-accent underline underline-offset-2">{vendo === t.chave ? "Fechar" : "Ver"}</button>
                      </div>
                      {vendo === t.chave ? (
                        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs">
                          {t.itens.map((i, k) => <li key={k}>{i.nome} · {i.series} × {i.reps.replace("-", "–")}</li>)}
                        </ol>
                      ) : null}
                      <button type="button" disabled={!!comecando} onClick={() => void comecar(t)} className="touch mt-2 w-full rounded-lg bg-accent px-3 py-2 text-sm font-black text-bg disabled:opacity-60">{comecando === t.chave ? "Abrindo…" : "▶ Começar este treino"}</button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
