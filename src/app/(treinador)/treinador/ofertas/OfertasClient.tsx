"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OfertaConfig, OfertaConfigId } from "@/lib/supabase/types-extended";
import type { PessoaPresencial } from "@/lib/data/ofertas";

const normalizarBusca = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const NOMES: Record<OfertaConfigId, { titulo: string; para: string; exemplo: string }> = {
  pacote_alunos: { titulo: "🎟️ Pacote Flexível para alunos da consultoria", para: "Alunos da consultoria online que podem ir a Alphaville", exemplo: "Ex.: 1 aula a mais na renovação" },
  consultoria_visitantes: { titulo: "💎 Consultoria online para visitantes", para: "Todos os visitantes", exemplo: "Ex.: 1ª semana com ajuste extra" },
  pacote_visitantes: { titulo: "🎟️ Pacote Flexível para visitantes", para: "Visitantes que podem ir a Alphaville", exemplo: "Ex.: Dá para parcelar em até 5×" },
};

export function OfertasClient({ config, pessoas }: { config: OfertaConfig[]; pessoas: PessoaPresencial[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState(pessoas);
  const [erro, setErro] = useState<string | null>(null);

  async function salvarOferta(id: OfertaConfigId, ativo: boolean, promo: string | null) {
    setErro(null);
    const r = await fetch("/api/treinador/ofertas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ativo, promo }) }).catch(() => null);
    if (!r?.ok) return setErro(((await r?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível salvar.");
    router.refresh();
  }
  async function presencial(p: PessoaPresencial, pode: boolean) {
    setErro(null);
    setLista((l) => l.map((x) => (x.id === p.id ? { ...x, podePresencial: pode } : x)));
    const r = await fetch(`/api/alunos/${p.id}/presencial`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pode_presencial: pode }) }).catch(() => null);
    if (!r?.ok) {
      setLista((l) => l.map((x) => (x.id === p.id ? { ...x, podePresencial: !pode } : x)));
      setErro(((await r?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível salvar.");
    }
  }

  const filtrada = useMemo(() => {
    const q = normalizarBusca(busca);
    return q ? lista.filter((p) => normalizarBusca(`${p.nome} ${p.cidade ?? ""}`).includes(q)) : lista;
  }, [busca, lista]);
  const longe = lista.filter((p) => !p.podePresencial).length;

  return (
    <div className="space-y-6">
      {erro ? <p role="alert" className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm">{erro}</p> : null}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Ofertas no app</h2>
        {config.map((c) => <CartaoOferta key={c.id} c={c} onSalvar={salvarOferta} />)}
        <p className="text-xs text-fg-subtle">Os alunos veem tudo em Perfil → “Planos do Montinho”. Cada toque no WhatsApp de visitante aparece em Leads.</p>
        <Link href="/treinador/leads" className="alvo inline-block text-sm font-semibold text-accent">Ver os leads →</Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Pode fazer aula presencial?</h2>
          <span className="text-xs text-fg-subtle">{longe} longe de Alphaville</span>
        </div>
        <p className="text-sm text-fg-muted">Quem estiver “Longe” não vê o Pacote Flexível nem o Presencial. O visitante já informa a cidade no cadastro; quem respondeu que não consegue ir a Alphaville já entra como “Longe”.</p>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou cidade" className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {filtrada.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.nome}{p.visitante ? <span className="ml-1 text-xs font-normal text-fg-muted">· visitante</span> : null}</p>
                <p className="text-xs text-fg-subtle">{p.cidade ?? "Cidade não informada"}</p>
              </div>
              <div className="flex shrink-0 overflow-hidden rounded-full border border-border text-xs font-bold">
                <button type="button" onClick={() => void presencial(p, true)} aria-pressed={p.podePresencial} className={`px-3 py-1.5 ${p.podePresencial ? "bg-success/20 text-success" : "text-fg-muted"}`}>Perto</button>
                <button type="button" onClick={() => void presencial(p, false)} aria-pressed={!p.podePresencial} className={`px-3 py-1.5 ${!p.podePresencial ? "bg-danger/20 text-danger" : "text-fg-muted"}`}>Longe</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CartaoOferta({ c, onSalvar }: { c: OfertaConfig; onSalvar: (id: OfertaConfigId, ativo: boolean, promo: string | null) => Promise<void> }) {
  const [promo, setPromo] = useState(c.promo ?? "");
  const [salvando, setSalvando] = useState(false);
  const n = NOMES[c.id];
  const mudou = (promo.trim() || null) !== (c.promo ?? null);
  async function salvar(ativo: boolean) {
    setSalvando(true);
    await onSalvar(c.id, ativo, promo.trim() || null);
    setSalvando(false);
  }
  return (
    <div className={`space-y-2 rounded-2xl border p-4 ${c.ativo ? "border-accent/50 bg-card" : "border-border bg-bg"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{n.titulo}</p>
          <p className="text-xs text-fg-muted">Para: {n.para}</p>
        </div>
        <button type="button" disabled={salvando} onClick={() => void salvar(!c.ativo)} aria-pressed={c.ativo} className={`touch shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${c.ativo ? "bg-success text-bg" : "border border-border text-fg-muted"}`}>
          {c.ativo ? "Ligada" : "Desligada"}
        </button>
      </div>
      <label className="block text-xs font-semibold text-fg-muted" htmlFor={`promo-${c.id}`}>Vantagem que aparece junto (opcional, só se for real)</label>
      <div className="flex gap-2">
        <input id={`promo-${c.id}`} value={promo} maxLength={120} onChange={(e) => setPromo(e.target.value)} placeholder={n.exemplo} className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
        {mudou ? <button type="button" disabled={salvando} onClick={() => void salvar(c.ativo)} className="touch shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-bg">Salvar</button> : null}
      </div>
    </div>
  );
}
