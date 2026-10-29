"use client";

// Registro rápido de cardio (2 toques no prescrito: “Fiz tudo” → esforço).
// Prescrito já vem preenchido; detalhes (distância, FC…) ficam recolhidos.
// Ao terminar, comemora os troféus novos com a mesma celebração da musculação.
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";
import { useEffect, useMemo, useRef, useState } from "react";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { useRouter } from "next/navigation";
import { CelebracaoMedalha, type ConquistaCelebravel } from "@/components/chalala/CelebracaoMedalha";
import { eventoGa } from "@/components/analytics/ga";
import { MODALIDADES, MODALIDADE_IDS, INTENSIDADES } from "@/lib/cardio/modalidades";
import type { CardioPrescricao, IntensidadeCardio, ModalidadeCardio } from "@/lib/supabase/types-extended";

type Status = "concluido" | "parcial" | "nao_realizado";
type Props = {
  prescricao?: Pick<CardioPrescricao, "id" | "modalidade" | "duracao_min" | "intensidade" | "tipo" | "intervalos"> | null;
  /** Treino de musculação de onde veio (cardio depois do treino). */
  sessionId?: string | null;
  nome?: string;
  onFechar: () => void;
  onRegistrado?: () => void;
  /** Personal registrando pelo aluno: `/api/alunos/<id>/cardio/registros`. */
  rota?: string;
  /** Vindo do cronômetro: já sabe os minutos, a modalidade e se terminou. */
  inicial?: { minutos?: number; modalidade?: ModalidadeCardio; status?: Status };
  /** Vindo do cronômetro: grava sozinho ao abrir (o esforço fica opcional, depois). */
  salvarAoAbrir?: boolean;
};

