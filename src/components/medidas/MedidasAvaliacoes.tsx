"use client";

// Minhas medidas e avaliações: registrar peso, altura, bioimpedância e
// circunferências e/ou enviar o arquivo da avaliação (PDF, foto, print).
// Usado pelo aluno (as próprias) e pelo personal (na ficha do aluno).
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AvaliacaoArquivo, Evolucao } from "@/lib/supabase/types";
import { CAMPOS_MEDIDA, lerMedida, MAX_ARQUIVO_BYTES, TIPOS_ARQUIVO, type ChaveMedida } from "@/lib/medidas/campos";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { dataBR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { CelebracaoMedalha, type ConquistaCelebravel } from "@/components/chalala/CelebracaoMedalha";
import { LerAvaliacaoIA } from "./LerAvaliacaoIA";
import { AvaliacaoPollock } from "./AvaliacaoPollock";
import type { SexoAvaliacao } from "@/lib/medidas/pollock";

type Nova = ConquistaCelebravel;

const hojeBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const br = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const tipoDoArquivo = (f: File) => (f.type || (/\.heic$/i.test(f.name) ? "image/heic" : /\.pdf$/i.test(f.name) ? "application/pdf" : ""));

/** Como medir em casa, com fita métrica e balança (mesmo lado, mesmo horário, fita sem apertar). */
const COMO_MEDIR: Partial<Record<ChaveMedida, string>> = {
  peso_kg: "De manhã, em jejum, depois de ir ao banheiro, com roupa leve e sempre na mesma balança.",
  altura_cm: "Descalço, costas na parede, olhando para a frente.",
  cintura_cm: "Na parte mais fina entre a última costela e o umbigo, no fim de uma expiração normal.",
  abdomen_cm: "Na altura do umbigo, barriga relaxada (sem encolher).",
  quadril_cm: "Na parte mais larga do bumbum, pés juntos.",
  peito_cm: "Na linha dos mamilos, braços relaxados, no fim de uma expiração normal.",
  braco_cm: "Braço direito relaxado, no meio entre o ombro e o cotovelo.",
  coxa_cm: "Coxa direita, na parte mais grossa (logo abaixo do bumbum), peso nas duas pernas.",
  panturrilha_cm: "Panturrilha direita, na parte mais grossa, em pé.",
};
const CASEIRO: ChaveMedida[] = ["peso_kg", "altura_cm", "cintura_cm", "abdomen_cm", "quadril_cm", "peito_cm", "braco_cm", "coxa_cm", "panturrilha_cm"];
type Modo = "arquivo" | "caseiro" | "completa";

export function MedidasAvaliacoes({ alunoId, medidas, arquivos, nome, demo = false, doPersonal = false, sexo = null, nascimento = null }: { alunoId: string; medidas: Evolucao[]; arquivos: AvaliacaoArquivo[]; nome: string; demo?: boolean; doPersonal?: boolean; sexo?: SexoAvaliacao | null; nascimento?: string | null }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo | null>(null);
  const setAberto = (v: boolean) => setModo(v ? modo : null);
  const [data, setData] = useState(hojeBR());
  const [valores, setValores] = useState<Partial<Record<ChaveMedida, string>>>({});
  const [obs, setObs] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [novas, setNovas] = useState<Nova[]>([]);

  async function enviarArquivo(f: File): Promise<Nova[]> {
    const tipo = tipoDoArquivo(f);
    if (!(TIPOS_ARQUIVO as readonly string[]).includes(tipo)) throw new Error("Envie PDF ou imagem (JPG, PNG, WEBP ou HEIC).");
    if (f.size > MAX_ARQUIVO_BYTES) throw new Error("Arquivo grande demais: o limite é 15 MB.");
    const r = await fetch("/api/medidas/arquivos/url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aluno_id: alunoId, tipo, tamanho: f.size }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "Não foi possível preparar o envio.");
    if (j.token) {
      const { error } = await createSupabaseBrowserClient().storage.from("avaliacoes").uploadToSignedUrl(j.caminho, j.token, f, { contentType: tipo });
      if (error) throw new Error("O envio do arquivo falhou. Confira a internet e tente de novo.");
    }
    const r2 = await fetch("/api/medidas/arquivos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aluno_id: alunoId, caminho: j.caminho, nome: f.name.slice(0, 200), tipo, tamanho: f.size, data, descricao: obs.trim() || null }) });
    const j2 = await r2.json().catch(() => ({}));
    if (!r2.ok) throw new Error(j2.error ?? "Não foi possível registrar o arquivo.");
    return (j2.novas ?? []) as Nova[];
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    const lidos: Partial<Record<ChaveMedida, number>> = {};
    for (const c of CAMPOS_MEDIDA) {
      const { valor, erro: er } = lerMedida(c, valores[c.chave] ?? "");
      if (er) return setErro(er);
      if (valor != null) lidos[c.chave] = valor;
    }
    const temMedida = Object.keys(lidos).length > 0;
    if (!temMedida && !arquivo) return setErro("Preencha pelo menos uma medida ou escolha o arquivo da avaliação.");
    setSalvando(true);
    try {
      const ganhas: Nova[] = [];
      if (arquivo) ganhas.push(...(await enviarArquivo(arquivo)));
      if (temMedida) {
        const r = await fetch("/api/medidas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aluno_id: alunoId, data, observacoes: obs.trim() || null, ...lidos }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? "Não foi possível salvar as medidas.");
        ganhas.push(...((j.novas ?? []) as Nova[]));
      }
      setValores({});
      setObs("");
      setArquivo(null);
      setAberto(false);
      setOk(temMedida && arquivo ? "Medidas e arquivo salvos." : temMedida ? "Medidas salvas." : "Arquivo salvo.");
      const unicas = ganhas.filter((n, i) => ganhas.findIndex((x) => x.codigo === n.codigo) === i && n.codigo === "ponto_de_partida");
      if (unicas.length && !doPersonal) setNovas(unicas);
      router.refresh();
    } catch (er) {
      setErro(er instanceof Error ? er.message : "Algo deu errado. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {!doPersonal ? <ChamadaTrofeu acao="medidas" /> : null}
      {ok ? <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold" role="status">✓ {ok}</p> : null}
      {modo === null ? (
        <section className="space-y-2" aria-label="Nova avaliação">
          <p className="text-sm font-bold">{medidas.length || arquivos.length ? "Registrar uma nova avaliação" : "Como você quer registrar?"}</p>
          <div className="grid gap-2">
            {doPersonal ? (
              <Opcao emoji="🩺" titulo="Avaliação física completa (7 dobras)" texto="Anote as dobras do adipômetro na hora: o app calcula % de gordura, massa magra e massa gorda (Jackson & Pollock)." onClick={() => setModo("completa")} destaque />
            ) : null}
            <Opcao emoji="📄" titulo={doPersonal ? "Subir o arquivo da avaliação" : "Já tenho a avaliação física"} texto={doPersonal ? "PDF, foto ou print. Depois, “✨ Puxar as medidas” lê os números de cada data." : "Envie o PDF, a foto ou o print da avaliação ou da bioimpedância."} onClick={() => setModo("arquivo")} />
            <Opcao emoji="📏" titulo={doPersonal ? "Só anotar medidas (fita e balança)" : "Vou medir em casa"} texto="Peso e circunferências com fita métrica, com o passo a passo de como medir cada uma." onClick={() => setModo("caseiro")} />
          </div>
        </section>
      ) : modo === "completa" ? (
        <AvaliacaoPollock alunoId={alunoId} sexo={sexo} nascimento={nascimento} ultimoPeso={medidas.find((m) => m.peso_kg)?.peso_kg ?? null} altura={medidas.find((m) => m.altura_cm)?.altura_cm ?? null} onFechar={() => { setModo(null); setOk("Avaliação salva."); }} />
      ) : (
        <form onSubmit={salvar} className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-extrabold">{modo === "arquivo" ? "📄 Arquivo da avaliação" : "📏 Medidas com fita e balança"}</p>
            <button type="button" onClick={() => setModo(null)} className="alvo rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg-muted">Voltar</button>
          </div>
          <label className="block text-sm font-semibold">
            Data da avaliação
            <input type="date" value={data} max={hojeBR()} onChange={(e) => setData(e.target.value)} className="mt-1 block rounded-lg border border-border bg-bg px-3 py-2 text-sm" required />
          </label>

          {modo === "arquivo" ? (
            <fieldset className="space-y-2 rounded-lg border border-dashed border-accent/50 p-3">
              <legend className="px-1 text-sm font-bold">Arquivo</legend>
              <p className="text-xs text-fg-muted">PDF, foto ou print (até 15 MB). Fica guardado só para {doPersonal ? "o aluno e você" : "você e o Montinho"}.{doPersonal ? " Depois de salvar, toque em “✨ Puxar as medidas deste arquivo”." : " O Montinho confere e passa os números para os seus gráficos."}</p>
              <input type="file" accept="application/pdf,image/*,.heic,.heif" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-bg" />
              {arquivo ? <p className="text-xs text-fg-muted">Selecionado: {arquivo.name} ({br(arquivo.size / 1024 / 1024)} MB)</p> : null}
              {demo ? <p className="text-[11px] text-fg-subtle">Na demonstração o arquivo não é guardado de verdade.</p> : null}
            </fieldset>
          ) : (
            <>
              <p className="rounded-lg bg-bg px-3 py-2 text-xs text-fg-muted">📌 Use a fita sem apertar a pele, sempre do lado direito e no mesmo horário. Se der, peça ajuda a alguém. Medir a cada 2 a 4 semanas já mostra a evolução.</p>
              <div className="grid gap-2">
                {CAMPOS_MEDIDA.filter((c) => CASEIRO.includes(c.chave)).map((c) => (
                  <label key={c.chave} className="block rounded-lg border border-border px-3 py-2">
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                      <span>{c.rotulo} <span className="font-normal text-fg-subtle">({c.unidade})</span></span>
                      <input inputMode="decimal" value={valores[c.chave] ?? ""} onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))} placeholder="—" className="w-24 rounded-lg border border-border bg-bg px-3 py-2 text-right text-sm font-mono" />
                    </span>
                    {COMO_MEDIR[c.chave] ? <span className="mt-1 block text-[11px] leading-snug text-fg-subtle">{COMO_MEDIR[c.chave]}</span> : null}
                  </label>
                ))}
              </div>
              <details className="rounded-lg border border-border px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold">Fez bioimpedância? Anote aqui</summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CAMPOS_MEDIDA.filter((c) => c.grupo === "bioimpedancia").map((c) => (
                    <label key={c.chave} className="text-xs font-semibold">
                      {c.rotulo} <span className="font-normal text-fg-subtle">({c.unidade})</span>
                      <input inputMode="decimal" value={valores[c.chave] ?? ""} onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))} placeholder="—" className="mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-mono" />
                    </label>
                  ))}
                </div>
              </details>
            </>
          )}

          <label className="block text-sm font-semibold">
            Observação (opcional)
            <textarea value={obs} onChange={(e) => setObs(e.target.value.slice(0, 500))} rows={2} placeholder={modo === "arquivo" ? "Ex.: avaliação na academia, bioimpedância Inbody" : "Ex.: medido de manhã, em jejum"} className="mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          </label>

          {erro ? <p className="text-sm font-semibold text-red-400" role="alert">{erro}</p> : null}
          <Button type="submit" disabled={salvando} className="w-full">{salvando ? "Salvando…" : modo === "arquivo" ? "Enviar arquivo" : "Salvar medidas"}</Button>
        </form>
      )}

      {arquivos.length ? (
        <section className="space-y-2" aria-labelledby="arq-titulo">
          <h3 id="arq-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Arquivos de avaliação</h3>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {arquivos.map((a) => (
              <li key={a.id} className="text-sm">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.tipo_mime === "application/pdf" ? "📄" : "🖼️"} {a.nome_original ?? "Avaliação"}</span>
                    <span className="text-xs text-fg-subtle">{dataBR(a.data_avaliacao)}{a.descricao ? ` · ${a.descricao}` : ""}</span>
                  </span>
                  <a href={`/api/medidas/arquivos/${a.id}`} target="_blank" rel="noopener noreferrer" className="alvo shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent">Abrir</a>
                </div>
                {doPersonal && a.tipo_mime !== "image/heic" && a.tipo_mime !== "image/heif" ? <LerAvaliacaoIA alunoId={alunoId} arquivoId={a.id} datasJaSalvas={medidas.map((m) => m.data)} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {medidas.length ? (
        <section className="space-y-2" aria-labelledby="hist-titulo">
          <h3 id="hist-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Registros</h3>
          <ul className="space-y-2">
            {medidas.slice(0, 12).map((m) => {
              const itens = CAMPOS_MEDIDA.filter((c) => typeof m[c.chave] === "number");
              const extras = m.extras ?? [];
              return (
                <li key={m.id} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
                  <p className="font-semibold">{dataBR(m.data)}{m.origem === "personal" ? <span className="ml-2 text-xs font-normal text-fg-subtle">registrado pelo personal</span> : null}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">{itens.length ? itens.map((c) => `${c.rotulo} ${br(m[c.chave] as number)} ${c.unidade}`).join(" · ") : extras.length ? "" : "Sem números"}</p>
                  {extras.length ? <p className="mt-0.5 text-xs text-fg-subtle">{extras.map((e) => `${e.nome} ${br(e.valor)} ${e.unidade}`).join(" · ")}</p> : null}
                  {m.observacoes ? <p className="mt-0.5 text-xs text-fg-subtle">{m.observacoes}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {novas.length ? <CelebracaoMedalha conquistas={novas} nome={nome} onFechar={() => setNovas([])} /> : null}
    </div>
  );
}

function Opcao({ emoji, titulo, texto, onClick, destaque = false }: { emoji: string; titulo: string; texto: string; onClick: () => void; destaque?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`touch flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:border-accent ${destaque ? "border-accent/60 bg-accent/10" : "border-border bg-surface"}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-bg text-2xl" aria-hidden>{emoji}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{titulo}</span>
        <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{texto}</span>
      </span>
      <span className="ml-auto self-center text-fg-subtle" aria-hidden>›</span>
    </button>
  );
}
