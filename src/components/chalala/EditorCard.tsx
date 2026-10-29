"use client";

// Editor do card “Meu Chalalá de hoje”: poucos toques, prévia em tempo real,
// foto opcional processada só no aparelho, exportação 9:16 / 4:5 / 1:1 / PNG
// transparente e compartilhamento nativo quando o navegador permite.

import { useEffect, useRef, useState } from "react";
import { configPadrao, FORMATOS, FRASES, metricasDisponiveis, modelosDisponiveis, nomeArquivo, ROTULO_METRICA, ROTULO_MODELO, AJUSTE_FOTO_PADRAO, type ConfigCard, type DadosCard, type Formato, type Fundo, type ModeloId, type Variacao } from "@/lib/chalala/card";
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import { carregarSvg, desenhar, paraBlob, prepararFoto, type Ativos } from "./desenhar";
import { enviarEvento } from "./evento";

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
  const [cfg, setCfg] = useState<ConfigCard>(() => configPadrao(inicial, dados, nome));
  const [historico, setHistorico] = useState<ConfigCard[]>([]);
  const [ativos, setAtivos] = useState<Ativos>({ logoClaro: null, logoEscuro: null, foto: null, fotoW: 0, fotoH: 0 });
  const [alt, setAlt] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "erro" } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
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
    setAtivos((a) => ({ ...a, foto: null, fotoW: 0, fotoH: 0 }));
    mudar({ fundo: "gradiente" });
  }

  async function gerarArquivo(): Promise<File> {
    // Renderiza num canvas novo no tamanho final (independe do zoom da prévia).
    const c = document.createElement("canvas");
    desenhar(c, cfg, dados, ativos);
    const blob = await paraBlob(c);
    ev({ tipo: "card_gerado", modelo: cfg.modelo, formato: cfg.formato });
    return new File([blob], nomeArquivo(cfg, dados), { type: "image/png" });
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
  async function acao(tipo: "compartilhar" | "baixar") {
    setOcupado(true);
    setAviso(null);
    let r: ResultadoCompartilhar;
    try {
      const f = await gerarArquivo();
      if (tipo === "baixar") {
        baixar(f);
        r = "baixado";
      } else {
        const link = `${window.location.origin}/chalala?origem=card_${cfg.modelo.toLowerCase()}${codigoLink ? `&c=${codigoLink}` : ""}`;
        r = await compartilharArquivo(navigator, f, `${cfg.frase} @montinho_personal ${link}`, baixar);
      }
    } catch {
      r = "erro";
    }
    if (r === "baixado") ev({ tipo: "download", modelo: cfg.modelo, formato: cfg.formato, ...(refEvento ? { ref: refEvento } : {}) });
    if (r === "enviado_ao_sistema") ev({ tipo: "compartilhar_nativo", modelo: cfg.modelo, formato: cfg.formato, ...(refEvento ? { ref: refEvento } : {}) });
    if (r === "cancelado") ev({ tipo: "compartilhar_cancelado", modelo: cfg.modelo, formato: cfg.formato });
    setAviso({ texto: MENSAGEM_RESULTADO[r], tipo: r === "erro" ? "erro" : "ok" });
    setOcupado(false);
  }

  // Evolução do treino tem a sua própria chave, em destaque (a pessoa escolhe se mostra).
  const temEvolucao = cfg.modelo !== "mensal" && !!dados.evolucaoTreino?.length && metricasDisponiveis(cfg.modelo, dados).includes("evolucao");
  const metricas = metricasDisponiveis(cfg.modelo, dados).filter((k) => cfg.modelo === "mensal" || k !== "evolucao");
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
                <p className="font-semibold">Minha foto</p>
                {ativos.foto ? (
                  <button type="button" onClick={removerFoto} className="alvo text-xs text-fg-muted underline-offset-2 hover:underline">
                    Remover foto
                  </button>
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
                  {(
                    [
                      ["zoom", "Zoom", 1, 3, 0.05],
                      ["x", "Posição horizontal", -1, 1, 0.02],
                      ["y", "Posição vertical", -1, 1, 0.02],
                      ["escurecer", "Escurecer", 0, 0.8, 0.05],
                    ] as const
                  ).map(([k, rotulo, min, max, passo]) => (
                    <label key={k} className="block space-y-0.5">
                      <span className="text-xs text-fg-muted">{rotulo}</span>
                      <input type="range" min={min} max={max} step={passo} value={cfg.foto[k]} onChange={(e) => setCfg((c) => ({ ...c, fundo: "foto", foto: { ...c.foto, [k]: Number(e.target.value) } }))} onPointerDown={() => setHistorico((hs) => [...hs.slice(-29), cfg])} className="w-full accent-[var(--color-accent)]" />
                    </label>
                  ))}
                  {cfg.fundo !== "foto" ? (
                    <button type="button" onClick={() => mudar({ fundo: "foto" })} className="text-xs text-accent underline-offset-2 hover:underline">
                      Usar a foto como fundo
                    </button>
                  ) : null}
                </div>
              )}
            </div>

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
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={ocupado} onClick={() => void acao("compartilhar")} className="touch rounded-lg bg-accent px-4 py-3 font-bold text-bg disabled:opacity-60">
              {ocupado ? "Gerando…" : "Compartilhar"}
            </button>
            <button type="button" disabled={ocupado} onClick={() => void acao("baixar")} className="touch rounded-lg border border-border px-4 py-3 font-semibold text-fg-muted hover:text-fg disabled:opacity-60">
              Baixar imagem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