const novaChave = () => `cardio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function RegistrarCardio({ prescricao, sessionId, nome, onFechar, onRegistrado, rota = "/api/cardio", inicial, salvarAoAbrir = false }: Props) {
  const router = useRouter();
  const [chave] = useState(novaChave);
  const [modalidade, setModalidade] = useState<ModalidadeCardio>(inicial?.modalidade ?? (prescricao && prescricao.modalidade !== "livre" ? prescricao.modalidade : "caminhada"));
  const [status, setStatus] = useState<Status | null>(inicial?.status ?? null);
  const [minutos, setMinutos] = useState<number>(inicial?.minutos ?? prescricao?.duracao_min ?? 30);
  // Prescrito, mas fez outro cardio no lugar (ex.: bike em vez de esteira): continua valendo pelo prescrito.
  const livre = prescricao?.modalidade === "livre";
  const [trocou, setTrocou] = useState(livre || (!!prescricao && !!inicial?.modalidade && inicial.modalidade !== prescricao.modalidade));
  const [intensidade, setIntensidade] = useState<IntensidadeCardio | null>(prescricao?.intensidade ?? null);
  const [esforco, setEsforco] = useState<number | null>(null);
  const [detalhes, setDetalhes] = useState(false);
  const [extra, setExtra] = useState({ distancia_km: "", velocidade_kmh: "", inclinacao_pct: "", fc_media: "", fc_max: "", observacoes: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ status: Status; minutos: number; id: string | null } | null>(null);
  const [esforcoDepois, setEsforcoDepois] = useState<number | null>(null);
  const autoSalvo = useRef(false);
  const [novas, setNovas] = useState<Array<ConquistaCelebravel & { id: string }>>([]);
  const info = MODALIDADES[modalidade];
  const planejado = prescricao?.duracao_min ?? null;

  const precisaMinutos = status !== "nao_realizado";
  const pronto = !!status && (!precisaMinutos || minutos >= 1);
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  async function enviar() {
    if (!status) return;
    setEnviando(true);
    setErro(null);
    const corpo = {
      client_key: chave,
      prescricao_id: prescricao?.id ?? null,
      modalidade,
      status,
      duracao_min: status === "nao_realizado" ? 0 : minutos,
      intensidade: status === "nao_realizado" ? null : intensidade,
      esforco: status === "nao_realizado" ? null : esforco,
      distancia_km: num(extra.distancia_km),
      velocidade_kmh: num(extra.velocidade_kmh),
      inclinacao_pct: num(extra.inclinacao_pct),
      fc_media: num(extra.fc_media),
      fc_max: num(extra.fc_max),
      observacoes: extra.observacoes.trim() || null,
      session_id: sessionId ?? null,
    };
    try {
      const r = await fetch(rota, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Não foi possível registrar agora.");
      if (rota === "/api/cardio") eventoGa(status === "concluido" ? "cardio_completed" : status === "parcial" ? "cardio_partial" : "cardio_skipped", { prescrito: prescricao ? 1 : 0 });
      const lista = (d.novas ?? []) as Array<ConquistaCelebravel & { id: string }>;
      if (lista.length) {
        eventoGa("cardio_trophy_unlocked", { quantidade: lista.length });
        if (lista.some((c) => c.codigo === "cardio_semana_ritmo" || c.codigo === "cardio_meta_semana")) eventoGa("cardio_goal_completed");
      }
      setFeito({ status, minutos: corpo.duracao_min, id: (d.registro as { id?: string } | undefined)?.id ?? null });
      setNovas(lista);
      onRegistrado?.();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Sem internet? Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  // Cronômetro terminou: grava na hora, sem depender de achar o botão “Salvar”.
  useEffect(() => {
    if (!salvarAoAbrir || autoSalvo.current || !status) return;
    autoSalvo.current = true;
    void enviar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salvarAoAbrir]);

  /** Esforço depois de gravado (opcional): corrige o registro. */
  function anotarEsforco(n: number) {
    setEsforcoDepois(n);
    if (feito?.id) fetch(`/api/cardio/${feito.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ esforco: n }) }).catch(() => undefined);
  }

  const fecharCelebracao = () => {
    fetch("/api/conquistas/vistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: novas.map((c) => c.id) }) }).catch(() => undefined);
    setNovas([]);
  };

  const opcoesStatus = useMemo(
    () =>
      [
        { v: "concluido" as const, t: planejado && !inicial?.minutos ? `✅ Fiz tudo (${planejado} min)` : "✅ Concluído" },
        { v: "parcial" as const, t: "🟡 Fiz uma parte" },
        { v: "nao_realizado" as const, t: "⏸️ Hoje não deu" },
      ],
    [planejado, inicial?.minutos]
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-cardio">
      {novas.length ? <CelebracaoMedalha conquistas={novas} nome={nome} onFechar={fecharCelebracao} /> : null}
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg p-4 pb-8 sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id="titulo-cardio" className="text-lg font-bold">
            {info.emoji} {prescricao ? `Registrar ${info.nome.toLowerCase()}` : "Registrar cardio"}
          </h2>
          <button type="button" onClick={onFechar} className="alvo rounded-md px-2 py-1 text-fg-muted" aria-label="Fechar">✕</button>
        </div>
        {rota === "/api/cardio" ? <ChamadaTrofeu acao="cardio" className="mb-3" /> : null}

        {salvarAoAbrir && enviando && !feito ? (
          <p className="py-10 text-center text-lg font-bold" aria-live="polite">❤️‍🔥 Salvando seu cardio…</p>
        ) : feito ? (
          <div className="space-y-3 text-center" aria-live="polite">
            <p className="text-4xl">{feito.status === "nao_realizado" ? "🫶" : "❤️‍🔥"}</p>
            <p className="text-lg font-bold">{feito.status === "nao_realizado" ? "Anotado. Amanhã tem mais!" : `${feito.minutos} min de cardio registrados. Chalalá!`}</p>
            <p className="text-sm text-fg-muted">{feito.status === "nao_realizado" ? "Avisar quando não dá também ajuda o Montinho a ajustar o seu plano." : "Já está no seu histórico. O que conta é cumprir o cardio certo, com constância."}</p>
            {salvarAoAbrir && feito.id && feito.status !== "nao_realizado" ? (
              <div className="text-left">
                <p className="mb-1 text-sm font-semibold">Como foi o esforço? <span className="font-normal text-fg-muted">(opcional)</span></p>
                <div className="grid grid-cols-11 gap-1" role="group" aria-label="Esforço percebido">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button key={i} type="button" aria-pressed={esforcoDepois === i} onClick={() => anotarEsforco(i)} className={`touch h-10 rounded-md border text-sm font-bold ${esforcoDepois === i ? "border-accent bg-accent text-bg" : "border-border"}`}>{i}</button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-fg-subtle"><span>Leve</span><span>Moderado</span><span>Forte</span></div>
              </div>
            ) : null}
            <button type="button" onClick={onFechar} className="alvo w-full rounded-xl bg-accent px-4 py-3 font-bold text-bg">Pronto</button>
          </div>
        ) : (
          <div className="space-y-4">
            {prescricao ? (
              <div className="space-y-2">
                <p className="rounded-lg bg-surface px-3 py-2 text-sm">
                  Prescrito: <strong>{livre ? "cardio à sua escolha" : MODALIDADES[prescricao.modalidade as ModalidadeCardio].nome.toLowerCase()}, {prescricao.duracao_min} min</strong> · {INTENSIDADES[prescricao.intensidade].nome.toLowerCase()}
                  {prescricao.tipo === "intervalado" && prescricao.intervalos ? ` · ${prescricao.intervalos}` : ""}
                </p>
                {livre ? (
                  <p className="text-sm font-semibold">Qual cardio você fez?</p>
                ) : (
                  <button type="button" aria-expanded={trocou} onClick={() => { if (trocou && prescricao.modalidade !== "livre") setModalidade(prescricao.modalidade); setTrocou(!trocou); }} className="text-sm text-accent underline-offset-2 hover:underline">
                    {trocou ? "↩ Fiz o que estava prescrito" : "🔁 Fiz outro cardio no lugar"}
                  </button>
                )}
                {trocou ? (
                  <div className="grid grid-cols-3 gap-2">
                    {MODALIDADE_IDS.map((m) => (
                      <button key={m} type="button" aria-pressed={modalidade === m} onClick={() => setModalidade(m)} className={`touch rounded-lg border px-2 py-2 text-xs font-semibold ${modalidade === m ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>
                        <span className="block text-lg">{MODALIDADES[m].emoji}</span>
                        {MODALIDADES[m].nome}
                      </button>
                    ))}
                    <p className="col-span-3 text-[11px] text-fg-subtle">{livre ? "O Montinho deixou você escolher: conta como o cardio prescrito." : "Conta como o cardio prescrito de hoje. O Montinho vê que você trocou."}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-semibold">Qual cardio?</p>
                <div className="grid grid-cols-3 gap-2">
                  {MODALIDADE_IDS.map((m) => (
                    <button key={m} type="button" aria-pressed={modalidade === m} onClick={() => setModalidade(m)} className={`touch rounded-lg border px-2 py-2 text-xs font-semibold ${modalidade === m ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>
                      <span className="block text-lg">{MODALIDADES[m].emoji}</span>
                      {MODALIDADES[m].nome}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-fg-subtle">Cardio livre: aparece no seu histórico como “livre”, fora do que o Montinho prescreveu.</p>
              </div>
            )}

            <div className="grid gap-2" role="group" aria-label="Como foi?">
              {opcoesStatus.map((o) => (
                <button key={o.v} type="button" aria-pressed={status === o.v} onClick={() => { setStatus(o.v); if (o.v === "concluido" && planejado && !inicial?.minutos) setMinutos(planejado); if (o.v === "parcial" && planejado && minutos >= planejado) setMinutos(Math.max(5, Math.round(planejado / 2))); }} className={`touch rounded-xl border px-4 py-3 text-left font-semibold ${status === o.v ? "border-accent bg-accent/15" : "border-border"}`}>
                  {o.t}
                </button>
              ))}
            </div>

            {status && status !== "nao_realizado" ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-semibold" htmlFor="min-cardio">Quantos minutos?</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setMinutos((m) => Math.max(1, m - 5))} className="alvo h-12 w-12 rounded-lg border border-border text-xl" aria-label="Menos 5 minutos">−</button>
                    <CampoNumero id="min-cardio" min={0} max={600} valor={minutos} onChange={setMinutos} className="h-12 w-24 rounded-lg border border-border bg-card text-center text-xl font-bold" />
                    <button type="button" onClick={() => setMinutos((m) => Math.min(600, m + 5))} className="alvo h-12 w-12 rounded-lg border border-border text-xl" aria-label="Mais 5 minutos">+</button>
                    <span className="text-sm text-fg-muted">min</span>
                  </div>
                  {planejado && minutos > planejado * 1.25 ? <p className="mt-1 text-xs text-fg-muted">Passou bem do prescrito ({planejado} min). Tudo bem de vez em quando — o objetivo é o cardio certo, não mais cardio.</p> : null}
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold">Esforço (0 = nada, 10 = máximo)</p>
                  <div className="grid grid-cols-11 gap-1" role="group" aria-label="Esforço percebido">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button key={i} type="button" aria-pressed={esforco === i} onClick={() => setEsforco(i)} className={`touch h-10 rounded-md border text-sm font-bold ${esforco === i ? "border-accent bg-accent text-bg" : "border-border"}`}>{i}</button>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-fg-subtle"><span>Leve</span><span>Moderado</span><span>Forte</span></div>
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold">Intensidade que sentiu</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(INTENSIDADES) as IntensidadeCardio[]).map((k) => (
                      <button key={k} type="button" aria-pressed={intensidade === k} onClick={() => setIntensidade(k)} className={`touch rounded-lg border px-2 py-2 text-xs ${intensidade === k ? "border-accent bg-accent/15 font-bold" : "border-border"}`}>
                        {INTENSIDADES[k].nome}
                        <span className="block text-[10px] text-fg-subtle">{INTENSIDADES[k].dica}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => setDetalhes((v) => !v)} className="text-sm text-accent underline-offset-2 hover:underline" aria-expanded={detalhes}>
                  {detalhes ? "− Menos detalhes" : "+ Distância, velocidade, batimentos (opcional)"}
                </button>
                {detalhes ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {info.distancia ? <Campo rotulo="Distância (km)" valor={extra.distancia_km} onChange={(v) => setExtra({ ...extra, distancia_km: v })} /> : null}
                    {info.velocidade ? <Campo rotulo="Velocidade (km/h)" valor={extra.velocidade_kmh} onChange={(v) => setExtra({ ...extra, velocidade_kmh: v })} /> : null}
                    {info.inclinacao ? <Campo rotulo="Inclinação (%)" valor={extra.inclinacao_pct} onChange={(v) => setExtra({ ...extra, inclinacao_pct: v })} /> : null}
                    <Campo rotulo="FC média (bpm)" valor={extra.fc_media} onChange={(v) => setExtra({ ...extra, fc_media: v })} />
                    <Campo rotulo="FC máxima (bpm)" valor={extra.fc_max} onChange={(v) => setExtra({ ...extra, fc_max: v })} />
                    <label className="col-span-2 block">
                      <span className="text-xs text-fg-muted">Observação</span>
                      <textarea rows={2} maxLength={300} value={extra.observacoes} onChange={(e) => setExtra({ ...extra, observacoes: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-card p-2" />
                    </label>
                    <p className="col-span-2 text-[11px] text-fg-subtle">Batimentos são dado de saúde: só você e o Montinho veem.</p>
                  </div>
                ) : null}
              </>
            ) : null}

            {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
            <button type="button" disabled={!pronto || enviando} onClick={() => void enviar()} className="alvo w-full rounded-xl bg-accent px-4 py-3 text-base font-bold text-bg disabled:opacity-50">
              {enviando ? "Salvando…" : "Salvar cardio"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-fg-muted">{rotulo}</span>
      <input type="text" inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-2" />
    </label>
  );
}
