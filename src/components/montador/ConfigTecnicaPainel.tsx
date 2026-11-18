"use client";

// Técnica avançada do exercício “em frase” (18/11/2026, pedido do Montinho: o
// painel antigo abria espremido na coluna do nome, com texto longo e vários
// campos). Na linha fica só o resumo colorido; o toque abre uma folha (de baixo
// no celular, no meio no computador) com: onde entra, a frase com os números
// para tocar, atalhos e “o aluno vai ver”. Os dados gravados são os mesmos.
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CampoNumero } from "@/components/ui/CampoNumero";
import type { Tecnica } from "@/lib/volume/calcular";
import { COR_TECNICA, METODOS } from "@/lib/volume/tecnicas";
import { useFecharComVoltar } from "@/lib/useFecharComVoltar";
import { ATALHOS_TECNICA, atalhoAtivo, configDoOnde, configEfetiva, ehConfiguravel, LIMITES_TECNICA, ondeEntra, podeFinalizar, previaDoAluno, resumoTecnica, type ConfigTecnica, type OndeEntra } from "@/lib/treino/tecnica-config";

type Campo = keyof typeof LIMITES_TECNICA;
const CHAVE = (t: string) => `montinho-tecnica-padrao:${t}`;

function lerMeuPadrao(tecnica: string): ConfigTecnica | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE(tecnica)) ?? "null");
    return v && typeof v === "object" ? (v as ConfigTecnica) : null;
  } catch {
    return null;
  }
}

/** Número dentro da frase: sublinhado na cor da técnica, toca e digita. */
function N({ campo, cfg, efetivo, onChange, cor, vazio, nulo, rotulo }: { campo: Campo; cfg: ConfigTecnica; efetivo: number | null; onChange: (c: ConfigTecnica) => void; cor: string; vazio?: string; nulo?: boolean; rotulo: string }) {
  const [min, max] = LIMITES_TECNICA[campo];
  return (
    <CampoNumero
      valor={efetivo}
      min={min}
      max={max}
      onChange={(n) => onChange({ ...cfg, [campo]: n })}
      onVazio={() => onChange({ ...cfg, [campo]: nulo ? null : undefined })}
      placeholder={vazio ?? ""}
      aria-label={rotulo}
      className="mx-0.5 inline-block h-9 rounded-md border-b-2 border-dashed bg-bg/60 px-1 text-center font-mono text-base font-bold outline-none focus:border-solid"
      style={{ borderColor: cor, color: cor, width: vazio && efetivo == null ? `${Math.max(3, vazio.length) + 1}ch` : `${String(efetivo ?? "").length + 2}ch` }}
    />
  );
}

