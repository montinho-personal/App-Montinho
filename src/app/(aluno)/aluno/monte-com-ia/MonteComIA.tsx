"use client";

// “Monte com IA”: a pessoa diz o treino que quer (texto ou voz), confere o
// que o app entendeu, escolhe a opção A ou B e os treinos já entram em
// Meus treinos, editáveis.
import Link from "next/link";
import { useState } from "react";
import { useDitado } from "@/components/voz/useDitado";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/config/brand";
import { OpcaoPlanoCard } from "@/components/visitante/OpcaoPlanoCard";
import type { OpcaoVista } from "@/lib/data/plano-visitante";
import { ROTULO_FOCO, ROTULO_NIVEL, type Foco, type Nivel, type ParametrosPlano } from "@/lib/visitante/gerar-treino";

const EXEMPLOS = [
  "Sou iniciante, 3 dias por semana, 45 minutos",
  "Quero focar em glúteo, 4 dias, 1 hora",
  "Treino em casa, 3x na semana, meia hora",
  "Já treino, 5 dias, quero braço e peito",
];

type Resposta =
  | { bloqueio: "saude"; mensagem: string }
  | { bloqueio?: undefined; parametros: ParametrosPlano; resumo: string; usouIA: boolean; opcoes: OpcaoVista[]; parecidos: Array<{ slug: string; nome: string; emoji: string; chamada: string }> };


