"use client";

// Treino extra montado pelo app: três perguntas de um toque, prévia e começar.
// Antes da semana cumprida, manda de volta para a sequência.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { FOCOS_EXTRA, TEMPOS_EXTRA_MIN, type CorpoExtra, type FocoExtra, type ResultadoExtraGerado } from "@/lib/treino/extra-gerado";
import type { ContextoExtraGerado } from "@/lib/data/extra-gerado";
import { BRAND } from "@/config/brand";

const CORPO: Record<CorpoExtra, string> = { bem: "Bem recuperado", cansado: "Um pouco cansado", dor: "Com dor ou desconforto" };
const chip = (on: boolean) => `touch rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`;
const chave = () => `extra-gerado:${new Date().toISOString().slice(0, 10)}:${Math.random().toString(36).slice(2, 10)}`;

export function MontarExtra({ ctx }: { ctx: ContextoExtraGerado }) {
  const router = useRouter();
  const toast = useToast();
  const [tempo, setTempo] = useState<number | null>(null);
  const [foco, setFoco] = useState<FocoExtra | null>(null);
  const [corpo, setCorpo] = useState<CorpoExtra | null>(null);
  const [previa, setPrevia] = useState<ResultadoExtraGerado | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (ctx.bloqueio) {
    const voltarASequencia = !ctx.cumprida && ctx.proximo && !ctx.emAndamento;
    return (
      <Card>
        <CardBody className="space-y-3 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Primeiro a sua sequência</p>
          <p className="font-semibold">{ctx.bloqueio}</p>
          {voltarASequencia ? (
            <>
              {ctx.programados ? (
                <div className="h-2 overflow-hidden rounded-full bg-border" aria-hidden>
                  <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.round((ctx.feitos / ctx.programados) * 100))}%` }} />
                </div>
              ) : null}
              <p className="text-fg-muted">O extra libera quando você fizer todos os treinos programados da semana. Bora continuar?</p>
              <Link href={`/aluno/treino/${ctx.proximo!.id}`} className="touch inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 font-bold text-bg">
                Fazer o treino {ctx.proximo!.letra} · {ctx.proximo!.nome}
              </Link>
            </>
          ) : ctx.emAndamento ? (
            <Link href={`/aluno/treino/${ctx.emAndamento.treinoId}?sessao=${ctx.emAndamento.id}`} className="touch inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 font-bold text-bg">
              Voltar ao treino em andamento
            </Link>
          ) : null}
        </CardBody>
      </Card>
    );
  }

  const pronto = tempo && foco && corpo;
  async function montar(f = foco, t = tempo, c = corpo) {
    if (!f || !t || !c) return;
    setCarregando(true);
    const r = await fetch("/api/extras/montar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foco: f, tempo_min: t, corpo: c }) })
      .then((x) => x.json())
      .catch(() => null);
    setCarregando(false);
    if (!r) return toast.error("Não foi possível montar agora. Tente de novo.");
    if (r.ctx?.bloqueio) { router.refresh(); return; }
    setPrevia(r.resultado ?? null);
  }
  async function comecar() {
    if (!foco || !tempo || !corpo) return;
    setCarregando(true);
    const r = await fetch("/api/extras/montar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foco, tempo_min: tempo, corpo, iniciar: true, client_key: chave() }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { id?: string; treinoId?: string; error?: string } | null;
    if (!r?.ok || !d?.id) { setCarregando(false); return toast.error(d?.error ?? "Não foi possível começar agora."); }
    router.push(`/aluno/treino/${d.treinoId}?sessao=${d.id}`);
  }

  return (
    <Card>
      <CardBody className="space-y-4 text-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Semana cumprida · {ctx.feitos} de {ctx.programados} treinos ✓</p>
          <h2 className="mt-1 text-lg font-bold">Monte o seu treino extra</h2>
          <p className="text-fg-muted">Três toques e o app monta com exercícios do seu plano, já com a carga da última vez.</p>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="font-semibold">Quanto tempo você tem?</legend>
          <div className="flex flex-wrap gap-1.5">
            {TEMPOS_EXTRA_MIN.map((m) => (
              <button key={m} type="button" aria-pressed={tempo === m} onClick={() => { setTempo(m); setPrevia(null); }} className={chip(tempo === m)}>
                {m} min
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="font-semibold">O que você quer hoje?</legend>
          <div className="grid gap-1.5">
            {(Object.keys(FOCOS_EXTRA) as FocoExtra[]).map((k) => (
              <button key={k} type="button" aria-pressed={foco === k} onClick={() => { setFoco(k); setPrevia(null); }} className={`touch rounded-lg border px-3 py-2 text-left ${foco === k ? "border-accent bg-accent/10" : "border-border"}`}>
                <span className={`block font-semibold ${foco === k ? "text-accent" : ""}`}>{FOCOS_EXTRA[k].rotulo}</span>
                <span className="block text-xs text-fg-muted">{FOCOS_EXTRA[k].detalhe}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="font-semibold">Como está o seu corpo?</legend>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CORPO) as CorpoExtra[]).map((k) => (
              <button key={k} type="button" aria-pressed={corpo === k} onClick={() => { setCorpo(k); setPrevia(null); }} className={chip(corpo === k)}>
                {CORPO[k]}
              </button>
            ))}
          </div>
        </fieldset>

        {!previa ? (
          <button type="button" disabled={!pronto || carregando} onClick={() => void montar()} className="touch w-full rounded-lg bg-accent px-4 py-3 font-bold text-bg disabled:opacity-50">
            {carregando ? "Montando…" : "Montar meu extra"}
          </button>
        ) : previa.ok ? (
          <div className="space-y-3 rounded-xl border border-accent/40 bg-accent/5 p-3" aria-live="polite">
            <div>
              <p className="font-bold">{previa.extra.titulo}</p>
              <p className="text-xs text-fg-muted">
                {previa.extra.exercicios.length} exercício{previa.extra.exercicios.length > 1 ? "s" : ""} · {previa.extra.series} séries · cerca de {previa.extra.duracaoMin} min
              </p>
            </div>
            <ol className="space-y-1">
              {previa.extra.exercicios.map((x, i) => (
                <li key={x.id} className="flex justify-between gap-3">
                  <span>{i + 1}. {x.nome}</span>
                  <span className="shrink-0 text-xs text-fg-muted">{x.series} × {x.reps}</span>
                </li>
              ))}
            </ol>
            {previa.extra.avisos.length ? <ul className="space-y-0.5 text-[11px] text-fg-subtle">{previa.extra.avisos.map((a) => <li key={a}>{a}</li>)}</ul> : null}
            <p className="text-[11px] text-fg-subtle">Séries com 2 repetições sobrando, sem técnica avançada. Treino extra não conta na meta semanal; fica registrado separado.</p>
            <button type="button" disabled={carregando} onClick={() => void comecar()} className="touch w-full rounded-lg bg-accent px-4 py-3 font-bold text-bg disabled:opacity-60">
              {carregando ? "Abrindo…" : "Começar extra"}
            </button>
            <button type="button" onClick={() => setPrevia(null)} className="w-full py-1 text-xs text-fg-muted underline-offset-2 hover:underline">
              Mudar as respostas
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-3" aria-live="polite">
            <p>{previa.motivo}</p>
            {previa.sugerirFoco && corpo !== "dor" ? (
              <button type="button" onClick={() => { setFoco(previa.sugerirFoco!); void montar(previa.sugerirFoco!, tempo, corpo); }} className="touch w-full rounded-lg border border-accent/60 px-4 py-2.5 text-sm font-bold text-accent">
                Montar com {FOCOS_EXTRA[previa.sugerirFoco].rotulo.toLowerCase()}
              </button>
            ) : null}
            {corpo === "dor" ? <p className="text-xs text-fg-muted">Fale com o {BRAND.name} pelo WhatsApp antes de treinar mais.</p> : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
