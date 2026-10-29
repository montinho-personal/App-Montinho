"use client";

// Protocolo de mobilidade guiado (pedido do Montinho, 29/10/2026): vídeo do
// canal para fazer junto, nota de desconforto 0–10 antes e depois, cada
// exercício com a dose e as dicas do roteiro, cronômetro nos que são por tempo
// e “Concluir”. Só vale começado no app: a hora de começar e de concluir é a
// do servidor, com 10+ minutos entre as duas (0116).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTravaVisitante } from "@/components/visitante/TravaVisitante";
import { CelebrarAtivadas } from "@/components/conquistas/CelebrarAtivadas";
import type { ConquistaCelebravel } from "@/components/chalala/CelebracaoMedalha";
import { gerarImagemMedalha } from "@/components/chalala/cardMedalha";
import { enviarEventoComTrofeus } from "@/components/chalala/evento";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import { embedUrl, parseVideoSource } from "@/lib/video";
import { ANTES_DE_COMECAR, AVISO_DOR, DESAFIO_7_DIAS, PROTOCOLOS, textoDose, todosExercicios, type ExercicioMobilidade, type SlugMobilidade } from "@/lib/mobilidade/protocolos";
import { faltaParaConcluir, LIMITES_MOBILIDADE } from "@/lib/mobilidade/regras";

type Fase = "antes" | "fazendo" | "nota" | "fim";
type Em = { id: string; iniciado_em: string; nota_antes: number | null } | null;

function baixar(f: File) {
  const url = URL.createObjectURL(f);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function Nota({ valor, onChange, rotulo }: { valor: number | null; onChange: (n: number) => void; rotulo: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{rotulo}</legend>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" aria-pressed={valor === n} onClick={() => onChange(n)} className={`min-h-11 rounded-lg border text-sm font-bold ${valor === n ? "border-accent bg-accent text-bg" : "border-border bg-bg text-fg"}`}>
            {n}
          </button>
        ))}
      </div>
      <p className="flex justify-between text-[11px] text-fg-subtle"><span>0 = nada</span><span>10 = muito</span></p>
    </fieldset>
  );
}

