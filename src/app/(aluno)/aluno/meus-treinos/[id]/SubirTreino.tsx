"use client";

// “Já tem um treino?” — o visitante sobe o treino do jeito mais fácil:
// escrevendo/colando/ditando, ou por foto/print/PDF (a IA lê; se não der, o
// arquivo vai para o Montinho montar). O resultado vira rascunho no montador.
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { lerTreinoEscrito, type ItemParaCasar, type TreinoLido } from "@/lib/visitante/importar-treino";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const EXEMPLO = "Treino A - Peito e tríceps\nSupino reto 4x10 30kg\nCrucifixo 3x12\nTríceps corda 3 séries de 12\n\nTreino B - Pernas\nLeg press 4x12\nAquele de esticar a perna 3x15";
const LIMITE_PDF = 3 * 1024 * 1024;
const LIMITE_ARQUIVO = 15 * 1024 * 1024;

type Modo = "escolher" | "escrever" | "arquivo";
type EstadoArquivo = { fase: "livre" } | { fase: "lendo" } | { fase: "sem_leitura"; motivo: string } | { fase: "enviando" } | { fase: "enviado" };

/** Imagem reduzida para JPEG (até 1600 px) em base64 — leve para enviar e suficiente para ler. */
async function imagemReduzida(f: File): Promise<string> {
  const bmp = await createImageBitmap(f);
  const escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
}

async function base64DoArquivo(f: File): Promise<string> {
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

const tipoDe = (f: File) => f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : /\.hei[cf]$/i.test(f.name) ? "image/heic" : "");

