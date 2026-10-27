"use client";

// Montinho Pulso — check-in rápido (10–15 s), opcional, no máximo 2 perguntas.
// Nunca bloqueia o treino. Corpo e sono só com consentimento específico.
// Com desconforto: orienta procurar avaliação e avisa que o Montinho vai ver;
// não diz “pode treinar” e não muda o treino.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Montinho } from "@/components/jornada-chalala/Personagens";
import { eventoGa } from "@/components/analytics/ga";
import { BRAND } from "@/config/brand";
import { PERGUNTAS, opcao, type Dimensao } from "@/lib/pulso/perguntas";
import { checkinPreDoPulso, type CheckinPre } from "@/lib/pulso/equivalencias";
import type { ContextoPulsoAluno, Consentimento, RespostasHoje } from "@/lib/data/pulso";

type Props = {
  ctx: ContextoPulsoAluno;
  momento: "pre_treino" | "inicio";
  /** Equivalente antigo (o treino usa para cuidar de quem está com dor). */
  onCheckin?: (v: CheckinPre | null) => void;
  /** Dimensões já respondidas em outra tela agora mesmo (ex.: corpo no treino extra). */
  jaRespondidas?: Dimensao[];
  /** Conteúdo extra quando há desconforto (ex.: campo “onde e como?”). */
  aoDesconforto?: ReactNode;
};

const NEGATIVO = (d: Dimensao, v: string) => (d === "dificuldade" ? v !== "nada" : (opcao(d, v)?.nivel ?? 0) < 0);

