"use client";

// “✨ Puxar as medidas deste arquivo” (pedido do Montinho, 29/10/2026): a IA lê
// o PDF/foto da avaliação e mostra UMA prévia por data (antes e depois). O
// personal confere, corrige o que quiser e salva; nada é gravado sem o toque.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAMPOS_MEDIDA, lerMedida, type ChaveMedida } from "@/lib/medidas/campos";
import type { AvaliacaoLida, MedidaExtra } from "@/lib/medidas/leitura";
import { dataBR } from "@/lib/format";
import { Button } from "@/components/ui/Button";

type Rascunho = { incluir: boolean; data: string; valores: Partial<Record<ChaveMedida, string>>; extras: Array<{ nome: string; valor: string; unidade: string }> };

const txt = (n: number) => String(n).replace(".", ",");
const paraRascunho = (a: AvaliacaoLida): Rascunho => ({
  incluir: true,
  data: a.data,
  valores: Object.fromEntries(Object.entries(a.medidas).map(([k, v]) => [k, txt(v as number)])),
  extras: a.extras.map((e) => ({ nome: e.nome, valor: txt(e.valor), unidade: e.unidade })),
});

export function LerAvaliacaoIA({ alunoId, arquivoId, datasJaSalvas }: { alunoId: string; arquivoId: string; datasJaSalvas: string[] }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"parado" | "lendo" | "previa" | "salvando">("parado");
  const [rascunhos, setRascunhos] = useState<Rascunho[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [exemplo, setExemplo] = useState(false);

  async function ler() {
    setErro(null);
    setEstado("lendo");
    try {
      const r = await fetch(`/api/medidas/arquivos/${arquivoId}/ler`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Não foi possível ler o arquivo agora.");
      if (j.ia === false) throw new Error("A leitura pela IA ainda não está ligada no app.");
      const lidas = (j.avaliacoes ?? []) as AvaliacaoLida[];
      if (!lidas.length) throw new Error(j.erro ?? "Não encontrei medidas neste arquivo.");
      setExemplo(Boolean(j.exemplo));
      setRascunhos(lidas.map(paraRascunho));
      setEstado("previa");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Algo deu errado.");
      setEstado("parado");
    }
  }

  const mudar = (i: number, f: (r: Rascunho) => Rascunho) => setRascunhos((rs) => rs.map((r, j) => (j === i ? f(r) : r)));

  async function salvar() {
    setErro(null);
    const corpos: Array<Record<string, unknown>> = [];
    for (const r of rascunhos.filter((x) => x.incluir)) {
      const lidos: Partial<Record<ChaveMedida, number>> = {};
      for (const c of CAMPOS_MEDIDA) {
        const { valor, erro: er } = lerMedida(c, r.valores[c.chave] ?? "");
        if (er) return setErro(`${dataBR(r.data)} · ${er}`);
        if (valor != null) lidos[c.chave] = valor;
      }
      const extras: MedidaExtra[] = r.extras
        .map((e) => ({ nome: e.nome.trim(), valor: Number(e.valor.replace(",", ".")), unidade: e.unidade.trim() }))
        .filter((e) => e.nome && Number.isFinite(e.valor) && e.valor > 0);
      corpos.push({ aluno_id: alunoId, data: r.data, observacoes: "Lido do arquivo da avaliação", ...lidos, ...(extras.length ? { extras } : {}) });
    }
    if (!corpos.length) return setErro("Marque pelo menos uma data para salvar.");
    setEstado("salvando");
    try {
      for (const corpo of corpos) {
        const r = await fetch("/api/medidas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? "Não foi possível salvar as medidas.");
      }
      setEstado("parado");
      setRascunhos([]);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Algo deu errado.");
      setEstado("previa");
    }
  }

  if (estado === "parado" || estado === "lendo")
    return (
      <div className="px-3 pb-2.5">
        <button type="button" onClick={ler} disabled={estado === "lendo"} className="alvo w-full rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs font-bold text-accent disabled:opacity-60">
          {estado === "lendo" ? "Lendo o arquivo… (até 1 minuto)" : "✨ Puxar as medidas deste arquivo"}
        </button>
        {erro ? <p className="mt-1 text-xs font-semibold text-red-400" role="alert">{erro}</p> : null}
      </div>
    );

  const marcadas = rascunhos.filter((r) => r.incluir).length;
  return (
    <div className="space-y-3 border-t border-border px-3 py-3">
      <p className="text-sm font-bold">✨ Confira antes de salvar</p>
      <p className="text-xs text-fg-muted">
        A IA encontrou {rascunhos.length === 1 ? "1 data" : `${rascunhos.length} datas`} no arquivo. Corrija o que precisar: só é salvo o que estiver marcado.
        {exemplo ? " (Demonstração: números de exemplo.)" : ""}
      </p>
      {rascunhos.map((r, i) => {
        const campos = CAMPOS_MEDIDA.filter((c) => r.valores[c.chave] != null);
        const repetida = datasJaSalvas.includes(r.data);
        return (
          <fieldset key={i} className={`space-y-2 rounded-xl border p-3 ${r.incluir ? "border-accent/50" : "border-border opacity-60"}`}>
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-accent">{i === 0 && rascunhos.length > 1 ? "Antes" : i === rascunhos.length - 1 && rascunhos.length > 1 ? "Depois" : "Avaliação"}</legend>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={r.incluir} onChange={(e) => mudar(i, (x) => ({ ...x, incluir: e.target.checked }))} className="h-4 w-4 accent-[var(--color-accent)]" />
                Salvar
              </label>
              <input type="date" value={r.data} onChange={(e) => mudar(i, (x) => ({ ...x, data: e.target.value }))} className="rounded-lg border border-border bg-bg px-2 py-1 text-sm" aria-label="Data da avaliação" />
            </div>
            {repetida ? <p className="text-[11px] text-warning">Já existe um registro em {dataBR(r.data)}. Salvar cria outro na mesma data.</p> : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {campos.map((c) => (
                <label key={c.chave} className="text-[11px] font-semibold">
                  {c.rotulo} <span className="font-normal text-fg-subtle">({c.unidade})</span>
                  <input inputMode="decimal" value={r.valores[c.chave] ?? ""} onChange={(e) => mudar(i, (x) => ({ ...x, valores: { ...x.valores, [c.chave]: e.target.value } }))} className="mt-0.5 block w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm font-mono" />
                </label>
              ))}
            </div>
            {r.extras.length ? (
              <details className="rounded-lg border border-border px-2 py-1.5" open>
                <summary className="cursor-pointer text-xs font-semibold">Outras medidas do laudo ({r.extras.length})</summary>
                <ul className="mt-2 space-y-1.5">
                  {r.extras.map((e, k) => (
                    <li key={k} className="flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate">{e.nome}</span>
                      <input inputMode="decimal" value={e.valor} onChange={(ev) => mudar(i, (x) => ({ ...x, extras: x.extras.map((y, z) => (z === k ? { ...y, valor: ev.target.value } : y)) }))} className="w-20 rounded border border-border bg-bg px-2 py-1 text-right font-mono" aria-label={e.nome} />
                      <span className="w-10 text-fg-subtle">{e.unidade}</span>
                      <button type="button" onClick={() => mudar(i, (x) => ({ ...x, extras: x.extras.filter((_, z) => z !== k) }))} className="alvo text-fg-subtle hover:text-red-400" aria-label={`Tirar ${e.nome}`}>✕</button>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </fieldset>
        );
      })}
      {erro ? <p className="text-sm font-semibold text-red-400" role="alert">{erro}</p> : null}
      <div className="flex gap-2">
        <Button type="button" onClick={salvar} disabled={estado === "salvando" || !marcadas} className="flex-1">
          {estado === "salvando" ? "Salvando…" : marcadas === 1 ? "Salvar 1 avaliação" : `Salvar ${marcadas} avaliações`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setEstado("parado"); setRascunhos([]); }}>Cancelar</Button>
      </div>
    </div>
  );
}
