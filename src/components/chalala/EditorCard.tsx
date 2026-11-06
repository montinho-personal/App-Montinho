"use client";

// Editor do card “Meu Chalalá de hoje”: poucos toques, prévia em tempo real,
// foto opcional processada só no aparelho, exportação 9:16 / 4:5 / 1:1 / PNG
// transparente e compartilhamento nativo quando o navegador permite.

import { useEffect, useRef, useState } from "react";
import { configPadrao, MAX_TITULO, TITULOS_TREINO, tituloDoTreino, FORMATOS, FRASES, metricasDisponiveis, modelosDisponiveis, nomeArquivo, ROTULO_METRICA, ROTULO_MODELO, AJUSTE_FOTO_PADRAO, type ConfigCard, type DadosCard, type Formato, type Fundo, type ModeloId, type Variacao } from "@/lib/chalala/card";
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";
import { CelebracaoMedalha, type ConquistaCelebravel } from "./CelebracaoMedalha";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import { carregarSvg, desenhar, paraBlob, prepararFoto, type Ativos } from "./desenhar";
import { enviarEvento, enviarEventoComTrofeus, marcarVistas } from "./evento";
import { abrirVideo, gravacaoSuportada, gravarVideoCard, type VideoAberto } from "./videoCard";
import { segundosTexto, trechoDoVideo } from "@/lib/chalala/video";

type Origem = "conclusao" | "historico" | "mensal" | "reconhecimento";

const FUNDOS: Array<{ v: Fundo; l: string }> = [
  { v: "gradiente", l: "Gradiente" },
  { v: "solido", l: "Sólido" },
  { v: "foto", l: "Minha foto" },
  { v: "transparente", l: "Transparente" },
];
const VARIACOES: Array<{ v: Variacao; l: string; amostra: string }> = [
  { v: "dourado", l: "Dourado", amostra: "linear-gradient(135deg,#2a2415,#0a0a0a)" },
  { v: "preto", l: "Preto", amostra: "#000" },
  { v: "claro", l: "Claro", amostra: "#f6f2e7" },
];

function Chip({ ativo, onClick, children, disabled }: { ativo: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={ativo} disabled={disabled} onClick={onClick} className={`touch rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${ativo ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted hover:text-fg"}`}>
      {children}
    </button>
  );
}

