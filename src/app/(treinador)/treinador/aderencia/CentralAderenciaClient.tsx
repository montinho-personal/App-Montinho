"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { ordenarCentral, REGRAS_CENTRAL, type LinhaCentral, type OrdemCentral, type RegrasCentral, type Sugestao } from "@/lib/aderencia/central";
import { dataLocal } from "@/lib/aderencia/calcular";

const ORDENS: Array<{ v: OrdemCentral; l: string }> = [
  { v: "queda", l: "Maior redução de frequência" },
  { v: "tempo_sem_treino", l: "Mais tempo sem treinar" },
  { v: "melhora", l: "Melhor evolução de aderência" },
  { v: "retomaram", l: "Retornaram recentemente" },
  { v: "nome", l: "Nome" },
];
const COR = { acompanhar: "border-warning/50 text-warning", reconhecer: "border-success/50 text-success", info: "border-border text-fg-muted" } as const;
const dataBR = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "—");
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const ROT_REGRA: Array<{ k: keyof RegrasCentral; l: string; u: string }> = [
  { k: "diasSemTreino", l: "Dias sem treino para sinalizar", u: "dias" },
  { k: "quedaPontos", l: "Queda de aderência (4 sem. × 4 anteriores)", u: "pontos" },
  { k: "pausaParaRetomada", l: "Intervalo que conta como retomada", u: "dias" },
  { k: "janelaRetomada", l: "Mostrar retomada por", u: "dias" },
  { k: "sequenciaReconhecer", l: "Sequência para reconhecer", u: "semanas" },
  { k: "horasRegistroAberto", l: "Treino aberto sem finalizar", u: "horas" },
  { k: "diasPlanoAlterado", l: "Plano alterado recentemente", u: "dias" },
];

