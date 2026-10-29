"use client";

// Painel do Chalalá no celular: chave geral (começa desligada), limites,
// teste no próprio celular e números agregados. Abrir notificação ≠ motivação,
// e nenhum número aqui prova que uma mensagem causou um treino.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LembretePush, type EstadoPush } from "@/components/aluno/LembretePush";
import { useToast } from "@/components/ui/Toast";
import type { ConfigChalala, MetricasPush } from "@/lib/data/notificacoes";
import type { MetricasChalalaTreino } from "@/lib/chalala/metricas";

const MOMENTO: Record<string, string> = { primeiro_treino: "1º treino", cansado: "dia cansado", tempo_curto: "treino curto", voltou: "volta", ficha_nova: "ficha nova", parcial: "treino parcial" };
const MOTIVO: Record<string, string> = { expirada: "fora do horário", preferencia: "aluno desligou", treino_revertido: "treino desfeito", limite_pos_treino: "limite semanal", sem_dispositivo: "sem celular ativo" };

export function PainelChalalaCelular({ dias, config, push, treino }: { dias: number; config: ConfigChalala; push: MetricasPush | null; treino: MetricasChalalaTreino }) {
  const toast = useToast();
  const router = useRouter();
  const [c, setC] = useState(config);
  const [estado, setEstado] = useState<EstadoPush>("carregando");
  const [testando, setTestando] = useState(false);

  async function salvar(novo: ConfigChalala) {
    if (novo.chalala_ativo && !c.chalala_ativo && !window.confirm("Ligar o Chalalá no celular para TODOS os alunos que ativaram notificações?\n\nFaça antes um teste no seu celular. Cada aluno ainda escolhe o que recebe (o Bom Dia vem desligado).")) return;
    const antes = c;
    setC(novo);
    const res = await fetch("/api/notificacoes/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novo) }).catch(() => null);
    if (!res?.ok) {
      setC(antes);
      return toast.error("Não foi possível salvar.");
    }
    toast.success(novo.chalala_ativo ? "Chalalá no celular ligado." : "Configuração salva.");
    router.refresh();
  }

  async function testar() {
    setTestando(true);
    const res = await fetch("/api/notificacoes/teste", { method: "POST" }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { ok?: boolean; demo?: boolean; erro?: string } | null;
    setTestando(false);
    if (d?.demo) return toast.success("Demonstração: no app de verdade, a notificação chega no seu celular.");
    if (d?.ok) return toast.success("Enviada! Confira o seu celular.");
    toast.error(d?.erro ?? "Não foi possível enviar.");
  }

  const num = (v: number | string) => <dd className="font-mono text-lg font-bold">{v}</dd>;
  const caixa = (r: string, v: number | string) => (
    <div key={r} className="min-w-0 rounded-lg bg-surface p-2">
      <dt className="text-[11px] leading-tight text-fg-subtle">{r}</dt>
      {num(v)}
    </div>
  );

  return (
    <div className="space-y-4 px-4 py-4 text-sm">
        <div>
          <p className="text-xs text-fg-muted">Bom Dia (dias úteis, no horário que o aluno escolhe) e recado de recuperação 1h30 depois do treino. Só recebe quem ativou as notificações.</p>
        </div>

        {push === null ? (
          <p className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs">Falta aplicar a atualização do banco (migração 0036) para ligar os envios. O restante do app funciona normalmente.</p>
        ) : (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <label className="flex min-h-11 items-center justify-between gap-3">
              <span>
                <span className="block font-semibold">{c.chalala_ativo ? "Envios ligados" : "Envios desligados"}</span>
                <span className="block text-xs text-fg-muted">{c.chalala_ativo ? "Os alunos com notificações ativas recebem conforme as preferências deles." : "Nada é enviado aos alunos. Teste primeiro no seu celular."}</span>
              </span>
              <input type="checkbox" role="switch" checked={c.chalala_ativo} onChange={(e) => void salvar({ ...c, chalala_ativo: e.target.checked })} className="h-5 w-9 shrink-0 accent-[var(--color-accent)]" aria-label="Ligar envios do Chalalá" />
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="block min-w-0 space-y-1">
                <span className="text-fg-muted">Máximo por aluno a cada 24 h</span>
                <select value={c.limite_diario} onChange={(e) => void salvar({ ...c, limite_diario: Number(e.target.value) })} className="h-11 w-full rounded-md border border-border bg-bg px-2 text-base">
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "recado" : "recados"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 space-y-1">
                <span className="text-fg-muted">Intervalo mínimo entre recados</span>
                <select value={c.intervalo_minimo_min} onChange={(e) => void salvar({ ...c, intervalo_minimo_min: Number(e.target.value) })} className="h-11 w-full rounded-md border border-border bg-bg px-2 text-base">
                  {[30, 60, 120].map((n) => (
                    <option key={n} value={n}>
                      {n >= 60 ? `${n / 60} h` : `${n} min`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <LembretePush completo treinador onEstado={setEstado} />
          {estado === "ligado" ? (
            <button type="button" onClick={() => void testar()} disabled={testando} className="touch w-full rounded-lg border border-accent/60 px-3 py-2 text-sm font-bold sm:w-auto text-accent disabled:opacity-60">
              {testando ? "Enviando…" : "Mandar um teste para o meu celular"}
            </button>
          ) : null}
        </div>

        {push ? (
          <>
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">Notificações ({dias} dias)</h3>
            <dl className="grid grid-cols-2 gap-2">
              {caixa("Alunos com celular inscrito", push.inscritos)}
              {caixa("Com recados do Chalalá ligados", push.habilitados)}
              {caixa("Bom Dia ligado", push.bomDiaLigado)}
              {caixa("Pós-treino ligado", push.posTreinoLigado)}
              {caixa("Enviadas", push.enviadas)}
              {caixa("Falhas de envio", push.falhas)}
              {caixa("Tocadas (abertas)", push.abertas)}
              {caixa("Bom Dia enviados / tocados", `${push.bomDiaEnviadas} / ${push.bomDiaAbertas}`)}
              {caixa("Pós-treino enviados", push.posTreinoEnviadas)}
              {caixa("Treinos até 3 h após tocar", push.treinosAposAbertura)}
            </dl>
            {Object.keys(push.descartadas).length ? (
              <p className="text-xs text-fg-muted">
                Não enviadas: {Object.entries(push.descartadas).map(([m, n]) => `${MOTIVO[m] ?? m} (${n})`).join(" · ")}
              </p>
            ) : null}
          </>
        ) : null}

        <h3 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">Dentro do treino ({dias} dias)</h3>
        <dl className="grid grid-cols-2 gap-2">
          {caixa("“Bora treinar?” exibido", treino.iniciados)}
          {caixa("Treinos concluídos", treino.concluidos)}
          {caixa("Incentivos de progressão", treino.progressao)}
          {caixa("Recordes reconhecidos", treino.recordes)}
          {caixa("Evolução nas repetições", treino.repeticoes)}
          {caixa("Avisos de técnica avançada", treino.tecnicas)}
          {caixa("“É impossível dar errado!”", treino.confianca)}
        </dl>
        {treino.confianca ? (
          <p className="text-xs text-fg-muted">
            “É impossível dar errado!” por momento: {Object.entries(treino.confiancaPorMomento).map(([m, n]) => `${MOMENTO[m] ?? m} (${n})`).join(" · ")}
          </p>
        ) : null}
        <p className="text-[11px] text-fg-subtle">Tocar numa notificação não mede motivação, e treinar depois dela não prova que ela foi a causa. Os números servem para acompanhar uso e ajustar a frequência. Nenhum texto do aluno é registrado.</p>
    </div>
  );
}
