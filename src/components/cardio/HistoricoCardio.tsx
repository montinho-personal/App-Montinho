"use client";

// Histórico de cardio: semanas (meta × feito) e lista dos registros, com
// correção e exclusão dos que a pessoa mesma registrou. Extras e Strava
// aparecem com a origem e não são editáveis aqui.
import { useEffect, useState } from "react";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { useRouter } from "next/navigation";
import { eventoGa } from "@/components/analytics/ga";
import { MODALIDADES } from "@/lib/cardio/modalidades";
import type { CardioFeito, SemanaCardio } from "@/lib/cardio/regras";

const ORIGEM: Record<CardioFeito["origem"], string> = { app: "", personal: "registrado pelo Montinho", extra: "treino extra", strava: "Strava" };
const STATUS: Record<CardioFeito["status"], string> = { concluido: "✅", parcial: "🟡", nao_realizado: "⏸️" };
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function SemanasCardio({ semanas }: { semanas: SemanaCardio[] }) {
  const ult = semanas.filter((s) => s.alvoSessoes > 0 || s.minutos > 0).slice(-8);
  if (!ult.length) return null;
  const max = Math.max(...ult.map((s) => Math.max(s.minutos, s.alvoMin)), 1);
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-sm font-semibold">Últimas semanas (minutos)</p>
      <div className="flex h-28 items-end gap-2" role="img" aria-label={ult.map((s) => `Semana de ${dataBR(s.inicio)}: ${s.minutos} de ${s.alvoMin} minutos`).join("; ")}>
        {ult.map((s) => (
          <div key={s.inicio} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative flex h-24 w-full items-end justify-center">
              {s.alvoMin ? <div className="absolute w-full border-t-2 border-dashed border-fg-subtle" style={{ bottom: `${(s.alvoMin / max) * 100}%` }} /> : null}
              <div className={`w-3/4 rounded-t ${s.status === "cumprida" ? "bg-success" : s.status === "pausada" ? "bg-fg-subtle" : "bg-accent"}`} style={{ height: `${Math.max(2, (s.minutos / max) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-fg-subtle">{dataBR(s.inicio)}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-fg-subtle">Tracejado = meta da semana. Verde = semana cumprida.</p>
    </div>
  );
}

export function HistoricoCardio({ feitos, rotaCorrecao, personal = false }: { feitos: CardioFeito[]; /** `/api/cardio` (aluno) ou `/api/alunos/<id>/cardio/registros` (personal). */ rotaCorrecao: string; /** Personal corrige também o que ele mesmo registrou. */ personal?: boolean }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [minutos, setMinutos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const lista = [...feitos].reverse().slice(0, 40);
  useEffect(() => {
    eventoGa("cardio_history_view", { itens: Math.min(feitos.length, 40) });
  }, [feitos.length]);
  async function corrigir(id: string, corpo: Record<string, unknown>) {
    setErro(null);
    const r = await fetch(`${rotaCorrecao}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
    if (!r?.ok) {
      const d = await r?.json().catch(() => ({}));
      setErro(d?.error ?? "Não foi possível salvar agora.");
      return;
    }
    setEditando(null);
    router.refresh();
  }
  if (!lista.length) return <p className="text-sm text-fg-muted">Nenhum cardio registrado ainda.</p>;
  return (
    <div className="space-y-2">
      {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {lista.map((f) => {
          const m = MODALIDADES[f.modalidade];
          return (
            <li key={f.id} className="p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {STATUS[f.status]} {m.emoji} {m.nome} · {f.status === "nao_realizado" ? "não realizado" : `${f.duracaoMin} min`}
                    {f.planejadoMin && f.status !== "nao_realizado" ? <span className="font-normal text-fg-muted"> (prescrito {f.planejadoMin})</span> : null}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {dataBR(f.data)}
                    {f.esforco != null ? ` · esforço ${f.esforco}/10` : ""}
                    {f.distanciaKm ? ` · ${String(f.distanciaKm).replace(".", ",")} km` : ""}
                    {f.fcMedia ? ` · FC média ${Math.round(f.fcMedia)}` : ""}
                    {!f.prescricaoId && f.origem === "app" ? " · livre" : ""}
                    {ORIGEM[f.origem] ? ` · ${ORIGEM[f.origem]}` : ""}
                  </p>
                </div>
                {f.editavel || (personal && f.origem === "personal") ? (
                  <button type="button" onClick={() => { setEditando(editando === f.id ? null : f.id); setMinutos(f.duracaoMin); }} className="alvo rounded-md px-2 py-1 text-xs text-accent">Corrigir</button>
                ) : null}
              </div>
              {editando === f.id ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface p-2 text-xs">
                  <label className="flex items-center gap-1">
                    Minutos
                    <CampoNumero min={0} max={600} valor={minutos} onChange={setMinutos} className="h-9 w-20 rounded-md border border-border bg-card px-2" aria-label="Minutos" />
                  </label>
                  <button type="button" onClick={() => void corrigir(f.id, minutos > 0 ? { duracao_min: minutos, status: f.status === "nao_realizado" ? "concluido" : f.status } : { status: "nao_realizado" })} className="alvo rounded-md bg-accent px-3 py-1.5 font-bold text-bg">Salvar</button>
                  <button type="button" onClick={() => { if (confirm("Excluir este cardio? Ele deixa de contar daqui em diante (troféus já ganhos ficam).")) void corrigir(f.id, { remover: true }); }} className="alvo rounded-md border border-border px-3 py-1.5 text-danger">Excluir</button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