function Sugestoes({ l }: { l: LinhaCentral }) {
  const toast = useToast();
  const [textos, setTextos] = useState<Record<string, string>>({});
  const acionaveis = l.sugestoes.filter((x) => x.acao !== "nenhuma");
  if (!l.sugestoes.length) return null;
  const copiar = async (sg: Sugestao) => {
    try {
      await navigator.clipboard.writeText(textos[sg.tipo] ?? sg.rascunho ?? "");
      toast.success("Mensagem copiada. Cole no WhatsApp ou onde preferir.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  };
  return (
    <details className="group text-xs">
      <summary className="cursor-pointer text-accent underline-offset-2 hover:underline">{acionaveis.length ? `${acionaveis.length} sugestão(ões) de acompanhamento` : l.sugestoes[0].titulo}</summary>
      <div className="mt-2 space-y-2">
        {l.sugestoes.map((sg) => (
          <div key={sg.tipo} className="rounded-lg border border-border bg-bg p-2.5 space-y-1.5">
            <p className="font-semibold text-fg">{sg.titulo}</p>
            <p className="text-fg-subtle">Por quê: {sg.regra}</p>
            {sg.rascunho ? (
              <>
                <label className="block text-[11px] text-fg-muted" htmlFor={`m-${l.alunoId}-${sg.tipo}`}>
                  Rascunho para você editar e enviar (nada é enviado automaticamente)
                </label>
                <textarea id={`m-${l.alunoId}-${sg.tipo}`} rows={3} value={textos[sg.tipo] ?? sg.rascunho} onChange={(e) => setTextos({ ...textos, [sg.tipo]: e.target.value.slice(0, 600) })} className="w-full rounded-md border border-border bg-card p-2 text-sm" />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => void copiar(sg)} className="font-semibold text-accent underline-offset-2 hover:underline">
                    Copiar mensagem
                  </button>
                  {sg.acao === "reconhecer" ? (
                    <Link href={`/treinador/conquistas?aluno=${l.alunoId}&msg=${encodeURIComponent(textos[sg.tipo] ?? sg.rascunho)}`} className="font-semibold text-accent underline-offset-2 hover:underline">
                      Enviar como reconhecimento no app
                    </Link>
                  ) : null}
                  <Link href={`/treinador/alunos/${l.alunoId}`} className="text-fg-muted underline-offset-2 hover:underline">
                    Abrir perfil
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

function RegrasForm({ regras }: { regras: RegrasCentral }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState<RegrasCentral>(regras);
  const [salvando, setSalvando] = useState(false);
  async function salvar(valores: RegrasCentral) {
    setSalvando(true);
    const res = await fetch("/api/preferencias/acompanhamento", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valores) }).catch(() => null);
    setSalvando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível salvar.");
    toast.success("Regras salvas.");
    router.refresh();
  }
  return (
    <details className="rounded-xl border border-border p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Regras dos sinais (ajustáveis)</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ROT_REGRA.map((r) => (
          <label key={r.k} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs">
            <span className="text-fg-muted">{r.l}</span>
            <span className="flex items-center gap-1">
              <input inputMode="numeric" value={v[r.k]} onChange={(e) => setV({ ...v, [r.k]: Number(e.target.value.replace(/\D/g, "")) || 0 })} className="h-8 w-14 rounded-md border border-border bg-bg text-center font-mono" aria-label={r.l} />
              {r.u}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-3">
        <button type="button" disabled={salvando} onClick={() => void salvar(v)} className="touch rounded-lg bg-accent px-4 py-2 font-bold text-bg disabled:opacity-60">
          Salvar regras
        </button>
        <button type="button" disabled={salvando} onClick={() => { setV(REGRAS_CENTRAL); void salvar(REGRAS_CENTRAL); }} className="text-xs text-fg-muted underline-offset-2 hover:underline">
          Voltar aos padrões
        </button>
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle">Os sinais descrevem fatos (dias sem registro, queda, retomada). Pausas combinadas nunca geram alerta; treino aberto sem finalizar aparece como possível registro esquecido, e plano recém-alterado é apontado como possível causa.</p>
    </details>
  );
}

export function CentralAderenciaClient({ linhas, regras }: { linhas: LinhaCentral[]; regras: RegrasCentral }) {
  const [ordem, setOrdem] = useState<OrdemCentral>("queda");
  const [soSinais, setSoSinais] = useState(false);
  const lista = useMemo(() => ordenarCentral(soSinais ? linhas.filter((l) => l.sinais.some((s) => s.natureza !== "info")) : linhas, ordem), [linhas, ordem, soSinais]);
  const acompanhar = linhas.filter((l) => l.sinais.some((s) => s.natureza === "acompanhar")).length;
  const reconhecer = linhas.filter((l) => l.sinais.some((s) => s.natureza === "reconhecer")).length;

  if (!linhas.length) return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">Nenhum aluno ativo ainda.</p>;

  const tend = (l: LinhaCentral) => (l.tendencia === null ? "—" : `${l.tendencia > 0 ? "+" : ""}${l.tendencia}`);
  const corTend = (l: LinhaCentral) => (l.tendencia === null ? "" : l.tendencia < 0 ? "text-warning" : l.tendencia > 0 ? "text-success" : "");
  const ultimo = (l: LinhaCentral) => (l.ultimaSessao ? `${dataBR(dataLocal(l.ultimaSessao))}${l.diasDesdeUltima !== null ? ` (${l.diasDesdeUltima}d)` : ""}` : "—");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-warning/50 px-3 py-1 text-warning">{acompanhar} para acompanhar</span>
        <span className="rounded-full border border-success/50 px-3 py-1 text-success">{reconhecer} para reconhecer</span>
        <select aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemCentral)} className="ml-auto h-9 rounded-md border border-border bg-bg px-2 text-sm">
          {ORDENS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <input type="checkbox" checked={soSinais} onChange={(e) => setSoSinais(e.target.checked)} /> só com sinais
        </label>
      </div>

      {/* Celular: um cartão por aluno (sem tabela cortada) */}
      <ul className="space-y-2 md:hidden">
        {lista.map((l) => (
          <li key={l.alunoId} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <Link href={`/treinador/alunos/${l.alunoId}`} className="font-semibold hover:text-accent">{l.nome}</Link>
            <dl className="grid grid-cols-4 gap-1 text-center text-xs">
              <div><dt className="text-[10px] text-fg-subtle">Semana</dt><dd className="font-mono">{l.meta ? `${num(l.semanaPontos)}/${l.meta}` : "—"}</dd></div>
              <div><dt className="text-[10px] text-fg-subtle">28 dias</dt><dd className="font-mono">{l.aderencia28 === null ? "—" : `${l.aderencia28}%`}</dd></div>
              <div><dt className="text-[10px] text-fg-subtle">Tendência</dt><dd className={`font-mono ${corTend(l)}`}>{tend(l)}</dd></div>
              <div><dt className="text-[10px] text-fg-subtle">Último</dt><dd className="font-mono">{l.ultimaSessao ? dataBR(dataLocal(l.ultimaSessao)) : "—"}</dd></div>
            </dl>
            {l.sinais.length ? (
              <div className="flex flex-wrap gap-1">
                {l.sinais.map((s) => <span key={s.tipo} className={`rounded-full border px-2 py-0.5 text-[11px] ${COR[s.natureza]}`}>{s.texto}</span>)}
              </div>
            ) : null}
            <Sugestoes l={l} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-wider text-fg-subtle">
            <tr>
              <th className="px-3 py-2 text-left">Aluno</th>
              <th className="px-2 py-2 text-right">Meta</th>
              <th className="px-2 py-2 text-right">Semana</th>
              <th className="px-2 py-2 text-right" title="Últimas 4 semanas completas">Aderência 28d</th>
              <th className="px-2 py-2 text-right" title="Diferença para as 4 semanas anteriores">Tendência</th>
              <th className="px-2 py-2 text-right">Último treino</th>
              <th className="px-2 py-2 text-right">Próximo previsto</th>
              <th className="px-3 py-2 text-left">Acompanhamento</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => (
              <tr key={l.alunoId} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <Link href={`/treinador/alunos/${l.alunoId}`} className="font-semibold hover:text-accent">{l.nome}</Link>
                </td>
                <td className="px-2 py-2 text-right font-mono">{l.meta ?? "—"}</td>
                <td className="px-2 py-2 text-right font-mono">{l.meta ? `${num(l.semanaPontos)}/${l.meta}` : "—"}</td>
                <td className="px-2 py-2 text-right font-mono">{l.aderencia28 === null ? "—" : `${l.aderencia28}%`}</td>
                <td className={`px-2 py-2 text-right font-mono ${corTend(l)}`}>{tend(l)}</td>
                <td className="px-2 py-2 text-right font-mono">{ultimo(l)}</td>
                <td className="px-2 py-2 text-right font-mono">{dataBR(l.proximaPrevista)}</td>
                <td className="px-3 py-2 max-w-sm">
                  <div className="flex flex-wrap gap-1">
                    {l.sinais.map((s) => (
                      <span key={s.tipo} className={`rounded-full border px-2 py-0.5 text-[11px] ${COR[s.natureza]}`}>{s.texto}</span>
                    ))}
                  </div>
                  <div className="mt-1"><Sugestoes l={l} /></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RegrasForm regras={regras} />
      <p className="text-[11px] text-fg-subtle">Sinais atuais: {regras.diasSemTreino}+ dias sem registrar treino (fora de pausa), aderência {regras.quedaPontos}+ pontos abaixo das 4 semanas anteriores, retorno após {regras.pausaParaRetomada}+ dias, {regras.sequenciaReconhecer}+ semanas seguidas com a meta. Sugestões são regras fixas e transparentes (sem IA); nenhuma mensagem é enviada automaticamente.</p>
    </div>
  );
}
