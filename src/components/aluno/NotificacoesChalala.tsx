"use client";

// Preferências do Chalalá no celular (Perfil do aluno). Cada mudança salva na
// hora. Nada é obrigatório: o Bom Dia vem desligado e o aluno escolhe o horário.
import { useState } from "react";
import Link from "next/link";
import { LembretePush, type EstadoPush } from "@/components/aluno/LembretePush";
import { useToast } from "@/components/ui/Toast";
import type { PreferenciasNotificacao } from "@/lib/data/notificacoes";
import { FUSOS } from "@/lib/validacao/schemas";

const HORARIOS_BOM_DIA = ["05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "10:00"];
const NOME_FUSO: Record<(typeof FUSOS)[number], string> = {
  "America/Sao_Paulo": "Brasília (SP, RJ, MG, Sul…)",
  "America/Bahia": "Bahia",
  "America/Fortaleza": "Fortaleza",
  "America/Recife": "Recife",
  "America/Belem": "Belém",
  "America/Maceio": "Maceió",
  "America/Araguaina": "Tocantins",
  "America/Manaus": "Manaus (−1 h)",
  "America/Cuiaba": "Cuiabá (−1 h)",
  "America/Campo_Grande": "Campo Grande (−1 h)",
  "America/Porto_Velho": "Porto Velho (−1 h)",
  "America/Boa_Vista": "Boa Vista (−1 h)",
  "America/Rio_Branco": "Rio Branco (−2 h)",
  "America/Noronha": "Fernando de Noronha (+1 h)",
  "Europe/Lisbon": "Lisboa",
};

function emSilencio(t: string, ini: string, fim: string): boolean {
  if (ini === fim) return false;
  return ini < fim ? t >= ini && t < fim : t >= ini || t < fim;
}

function Chave({ rotulo, detalhe, ligado, onMudar, desabilitado = false }: { rotulo: string; detalhe?: string; ligado: boolean; onMudar: (v: boolean) => void; desabilitado?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-3 py-2 ${desabilitado ? "opacity-50" : ""}`}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{rotulo}</span>
        {detalhe ? <span className="block text-xs text-fg-muted">{detalhe}</span> : null}
      </span>
      <input type="checkbox" role="switch" checked={ligado} disabled={desabilitado} onChange={(e) => onMudar(e.target.checked)} className="mt-1 h-5 w-9 shrink-0 accent-[var(--color-accent)]" />
    </label>
  );
}

export function NotificacoesChalala({ inicial }: { inicial: PreferenciasNotificacao }) {
  const toast = useToast();
  const [p, setP] = useState(inicial);
  const [estado, setEstado] = useState<EstadoPush>("carregando");
  const [testando, setTestando] = useState(false);

  async function salvar(novo: PreferenciasNotificacao) {
    const antes = p;
    setP(novo);
    const res = await fetch("/api/notificacoes/preferencias", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novo) }).catch(() => null);
    if (!res?.ok) {
      setP(antes);
      toast.error("Não foi possível salvar. Tente de novo.");
    }
  }
  const mudar = (patch: Partial<PreferenciasNotificacao>) => void salvar({ ...p, ...patch });

  async function testar() {
    setTestando(true);
    const res = await fetch("/api/notificacoes/teste", { method: "POST" }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { ok?: boolean; demo?: boolean; erro?: string; entregues?: number } | null;
    setTestando(false);
    if (d?.demo) return toast.success("Demonstração: no app de verdade, a notificação chega no seu celular.");
    if (d?.ok) return toast.success("Enviada! Confira a notificação do seu celular.");
    toast.error(d?.erro ?? "Não foi possível enviar o teste.");
  }

  const bomDiaNoSilencio = p.bom_dia && emSilencio(p.bom_dia_hora, p.silencio_inicio, p.silencio_fim);
  const off = !p.motivacionais;

  return (
    <section aria-labelledby="titulo-notif" className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 id="titulo-notif" className="text-base font-bold">Chalalá no celular</h2>
        <p className="text-xs text-fg-muted">Recados do Montinho, sem cobrança. Você escolhe o que recebe.</p>
      </div>

      <LembretePush completo onEstado={setEstado} />

      <div className="divide-y divide-border">
        <Chave rotulo="Mensagens do Chalalá" detalhe="Liga ou desliga todos os recados motivacionais." ligado={p.motivacionais} onMudar={(v) => mudar({ motivacionais: v })} />
        <div className="py-1">
          <Chave rotulo="Bom Dia com Chalalá" detalhe="De segunda a sexta, no horário que você escolher. Só um recado, sem precisar responder." ligado={p.bom_dia} desabilitado={off} onMudar={(v) => mudar({ bom_dia: v })} />
          {p.bom_dia && !off ? (
            <label className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-fg-muted">Horário</span>
              <select value={HORARIOS_BOM_DIA.includes(p.bom_dia_hora) ? p.bom_dia_hora : "07:00"} onChange={(e) => mudar({ bom_dia_hora: e.target.value })} className="rounded-md border border-border bg-bg px-2 py-1.5 font-mono">
                {HORARIOS_BOM_DIA.map((h) => (
                  <option key={h} value={h}>
                    {h.replace(":", "h")}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {bomDiaNoSilencio ? <p className="mb-2 text-xs text-warning">Esse horário cai no seu horário de silêncio — o Bom Dia não será enviado. Ajuste um dos dois.</p> : null}
        </div>
        <Chave rotulo="Depois do treino" detalhe="Um lembrete de recuperação 1h30 depois de concluir (no máx. 2 por semana)." ligado={p.pos_treino} desabilitado={off} onMudar={(v) => mudar({ pos_treino: v })} />
        <Chave rotulo="Treino esquecido aberto" detalhe="Avisa se você começar um treino e parar de registrar por 30 min." ligado={p.lembrete_treino} onMudar={(v) => mudar({ lembrete_treino: v })} />
        <div className="py-2">
          <p className="text-sm font-semibold">Horário de silêncio</p>
          <p className="text-xs text-fg-muted">Nenhum recado do Chalalá nesse intervalo.</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <input type="time" value={p.silencio_inicio} onChange={(e) => e.target.value && mudar({ silencio_inicio: e.target.value })} aria-label="Início do silêncio" className="rounded-md border border-border bg-bg px-2 py-1.5 font-mono" />
            <span className="text-fg-muted">até</span>
            <input type="time" value={p.silencio_fim} onChange={(e) => e.target.value && mudar({ silencio_fim: e.target.value })} aria-label="Fim do silêncio" className="rounded-md border border-border bg-bg px-2 py-1.5 font-mono" />
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="font-semibold">Fuso horário</span>
          <select value={p.fuso} onChange={(e) => mudar({ fuso: e.target.value as PreferenciasNotificacao["fuso"] })} className="max-w-[60%] rounded-md border border-border bg-bg px-2 py-1.5">
            {FUSOS.map((f) => (
              <option key={f} value={f}>
                {NOME_FUSO[f]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {estado === "ligado" ? (
          <button type="button" onClick={() => void testar()} disabled={testando} className="touch rounded-lg border border-accent/60 px-3 py-2 text-xs font-bold text-accent disabled:opacity-60">
            {testando ? "Enviando…" : "Mandar um teste para este celular"}
          </button>
        ) : null}
        <Link href="/aluno/notificacoes" className="alvo text-xs font-semibold text-fg-muted underline-offset-2 hover:underline">
          Ver recados recebidos
        </Link>
      </div>
    </section>
  );
}
