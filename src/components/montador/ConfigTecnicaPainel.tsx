"use client";

// Configuração da técnica avançada do exercício (rest-pause, drop-set,
// myo-reps, cluster, 3/7, super slow, negativo). Fica logo abaixo do método:
// resumo colorido sempre visível; toque para abrir e ajustar cada número.
import { useState } from "react";
import type { Tecnica } from "@/lib/volume/calcular";
import { COR_TECNICA, METODOS } from "@/lib/volume/tecnicas";
import { cargasDosDrops, configEfetiva, ehConfiguravel, exemploRestPause, instrucaoTecnica, LIMITES_TECNICA, PADRAO_TECNICA, podeFinalizar, resumoTecnica, type ConfigTecnica } from "@/lib/treino/tecnica-config";

type Campo = keyof typeof LIMITES_TECNICA;

function Numero({ rotulo, dica, campo, cfg, onChange, sufixo, vazio }: { rotulo: string; dica?: string; campo: Campo; cfg: ConfigTecnica; onChange: (c: ConfigTecnica) => void; sufixo?: string; vazio?: string }) {
  const [min, max] = LIMITES_TECNICA[campo];
  const valor = cfg[campo as keyof ConfigTecnica];
  return (
    <label className="block min-w-0 space-y-1">
      <span className="block text-[11px] font-semibold text-fg-muted">{rotulo}</span>
      <span className="flex items-center rounded-lg border border-border bg-bg focus-within:border-accent">
        <input
          inputMode="numeric"
          value={valor == null ? "" : String(valor)}
          placeholder={vazio ?? String((PADRAO_TECNICA.rest_pause as Record<string, unknown>)[campo] ?? "")}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(0, 3);
            const n = d === "" ? undefined : Math.min(max, Math.max(min, Number(d)));
            onChange({ ...cfg, [campo]: n });
          }}
          className="h-10 w-full min-w-0 bg-transparent px-2 text-center font-mono text-base outline-none"
          aria-label={rotulo}
        />
        {sufixo ? <span className="pr-2 text-xs text-fg-subtle">{sufixo}</span> : null}
      </span>
      {dica ? <span className="block text-[10px] text-fg-subtle">{dica}</span> : null}
    </label>
  );
}

