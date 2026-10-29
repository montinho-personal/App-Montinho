"use client";

// Compartilhar a posição no Ranking de troféus (pedido do Montinho, 29/10/2026).
// O card mostra SÓ a pessoa (posição, troféus, primeiro nome) — nunca o nome
// dos outros alunos. Um toque gera a imagem para Stories e abre o WhatsApp/Instagram.
import { useState } from "react";
import { LOGO_STORY } from "@/lib/desbloqueia/card";
import { carregarSvg, familiaFonte, paraBlob } from "@/components/chalala/desenhar";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import { enviarEventoComTrofeus, marcarVistas } from "@/components/chalala/evento";
import { CelebracaoMedalha, type ConquistaCelebravel } from "@/components/chalala/CelebracaoMedalha";
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";

const W = 1080;
const H = 1920;
const OURO = "#ba9e50";
const COR_PODIO: Record<number, string> = { 1: "#f5c451", 2: "#d4d4d8", 3: "#d08a4f" };

export type DadosRanking = { posicao: number; trofeus: number; total: number; nome: string };

/** Frase do card pela posição (sem comparar com ninguém pelo nome). */
export function fraseDoCard(posicao: number, total: number): string {
  if (posicao === 1) return "No topo do ranking! Bora manter.";
  if (posicao <= 3) return "No pódio! Cada treino conta.";
  if (total > 0 && posicao <= Math.ceil(total / 2)) return "Na metade de cima. Subindo!";
  return "Um troféu de cada vez. Bora subir!";
}

async function gerarImagemRanking(d: DadosRanking): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const familia = familiaFonte();
  const logo = await carregarSvg("/brand/logo.svg", 469, 321);
  await document.fonts?.ready;
  const cor = COR_PODIO[d.posicao] ?? OURO;

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);
  const brilho = ctx.createRadialGradient(W / 2, 820, 40, W / 2, 820, 800);
  brilho.addColorStop(0, "rgba(186,158,80,0.40)");
  brilho.addColorStop(1, "rgba(10,10,10,0)");
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, W, H);
  if (logo) ctx.drawImage(logo, W / 2 - LOGO_STORY.w / 2, LOGO_STORY.y, LOGO_STORY.w, LOGO_STORY.h);

  const texto = (t: string, y: number, tamanho: number, peso: number, c: string, espacamento = 0) => {
    ctx.font = `${peso} ${tamanho}px ${familia}`;
    ctx.fillStyle = c;
    ctx.textAlign = "center";
    const cc = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    cc.letterSpacing = `${espacamento}px`;
    ctx.fillText(t, W / 2, y);
    cc.letterSpacing = "0px";
  };

  texto("RANKING DE TROFÉUS", 600, 38, 700, OURO, 10);
  // Pódio: o lugar dentro de um círculo grande.
  ctx.save();
  ctx.shadowColor = `${cor}99`;
  ctx.shadowBlur = 90;
  ctx.beginPath();
  ctx.arc(W / 2, 860, 200, 0, Math.PI * 2);
  ctx.fillStyle = "#1c1810";
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(W / 2, 860, 200, 0, Math.PI * 2);
  ctx.lineWidth = 30;
  ctx.strokeStyle = cor;
  ctx.stroke();
  ctx.textBaseline = "middle";
  texto(`${d.posicao}º`, 870, 170, 900, "#ffffff");
  ctx.textBaseline = "alphabetic";
  texto("LUGAR", 1130, 40, 800, cor, 12);
  texto(`${d.trofeus} ${d.trofeus === 1 ? "troféu" : "troféus"}`, 1240, 88, 800, "#ffffff");
  ctx.fillStyle = OURO;
  ctx.fillRect(W / 2 - 40, 1290, 80, 4);
  texto(`“${fraseDoCard(d.posicao, d.total)}”`, 1390, 52, 700, "#f5f5f5");
  texto(d.nome, 1620, 34, 600, "#d4d4d4");
  texto("@montinho_personal", 1672, 34, 700, OURO);

  return new File([await paraBlob(canvas)], `ranking-montinho-${d.posicao}.png`, { type: "image/png" });
}

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

export function CompartilharRanking({ dados }: { dados: DadosRanking }) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trofeus, setTrofeus] = useState<Array<ConquistaCelebravel & { id: string }>>([]);

  async function compartilhar() {
    setEnviando(true);
    setAviso(null);
    let r: ResultadoCompartilhar;
    try {
      r = await compartilharArquivo(navigator, await gerarImagemRanking(dados), `Estou em ${dados.posicao}º no ranking de troféus do Montinho! @montinho_personal`, baixar);
    } catch {
      r = "erro";
    }
    setEnviando(false);
    if (r !== "enviado_ao_sistema") setAviso(MENSAGEM_RESULTADO[r]);
    if (r === "enviado_ao_sistema" || r === "baixado") {
      const novas = await enviarEventoComTrofeus({ tipo: r === "baixado" ? "download" : "compartilhar_nativo", modelo: "ranking", formato: "stories", origem: "conquistas" });
      if (novas.length) setTrofeus(novas as Array<ConquistaCelebravel & { id: string }>);
    }
  }

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => void compartilhar()} disabled={enviando} className="touch flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-base font-bold text-bg disabled:opacity-60">
        {enviando ? "Preparando a imagem…" : "📲 Compartilhar minha posição"}
      </button>
      {aviso ? <p role="status" className="text-xs text-fg-muted">{aviso}</p> : null}
      <ChamadaTrofeu acao="ranking" />
      {trofeus.length ? (
        <CelebracaoMedalha
          conquistas={trofeus}
          onFechar={() => {
            marcarVistas(trofeus.map((t) => t.id));
            setTrofeus([]);
          }}
        />
      ) : null}
    </div>
  );
}
