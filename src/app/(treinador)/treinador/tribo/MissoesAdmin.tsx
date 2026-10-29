"use client";

// Missões coletivas: criar (com sugestões prontas) e ligar/desligar.
// Nada é apagado: o histórico das missões fica.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampoNumero } from "@/components/ui/CampoNumero";

const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
function mesDe(hoje: string, deslocamento: number) {
  const [a, m] = hoje.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + deslocamento, 1));
  const ano = d.getUTCFullYear(), mes = d.getUTCMonth() + 1;
  const mm = String(mes).padStart(2, "0");
  return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${String(ultimoDia(ano, mes)).padStart(2, "0")}`, nome: new Date(Date.UTC(ano, mes - 1, 15)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" }) };
}

const MODELOS = [
  { id: "cardio", rotulo: "❤️‍🔥 Cardio do mês", nome: "Mês em Movimento", descricao: "Juntos, somar minutos de cardio neste mês. Cada cardio válido conta!", minutos: 3000, treinos: null },
  { id: "treinos", rotulo: "🏋️ Treinos do mês", nome: "Tribo de Ferro", descricao: "Juntos, somar treinos de musculação concluídos neste mês.", minutos: null, treinos: 100 },
  { id: "combo", rotulo: "🔥 Combinada", nome: "Combo da Tribo", descricao: "Cardio e musculação juntos: as duas metas no mesmo mês.", minutos: 2000, treinos: 80 },
] as const;

export function MissoesAdmin({ hoje, alternar }: { hoje: string; alternar?: { id: string; ativa: boolean } }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [modelo, setModelo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [minutos, setMinutos] = useState<number | null>(null);
  const [treinos, setTreinos] = useState<number | null>(null);
  const [mes, setMes] = useState<0 | 1>(1);
  const [recorrente, setRecorrente] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (alternar) {
    return (
      <button
        type="button"
        disabled={ocupado}
        onClick={async () => {
          if (alternar.ativa && !confirm("Desligar esta missão? Ela some para os alunos e não entrega mais troféus (os já entregues ficam).")) return;
          setOcupado(true);
          await fetch(`/api/tribo/missoes/${alternar.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativa: !alternar.ativa }) }).catch(() => null);
          setOcupado(false);
          router.refresh();
        }}
        className="alvo min-h-10 rounded-lg border border-border px-3 text-xs text-fg-muted disabled:opacity-50"
      >
        {alternar.ativa ? "Desligar missão" : "Ligar de novo"}
      </button>
    );
  }

  const periodo = mesDe(hoje, mes);
  function usar(m: (typeof MODELOS)[number]) {
    setNome(m.nome);
    setDescricao(m.descricao);
    setMinutos(m.minutos);
    setTreinos(m.treinos);
    setModelo(m.id);
    setAberto(true);
  }
  async function criar() {
    setOcupado(true);
    setMsg(null);
    const r = await fetch("/api/tribo/missoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, descricao: descricao.trim() || null, meta_minutos: minutos, meta_treinos: treinos, inicio: periodo.inicio, fim: periodo.fim, recorrente }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setOcupado(false);
    if (!r?.ok) return setMsg({ ok: false, texto: j?.error ?? "Não foi possível criar." });
    setMsg({ ok: true, texto: "Missão criada! Os alunos já veem em Conquistas → Missões." });
    setAberto(false);
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded-2xl border border-accent/40 bg-grain-strong p-4" aria-labelledby="nova-missao">
      <h2 id="nova-missao" className="text-sm font-bold">🎯 Nova missão coletiva</h2>
      <p className="text-xs text-fg-muted">Escolha um modelo e ajuste a meta. Dica: metas que a tribo alcança com constância (não com exagero) motivam mais.</p>
      <div className="flex flex-wrap gap-2">
        {MODELOS.map((m) => (
          <button key={m.id} type="button" onClick={() => usar(m)} className="alvo min-h-10 rounded-lg border border-border bg-bg px-3 text-sm font-semibold">{m.rotulo}</button>
        ))}
      </div>
      {aberto ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-xs text-fg-muted">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3" />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-fg-muted">Descrição (o que o aluno lê)</span>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-xs text-fg-muted">Minutos de cardio (vazio = sem)</span>
              <CampoNumero key={`m-${modelo}`} valor={minutos} onChange={(v) => setMinutos(v)} onVazio={() => setMinutos(null)} min={10} max={10000000} className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-fg-muted">Treinos de musculação (vazio = sem)</span>
              <CampoNumero key={`t-${modelo}`} valor={treinos} onChange={(v) => setTreinos(v)} onVazio={() => setTreinos(null)} min={1} max={1000000} className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {([0, 1] as const).map((d) => (
              <button key={d} type="button" onClick={() => setMes(d)} className={`alvo min-h-10 rounded-lg border px-3 ${mes === d ? "border-accent bg-accent/10 font-bold text-accent" : "border-border"}`}>
                {d === 0 ? "Este mês" : "Próximo mês"} ({mesDe(hoje, d).nome})
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} className="h-5 w-5" />
            Repetir todo mês (a missão do mês seguinte é criada sozinha)
          </label>
          <button type="button" disabled={ocupado || nome.trim().length < 3 || (minutos == null && treinos == null)} onClick={() => void criar()} className="alvo min-h-11 w-full rounded-lg bg-accent px-4 font-bold text-bg disabled:opacity-50">
            {ocupado ? "Criando…" : `Criar missão de ${periodo.inicio.slice(8)}/${periodo.inicio.slice(5, 7)} a ${periodo.fim.slice(8)}/${periodo.fim.slice(5, 7)}`}
          </button>
        </div>
      ) : null}
      {msg ? <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`} role="status">{msg.texto}</p> : null}
    </section>
  );
}