async function enviar(corpo: Record<string, unknown>): Promise<{ checkinPre?: CheckinPre | null } | null> {
  try {
    const r = await fetch("/api/pulso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    return r.ok ? await r.json() : null;
  } catch {
    // Sem internet: o Pulso é opcional, o treino segue normalmente.
    return null;
  }
}

export function PulsoCard({ ctx, momento, onCheckin, jaRespondidas = [], aoDesconforto }: Props) {
  const [consent, setConsent] = useState<Consentimento>(ctx.consentimento);
  const [respostas, setRespostas] = useState<RespostasHoje>({});
  const [estado, setEstado] = useState<"perguntando" | "feito" | "pulado" | "resumo">(() => {
    if (ctx.pulouHoje) return "pulado";
    const escolha = ctx.consentimento === "sim" || ctx.consentimento === "nunca" ? ctx.escolhaCom : ctx.escolhaSem;
    return escolha.perguntas.filter((d) => !jaRespondidas.includes(d)).length ? "perguntando" : Object.keys(ctx.hoje).length ? "resumo" : "feito";
  });
  const [mudando, setMudando] = useState(false);
  const [interagiu, setInteragiu] = useState(false);
  const vistoRef = useRef(false);

  const perguntas = useMemo<Dimensao[]>(() => {
    if (mudando) return (consent === "sim" ? ["recuperacao", "energia"] : ["energia"]) as Dimensao[];
    const escolha = consent === "sim" || consent === "nunca" ? ctx.escolhaCom : ctx.escolhaSem;
    return escolha.perguntas.filter((d) => !jaRespondidas.includes(d) && (consent === "sim" || !PERGUNTAS[d].saude || consent === "nunca"));
  }, [consent, ctx, jaRespondidas, mudando]);

  // Primeira vez com pergunta de saúde: pede o consentimento antes.
  const precisaConsentir = consent === "nunca" && perguntas.some((d) => PERGUNTAS[d].saude);
  const visiveis = precisaConsentir ? [] : perguntas;

  useEffect(() => {
    if (estado === "perguntando" && !vistoRef.current) {
      vistoRef.current = true;
      eventoGa("pulso_visualizado", { momento });
    }
  }, [estado, momento]);

  const completo = visiveis.length > 0 && visiveis.every((d) => respostas[d] !== undefined && (!Array.isArray(respostas[d]) || (respostas[d] as string[]).length > 0));

  function responder(d: Dimensao, v: string) {
    let novo: RespostasHoje;
    if (PERGUNTAS[d].multipla) {
      const atual = (respostas[d] as string[] | undefined) ?? [];
      const lista = v === "nada" ? (atual.includes("nada") ? [] : ["nada"]) : atual.includes(v) ? atual.filter((x) => x !== v) : [...atual.filter((x) => x !== "nada"), v];
      novo = { ...respostas, [d]: lista };
    } else novo = { ...respostas, [d]: respostas[d] === v ? undefined : v };
    setRespostas(novo);
    onCheckin?.(checkinPreDoPulso({ ...ctx.hoje, ...limpar(novo) }));
  }

  async function concluir() {
    const r = limpar(respostas);
    setEstado("feito");
    setMudando(false);
    setInteragiu(true);
    eventoGa("pulso_concluido", { momento, perguntas: Object.keys(r).length });
    const salvo = await enviar({ respostas: r });
    if (salvo && "checkinPre" in salvo) onCheckin?.(salvo.checkinPre ?? null);
  }

  async function pular() {
    setEstado("pulado");
    setMudando(false);
    setInteragiu(true);
    eventoGa("pulso_ignorado", { momento });
    if (!Object.keys(ctx.hoje).length) {
      onCheckin?.("prefiro_nao");
      await enviar({ pulou: true });
    }
  }

  async function consentir(sim: boolean) {
    setConsent(sim ? "sim" : "nao");
    await fetch("/api/pulso/consentimento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sim }) }).catch(() => null);
  }

  // Nada a perguntar agora; no Início, só aparece para quem tem algo a responder (voltando depois de dias).
  if (estado === "perguntando" && !visiveis.length && !precisaConsentir) return null;
  if (estado !== "perguntando" && !interagiu && (momento === "inicio" || estado === "feito")) return null;

  const final = { ...ctx.hoje, ...limpar(respostas) };
  const desconforto = final.recuperacao === "desconforto";
  const negativo = (Object.entries(final) as Array<[Dimensao, string | string[]]>).some(([d, v]) => (Array.isArray(v) ? v.some((x) => NEGATIVO(d, x)) : NEGATIVO(d, v)));

  if (estado !== "perguntando") {
    const texto = estado === "pulado"
      ? interagiu ? "Tudo bem, fica para a próxima. Bom treino!" : "Pulso de hoje: você preferiu pular. Tudo bem!"
      : desconforto
        ? `Anotado. Se for forte, diferente do normal ou não passar, procure avaliação de um profissional de saúde e fale com o ${BRAND.name} antes de treinar. Ele vai ver seu recado.`
        : negativo
          ? "Obrigado por contar. Dias assim fazem parte — o importante é você estar aqui. 💛"
          : estado === "resumo"
            ? "Pulso de hoje respondido. Obrigado!"
            : "Anotado! Bora de Chalalá! 💪";
    return (
      <div className={`space-y-2 rounded-xl border p-3 text-sm ${desconforto && estado !== "pulado" ? "border-warning/40 bg-warning/5" : "border-border bg-card"}`} aria-live="polite">
        <div className="flex items-start gap-2">
          <span className="text-base" aria-hidden>{desconforto && estado !== "pulado" ? "🩹" : "✓"}</span>
          <p className="flex-1">{texto}</p>
          {momento === "pre_treino" ? (
            <button type="button" onClick={() => { setMudando(true); setRespostas({}); setEstado("perguntando"); }} className="alvo shrink-0 text-xs text-accent underline-offset-2 hover:underline">
              mudar
            </button>
          ) : null}
        </div>
        {desconforto && estado !== "pulado" ? aoDesconforto : null}
      </div>
    );
  }

  return (
    <section aria-label="Montinho Pulso" className="space-y-3 rounded-2xl border border-accent/40 bg-[linear-gradient(160deg,#2a2412_0%,#141414_75%)] p-4">
      <div className="flex items-center gap-3">
        <Montinho tamanho={44} />
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Montinho Pulso</p>
          <p className="text-sm font-semibold">{momento === "inicio" ? "Que bom te ver de novo! Me conta rapidinho como estão as coisas." : "Como estão as coisas por aí? Me conta rapidinho."}</p>
        </div>
      </div>

      {precisaConsentir ? (
        <div className="space-y-2 rounded-xl border border-border bg-bg/60 p-3 text-sm">
          <p>Posso guardar <strong>como seu corpo está</strong> nos dias de treino? Isso ajuda o {BRAND.name} a cuidar do seu treino.</p>
          <p className="text-xs text-fg-muted">Só você e o {BRAND.name} veem. Não vai para propaganda nem para ninguém mais. Dá para mudar no Perfil quando quiser.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void consentir(true)} className="alvo rounded-full bg-accent px-4 py-2 text-xs font-bold text-bg">Sim, pode guardar</button>
            <button type="button" onClick={() => void consentir(false)} className="alvo rounded-full border border-border px-4 py-2 text-xs font-semibold text-fg-muted">Agora não</button>
          </div>
        </div>
      ) : (
        visiveis.map((d) => {
          const p = PERGUNTAS[d];
          const valor = respostas[d];
          return (
            <fieldset key={d} className="space-y-2">
              <legend className="text-sm font-semibold">
                {p.pergunta} {p.multipla ? <span className="font-normal text-fg-subtle">(pode marcar mais de um)</span> : null}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {p.opcoes.map((o) => {
                  const marcado = Array.isArray(valor) ? valor.includes(o.v) : valor === o.v;
                  return (
                    <button key={o.v} type="button" aria-pressed={marcado} onClick={() => responder(d, o.v)} className={`touch rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${marcado ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                      <span aria-hidden>{o.emoji}</span> {o.rotulo}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })
      )}

      <div className="flex items-center gap-2">
        {!precisaConsentir ? (
          <button type="button" disabled={!completo} onClick={() => void concluir()} className="alvo flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-bg disabled:opacity-40">
            Pronto
          </button>
        ) : null}
        <button type="button" onClick={() => void pular()} className="alvo rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-fg-muted">
          Pular
        </button>
      </div>
      <p className="text-[11px] text-fg-subtle">Opcional. Não é avaliação médica: é só para o {BRAND.name} acompanhar você de perto.</p>
    </section>
  );
}

function limpar(r: RespostasHoje): RespostasHoje {
  const out: RespostasHoje = {};
  for (const [k, v] of Object.entries(r) as Array<[Dimensao, string | string[] | undefined]>) {
    if (v === undefined || (Array.isArray(v) && !v.length)) continue;
    out[k] = v;
  }
  return out;
}