export function ConfigTecnicaPainel({ tecnica, config, validas, cargaAlvo, onChange }: { tecnica: Tecnica; config: ConfigTecnica | null; validas: number; cargaAlvo?: string; onChange: (c: ConfigTecnica) => void }) {
  const [aberto, setAberto] = useState(false);
  if (!ehConfiguravel(tecnica)) return null;
  const cor = COR_TECNICA[tecnica] ?? "#d4a84b";
  const nome = METODOS.find((m) => m.v === tecnica)?.l ?? tecnica;
  const cfg: ConfigTecnica = config ?? {};
  const ef = configEfetiva(tecnica, config)!;
  const p = PADRAO_TECNICA[tecnica];
  // Placeholder = valor sugerido desta técnica.
  const ph = (k: Campo) => String((p as Record<string, unknown>)[k] ?? "");
  const resumo = resumoTecnica(tecnica, config);
  const fin = podeFinalizar(tecnica);
  const carga = Number((cargaAlvo ?? "").replace(",", ".").match(/[\d.]+/)?.[0] ?? NaN);

  return (
    <div className="rounded-lg border-l-4 bg-bg/40" style={{ borderLeftColor: cor }}>
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="flex w-full items-center gap-2 px-2 py-1.5 text-left">
        <span className="min-w-0 flex-1 text-[11px] font-semibold" style={{ color: cor }}>
          {config ? resumo : "Configuração antiga · toque para configurar"}
        </span>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: `${cor}80`, color: cor }}>
          {aberto ? "Fechar" : "⚙ Configurar"}
        </span>
      </button>
      {aberto ? (
        <div className="space-y-3 px-2 pb-3">
          <p className="rounded-md bg-card px-2.5 py-2 text-[11px] leading-snug text-fg-muted">💡 {instrucaoTecnica(tecnica, cfg)}</p>

          {fin ? (
            <div className="space-y-1">
              <span className="block text-[11px] font-semibold text-fg-muted">Onde entra o {nome.toLowerCase()}?</span>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1 text-[11px] font-semibold">
                {(["finalizacao", "principais"] as const).map((a) => (
                  <button key={a} type="button" onClick={() => onChange({ ...cfg, aplicar: a, series: a === "principais" ? Math.min(validas || 1, ef.series) : ef.series })} className="rounded-md px-2 py-1.5" style={ef.aplicar === a ? { background: `${cor}26`, color: cor } : undefined}>
                    {a === "finalizacao" ? "Série(s) a mais no final" : "Nas séries principais"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {fin ? <Numero campo="series" rotulo={ef.aplicar === "finalizacao" ? "Séries de finalização" : "Nas últimas … séries"} dica={ef.aplicar === "finalizacao" ? "Feitas depois das principais" : `De ${validas} séries`} vazio="1" cfg={cfg} onChange={onChange} /> : null}
            {tecnica === "rest_pause" ? (
              <>
                <Numero campo="repsAlvo" rotulo="Reps alvo (total)" dica="Somando todos os pedaços" vazio="sem total" cfg={cfg} onChange={onChange} />
                <Numero campo="pausaSeg" rotulo="Pausa" sufixo="s" dica="10–20 s é o usual" vazio={ph("pausaSeg")} cfg={cfg} onChange={onChange} />
              </>
            ) : null}
            {tecnica === "dropset" ? (
              <>
                <Numero campo="reps" rotulo="Reps antes do 1º drop" dica="Depois, cada drop vai até a falha" vazio={ph("reps")} cfg={cfg} onChange={onChange} />
                <Numero campo="blocos" rotulo="Nº de drops" dica="1 a 3 é o usual" vazio={ph("blocos")} cfg={cfg} onChange={onChange} />
                <Numero campo="reducaoPct" rotulo="Redução por drop" sufixo="%" dica="20–25% é o usual" vazio={ph("reducaoPct")} cfg={cfg} onChange={onChange} />
                <Numero campo="pausaSeg" rotulo="Pausa entre drops" sufixo="s" dica="0 = só trocar o peso" vazio={ph("pausaSeg")} cfg={cfg} onChange={onChange} />
              </>
            ) : null}
            {tecnica === "myo_reps" ? (
              <>
                <Numero campo="reps" rotulo="Reps de ativação" dica="12–20, perto da falha" vazio={ph("reps")} cfg={cfg} onChange={onChange} />
                <Numero campo="blocos" rotulo="Mini-séries" dica="3 a 5" vazio={ph("blocos")} cfg={cfg} onChange={onChange} />
                <Numero campo="repsBloco" rotulo="Reps por mini" dica="3 a 5" vazio={ph("repsBloco")} cfg={cfg} onChange={onChange} />
                <Numero campo="pausaSeg" rotulo="Pausa" sufixo="s" dica="3–5 respirações" vazio={ph("pausaSeg")} cfg={cfg} onChange={onChange} />
              </>
            ) : null}
            {tecnica === "cluster" ? (
              <>
                <Numero campo="blocos" rotulo="Blocos por série" vazio={ph("blocos")} cfg={cfg} onChange={onChange} />
                <Numero campo="reps" rotulo="Reps por bloco" vazio={ph("reps")} cfg={cfg} onChange={onChange} />
                <Numero campo="pausaSeg" rotulo="Pausa entre blocos" sufixo="s" dica="15–30 s" vazio={ph("pausaSeg")} cfg={cfg} onChange={onChange} />
              </>
            ) : null}
            {tecnica === "tres_sete" ? <Numero campo="pausaSeg" rotulo="Pausa entre blocos" sufixo="s" dica="15 s no protocolo" vazio={ph("pausaSeg")} cfg={cfg} onChange={onChange} /> : null}
            {tecnica === "super_slow" || tecnica === "negativo" ? (
              <>
                <Numero campo="descidaSeg" rotulo="Descendo" sufixo="s" vazio={ph("descidaSeg")} cfg={cfg} onChange={onChange} />
                <Numero campo="subidaSeg" rotulo="Subindo" sufixo="s" vazio={ph("subidaSeg")} cfg={cfg} onChange={onChange} />
              </>
            ) : null}
            {fin && ef.aplicar === "finalizacao" && ef.series > 1 ? <Numero campo="descansoSeg" rotulo="Descanso entre elas" sufixo="s" vazio={ph("descansoSeg")} cfg={cfg} onChange={onChange} /> : null}
          </div>

          {tecnica === "rest_pause" && ef.repsAlvo != null ? (
            <p className="flex flex-wrap items-center gap-1 text-[11px] text-fg-muted">
              Exemplo:
              {exemploRestPause(ef.repsAlvo).map((n, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  {i ? <span className="text-fg-subtle">{ef.pausaSeg}s</span> : null}
                  <span className="rounded-full px-2 py-0.5 font-mono font-bold" style={{ background: `${cor}26`, color: cor }}>{n}</span>
                </span>
              ))}
              <span>= {ef.repsAlvo} ✓</span>
            </p>
          ) : null}
          {tecnica === "dropset" ? (
            <p className="text-[11px] text-fg-muted">
              Exemplo{Number.isFinite(carga) && carga > 0 ? "" : " com 50 kg"}:{" "}
              <span className="font-mono font-bold" style={{ color: cor }}>
                {[Number.isFinite(carga) && carga > 0 ? carga : 50, ...cargasDosDrops(Number.isFinite(carga) && carga > 0 ? carga : 50, ef.blocos, ef.reducaoPct)].map((k) => `${String(k).replace(".", ",")} kg`).join(" → ")}
              </span>
            </p>
          ) : null}
          <button type="button" onClick={() => onChange({})} className="text-[11px] font-semibold text-fg-subtle underline-offset-2 hover:underline">
            Voltar aos valores sugeridos
          </button>
        </div>
      ) : null}
    </div>
  );
}
