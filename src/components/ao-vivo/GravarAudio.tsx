"use client";

// Áudio do personal no meio do treino (0132): grava no navegador (até 60 s),
// deixa ouvir antes, e envia direto para o bucket privado recados-audio por
// link assinado. Na demo, vai como data URL (nada sobe para o Storage).
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export const MAX_SEG_AUDIO = 60;

function tipoGravacao(): string {
  if (typeof MediaRecorder === "undefined") return "";
  // mp4 primeiro: toca em qualquer celular (o webm não abre em iPhone antigo).
  for (const t of ["audio/mp4", "audio/webm", "audio/ogg"]) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
}

function lerComoDataUrl(b: Blob): Promise<string> {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => erro(new Error("Não foi possível ler o áudio."));
    r.readAsDataURL(b);
  });
}

/** Sobe o áudio e cria o recado. Devolve quantos aparelhos foram avisados. */
async function enviarAudio(sessaoId: string, blob: Blob): Promise<{ ok: boolean; notificados: number; error?: string }> {
  const tipo = (blob.type || "audio/webm").split(";")[0];
  const l = await fetch("/api/ao-vivo/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessao_id: sessaoId, tipo }) }).catch(() => null);
  const link = (await l?.json().catch(() => null)) as { caminho?: string; token?: string; demo?: boolean; error?: string } | null;
  if (!l?.ok || !link) return { ok: false, notificados: 0, error: link?.error ?? "Não foi possível enviar o áudio agora." };
  let corpo: Record<string, string>;
  if (link.demo) {
    corpo = { sessao_id: sessaoId, audio_demo: await lerComoDataUrl(new Blob([blob], { type: tipo })) };
  } else {
    if (!link.caminho || !link.token) return { ok: false, notificados: 0, error: "Não foi possível enviar o áudio agora." };
    const { error } = await createSupabaseBrowserClient().storage.from("recados-audio").uploadToSignedUrl(link.caminho, link.token, blob, { contentType: tipo });
    if (error) return { ok: false, notificados: 0, error: "O áudio não subiu. Confira a internet e tente de novo." };
    corpo = { sessao_id: sessaoId, audio: link.caminho };
  }
  const r = await fetch("/api/ao-vivo/recado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
  const d = (await r?.json().catch(() => null)) as { notificados?: number; error?: string } | null;
  return { ok: !!r?.ok, notificados: d?.notificados ?? 0, error: d?.error };
}

type Estado = "parado" | "gravando" | "ouvindo" | "enviando";

export function GravarAudio({ sessaoId, nome, onEnviado, onErro }: { sessaoId: string; nome: string; onEnviado: (notificados: number) => void; onErro: (msg: string) => void }) {
  const [estado, setEstado] = useState<Estado>("parado");
  const [seg, setSeg] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);

  function soltarMicrofone() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }
  useEffect(() => () => soltarMicrofone(), []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function gravar() {
    const tipo = tipoGravacao();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return onErro("Este navegador não grava áudio. Tente pelo Chrome ou Safari atualizado.");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return onErro("Libere o microfone para o app nas configurações do navegador.");
    }
    const partes: Blob[] = [];
    const r = new MediaRecorder(stream.current, tipo ? { mimeType: tipo } : undefined);
    r.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
    r.onstop = () => {
      soltarMicrofone();
      const b = new Blob(partes, { type: (r.mimeType || tipo || "audio/webm").split(";")[0] });
      if (!b.size) { setEstado("parado"); return onErro("Não deu para gravar. Tente de novo."); }
      setBlob(b);
      setUrl(URL.createObjectURL(b));
      setEstado("ouvindo");
    };
    rec.current = r;
    r.start();
    setSeg(0);
    setEstado("gravando");
    const inicio = Date.now();
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - inicio) / 1000);
      setSeg(s);
      if (s >= MAX_SEG_AUDIO) parar();
    }, 250);
  }
  function parar() {
    if (rec.current?.state === "recording") rec.current.stop();
  }
  function descartar() {
    setBlob(null);
    setUrl(null);
    setEstado("parado");
  }
  async function enviar() {
    if (!blob) return;
    setEstado("enviando");
    const d = await enviarAudio(sessaoId, blob);
    if (!d.ok) { setEstado("ouvindo"); return onErro(d.error ?? "Não foi possível enviar o áudio agora."); }
    descartar();
    onEnviado(d.notificados);
  }

  if (estado === "gravando") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-danger/50 bg-danger/10 p-3">
        <span className="h-3 w-3 shrink-0 rounded-full bg-danger motion-safe:animate-pulse" aria-hidden />
        <span className="flex-1 text-sm font-bold">Gravando… 0:{String(seg).padStart(2, "0")} <span className="font-normal text-fg-muted">/ 1:00</span></span>
        <button type="button" onClick={parar} className="alvo shrink-0 rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white">⏹ Parar</button>
      </div>
    );
  }
  if ((estado === "ouvindo" || estado === "enviando") && url) {
    return (
      <div className="space-y-2 rounded-xl border border-accent/50 bg-card p-3">
        <p className="text-xs font-semibold text-fg-muted">Ouça antes de mandar para {nome}:</p>
        <audio controls src={url} className="w-full" />
        <div className="flex gap-2">
          <button type="button" disabled={estado === "enviando"} onClick={descartar} className="alvo flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50">🔁 Regravar</button>
          <button type="button" disabled={estado === "enviando"} onClick={() => void enviar()} className="alvo flex-[2] rounded-lg bg-accent px-3 py-2 text-sm font-bold text-bg disabled:opacity-60">{estado === "enviando" ? "Enviando…" : "📤 Enviar áudio"}</button>
        </div>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => void gravar()} className="alvo flex w-full items-center justify-center gap-2 rounded-xl border border-accent/60 bg-card px-4 py-2.5 text-sm font-bold text-accent">
      🎙️ Gravar um áudio (até 1 min)
    </button>
  );
}
