"use client";

import { useMemo, useState } from "react";
import type { Foto, FotoTipo } from "@/lib/supabase/types-extended";
import { dataBR } from "@/lib/format";

const POSE_LABEL: Record<FotoTipo, string> = {
  frente: "Frente",
  lado: "Lado",
  costas: "Costas",
  pose: "Pose",
  confronto: "Confronto",
  outro: "Outro",
};
const POSE_ORDEM: FotoTipo[] = ["frente", "lado", "costas", "pose", "confronto", "outro"];

type Sessao = { data: string; fotos: Foto[] };

export function ComparadorFotos({ fotos }: { fotos: Foto[] }) {
  const [modo, setModo] = useState<"galeria" | "comparar">("comparar");

  const sessoes = useMemo<Sessao[]>(() => {
    const map = new Map<string, Foto[]>();
    for (const f of fotos) {
      if (!map.has(f.data)) map.set(f.data, []);
      map.get(f.data)!.push(f);
    }
    return Array.from(map.entries())
      .map(([data, fts]) => ({ data, fotos: fts }))
      .sort((a, b) => (a.data < b.data ? -1 : 1));
  }, [fotos]);

  // Poses presentes (na ordem canônica)
  const poses = useMemo<FotoTipo[]>(() => {
    const set = new Set(fotos.map((f) => f.tipo));
    return POSE_ORDEM.filter((p) => set.has(p));
  }, [fotos]);

  const [poseSel, setPoseSel] = useState<FotoTipo>(poses[0] ?? "frente");
  const [dataA, setDataA] = useState(sessoes[0]?.data ?? "");
  const [dataB, setDataB] = useState(sessoes[sessoes.length - 1]?.data ?? "");

  if (fotos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
        <div className="text-3xl mb-2 opacity-50">📷</div>
        <div className="font-bold text-sm">Nenhuma foto registrada</div>
        <div className="text-xs text-fg-muted mt-1">
          As fotos de progresso enviadas pelo aluno aparecem aqui pra comparação lado a lado.
        </div>
      </div>
    );
  }

  const fotoDe = (data: string, pose: FotoTipo) =>
    fotos.find((f) => f.data === data && f.tipo === pose) ?? null;

  return (
    <div className="space-y-4">
      {/* Toggle de modo */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex bg-card border border-border rounded-md overflow-hidden text-[12px] font-bold">
          <button
            onClick={() => setModo("comparar")}
            className={`px-3.5 py-1.5 transition-colors ${
              modo === "comparar" ? "bg-accent text-white" : "text-fg-muted hover:text-fg"
            }`}
          >
            ⇆ Comparar
          </button>
          <button
            onClick={() => setModo("galeria")}
            className={`px-3.5 py-1.5 transition-colors ${
              modo === "galeria" ? "bg-accent text-white" : "text-fg-muted hover:text-fg"
            }`}
          >
            ▦ Linha do tempo
          </button>
        </div>
        <button
          className="text-[12px] font-semibold px-3 py-1.5 rounded-md border border-border bg-card text-fg-muted hover:text-fg hover:border-border-strong transition-colors"
          title="Gera um comparativo com a sua logo pra compartilhar nos stories (em breve)"
        >
          ⬇ Exportar comparativo
        </button>
      </div>

      {modo === "comparar" ? (
        <>
          {/* Seletor de pose */}
          <div className="flex gap-1.5 flex-wrap">
            {poses.map((p) => (
              <button
                key={p}
                onClick={() => setPoseSel(p)}
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  poseSel === p
                    ? "bg-accent/15 text-accent border-accent/40"
                    : "bg-card text-fg-muted border-border hover:text-fg"
                }`}
              >
                {POSE_LABEL[p]}
              </button>
            ))}
          </div>

          {/* Par lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <LadoComparacao
              titulo="Antes"
              data={dataA}
              datas={sessoes.map((s) => s.data)}
              onData={setDataA}
              foto={fotoDe(dataA, poseSel)}
            />
            <LadoComparacao
              titulo="Depois"
              data={dataB}
              datas={sessoes.map((s) => s.data)}
              onData={setDataB}
              foto={fotoDe(dataB, poseSel)}
            />
          </div>

          {/* Intervalo */}
          {dataA && dataB && dataA !== dataB && (
            <p className="text-center text-[12px] text-fg-muted">
              Intervalo de{" "}
              <b className="text-fg">
                {Math.round(
                  (new Date(dataB).getTime() - new Date(dataA).getTime()) / (1000 * 60 * 60 * 24)
                )}{" "}
                dias
              </b>{" "}
              entre as fotos.
            </p>
          )}
        </>
      ) : (
        /* Linha do tempo: linhas = sessões, colunas = poses */
        <div className="space-y-4">
          {sessoes.map((s) => (
            <div key={s.data}>
              <div className="text-xs font-bold text-fg-muted mb-2">{dataBR(s.data)}</div>
              <div className="grid grid-cols-4 gap-2">
                {poses.map((p) => {
                  const f = fotoDe(s.data, p);
                  return (
                    <div key={p} className="space-y-1">
                      <div className="aspect-[2/3] rounded-md overflow-hidden border border-border bg-bg">
                        {f ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.url} alt={`${POSE_LABEL[p]} ${dataBR(s.data)}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-fg-subtle text-[10px]">
                            sem foto
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-center text-fg-subtle">{POSE_LABEL[p]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LadoComparacao({
  titulo,
  data,
  datas,
  onData,
  foto,
}: {
  titulo: string;
  data: string;
  datas: string[];
  onData: (d: string) => void;
  foto: Foto | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-bold text-fg-subtle">{titulo}</span>
        <select
          value={data}
          onChange={(e) => onData(e.target.value)}
          className="text-[12px] bg-card border border-border rounded-md px-2 py-1 outline-none focus:border-accent/50"
        >
          {datas.map((d) => (
            <option key={d} value={d}>
              {dataBR(d)}
            </option>
          ))}
        </select>
      </div>
      <div className="aspect-[2/3] rounded-lg overflow-hidden border border-border bg-bg">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.url} alt={`${titulo} ${dataBR(data)}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-subtle text-xs">
            sem foto nesta pose
          </div>
        )}
      </div>
      {foto?.observacoes && (
        <p className="text-[11px] text-fg-muted italic leading-relaxed">{foto.observacoes}</p>
      )}
    </div>
  );
}
