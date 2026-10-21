"use client";

// Foto de perfil do aluno: escolher da galeria ou tirar na hora, ajustar
// (arrastar e zoom) e salvar. A foto é reduzida no próprio celular para um
// quadrado de 512 px antes de enviar (leve e privada: nada é enviado antes de
// o aluno tocar em "Usar esta foto").
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { enquadrarFoto } from "@/lib/chalala/card";
import { FOTO_LADO_PX, FOTO_QUALIDADE, FOTO_MAX_BYTES } from "@/lib/perfil/foto";
import { useFecharComVoltar } from "@/lib/useFecharComVoltar";

const PREVIA = 280;

async function abrirImagem(arquivo: File): Promise<ImageBitmap> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (arquivo.size > 30 * 1024 * 1024) throw new Error("Foto muito grande (máx. 30 MB).");
  try {
    return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não consegui abrir essa foto. Tente outra (JPEG ou PNG).");
  }
}

function desenhar(canvas: HTMLCanvasElement, img: ImageBitmap, lado: number, zoom: number, x: number, y: number) {
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const r = enquadrarFoto({ w: img.width, h: img.height }, { w: lado, h: lado }, { x, y, zoom, escurecer: 0 });
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, lado, lado);
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, lado, lado);
}

export function FotoPerfil({ nome, url }: { nome: string; url: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const previa = useRef<HTMLCanvasElement>(null);
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const fechar = useCallback(() => {
    setImg(null);
    setErro(null);
    setZoom(1);
    setPos({ x: 0, y: 0 });
  }, []);
  useFecharComVoltar(!!img, fechar);

  useEffect(() => {
    if (img && previa.current) desenhar(previa.current, img, PREVIA, zoom, pos.x, pos.y);
  }, [img, zoom, pos]);

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setImg(await abrirImagem(f));
    } catch (er) {
      toast.error(er instanceof Error ? er.message : "Não foi possível abrir a foto.");
    }
  }

  // Arrastar com o dedo move o enquadramento (mais zoom = mais espaço para mover).
  function aoTocar(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    arrasto.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
  }
  function aoMover(e: React.PointerEvent) {
    const a = arrasto.current;
    if (!a || !img) return;
    const folga = Math.max(0.35, zoom - 0.5);
    const dx = ((e.clientX - a.px) / PREVIA) * -2.2 / folga;
    const dy = ((e.clientY - a.py) / PREVIA) * -2.2 / folga;
    setPos({ x: Math.max(-1, Math.min(1, a.x + dx)), y: Math.max(-1, Math.min(1, a.y + dy)) });
  }

  async function salvar() {
    if (!img) return;
    setEnviando(true);
    setErro(null);
    try {
      const c = document.createElement("canvas");
      desenhar(c, img, FOTO_LADO_PX, zoom, pos.x, pos.y);
      const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, "image/jpeg", FOTO_QUALIDADE));
      if (!blob) throw new Error("Não consegui preparar a foto.");
      if (blob.size > FOTO_MAX_BYTES) throw new Error("Foto muito pesada. Tente outra.");
      const res = await fetch("/api/perfil/foto", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Não foi possível salvar a foto.");
      toast.success("Foto atualizada!");
      fechar();
      router.refresh();
    } catch (er) {
      setErro(er instanceof Error ? er.message : "Não foi possível salvar a foto.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    if (!window.confirm("Remover a sua foto de perfil?")) return;
    const res = await fetch("/api/perfil/foto", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast.error("Não foi possível remover a foto.");
    toast.success("Foto removida.");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => entrada.current?.click()} aria-label={url ? "Trocar minha foto" : "Adicionar minha foto"} className="relative rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
        <Avatar nome={nome} url={url} size={96} className="text-2xl" />
        <span aria-hidden className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-bg bg-accent text-base text-bg shadow-lg">
          📷
        </span>
      </button>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <button type="button" onClick={() => entrada.current?.click()} className="alvo font-semibold text-accent underline-offset-2 hover:underline">
          {url ? "Trocar foto" : "Adicionar foto"}
        </button>
        {url ? (
          <button type="button" onClick={() => void remover()} className="alvo text-fg-subtle underline-offset-2 hover:underline">
            Remover
          </button>
        ) : null}
      </div>
      <input ref={entrada} type="file" accept="image/*" onChange={(e) => void aoEscolher(e)} className="sr-only" aria-label="Escolher foto" tabIndex={-1} />

      {img && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Ajustar foto de perfil">
              <button type="button" aria-label="Cancelar" onClick={fechar} className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />
              <div className="relative w-full max-w-sm space-y-4 rounded-t-2xl border border-border bg-card p-5 text-center shadow-2xl sm:rounded-2xl">
                <p className="text-base font-bold">Ajuste sua foto</p>
                <p className="-mt-2 text-xs text-fg-muted">Arraste para enquadrar e use o zoom. Só o círculo aparece no app.</p>
                <div className="relative mx-auto touch-none select-none" style={{ width: PREVIA, height: PREVIA }} onPointerDown={aoTocar} onPointerMove={aoMover} onPointerUp={() => (arrasto.current = null)} onPointerCancel={() => (arrasto.current = null)}>
                  <canvas ref={previa} className="h-full w-full rounded-2xl" style={{ width: PREVIA, height: PREVIA }} />
                  {/* máscara: escurece fora do círculo */}
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(circle at center, transparent 0, transparent 69%, rgba(0,0,0,0.62) 70%)" }} />
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent/80" style={{ margin: PREVIA * 0.0 }} />
                </div>
                <label className="block text-left text-xs text-fg-muted">
                  Zoom
                  <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom da foto" className="mt-1 w-full accent-[var(--color-accent)]" />
                </label>
                {erro ? <p role="alert" className="text-xs text-danger">{erro}</p> : null}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => entrada.current?.click()} disabled={enviando} className="touch rounded-xl border border-border px-3 py-3 text-sm font-semibold text-fg-muted">
                    Escolher outra
                  </button>
                  <button type="button" onClick={() => void salvar()} disabled={enviando} className="touch rounded-xl bg-accent px-3 py-3 text-sm font-bold text-bg disabled:opacity-60">
                    {enviando ? "Salvando…" : "Usar esta foto"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
