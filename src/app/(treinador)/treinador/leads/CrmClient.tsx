"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { CrmConfig, EnvioCrm } from "@/lib/data/leads";

const EVENTO: Record<string, string> = { lead_novo: "Lead novo", onboarding_concluido: "Respondeu as boas-vindas", whatsapp_clicado: "Tocou no WhatsApp", desafio_concluido: "Concluiu desafio", status_alterado: "Status alterado", virou_aluno: "Virou aluno", teste: "Teste" };
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function CrmClient({ config, envios }: { config: CrmConfig | null; envios: EnvioCrm[] }) {
  const router = useRouter();
  const [url, setUrl] = useState(config?.webhook_url ?? "");
  const [ativo, setAtivo] = useState(config?.ativo ?? false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [verToken, setVerToken] = useState(false);

  async function salvar(novoAtivo = ativo) {
    setOcupado(true);
    setMsg(null);
    const r = await fetch("/api/treinador/crm", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook_url: url.trim() || null, ativo: novoAtivo }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setOcupado(false);
    if (!r?.ok) return setMsg({ tipo: "erro", texto: j?.error ?? "Não foi possível salvar." });
    setAtivo(novoAtivo);
    setMsg({ tipo: "ok", texto: novoAtivo ? "Sincronização ligada. As novidades vão para o CRM em até 5 minutos." : "Salvo." });
    router.refresh();
  }

  async function testar() {
    setOcupado(true);
    setMsg(null);
    const r = await fetch("/api/treinador/crm/teste", { method: "POST" }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { codigo?: number | null; erro?: string | null; error?: string } | undefined;
    setOcupado(false);
    setMsg(r?.ok ? { tipo: "ok", texto: `O CRM recebeu o lead de teste (resposta ${j?.codigo}). Confira lá: “Lead de Teste”.` } : { tipo: "erro", texto: j?.error ?? `O CRM não aceitou: ${j?.erro ?? "sem resposta"}.` });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronizar com o seu CRM</CardTitle>
        <p className="text-sm text-fg-muted mt-1">
          Cada novidade de um lead é enviada para o endereço de recebimento (webhook) do seu CRM em até 5 minutos: lead novo, respondeu as boas-vindas, tocou no WhatsApp, concluiu desafio, mudou de status e virou aluno. Vão nome, e-mail, convite, desafio, objetivo, treinos feitos e status. Nunca vão dados de saúde nem senhas.
        </p>
      </CardHeader>
      <CardBody className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span className="text-xs text-fg-muted">Endereço de recebimento (começa com https://)</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/…" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={ocupado} onClick={() => void salvar(ativo)}>Salvar endereço</Button>
          <button type="button" disabled={ocupado || !config?.webhook_url} onClick={() => void testar()} className="alvo min-h-11 rounded-lg border border-border px-4 text-sm disabled:opacity-40">Enviar teste</button>
          <button type="button" disabled={ocupado || !config?.webhook_url} onClick={() => void salvar(!ativo)} className={`alvo min-h-11 rounded-lg border px-4 text-sm disabled:opacity-40 ${ativo ? "border-accent text-accent" : "border-border"}`}>
            {ativo ? "Sincronização ligada — desligar" : "Ligar sincronização"}
          </button>
        </div>
        {msg ? <p className={`text-sm ${msg.tipo === "ok" ? "text-success" : "text-danger"}`} role="status">{msg.texto}</p> : null}
        <p className="text-xs text-fg-subtle">
          Token de conferência (o app manda no cabeçalho X-Montinho-Token; use no CRM para aceitar só o que vem do app):{" "}
          {verToken ? <code className="select-all text-fg">{config?.token}</code> : <button type="button" onClick={() => setVerToken(true)} className="alvo text-accent underline-offset-2 hover:underline">mostrar</button>}
        </p>
        {envios.length ? (
          <div>
            <p className="mb-1 text-xs font-semibold text-fg-muted">Últimos envios</p>
            <ul className="divide-y divide-border text-xs">
              {envios.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 py-1.5">
                  <span>{EVENTO[e.evento] ?? e.evento} · {quando(e.criado_em)}</span>
                  <span className={e.enviado_em ? "text-success" : e.tentativas >= 5 ? "text-danger" : "text-fg-muted"}>{e.enviado_em ? "Entregue" : e.tentativas >= 5 ? `Falhou (${e.ultimo_erro ?? e.codigo ?? "?"})` : e.tentativas ? `Tentando de novo (${e.tentativas}/5)` : "Na fila"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
