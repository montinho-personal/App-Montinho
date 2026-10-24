"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/config/brand";
import { mensagemConviteDesafio } from "@/lib/desafios/regras";

/** Convidar: pelo nome (quem aparece no ranking) ou mandando o link pelo WhatsApp. */
export function ConvidarDesafio({ id, codigo, nome, criador, resumo, pessoas, jaEstao }: { id: string; codigo: string; nome: string; criador: string; resumo: string; pessoas: Array<{ alunoId: string; nome: string }>; jaEstao: string[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const livres = useMemo(() => {
    const ja = new Set(jaEstao);
    const q = busca.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return pessoas.filter((p) => !ja.has(p.alunoId) && (!q || p.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q))).slice(0, 40);
  }, [pessoas, jaEstao, busca]);
  const link = () => `${window.location.origin}/desafio/${codigo}`;
  async function convidar() {
    if (!marcados.length) return;
    setOcupado(true);
    setAviso(null);
    const r = await fetch(`/api/desafios/${id}/convidar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alunos: marcados }) }).catch(() => null);
    const j = ((await r?.json().catch(() => ({}))) ?? {}) as { convidados?: number; error?: string };
    setOcupado(false);
    if (!r?.ok) return setAviso(j.error ?? "Sem conexão. Tente de novo.");
    setMarcados([]);
    setAviso(j.convidados ? `${j.convidados} ${j.convidados === 1 ? "convite enviado" : "convites enviados"}: aparece para a pessoa no app.` : "Essas pessoas já estavam no desafio.");
    router.refresh();
  }
  function whatsapp() {
    const texto = mensagemConviteDesafio({ nome, criador, resumo, link: link() });
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link());
      setAviso("Link copiado.");
    } catch {
      setAviso(link());
    }
  }
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-label="Convidar">
      <h2 className="font-bold">Chamar mais gente</h2>
      <button type="button" onClick={whatsapp} className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 font-bold text-bg">
        💬 Mandar convite pelo WhatsApp
      </button>
      <p className="text-xs text-fg-muted">Quem ainda não usa o app entra pelo link e ganha 30 dias grátis do app do {BRAND.name}.</p>
      <button type="button" onClick={() => void copiar()} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
        Copiar o link do desafio
      </button>
      {pessoas.length ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm font-semibold">Ou convide quem já treina no app</p>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {livres.map((p) => {
              const on = marcados.includes(p.alunoId);
              return (
                <li key={p.alunoId}>
                  <button type="button" aria-pressed={on} onClick={() => setMarcados((m) => (on ? m.filter((x) => x !== p.alunoId) : [...m, p.alunoId]))} className={`alvo flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${on ? "border-accent bg-accent/10 font-semibold" : "border-border"}`}>
                    {p.nome}
                    <span aria-hidden>{on ? "✓" : "+"}</span>
                  </button>
                </li>
              );
            })}
            {!livres.length ? <li className="text-xs text-fg-subtle">Ninguém encontrado. Mande o link pelo WhatsApp.</li> : null}
          </ul>
          <button type="button" disabled={!marcados.length || ocupado} onClick={() => void convidar()} className="alvo w-full rounded-lg border border-accent px-3 py-2.5 text-sm font-bold text-accent disabled:opacity-50">
            Convidar {marcados.length ? `(${marcados.length})` : ""}
          </button>
        </div>
      ) : null}
      {aviso ? <p role="status" className="break-all text-xs text-fg-muted">{aviso}</p> : null}
    </section>
  );
}