export function ConfigTecnicaPainel({ tecnica, config, validas, cargaAlvo, repsTexto, exercicio, abrirAoMontar = false, onChange, onRemover }: { tecnica: Tecnica; config: ConfigTecnica | null; validas: number; cargaAlvo?: string; repsTexto?: string | null; exercicio?: string; abrirAoMontar?: boolean; onChange: (c: ConfigTecnica) => void; onRemover?: () => void }) {
  // Técnica acabou de ser escolhida nesta tela: já abre para conferir (nunca ao carregar a página).
  const [aberto, setAberto] = useState(abrirAoMontar);
  const [meuPadrao, setMeuPadrao] = useState<ConfigTecnica | null>(() => (typeof window === "undefined" ? null : lerMeuPadrao(tecnica)));
  // A lista de métodos acabou de fechar com um “voltar”: só liga o voltar do celular depois.
  const [armado, setArmado] = useState(false);
  const fechar = () => {
    setAberto(false);
    setArmado(false);
  };
  useEffect(() => {
    if (!aberto) return;
    const t = setTimeout(() => setArmado(true), 450);
    return () => clearTimeout(t);
  }, [aberto]);
  useFecharComVoltar(aberto && armado, fechar);
  useEffect(() => {
    // Técnica recém-escolhida e o treinador tem um padrão guardado: já entra com ele.
    if (abrirAoMontar && meuPadrao && config && Object.keys(config).length === 0) onChange(meuPadrao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("folha-tecnica-aberta");
    return () => {
      document.body.classList.remove("folha-tecnica-aberta");
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [aberto]);

  if (!ehConfiguravel(tecnica)) return null;
  const cor = COR_TECNICA[tecnica] ?? "#d4a84b";
  const nome = METODOS.find((m) => m.v === tecnica)?.l ?? tecnica;
  const cfg: ConfigTecnica = config ?? {};
  const ef = configEfetiva(tecnica, cfg)!;
  const fin = podeFinalizar(tecnica);
  const onde = ondeEntra(tecnica, cfg, validas);
  const carga = Number((cargaAlvo ?? "").replace(",", ".").match(/[\d.]+/)?.[0] ?? NaN);
  const previa = previaDoAluno(tecnica, cfg, validas, nome, repsTexto, Number.isFinite(carga) ? carga : null);
  const atalhos = ATALHOS_TECNICA[tecnica] ?? [];
  const n = (campo: Campo, rotulo: string, extra?: { vazio?: string; nulo?: boolean }) => <N campo={campo} cfg={cfg} efetivo={ef[campo as keyof typeof ef] as number | null} onChange={onChange} cor={cor} rotulo={rotulo} {...extra} />;
  // Mantém “onde entra” ao aplicar um atalho ou o padrão.
  const comOnde = (c: ConfigTecnica): ConfigTecnica => (fin ? { ...c, aplicar: ef.aplicar, series: ef.series } : c);
  const chip = (ativo: boolean) => ({ className: "rounded-full border px-3 py-2 text-sm font-semibold", style: ativo ? { borderColor: `${cor}99`, background: `${cor}26`, color: cor } : undefined });
  const ONDE: Array<{ v: Exclude<OndeEntra, "outro">; l: string }> = [
    { v: "ultima", l: "Na última série" },
    { v: "extra", l: "Série a mais no fim" },
    { v: "todas", l: "Em todas" },
  ];

  let frase: ReactNode = null;
  if (tecnica === "dropset")
    frase = (
      <>
        Faz {n("reps", "Reps antes do 1º drop", { vazio: "falha", nulo: true })} reps, tira {n("reducaoPct", "Redução por drop (%)")}% do peso e vai até a falha, {n("blocos", "Número de drops")} {ef.blocos === 1 ? "vez" : "vezes"}, com {n("pausaSeg", "Pausa entre drops (s)")} s de pausa.
      </>
    );
  else if (tecnica === "rest_pause")
    frase = (
      <>
        Vai até perto da falha, descansa {n("pausaSeg", "Pausa (s)")} s e continua com a mesma carga, mais {cfg.blocos == null ? <N campo="blocos" cfg={cfg} efetivo={null} onChange={onChange} cor={cor} rotulo="Mini-séries depois da 1ª" vazio="quantas der" /> : n("blocos", "Mini-séries depois da 1ª")} {cfg.blocos != null && ef.blocos === 1 ? "vez" : "vezes"}, até somar {n("repsAlvo", "Reps alvo (total)", { vazio: "sem total", nulo: true })} reps.
      </>
    );
  else if (tecnica === "myo_reps")
    frase = (
      <>
        Faz {n("reps", "Reps de ativação")} reps perto da falha, respira {n("pausaSeg", "Pausa (s)")} s e faz {n("blocos", "Mini-séries")} mini-séries de {n("repsBloco", "Reps por mini-série")} reps, mesma carga.
      </>
    );
  else if (tecnica === "cluster")
    frase = (
      <>
        Cada série em {n("blocos", "Blocos por série")} blocos de {n("reps", "Reps por bloco")} reps, com {n("pausaSeg", "Pausa entre blocos (s)")} s de pausa entre eles.
      </>
    );
  else if (tecnica === "tres_sete") frase = <>3, 4, 5, 6 e 7 reps com a mesma carga, com {n("pausaSeg", "Pausa entre blocos (s)")} s de pausa entre os blocos.</>;
  else
    frase = (
      <>
        {n("descidaSeg", "Segundos descendo")} s descendo e {n("subidaSeg", "Segundos subindo")} s subindo, sem embalo.
      </>
    );

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-haspopup="dialog" className="flex w-full items-center gap-2 rounded-lg border-l-4 bg-bg/40 px-2 py-1.5 text-left" style={{ borderLeftColor: cor }}>
        <span className="min-w-0 flex-1 text-[11px] font-semibold" style={{ color: cor }}>
          {config ? resumoTecnica(tecnica, config) : "Configuração antiga · toque para configurar"}
        </span>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: `${cor}80`, color: cor }}>
          ✏️ Ajustar
        </span>
      </button>
      {aberto
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`${nome}: como vai ser`}>
              <button type="button" aria-label="Fechar" onClick={() => fechar()} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
              <div className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-2xl">
                <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden />
                <div className="flex items-start justify-between gap-3 px-4 pb-1 pt-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold" style={{ color: cor }}>⚡ {nome}</p>
                    {exercicio ? <p className="truncate text-xs text-fg-muted">{exercicio}</p> : null}
                  </div>
                  <button type="button" onClick={() => fechar()} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-fg-muted hover:text-fg">✕</button>
                </div>
                <div className="space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
                  {fin ? (
                    <section className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Onde entra</p>
                      <div className="flex flex-wrap gap-2">
                        {ONDE.map((o) => (
                          <button key={o.v} type="button" onClick={() => onChange(configDoOnde(cfg, o.v, validas))} aria-pressed={onde === o.v} {...chip(onde === o.v)}>
                            {o.l}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-fg-muted">
                        {ef.aplicar === "finalizacao" ? (
                          <>
                            {n("series", "Séries de finalização")} {ef.series === 1 ? "série a mais" : "séries a mais"}, depois das {validas} do exercício
                            {ef.series > 1 ? <>, com {n("descansoSeg", "Descanso entre elas (s)")} s de descanso entre elas</> : null}.
                          </>
                        ) : (
                          <>
                            Nas últimas {n("series", "Quantas séries usam a técnica")} das {validas} séries (não aumenta o total).
                          </>
                        )}
                      </p>
                    </section>
                  ) : null}

                  <section className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Como é · toque no número para mudar</p>
                    <p className="text-base leading-[2.6]">{frase}</p>
                  </section>

                  <section className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Atalhos</p>
                    <div className="flex flex-wrap gap-2">
                      {meuPadrao ? (
                        <button type="button" onClick={() => onChange(comOnde(meuPadrao))} {...chip(false)}>⭐ Meu padrão</button>
                      ) : null}
                      <button type="button" onClick={() => onChange(comOnde({}))} {...chip(false)}>Sugerido</button>
                      {atalhos.map((a) => (
                        <button key={a.rotulo} type="button" onClick={() => onChange({ ...cfg, ...a.cfg })} {...chip(atalhoAtivo(tecnica, cfg, a.cfg))}>
                          {a.rotulo}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          window.localStorage.setItem(CHAVE(tecnica), JSON.stringify(cfg));
                          setMeuPadrao(cfg);
                        } catch {}
                      }}
                      className="text-xs font-semibold text-fg-subtle underline-offset-2 hover:underline"
                    >
                      {meuPadrao && JSON.stringify(meuPadrao) === JSON.stringify(cfg) ? "✓ Este é o meu padrão neste aparelho" : `⭐ Guardar este como meu padrão de ${nome.toLowerCase()}`}
                    </button>
                  </section>

                  {previa ? (
                    <section className="rounded-xl bg-bg px-3 py-2.5 text-sm leading-relaxed text-fg-muted">
                      <p className="font-bold text-fg">👁 O aluno vai ver</p>
                      {previa.linhas.map((l, i) => (
                        <p key={i} style={l.tecnica ? { color: cor } : undefined}>{l.texto}</p>
                      ))}
                      {fin ? <p className="text-xs text-fg-subtle">Total: {previa.total} {previa.total === 1 ? "série" : "séries"}</p> : null}
                    </section>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2 border-t border-border px-4 py-3">
                  {onRemover ? (
                    <button
                      type="button"
                      onClick={() => {
                        fechar();
                        onRemover();
                      }}
                      className="rounded-xl border border-border px-3 py-3 text-sm font-semibold text-fg-muted"
                    >
                      Tirar a técnica
                    </button>
                  ) : null}
                  <button type="button" onClick={() => fechar()} className="flex-1 rounded-xl bg-accent px-3 py-3 text-sm font-bold text-bg">Pronto</button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