export default function EditorCard({ dados, modeloInicial, nome, origem, registrarEventos = true, refEvento = null, onFechar }: { dados: DadosCard; modeloInicial: ModeloId; nome: string; origem: Origem; registrarEventos?: boolean; /** Ex.: "medalha:treinos_10" — qual troféu foi compartilhado (Vitrine de Troféus). */ refEvento?: string | null; onFechar: () => void }) {
  const modelos = modelosDisponiveis(dados);
  const inicial = modelos.includes(modeloInicial) ? modeloInicial : modelos[0];
  // Título escolhido da última vez (fica no aparelho) já vem marcado.
  const [cfg, setCfg] = useState<ConfigCard>(() => {
    let titulo: string | null = null;
    try {
      titulo = localStorage.getItem("montinho-titulo-card");
    } catch {
      // sem armazenamento: usa o padrão
    }
    return { ...configPadrao(inicial, dados, nome), titulo };
  });
  const [tituloProprio, setTituloProprio] = useState(() => (cfg.titulo && !TITULOS_TREINO.includes(cfg.titulo) ? cfg.titulo : ""));
  const escolherTitulo = (t: string | null) => {
    mudar({ titulo: t });
    try {
      if (t) localStorage.setItem("montinho-titulo-card", t);
      else localStorage.removeItem("montinho-titulo-card");
    } catch {
      // sem armazenamento: vale só agora
    }
  };
  const [historico, setHistorico] = useState<ConfigCard[]>([]);
  const [ativos, setAtivos] = useState<Ativos>({ logoClaro: null, logoEscuro: null, foto: null, fotoW: 0, fotoH: 0 });
  const [alt, setAlt] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "erro" } | null>(null);
  // Troféu de compartilhar que saiu agora (Espalhando o Chalalá, Diário de Bordo…): comemora na hora.
  const [trofeus, setTrofeus] = useState<Array<ConquistaCelebravel & { id: string }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  // Card com vídeo (04/11/2026): só no “Treino pago”; tudo no aparelho.
  const videoRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<(VideoAberto & { inicio: number; comSom: boolean }) | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  // O vídeo leva alguns segundos para montar; o celular só deixa compartilhar logo depois de um toque,
  // então primeiro “Montar o vídeo” e depois “Compartilhar” com o arquivo pronto.
  const [videoPronto, setVideoPronto] = useState<File | null>(null);
  const [podeVideo, setPodeVideo] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capacidade do navegador só existe no cliente
    setPodeVideo(gravacaoSuportada());
  }, []);
  const trecho = video ? trechoDoVideo(video.total, video.inicio) : null;
  const cfgAtual = useRef(cfg);
  const ativosAtual = useRef(ativos);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    cfgAtual.current = cfg;
    ativosAtual.current = ativos;
    videoEl.current = video?.el ?? null;
  }, [cfg, ativos, video]);
  // Prévia do vídeo: toca mudo, em loop, só no trecho escolhido, e redesenha o card ~15×/s.
  useEffect(() => {
    const v = videoEl.current;
    if (!v || !trecho) return;
    v.muted = true;
    v.currentTime = trecho.inicio;
    void v.play().catch(() => undefined);
    let vivo = true;
    let ultimo = 0;
    const passo = (t: number) => {
      if (!vivo) return;
      if (v.currentTime >= trecho.inicio + trecho.duracao || v.currentTime < trecho.inicio - 0.5) v.currentTime = trecho.inicio;
      if (t - ultimo > 66 && canvasRef.current) {
        ultimo = t;
        desenhar(canvasRef.current, cfgAtual.current, dados, ativosAtual.current);
      }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
    return () => {
      vivo = false;
      v.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.url, trecho?.inicio, trecho?.duracao]);
  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.url]);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const ev = (e: Parameters<typeof enviarEvento>[0]) => registrarEventos && enviarEvento({ origem, ...e });
  // Código opaco do link (Inspiração da Galera): quem abre não vê quem compartilhou.
  const [codigoLink, setCodigoLink] = useState<string | null>(null);
  useEffect(() => {
    if (!registrarEventos) return;
    let vivo = true;
    void fetch("/api/chalala/meu-link")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { codigo?: string } | null) => {
        if (vivo && j?.codigo) setCodigoLink(j.codigo);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [registrarEventos]);

  useEffect(() => {
    if (registrarEventos) enviarEvento({ tipo: "editor_aberto", origem, modelo: inicial });
    dialogoRef.current?.focus();
    let vivo = true;
    void Promise.all([carregarSvg("/brand/logo.svg", 469, 321), carregarSvg("/brand/logo-fundo-claro.svg", 469, 321), document.fonts?.ready]).then(([claro, escuro]) => {
      if (vivo) setAtivos((a) => ({ ...a, logoClaro: claro, logoEscuro: escuro }));
    });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => {
      vivo = false;
      window.removeEventListener("keydown", esc);
    };
    // Abre uma vez por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mudou o card ou o trecho: o vídeo montado antes fica velho.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- invalida o arquivo montado
    setVideoPronto(null);
  }, [cfg, video?.url, video?.inicio, video?.comSom]);
  // Prévia = a mesma rotina da exportação, no tamanho final (o CSS só reduz).
  useEffect(() => {
    if (!canvasRef.current) return;
    const l = desenhar(canvasRef.current, cfg, dados, ativos);
    setAlt(l.textoAlternativo);
  }, [cfg, dados, ativos]);

  function mudar(patch: Partial<ConfigCard>) {
    setHistorico((h) => [...h.slice(-29), cfg]);
    setCfg((c) => ({ ...c, ...patch }));
  }
  function trocarModelo(m: ModeloId) {
    if (m === cfg.modelo) return;
    const base = configPadrao(m, dados, cfg.nome);
    mudar({ modelo: m, frase: base.frase, metricas: base.metricas });
    ev({ tipo: "modelo_escolhido", modelo: m });
  }
  function desfazer() {
    setHistorico((h) => {
      const anterior = h[h.length - 1];
      if (anterior) setCfg(anterior);
      return h.slice(0, -1);
    });
  }
  function restaurar() {
    mudar({ ...configPadrao(cfg.modelo, dados, nome), fundo: ativos.foto ? cfg.fundo : "gradiente" });
  }

  async function escolherFoto(f: File | undefined) {
    if (!f) return;
    setAviso(null);
    setOcupado(true);
    try {
      const p = await prepararFoto(f);
      setVideo(null);
      setAtivos((a) => ({ ...a, foto: p.imagem, fotoW: p.w, fotoH: p.h }));
      mudar({ fundo: "foto", foto: { ...AJUSTE_FOTO_PADRAO } });
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : "Não foi possível abrir a foto.", tipo: "erro" });
    } finally {
      setOcupado(false);
      if (fotoRef.current) fotoRef.current.value = "";
    }
  }
  function removerFoto() {
    setVideo(null);
    setAtivos((a) => ({ ...a, foto: null, fotoW: 0, fotoH: 0 }));
    mudar({ fundo: "gradiente" });
  }
  async function escolherVideo(f: File | undefined) {
    if (!f) return;
    setAviso(null);
    setOcupado(true);
    try {
      const v = await abrirVideo(f);
      setVideo({ ...v, inicio: 0, comSom: true });
      setAtivos((a) => ({ ...a, foto: v.el, fotoW: v.w, fotoH: v.h }));
      mudar({ fundo: "foto", foto: { ...AJUSTE_FOTO_PADRAO } });
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : "Não foi possível abrir o vídeo.", tipo: "erro" });
    } finally {
      setOcupado(false);
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  async function gerarArquivo(): Promise<File> {
    if (video && trecho && cfg.fundo === "foto") {
      setProgresso(0);
      try {
        const f = await gravarVideoCard({ url: video.url, inicio: trecho.inicio, duracao: trecho.duracao, comSom: video.comSom, cfg, dados, ativos, nomeBase: nomeArquivo(cfg, dados).replace(/\.png$/, ""), onProgresso: setProgresso });
        ev({ tipo: "card_gerado", modelo: cfg.modelo, formato: cfg.formato });
        return f;
      } finally {
        setProgresso(null);
        void video.el.play().catch(() => undefined);
      }
    }
    const f = await gerarImagem();
    ev({ tipo: "card_gerado", modelo: cfg.modelo, formato: cfg.formato });
    return f;
  }
  // Renderiza num canvas novo no tamanho final (independe do zoom da prévia).
  // Com foto vai em JPEG: bem mais leve e rápido de gerar que o PNG (o celular só abre a
  // lista de apps logo depois do toque — caso do Montinho, 06/11/2026: “só baixava”).
  async function gerarImagem(): Promise<File> {
    const c = document.createElement("canvas");
    desenhar(c, cfg, dados, ativos);
    const jpg = cfg.fundo === "foto" && !!ativos.foto;
    const blob = await paraBlob(c, jpg ? "image/jpeg" : "image/png");
    const nome = nomeArquivo(cfg, dados);
    return new File([blob], jpg ? nome.replace(/\.png$/, ".jpg") : nome, { type: jpg ? "image/jpeg" : "image/png" });
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
  const modoVideo = !!video && cfg.fundo === "foto";
  // Deixa a imagem pronta ~0,5 s depois da última mudança: no toque em Compartilhar ela já existe.
  const prontaRef = useRef<File | null>(null);
  useEffect(() => {
    prontaRef.current = null;
    if (modoVideo || !ativos.logoClaro) return;
    let vivo = true;
    const t = setTimeout(() => {
      gerarImagem().then((f) => { if (vivo) prontaRef.current = f; }, () => undefined);
    }, 500);
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, dados, ativos, modoVideo]);
  async function montarVideo() {
    setOcupado(true);
    setAviso(null);
    try {
      setVideoPronto(await gerarArquivo());
      setAviso({ texto: "🎬 Vídeo pronto! Agora toque em Compartilhar ou Baixar.", tipo: "ok" });
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : "Não foi possível montar o vídeo agora. Tente de novo ou use uma foto.", tipo: "erro" });
    } finally {
      setOcupado(false);
    }
  }
  async function acao(tipo: "compartilhar" | "baixar") {
    setOcupado(true);
    setAviso(null);
    let r: ResultadoCompartilhar;
    try {
      // A imagem já pronta (gerada logo depois da última mudança) vai na hora, ainda dentro do toque.
      const pronta = !modoVideo ? prontaRef.current : null;
      const f = modoVideo && videoPronto ? videoPronto : pronta ?? (await gerarArquivo());
      if (pronta) ev({ tipo: "card_gerado", modelo: cfg.modelo, formato: cfg.formato });
      if (tipo === "baixar") {
        baixar(f);
        r = "baixado";
      } else {
        const link = `${window.location.origin}/chalala?origem=card_${cfg.modelo.toLowerCase()}${codigoLink ? `&c=${codigoLink}` : ""}`;
        r = await compartilharArquivo(navigator, f, `${cfg.frase} @montinho_personal ${link}`, baixar, { pedirToque: true });
        if (r === "precisa_toque" && !modoVideo) prontaRef.current = f;
      }
    } catch {
      r = "erro";
    }
    if (r === "baixado" || r === "enviado_ao_sistema") {
      // Envio de verdade: o servidor grava e devolve o troféu de compartilhar que acabou de sair.
      const e = { tipo: r === "baixado" ? ("download" as const) : ("compartilhar_nativo" as const), modelo: cfg.modelo, formato: cfg.formato, origem, ...(refEvento ? { ref: refEvento } : {}) };
      if (registrarEventos) void enviarEventoComTrofeus(e).then((novas) => novas.length && setTrofeus(novas as Array<ConquistaCelebravel & { id: string }>));
    }
    if (r === "cancelado") ev({ tipo: "compartilhar_cancelado", modelo: cfg.modelo, formato: cfg.formato });
    const ehVideo = !!video && cfg.fundo === "foto";
    setAviso({ texto: ehVideo && r === "baixado" ? "Vídeo salvo no aparelho. No Instagram: Story → galeria → escolha o vídeo. No WhatsApp: Status ou conversa → anexar." : ehVideo && r === "erro" ? "Não foi possível montar o vídeo agora. Deixe o app aberto na tela até terminar e tente de novo, ou use uma foto." : MENSAGEM_RESULTADO[r], tipo: r === "erro" ? "erro" : "ok" });
    setOcupado(false);
  }

  // Evolução do treino tem a sua própria chave, em destaque (a pessoa escolhe se mostra).
  const temEvolucao = cfg.modelo !== "mensal" && !!dados.evolucaoTreino?.length && metricasDisponiveis(cfg.modelo, dados).includes("evolucao");
  const temLista = cfg.modelo === "A" && !!dados.listaTreino?.length && metricasDisponiveis(cfg.modelo, dados).includes("lista");
  const metricas = metricasDisponiveis(cfg.modelo, dados).filter((k) => (cfg.modelo === "mensal" || k !== "evolucao") && k !== "lista");
  const { w, h } = FORMATOS[cfg.formato];
  const fundoXadrez = cfg.fundo === "transparente" ? { backgroundImage: "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)", backgroundSize: "24px 24px" } : undefined;

  return (
    <div ref={dialogoRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="editor-card-titulo" className="fixed inset-0 z-[70] overflow-y-auto bg-bg outline-none">
      <div className="mx-auto max-w-5xl px-4 pb-28 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="editor-card-titulo" className="text-lg font-bold">Personalizar card</h2>
          <button type="button" onClick={onFechar} className="touch rounded-md border border-border px-3 py-1.5 text-sm text-fg-muted hover:text-fg">
            Fechar
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex justify-center">
            <canvas ref={canvasRef} role="img" aria-label={alt} width={w} height={h} className="h-auto max-h-[58vh] w-auto max-w-full rounded-xl border border-border shadow-lg lg:max-h-[78vh]" style={{ aspectRatio: `${w} / ${h}`, ...fundoXadrez }} />
          </div>

          <div className="space-y-4 text-sm">
            {modelos.length > 1 ? (
              <fieldset className="space-y-1.5">
                <legend className="font-semibold">Modelo</legend>
                <div className="flex flex-wrap gap-1.5">
                  {modelos.map((m) => (
                    <Chip key={m} ativo={cfg.modelo === m} onClick={() => trocarModelo(m)}>
                      {ROTULO_MODELO[m]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {temEvolucao ? (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-accent/50 bg-accent/5 p-3">
                <span>
                  <span className="block font-semibold">📈 Mostrar quanto eu evoluí</span>
                  <span className="block text-xs text-fg-muted">{(dados.evolucaoTreino ?? []).join(" · ")}</span>
                </span>
                <input type="checkbox" role="switch" checked={!!cfg.metricas.evolucao} onChange={(e) => mudar({ metricas: { ...cfg.metricas, evolucao: e.target.checked } })} aria-label="Mostrar no card quanto eu evoluí desde o último treino" className="h-6 w-6 shrink-0 accent-[var(--color-accent)]" />
              </label>
            ) : null}

            {temLista ? (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-accent/50 bg-accent/5 p-3">
                <span>
                  <span className="block font-semibold">📋 Mostrar os exercícios que fiz</span>
                  <span className="block text-xs text-fg-muted">Na ordem, com séries × repetições e a técnica ({dados.listaTreino!.length} {dados.listaTreino!.length === 1 ? "exercício" : "exercícios"})</span>
                </span>
                <input type="checkbox" role="switch" checked={!!cfg.metricas.lista} onChange={(e) => mudar({ metricas: { ...cfg.metricas, lista: e.target.checked } })} aria-label="Mostrar no card os exercícios que fiz" className="h-6 w-6 shrink-0 accent-[var(--color-accent)]" />
              </label>
            ) : null}

            <fieldset className="space-y-1.5">
              <legend className="font-semibold">Formato</legend>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(FORMATOS) as Formato[]).map((f) => (
                  <Chip key={f} ativo={cfg.formato === f} onClick={() => mudar({ formato: f })}>
                    {FORMATOS[f].rotulo}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-1.5">
              <legend className="font-semibold">Fundo</legend>
              <div className="flex flex-wrap gap-1.5">
                {FUNDOS.map((f) => (
                  <Chip key={f.v} ativo={cfg.fundo === f.v} onClick={() => (f.v === "foto" && !ativos.foto ? fotoRef.current?.click() : mudar({ fundo: f.v }))}>
                    {f.l}
                  </Chip>
                ))}
              </div>
              {cfg.fundo === "transparente" ? <p className="text-xs text-fg-subtle">PNG com transparência real, para colar sobre suas fotos e vídeos no Instagram.</p> : null}
              <input ref={fotoRef} type="file" accept="image/*" className="sr-only" aria-label="Escolher foto do aparelho" onChange={(e) => void escolherFoto(e.target.files?.[0])} />
            </fieldset>

            {cfg.fundo !== "foto" && cfg.fundo !== "transparente" ? (
              <fieldset className="space-y-1.5">
                <legend className="font-semibold">Cor</legend>
                <div className="flex flex-wrap gap-1.5">
                  {VARIACOES.map((v) => (
                    <button key={v.v} type="button" aria-pressed={cfg.variacao === v.v} onClick={() => mudar({ variacao: v.v })} className={`touch inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${cfg.variacao === v.v ? "border-accent text-accent" : "border-border text-fg-muted"}`}>
                      <span aria-hidden className="h-4 w-4 rounded-full border border-border" style={{ background: v.amostra }} />
                      {v.l}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{video ? "Ajustar o vídeo" : "Minha foto"}</p>
                {ativos.foto ? (
                  <span className="flex items-center gap-3">
                    <button type="button" disabled={ocupado} onClick={() => fotoRef.current?.click()} className="alvo rounded-full border border-accent/60 px-3 py-1 text-xs font-semibold text-accent disabled:opacity-60">
                      🔄 Trocar foto
                    </button>
                    <button type="button" onClick={removerFoto} className="alvo text-xs text-fg-muted underline-offset-2 hover:underline">
                      Remover
                    </button>
                  </span>
                ) : null}
              </div>
              {!ativos.foto ? (
                <>
                  <button type="button" disabled={ocupado} onClick={() => fotoRef.current?.click()} className="touch w-full rounded-md border border-accent/60 px-3 py-2 font-semibold text-accent disabled:opacity-60">
                    Adicionar minha foto
                  </button>
                  <p className="text-xs text-fg-subtle">A foto fica só no seu aparelho: o card é montado aqui mesmo e nada é enviado ao servidor.</p>
                </>
              ) : (
                <div className="space-y-2">
                  {/* Botões − / + no lugar das barrinhas (04/11/2026, pedido do Montinho: “a foto dá zoom sozinha”):
                      no celular, rolar a tela passando o dedo por cima da barra mudava o zoom sem querer. */}
                  {(
                    [
                      ["zoom", "Zoom", 1, 3, 0.1, "−", "+", false],
                      // Setas = para onde a FOTO anda (subir o valor mostra mais da direita/de baixo, a foto vai para a esquerda/para cima).
                      ["x", "Mover a foto", -1, 1, 0.05, "⬅", "➡", true],
                      ["y", "Mover a foto", -1, 1, 0.05, "⬆", "⬇", true],
                      ["escurecer", "Escurecer", 0, 0.8, 0.1, "−", "+", false],
                    ] as const
                  ).map(([k, rotulo, min, max, passo0, menos, mais, inverte]) => {
                    const passo = inverte ? -passo0 : passo0;
                    const v = cfg.foto[k];
                    const ajustar = (d: number) => {
                      setHistorico((hs) => [...hs.slice(-29), cfg]);
                      setCfg((c) => ({ ...c, fundo: "foto", foto: { ...c.foto, [k]: Math.round(Math.min(max, Math.max(min, c.foto[k] + d)) * 100) / 100 } }));
                    };
                    const pct = Math.round(((v - min) / (max - min)) * 100);
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 text-xs text-fg-muted">{rotulo}</span>
                        <button type="button" aria-label={`${rotulo}: ${menos}`} disabled={inverte ? v >= max : v <= min} onClick={() => ajustar(-passo)} className="touch h-10 w-10 rounded-full border border-border text-base font-bold disabled:opacity-30">{menos}</button>
                        <span className="w-10 text-center font-mono text-xs text-fg-muted">{k === "zoom" ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}×` : k === "escurecer" ? `${pct}%` : ""}</span>
                        <button type="button" aria-label={`${rotulo}: ${mais}`} disabled={inverte ? v <= min : v >= max} onClick={() => ajustar(passo)} className="touch h-10 w-10 rounded-full border border-border text-base font-bold disabled:opacity-30">{mais}</button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => mudar({ fundo: "foto", foto: { ...AJUSTE_FOTO_PADRAO } })} className="text-xs text-fg-muted underline-offset-2 hover:underline">↺ Voltar a foto ao normal</button>
                  {cfg.fundo !== "foto" ? (
                    <button type="button" onClick={() => mudar({ fundo: "foto" })} className="text-xs text-accent underline-offset-2 hover:underline">
                      Usar a foto como fundo
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Card com vídeo: só no Treino pago, por enquanto (04/11/2026). */}
            {cfg.modelo === "A" && podeVideo ? (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">🎬 Meu vídeo</p>
                  {video ? (
                    <span className="flex items-center gap-3">
                      <button type="button" disabled={ocupado} onClick={() => videoRef.current?.click()} className="alvo rounded-full border border-accent/60 px-3 py-1 text-xs font-semibold text-accent disabled:opacity-60">🔄 Trocar vídeo</button>
                      <button type="button" disabled={ocupado} onClick={removerFoto} className="alvo text-xs text-fg-muted underline-offset-2 hover:underline">Remover</button>
                    </span>
                  ) : null}
                </div>
                <input ref={videoRef} type="file" accept="video/*" className="sr-only" aria-label="Escolher vídeo do aparelho" onChange={(e) => void escolherVideo(e.target.files?.[0])} />
                {!video ? (
                  <>
                    <button type="button" disabled={ocupado} onClick={() => videoRef.current?.click()} className="touch w-full rounded-md border border-accent/60 px-3 py-2 font-semibold text-accent disabled:opacity-60">
                      Adicionar um vídeo (até 15 s)
                    </button>
                    <p className="text-xs text-fg-subtle">O card vai por cima do seu vídeo. É montado aqui no celular; nada é enviado ao servidor.</p>
                  </>
                ) : trecho ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 text-xs text-fg-muted">Começa em</span>
                      <button type="button" aria-label="Começar 1 segundo antes" disabled={ocupado || trecho.inicio <= 0} onClick={() => setVideo((v) => (v ? { ...v, inicio: Math.max(0, trechoDoVideo(v.total, v.inicio).inicio - 1) } : v))} className="touch h-10 w-10 rounded-full border border-border font-bold disabled:opacity-30">−</button>
                      <span className="w-12 text-center font-mono text-xs">{segundosTexto(trecho.inicio)}</span>
                      <button type="button" aria-label="Começar 1 segundo depois" disabled={ocupado || trecho.inicio + 1 >= video.total} onClick={() => setVideo((v) => (v ? { ...v, inicio: trechoDoVideo(v.total, v.inicio + 1).inicio } : v))} className="touch h-10 w-10 rounded-full border border-border font-bold disabled:opacity-30">+</button>
                    </div>
                    <p className="text-xs text-fg-subtle">Trecho: {segundosTexto(trecho.inicio)} até {segundosTexto(trecho.inicio + trecho.duracao)} ({Math.round(trecho.duracao)} s){video.total > 15 ? " · o card usa até 15 s" : ""}</p>
                    <label className="flex items-center justify-between gap-2 text-xs">
                      <span>Manter o som do vídeo</span>
                      <input type="checkbox" checked={video.comSom} disabled={ocupado} onChange={(e) => setVideo((v) => (v ? { ...v, comSom: e.target.checked } : v))} className="h-5 w-5 accent-[var(--color-accent)]" />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {cfg.modelo === "A" ? (
              <fieldset className="space-y-1.5">
                <legend className="font-semibold">Título do card</legend>
                <div className="flex flex-wrap gap-1.5">
                  {TITULOS_TREINO.map((t) => {
                    const on = tituloDoTreino(cfg.titulo) === t;
                    return (
                      <button key={t} type="button" aria-pressed={on} onClick={() => { setTituloProprio(""); escolherTitulo(t === TITULOS_TREINO[0] ? null : t); }} className={`min-h-9 rounded-full border px-3 text-xs font-bold ${on ? "border-accent bg-accent text-bg" : "border-border text-fg-muted"}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
                <label className="block space-y-1">
                  <span className="text-xs text-fg-muted">✏️ Ou escreva o seu (até {MAX_TITULO} letras)</span>
                  <input
                    value={tituloProprio}
                    maxLength={MAX_TITULO}
                    onChange={(e) => {
                      setTituloProprio(e.target.value);
                      escolherTitulo(e.target.value.trim() ? e.target.value : null);
                    }}
                    placeholder="Ex.: PERNA DESTRUÍDA!"
                    className="h-10 w-full rounded-md border border-border bg-bg px-2 uppercase"
                  />
                </label>
              </fieldset>
            ) : null}

            {cfg.modelo !== "reconhecimento" ? (
              <label className="block space-y-1">
                <span className="font-semibold">Frase</span>
                <select value={cfg.frase} onChange={(e) => mudar({ frase: e.target.value })} className="h-10 w-full rounded-md border border-border bg-bg px-2">
                  {FRASES[cfg.modelo].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <fieldset className="space-y-1.5">
              <legend className="font-semibold">O que mostrar</legend>
              {metricas.map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!cfg.metricas[k]} onChange={(e) => mudar({ metricas: { ...cfg.metricas, [k]: e.target.checked } })} className="h-4 w-4 accent-[var(--color-accent)]" />
                  {ROTULO_METRICA[k]}
                </label>
              ))}
              {dados.data ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.mostrarData} onChange={(e) => mudar({ mostrarData: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
                  Data
                </label>
              ) : null}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={cfg.mostrarNome} onChange={(e) => mudar({ mostrarNome: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
                Meu nome
              </label>
              {cfg.mostrarNome ? <input value={cfg.nome} onChange={(e) => setCfg((c) => ({ ...c, nome: e.target.value.slice(0, 40) }))} aria-label="Nome ou apelido no card" placeholder="Nome ou apelido" className="h-10 w-full rounded-md border border-border bg-bg px-3" /> : null}
              {!cfg.mostrarNome ? <p className="text-xs text-fg-subtle">Seu nome não aparece no card, a menos que você ative.</p> : null}
            </fieldset>

            <div className="flex gap-3 text-xs">
              <button type="button" onClick={desfazer} disabled={!historico.length} className="alvo text-fg-muted underline-offset-2 hover:underline disabled:opacity-40">
                Desfazer
              </button>
              <button type="button" onClick={restaurar} className="alvo text-fg-muted underline-offset-2 hover:underline">
                Restaurar modelo original
              </button>
            </div>

            <details className="rounded-lg border border-border p-3 text-xs text-fg-muted">
              <summary className="cursor-pointer font-semibold text-fg">Como postar no Instagram ou WhatsApp</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>“Compartilhar” abre a lista de apps do celular (quando o navegador permite). Escolha Instagram ou WhatsApp e finalize a publicação por lá.</li>
                <li>Se não aparecer a lista, o card é salvo no aparelho. No Instagram: novo Story → galeria → escolha o card.</li>
                <li>O PNG transparente é para colar como figurinha sobre uma foto ou vídeo seu.</li>
                <li>Nada é publicado automaticamente.</li>
              </ul>
            </details>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-5xl space-y-2">
          {registrarEventos ? (
            <ChamadaTrofeu acao={refEvento?.startsWith("medalha:") || origem !== "conclusao" ? "card_medalha" : "card_treino"} refTrofeu={refEvento?.startsWith("medalha:") ? refEvento.slice(8) : null} />
          ) : null}
          {aviso ? (
            <p role="status" className={`text-xs ${aviso.tipo === "erro" ? "text-danger" : "text-fg-muted"}`}>
              {aviso.texto}
            </p>
          ) : null}
          {modoVideo && !videoPronto ? (
            <button type="button" disabled={ocupado} onClick={() => void montarVideo()} className="touch w-full rounded-lg bg-accent px-4 py-3 font-bold text-bg disabled:opacity-60">
              {progresso != null ? `🎬 Montando o vídeo… ${Math.round(progresso * 100)}%` : `🎬 Montar o vídeo (${segundosTexto(trecho?.duracao ?? 0)})`}
            </button>
          ) : (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={ocupado} onClick={() => void acao("compartilhar")} className="touch rounded-lg bg-accent px-4 py-3 font-bold text-bg disabled:opacity-60">
              {ocupado ? "Gerando…" : "Compartilhar"}
            </button>
            <button type="button" disabled={ocupado} onClick={() => void acao("baixar")} className="touch rounded-lg border border-border px-4 py-3 font-semibold text-fg-muted hover:text-fg disabled:opacity-60">
              {modoVideo ? "Baixar vídeo" : "Baixar imagem"}
            </button>
          </div>
          )}
          {progresso != null ? <p className="text-center text-[11px] text-fg-subtle">Deixe o app aberto nesta tela até terminar.</p> : null}
        </div>
      </div>
      {trofeus.length ? (
        <CelebracaoMedalha
          conquistas={trofeus}
          nome={nome}
          onFechar={() => {
            marcarVistas(trofeus.map((t) => t.id));
            setTrofeus([]);
          }}
        />
      ) : null}
    </div>
  );
}