export function MonteComIA({ temTreinos }: { temTreinos: boolean }) {
  const voz = useDitado();
  const texto = voz.texto;
  const setTexto = voz.setTexto;
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [substituir, setSubstituir] = useState(true);
  const [salvando, setSalvando] = useState<"A" | "B" | null>(null);
  async function pedir(ajuste?: Partial<ParametrosPlano>) {
    setErro(null);
    voz.parar();
    if (texto.trim().length < 3) return setErro("Conte o treino que você quer. Ex.: “iniciante, 3 dias, 45 minutos”.");
    setCarregando(true);
    const r = await fetch("/api/visitante/plano/entender", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: texto.trim(), ...(ajuste ? { ajuste } : {}) }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as (Resposta & { error?: string }) | null;
    setCarregando(false);
    if (!r?.ok || !j) return setErro(j?.error ?? "Não foi possível montar agora. Tente de novo.");
    setResposta(j);
  }

  async function escolher(opcao: "A" | "B") {
    if (!resposta || resposta.bloqueio) return;
    setErro(null);
    setSalvando(opcao);
    const r = await fetch("/api/visitante/plano", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origem: { tipo: "pedido", parametros: resposta.parametros, opcao }, substituir: temTreinos ? substituir : false }) }).catch(() => null);
    if (r?.ok) return window.location.assign("/aluno/meus-treinos?novo=1");
    setSalvando(null);
    setErro(((await r?.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível salvar agora.");
  }

  const p = resposta && !resposta.bloqueio ? resposta.parametros : null;
  const chip = "rounded-lg border border-border bg-bg px-2 py-1.5 text-xs";

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-accent/50 bg-accent/5 p-4">
        <label htmlFor="pedido" className="block text-sm font-semibold">Diga o treino que você quer</label>
        <div className="relative">
          <textarea id="pedido" value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 600))} rows={3} placeholder="Ex.: sou iniciante, 3 dias por semana, 45 minutos, quero focar em glúteo" className="block w-full rounded-xl border border-border bg-bg px-3 py-2 pr-14 text-base" />
          {voz.temMic ? (
            <button type="button" onClick={voz.alternar} aria-pressed={voz.ouvindo} aria-label={voz.ouvindo ? "Parar de ouvir" : "Falar o pedido"} className={`absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full text-lg ${voz.ouvindo ? "animate-pulse bg-danger text-white" : "bg-accent text-bg"}`}>
              🎤
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-fg-subtle">{voz.temMic ? (voz.ouvindo ? "Ouvindo… fale à vontade e toque no 🎤 para parar." : "Toque no 🎤 e fale, ou escreva.") : "Para falar, toque no 🎤 do teclado do celular."} Conte quantos dias, quanto tempo, seu nível e o que quer focar.</p>
        <div className="flex flex-wrap gap-1.5">
          {EXEMPLOS.map((e) => (
            <button key={e} type="button" onClick={() => setTexto(e)} className="rounded-full border border-border px-3 py-1.5 text-xs text-fg-muted hover:border-accent/60">{e}</button>
          ))}
        </div>
        {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
        <Button type="button" className="w-full" disabled={carregando} onClick={() => void pedir()}>{carregando ? "Montando seu treino…" : "✨ Montar meu treino"}</Button>
      </section>

      {resposta?.bloqueio ? (
        <div className="space-y-2 rounded-xl border border-accent/50 bg-bg p-4 text-sm" role="status">
          <p>{resposta.mensagem}</p>
          <a href={`https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent("Olá, Montinho! Quero um treino, mas tenho uma questão de saúde para te contar. [APP-MONTE-IA]")}`} target="_blank" rel="noopener noreferrer" className="touch inline-flex items-center rounded-xl bg-[#25D366] px-4 py-2.5 font-bold text-black">Falar com o Montinho no WhatsApp</a>
        </div>
      ) : null}

      {resposta && !resposta.bloqueio && p ? (
        <>
          <section className="space-y-2 rounded-xl border border-border bg-surface p-3" aria-label="O que entendi">
            <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">Entendi assim · confira</p>
            <p className="text-sm font-semibold">{resposta.resumo}</p>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Nível" className={chip} value={p.nivel} onChange={(e) => void pedir({ ...p, nivel: e.target.value as Nivel })}>
                {(Object.keys(ROTULO_NIVEL) as Nivel[]).map((n) => <option key={n} value={n}>{ROTULO_NIVEL[n]}</option>)}
              </select>
              <select aria-label="Dias por semana" className={chip} value={p.dias} onChange={(e) => void pedir({ ...p, dias: Number(e.target.value) })}>
                {[2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d} dias</option>)}
              </select>
              <select aria-label="Minutos por treino" className={chip} value={p.minutos} onChange={(e) => void pedir({ ...p, minutos: Number(e.target.value) })}>
                {[...new Set([30, 40, 45, 50, 60, 75, 90, p.minutos])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
              <select aria-label="Foco" className={chip} value={p.foco} onChange={(e) => void pedir({ ...p, foco: e.target.value as Foco })}>
                {(Object.keys(ROTULO_FOCO) as Foco[]).map((f) => <option key={f} value={f}>{ROTULO_FOCO[f]}</option>)}
              </select>
              <select aria-label="Local" className={chip} value={p.local} onChange={(e) => void pedir({ ...p, local: e.target.value as ParametrosPlano["local"] })}>
                <option value="academia">Academia</option>
                <option value="casa">Em casa</option>
              </select>
            </div>
          </section>

          {temTreinos ? (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
              <span>Trocar meus treinos atuais por estes <span className="block text-xs text-fg-subtle">Os atuais saem da lista, mas o histórico continua salvo.</span></span>
            </label>
          ) : null}

          {resposta.opcoes.map((o) => (
            <OpcaoPlanoCard
              key={o.id}
              opcao={o}
              destaque={o.id === "A"}
              titulo={`Opção ${o.id}${o.id === "A" ? " · mais simples" : " · alternativa"}`}
              acao={<Button type="button" className="w-full" disabled={salvando !== null} onClick={() => void escolher(o.id)}>{salvando === o.id ? "Salvando…" : `Quero a opção ${o.id}`}</Button>}
            />
          ))}

          {resposta.parecidos.length ? (
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">Ou pegue um treino pronto do Montinho</p>
              {resposta.parecidos.map((t) => (
                <Link key={t.slug} href={`/aluno/treinos-prontos/${t.slug}`} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:border-accent/60">
                  <span className="text-2xl" aria-hidden>{t.emoji}</span>
                  <span className="min-w-0"><span className="block text-sm font-bold">{t.nome}</span><span className="block text-xs text-fg-muted">{t.chamada}</span></span>
                </Link>
              ))}
            </section>
          ) : null}
          <p className="text-center text-xs text-fg-subtle">Depois de escolher, dá para trocar exercícios, séries e repetições em Meus treinos.</p>
        </>
      ) : null}
    </div>
  );
}