export function SubirTreino({ itens, onLido, demo }: { itens: ItemParaCasar[]; onLido: (treinos: TreinoLido[]) => void; demo: boolean }) {
  const [modo, setModo] = useState<Modo>("escolher");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<EstadoArquivo>({ fase: "livre" });

  function montarDoTexto(t: string): boolean {
    const lidos = lerTreinoEscrito(t, itens);
    if (!lidos.length) return false;
    onLido(lidos);
    return true;
  }

  async function lerArquivo(f: File) {
    setErro(null);
    setArquivo(f);
    const tipo = tipoDe(f);
    if (f.size > LIMITE_ARQUIVO) return setErro("Arquivo grande demais (limite de 15 MB).");
    // HEIC (iPhone) e PDFs grandes não vão para a leitura: seguem para o Montinho.
    if (tipo === "image/heic" || tipo === "image/heif") return setEstado({ fase: "sem_leitura", motivo: "Esse formato de foto não dá para ler aqui." });
    if (tipo === "application/pdf" && f.size > LIMITE_PDF) return setEstado({ fase: "sem_leitura", motivo: "Esse PDF é grande demais para ler aqui." });
    if (!tipo.startsWith("image/") && tipo !== "application/pdf") return setErro("Envie uma foto, um print ou um PDF.");
    setEstado({ fase: "lendo" });
    try {
      const base64 = tipo === "application/pdf" ? await base64DoArquivo(f) : await imagemReduzida(f);
      const r = await fetch("/api/visitante/treinos/ler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: tipo === "application/pdf" ? "application/pdf" : "image/jpeg", base64 }) });
      const j = (await r.json().catch(() => ({}))) as { ia?: boolean; texto?: string | null; error?: string };
      if (!r.ok) return setEstado({ fase: "sem_leitura", motivo: j.error ?? "Não foi possível ler agora." });
      if (!j.ia) return setEstado({ fase: "sem_leitura", motivo: "A leitura automática ainda não está ligada." });
      if (j.texto && montarDoTexto(j.texto)) return setEstado({ fase: "livre" });
      setEstado({ fase: "sem_leitura", motivo: "Não consegui ler o treino nesse arquivo." });
    } catch {
      setEstado({ fase: "sem_leitura", motivo: "Não consegui abrir esse arquivo." });
    }
  }

  async function enviarAoMontinho() {
    if (!arquivo) return;
    setErro(null);
    setEstado({ fase: "enviando" });
    const tipo = tipoDe(arquivo);
    try {
      const r = await fetch("/api/visitante/treinos/enviar/url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, tamanho: arquivo.size }) });
      const j = (await r.json().catch(() => ({}))) as { caminho?: string; token?: string | null; error?: string };
      if (!r.ok || !j.caminho) throw new Error(j.error ?? "Não foi possível enviar agora.");
      if (j.token) {
        const { error } = await createSupabaseBrowserClient().storage.from("treinos-enviados").uploadToSignedUrl(j.caminho, j.token, arquivo, { contentType: tipo });
        if (error) throw new Error("O envio falhou. Confira a internet e tente de novo.");
      }
      const r2 = await fetch("/api/visitante/treinos/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caminho: j.caminho, tipo, tamanho: arquivo.size }) });
      if (!r2.ok) throw new Error(((await r2.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível enviar agora.");
      setEstado({ fase: "enviado" });
    } catch (e) {
      setEstado({ fase: "sem_leitura", motivo: "" });
      setErro(e instanceof Error ? e.message : "Não foi possível enviar agora.");
    }
  }

  const opcao = "alvo flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-accent/60";

  return (
    <section className="space-y-3 rounded-2xl border border-accent/40 bg-accent/5 p-4" aria-labelledby="subir-treino">
      <div>
        <h2 id="subir-treino" className="font-bold">Já tem um treino? Suba do jeito mais fácil</h2>
        <p className="text-xs text-fg-muted">O app monta a lista e você só confere. Exercício que não estiver na biblioteca fica com o nome que você escrever.</p>
      </div>

      {modo === "escolher" ? (
        <div className="space-y-2">
          <button type="button" className={opcao} onClick={() => setModo("escrever")}>
            <span className="text-2xl" aria-hidden>✍️</span>
            <span><span className="block text-sm font-semibold">Escrever, colar ou ditar</span><span className="block text-xs text-fg-muted">Do papel, do WhatsApp ou pelo microfone do teclado.</span></span>
          </button>
          <button type="button" className={opcao} onClick={() => setModo("arquivo")}>
            <span className="text-2xl" aria-hidden>📷</span>
            <span><span className="block text-sm font-semibold">Foto, print ou PDF</span><span className="block text-xs text-fg-muted">Tire foto da ficha ou envie o print/PDF que você tem.</span></span>
          </button>
        </div>
      ) : null}

      {modo === "escrever" ? (
        <div className="space-y-2">
          <label htmlFor="treino-escrito" className="block text-sm font-semibold">Escreva um exercício por linha</label>
          <textarea id="treino-escrito" value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 6000))} rows={9} placeholder={EXEMPLO} className="block w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          <p className="text-xs text-fg-subtle">Vale do jeito que você fala: “supino 4x10 30kg”, “puxada três séries de doze”. Não sabe o nome? Escreva do seu jeito (“aquele de puxar”). Para ditar, toque no 🎤 do teclado. Vários treinos? Comece cada um com “Treino A”, “Treino B”…</p>
          {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={() => (montarDoTexto(texto) ? undefined : setErro("Não encontrei exercícios. Escreva um por linha, ex.: “Supino 4x10”."))}>Montar a lista</Button>
            <Button type="button" variant="ghost" onClick={() => { setModo("escolher"); setErro(null); }}>Voltar</Button>
          </div>
        </div>
      ) : null}

      {modo === "arquivo" ? (
        <div className="space-y-3">
          {estado.fase === "enviado" ? (
            <div className="rounded-lg border border-accent/40 bg-bg/60 p-3 text-sm" role="status">
              <p className="font-semibold">✓ Enviado para o Montinho!</p>
              <p className="text-fg-muted">Ele vai montar o treino para você. Quando estiver pronto, aparece aqui em Meus treinos. Enquanto isso, se quiser, escreva o treino em “Escrever, colar ou ditar”.</p>
            </div>
          ) : (
            <>
              <input type="file" accept="image/*,application/pdf,.pdf,.heic,.heif" onChange={(e) => { const f = e.target.files?.[0]; if (f) void lerArquivo(f); }} disabled={estado.fase === "lendo" || estado.fase === "enviando"} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-bg" aria-label="Escolher foto, print ou PDF do treino" />
              {estado.fase === "lendo" ? <p className="text-sm text-fg-muted" role="status">Lendo o seu treino… pode levar alguns segundos.</p> : null}
              {estado.fase === "enviando" ? <p className="text-sm text-fg-muted" role="status">Enviando…</p> : null}
              {estado.fase === "sem_leitura" ? (
                <div className="space-y-2 rounded-lg border border-border bg-bg/60 p-3 text-sm">
                  {estado.motivo ? <p>{estado.motivo}</p> : null}
                  <p className="text-fg-muted">Você pode enviar o arquivo para o Montinho montar o treino para você, ou escrever o treino.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void enviarAoMontinho()}>Enviar para o Montinho montar</Button>
                    <Button type="button" variant="ghost" onClick={() => { setModo("escrever"); setEstado({ fase: "livre" }); }}>Escrever o treino</Button>
                  </div>
                </div>
              ) : null}
              {demo ? <p className="text-[11px] text-fg-subtle">Na demonstração a leitura usa um treino de exemplo e o arquivo não é guardado.</p> : null}
            </>
          )}
          {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
          <Button type="button" variant="ghost" onClick={() => { setModo("escolher"); setErro(null); setEstado({ fase: "livre" }); setArquivo(null); }}>Voltar</Button>
        </div>
      ) : null}
    </section>
  );
}