function Cronometro({ segundos }: { segundos: number }) {
  const [resta, setResta] = useState<number | null>(null);
  useEffect(() => {
    if (resta == null || resta <= 0) return;
    const t = setTimeout(() => setResta((r) => (r == null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [resta]);
  useEffect(() => {
    if (resta === 0) {
      try {
        navigator.vibrate?.([120, 80, 120]);
      } catch {
        // vibrar é opcional
      }
    }
  }, [resta]);
  if (resta == null || resta === 0)
    return (
      <button type="button" onClick={() => setResta(segundos)} className="alvo min-h-10 rounded-lg border border-accent/60 px-3 text-xs font-bold text-accent">
        {resta === 0 ? "✓ Tempo! De novo" : `⏱ ${segundos >= 60 ? `${segundos / 60} min` : `${segundos} s`}`}
      </button>
    );
  return (
    <button type="button" onClick={() => setResta(null)} className="alvo min-h-10 rounded-lg bg-accent px-3 text-sm font-black tabular-nums text-bg" aria-live="polite">
      {Math.floor(resta / 60)}:{String(resta % 60).padStart(2, "0")} · parar
    </button>
  );
}

function Exercicio({ e, feito, onToggle }: { e: ExercicioMobilidade; feito: boolean; onToggle: () => void }) {
  return (
    <li className={`rounded-xl border p-3 ${feito ? "border-success/50 bg-success/5" : "border-border bg-surface"}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onToggle} aria-pressed={feito} aria-label={feito ? `Desmarcar ${e.nome}` : `Marcar ${e.nome} como feito`} className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-lg font-black ${feito ? "border-success bg-success text-bg" : "border-border text-fg-subtle"}`}>
          {feito ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">{e.nome}</p>
          <p className="text-sm font-semibold text-accent">{textoDose(e.dose)}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-fg-muted">
            {e.dicas.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
          {e.dose.segundos ? <div className="mt-2"><Cronometro segundos={e.dose.segundos} /></div> : null}
        </div>
      </div>
    </li>
  );
}

export function MobilidadeClient({ slug, emAndamento, nome, demo = false }: { slug: SlugMobilidade; emAndamento: Em; nome: string; /** Demo: sem esperar os 10 minutos. */ demo?: boolean }) {
  const p = PROTOCOLOS[slug];
  const lista = useMemo(() => todosExercicios(p), [p]);
  const trava = useTravaVisitante();
  const [fase, setFase] = useState<Fase>(emAndamento ? "fazendo" : "antes");
  const [sessao, setSessao] = useState<Em>(emAndamento);
  const [notaAntes, setNotaAntes] = useState<number | null>(emAndamento?.nota_antes ?? null);
  const [notaDepois, setNotaDepois] = useState<number | null>(null);
  const [feitos, setFeitos] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [trofeus, setTrofeus] = useState<Array<ConquistaCelebravel & { id: string }>>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const video = parseVideoSource(`https://www.youtube.com/watch?v=${p.videoId}`);

  // Relógio da tela (para o “Concluir em X min”).
  useEffect(() => {
    if (fase !== "fazendo") return;
    const t = setInterval(() => setAgora(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [fase]);

  async function comecar() {
    if (trava.travado) return trava.abrir();
    setOcupado(true);
    setErro(null);
    const r = await fetch("/api/mobilidade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ protocolo: slug, nota_antes: notaAntes }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { id?: string; iniciado_em?: string; error?: string };
    setOcupado(false);
    if (!r?.ok || !j.id) return setErro(j.error ?? "Sem internet? Para valer, a mobilidade precisa começar com internet.");
    setSessao({ id: j.id, iniciado_em: j.iniciado_em ?? new Date().toISOString(), nota_antes: notaAntes });
    setAgora(Date.now());
    setFase("fazendo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function concluir() {
    if (!sessao) return;
    setOcupado(true);
    setErro(null);
    const r = await fetch(`/api/mobilidade/${sessao.id}/concluir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nota_depois: notaDepois, feitos: feitos.size }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; comemorar?: Array<ConquistaCelebravel & { id: string }> };
    setOcupado(false);
    if (!r?.ok) {
      setErro(j.error ?? "Não foi possível concluir. Tente de novo.");
      if (r?.status === 409) setFase("fazendo");
      return;
    }
    setTrofeus(j.comemorar ?? []);
    setFase("fim");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function cancelar() {
    if (!sessao || !confirm("Cancelar esta mobilidade? Ela não conta para os troféus.")) return;
    await fetch(`/api/mobilidade/${sessao.id}/cancelar`, { method: "POST" }).catch(() => null);
    setSessao(null);
    setFeitos(new Set());
    setFase("antes");
  }

  async function compartilhar() {
    const melhora = notaAntes != null && notaDepois != null ? `Desconforto: ${notaAntes} → ${notaDepois}` : `${lista.length} exercícios · ~${p.minutos} min`;
    const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const card = { selo: p.emoji, titulo: p.titulo, destaque: melhora, frase: "Mobilidade feita! Corpo solto.", porque: `${p.chamada.replace("?", "")}? Não mais. Jornada do Chalalá — Montinho Personal Trainer.`, nome: nome.split(" ")[0] ?? "", data: hoje, legenda: `${p.emoji} ${p.nome} feita! ${melhora} — com @montinho_personal` };
    let r: ResultadoCompartilhar;
    try {
      r = await compartilharArquivo(navigator, await gerarImagemMedalha(card), card.legenda, baixar);
    } catch {
      r = "erro";
    }
    const novos = await enviarEventoComTrofeus({ tipo: r === "baixado" ? "download" : r === "cancelado" ? "compartilhar_cancelado" : "compartilhar_nativo", formato: "stories", origem: "mobilidade", ref: `mobilidade:${sessao?.id ?? slug}` });
    if (novos.length) setTrofeus(novos as Array<ConquistaCelebravel & { id: string }>);
    if (r !== "enviado_ao_sistema") setAviso(MENSAGEM_RESULTADO[r]);
  }

  const falta = demo ? 0 : sessao ? faltaParaConcluir(sessao.iniciado_em, agora) : LIMITES_MOBILIDADE.minutosMin;
  const Video = video ? (
    <div className="mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-black">
      <iframe src={embedUrl(video)} title={`${p.nome} — vídeo do Montinho`} className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
    </div>
  ) : null;

  if (fase === "fim") {
    const melhorou = notaAntes != null && notaDepois != null ? notaAntes - notaDepois : null;
    return (
      <div className="space-y-4 text-center">
        <CelebrarAtivadas conquistas={trofeus} nome={nome} />
        <p className="text-5xl" aria-hidden>{p.emoji}</p>
        <h1 className="text-2xl font-black">Mobilidade feita!</h1>
        <p className="text-sm text-fg-muted">{p.nome} concluída. Chalalá!</p>
        {notaAntes != null && notaDepois != null ? (
          <div className="rounded-2xl border border-accent/40 bg-grain-strong p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Seu desconforto</p>
            <p className="text-4xl font-black tabular-nums">{notaAntes} → <span className="text-accent">{notaDepois}</span></p>
            <p className="mt-1 text-sm">{melhorou! > 0 ? `${melhorou} ${melhorou === 1 ? "ponto" : "pontos"} a menos. É isso!` : melhorou === 0 ? "Igual ao começo: a constância é que vai mostrando a diferença." : "Subiu um pouco? Se for dor, pare e fale com o Montinho."}</p>
          </div>
        ) : null}
        <button type="button" onClick={() => void compartilhar()} className="touch w-full rounded-xl bg-accent px-5 py-3 font-bold text-bg">📲 Compartilhar no Story / WhatsApp</button>
        {aviso ? <p className="text-xs text-fg-muted">{aviso}</p> : null}
        <p className="rounded-xl border border-border bg-surface p-3 text-sm">{DESAFIO_7_DIAS}</p>
        <div className="flex flex-col gap-2">
          <Link href="/aluno/mobilidade" className="touch rounded-xl border border-border px-5 py-3 font-semibold">Ver minha mobilidade e troféus</Link>
          <Link href="/aluno" className="text-sm text-fg-muted">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  if (fase === "antes") {
    return (
      <div className="space-y-4">
        <header>
          <p className="text-3xl" aria-hidden>{p.emoji}</p>
          <h1 className="text-2xl font-black">{p.nome}</h1>
          <p className="text-sm text-fg-muted">{p.chamada} (~{p.minutos} min)</p>
        </header>
        {Video}
        <section className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-bold">Antes de começar</h2>
          <p className="text-sm">Você vai precisar de: {p.material}.</p>
          <ul className="space-y-1 text-sm">
            {ANTES_DE_COMECAR.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
        <Nota valor={notaAntes} onChange={setNotaAntes} rotulo="Dê uma nota de 0 a 10 para o seu desconforto agora:" />
        {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
        <button type="button" disabled={ocupado} onClick={() => void comecar()} className="touch w-full rounded-xl bg-accent px-5 py-3.5 text-lg font-black text-bg disabled:opacity-60">
          {ocupado ? "Começando…" : "▶ Começar"}
        </button>
        <p className="text-center text-[11px] text-fg-subtle">Para valer troféu, a mobilidade precisa ser começada aqui no app (com internet).</p>
      </div>
    );
  }

  if (fase === "nota") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black">E agora?</h1>
        <Nota valor={notaDepois} onChange={setNotaDepois} rotulo={`Qual a sua nota de 0 a 10?${notaAntes != null ? ` No começo foi ${notaAntes}.` : ""}`} />
        {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
        <button type="button" disabled={ocupado} onClick={() => void concluir()} className="touch w-full rounded-xl bg-accent px-5 py-3.5 text-lg font-black text-bg disabled:opacity-60">
          {ocupado ? "Salvando…" : "✓ Concluir mobilidade"}
        </button>
        <button type="button" onClick={() => setFase("fazendo")} className="w-full text-sm text-fg-muted">← Voltar aos exercícios</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Mobilidade em andamento</p>
        <h1 className="text-xl font-black">{p.emoji} {p.nome}</h1>
        <p className="text-xs text-fg-muted">Faça junto com o vídeo. Marque cada exercício quando terminar.</p>
      </header>
      {Video}
      <p className="text-center text-sm font-semibold">{feitos.size} de {lista.length} exercícios</p>
      {p.blocos.map((b) => (
        <section key={b.titulo} className="space-y-2" aria-label={b.titulo}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">{b.titulo}</h2>
          <ul className="space-y-2">
            {b.exercicios.map((e) => (
              <Exercicio key={e.id} e={e} feito={feitos.has(e.id)} onToggle={() => setFeitos((f) => {
                const n = new Set(f);
                if (n.has(e.id)) n.delete(e.id);
                else n.add(e.id);
                return n;
              })} />
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-fg-muted">{AVISO_DOR}</p>
      {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 mx-auto max-w-md px-4">
        <button type="button" disabled={falta > 0} onClick={() => { setErro(null); setFase("nota"); }} className="touch w-full rounded-xl bg-accent px-5 py-3 font-black text-bg shadow-lg disabled:bg-surface disabled:text-fg-muted disabled:opacity-100">
          {falta > 0 ? `Concluir em ${falta} min` : "✓ Terminei! Concluir"}
        </button>
      </div>
      <button type="button" onClick={() => void cancelar()} className="w-full text-sm text-fg-subtle">✖ Cancelar esta mobilidade</button>
    </div>
  );
}
