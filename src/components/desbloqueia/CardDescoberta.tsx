"use client";

// Card “Mito ou verdade?” em formato Stories (1080×1920). Mesmo desenho na
// prévia e no arquivo; compartilhamento nativo com fallback para download.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ConteudoConhecimento } from "@/lib/desbloqueia/tipos";
import { CARD_DESCOBERTA, layoutDescoberta } from "@/lib/desbloqueia/card";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import { carregarSvg, familiaFonte, medidorCanvas, paraBlob } from "@/components/chalala/desenhar";
import { enviarEvento } from "@/components/chalala/evento";

function desenharCard(canvas: HTMLCanvasElement, c: ConteudoConhecimento, logo: HTMLImageElement | null) {
  const { w, h, margem } = CARD_DESCOBERTA;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const familia = familiaFonte();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1b1b1b");
  g.addColorStop(1, "#050505");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const lay = layoutDescoberta(c, medidorCanvas(ctx, familia));
  ctx.fillStyle = lay.cor;
  ctx.fillRect(margem, 440, 120, 8);
  if (logo) ctx.drawImage(logo, margem, 120, 420, 287);
  ctx.textBaseline = "alphabetic";
  for (const l of lay.linhas) {
    ctx.font = `${l.peso} ${l.tamanho}px ${familia}`;
    ctx.fillStyle = l.cor;
    ctx.fillText(l.texto, l.x, l.y);
  }
  const s = lay.selo;
  ctx.fillStyle = lay.cor;
  ctx.beginPath();
  ctx.roundRect(s.x, s.y, s.w, s.h, 48);
  ctx.fill();
  ctx.font = `800 52px ${familia}`;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillText(s.texto, s.x + 40, s.y + 66);
}

export function CardDescoberta({ conteudo, onFechar }: { conteudo: ConteudoConhecimento; onFechar: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void Promise.all([carregarSvg("/brand/logo.svg", 469, 321), document.fonts?.ready]).then(([l]) => vivo && setLogo(l));
    return () => {
      vivo = false;
    };
  }, []);
  useEffect(() => {
    if (ref.current) desenharCard(ref.current, conteudo, logo);
  }, [conteudo, logo]);

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
  async function compartilhar() {
    setOcupado(true);
    let r: ResultadoCompartilhar;
    try {
      const c = document.createElement("canvas");
      desenharCard(c, conteudo, logo);
      const f = new File([await paraBlob(c)], `montinho-descoberta-${conteudo.id}.png`, { type: "image/png" });
      r = await compartilharArquivo(navigator, f, `Mito ou verdade? ${conteudo.pergunta} @montinho_personal`, baixar);
    } catch {
      r = "erro";
    }
    if (r === "enviado_ao_sistema" || r === "baixado") enviarEvento({ tipo: "descoberta_compartilhada", modelo: conteudo.id, formato: "stories" });
    setAviso(MENSAGEM_RESULTADO[r]);
    setOcupado(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Card da descoberta" className="fixed inset-0 z-[70] overflow-y-auto bg-bg/95 p-4">
      <div className="mx-auto max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-bold">Card para Stories</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="alvo text-fg-muted hover:text-fg">✕</button>
        </div>
        <canvas ref={ref} className="mx-auto block h-auto w-full max-w-[300px] rounded-xl border border-border" aria-label={`Prévia: ${conteudo.pergunta} — ${conteudo.veredito}`} />
        <p className="text-xs text-fg-muted">O card mostra só a pergunta, a resposta e uma frase curta — nenhum dado seu.</p>
        <Button variant="gold" className="w-full" onClick={compartilhar} loading={ocupado}>Compartilhar</Button>
        {aviso ? <p role="status" className="text-sm text-fg-muted">{aviso}</p> : null}
      </div>
    </div>
  );
}
