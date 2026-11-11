"use client";

// Personal: salvar os treinos que fez (Meu treino) como “Treinos do Montinho” e
// editar o título, o foco e a narrativa que os alunos veem; esconder ou arquivar.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataBR } from "@/lib/format";
import { resumoItem, type ItemTreinoMontinho, type TreinoMontinho } from "@/lib/treino/treinos-montinho";

type Feito = { sessaoId: string; titulo: string; feitoEm: string; itens: ItemTreinoMontinho[]; salvo: boolean };

async function chamar(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const j = (await r?.json().catch(() => ({}))) as { error?: string };
  return { ok: !!r?.ok, erro: j.error ?? null };
}

function Editar({ t }: { t: TreinoMontinho }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(t.titulo);
  const [foco, setFoco] = useState(t.foco ?? "");
  const [narrativa, setNarrativa] = useState(t.narrativa ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function salvar(extra: Record<string, unknown> = {}) {
    setOcupado(true);
    const r = await chamar(`/api/treinador/treinos-montinho/${t.id}`, "PATCH", { titulo: titulo.trim() || t.titulo, foco: foco.trim() || null, narrativa: narrativa.trim() || null, ...extra });
    setOcupado(false);
    setMsg(r.ok ? "✅ Salvo" : r.erro ?? "Não deu para salvar agora.");
    if (r.ok) router.refresh();
  }
  return (
    <article className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full px-2 py-0.5 font-bold ${t.publicado ? "bg-success/15 text-success" : "bg-fg-subtle/20 text-fg-muted"}`}>{t.publicado ? "👀 Os alunos veem" : "🙈 Escondido"}</span>
        {t.feito_em ? <span className="text-fg-subtle">feito em {dataBR(t.feito_em)}</span> : null}
        <span className="text-fg-subtle">· {t.itens.length} exercícios</span>
      </div>
      <label className="block space-y-1 text-xs text-fg-muted">Nome<input value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-bg px-2 text-sm text-fg" /></label>
      <label className="block space-y-1 text-xs text-fg-muted">Foco (aparece como etiqueta)<input value={foco} maxLength={200} onChange={(e) => setFoco(e.target.value)} placeholder="Ex.: Abdômen e panturrilha" className="h-10 w-full rounded-lg border border-border bg-bg px-2 text-sm text-fg" /></label>
      <label className="block space-y-1 text-xs text-fg-muted">Narrativa (o que o aluno lê antes de fazer)<textarea value={narrativa} maxLength={1500} rows={5} onChange={(e) => setNarrativa(e.target.value)} className="w-full rounded-lg border border-border bg-bg p-2 text-sm text-fg" /></label>
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-accent">Ver os exercícios</summary>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">{t.itens.map((i, k) => <li key={k}>{i.nome} · {resumoItem(i)}{i.bloco ? " · ⚡ bi-set" : ""}</li>)}</ol>
      </details>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={ocupado} onClick={() => void salvar()} className="touch rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg disabled:opacity-60">Salvar texto</button>
        <button type="button" disabled={ocupado} onClick={() => void salvar({ publicado: !t.publicado })} className="touch rounded-lg border border-border px-3 py-2 text-sm">{t.publicado ? "🙈 Esconder dos alunos" : "👀 Mostrar aos alunos"}</button>
        <button type="button" disabled={ocupado} onClick={() => { if (window.confirm("Arquivar este treino? Ele some da lista dos alunos (nada é apagado).")) void salvar({ arquivar: true }); }} className="touch rounded-lg px-3 py-2 text-sm text-red underline">Arquivar</button>
      </div>
      {msg ? <p className="text-xs">{msg}</p> : null}
    </article>
  );
}

export function PainelTreinosMontinho({ salvos, feitos }: { salvos: TreinoMontinho[]; feitos: Feito[] }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const novos = feitos.filter((f) => !f.salvo);
  async function salvar(f: Feito) {
    setSalvando(f.sessaoId);
    setErro(null);
    const r = await chamar("/api/treinador/treinos-montinho", "POST", { sessao_id: f.sessaoId });
    setSalvando(null);
    if (!r.ok) return setErro(r.erro ?? "Não deu para salvar agora.");
    router.refresh();
  }
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-bold">💾 Treinos que você fez</h2>
        <p className="text-sm text-fg-muted">Do seu Meu treino. Salve e ele aparece para os alunos em Treinar › “Treinos que o Montinho fez”, com um texto pronto que você pode mudar. As suas cargas nunca vão junto.</p>
        {erro ? <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm">{erro}</p> : null}
        {novos.length ? (
          <ul className="space-y-2">
            {novos.map((f) => (
              <li key={f.sessaoId} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <span className="min-w-0 flex-1"><span className="block font-semibold">{f.titulo}</span><span className="block truncate text-xs text-fg-muted">{dataBR(f.feitoEm)} · {f.itens.map((i) => i.nome).join(", ")}</span></span>
                <button type="button" disabled={!!salvando} onClick={() => void salvar(f)} className="touch shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-bg disabled:opacity-60">{salvando === f.sessaoId ? "Salvando…" : "💾 Salvar para os alunos"}</button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-fg-subtle">Nenhum treino novo para salvar. Os treinos que você fizer no Meu treino aparecem aqui.</p>}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">🔥 Treinos do Montinho ({salvos.length})</h2>
        {salvos.length ? salvos.map((t) => <Editar key={t.id} t={t} />) : <p className="text-sm text-fg-subtle">Nenhum salvo ainda.</p>}
      </section>
    </div>
  );
}
