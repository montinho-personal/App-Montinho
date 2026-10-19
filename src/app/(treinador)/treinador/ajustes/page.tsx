import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireTreinadorPage } from "@/lib/auth/session";
import { appMode, FEATURES } from "@/lib/env";
import { BRAND } from "@/config/brand";

export const metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const sessao = await requireTreinadorPage();
  const modo = appMode();
  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <p className="text-xs uppercase tracking-wider text-accent font-bold">Ajustes</p>
        <h1 className="text-3xl font-bold mt-1">Conta e configuração</h1>
        <p className="text-fg-muted text-sm mt-1">Estado do ambiente e integrações do {BRAND.fullName}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Treinador</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <Row label="Nome" value={sessao.nome} />
          <Row label="Papel" value="treinador administrador" />
          <p className="text-xs text-fg-subtle">Nome e e-mail são editados no cadastro (Supabase Auth / tabela profiles).</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ambiente</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <Integration name="Banco de dados (Supabase)" status={modo === "live" ? "connected" : "pending"} detail={modo === "live" ? "autenticação e RLS ativos" : modo === "demo" ? "modo demonstração — dados fictícios em memória" : "não configurado"} />
          <Integration name="Memória de prescrições" status="connected" detail="busca estruturada (sem IA) — sempre disponível" />
          <Integration name="Camada de IA (opcional)" status={FEATURES.iaMemoria ? "connected" : "pending"} detail={FEATURES.iaMemoria ? "chave configurada no servidor; dados enviados são mínimos e desidentificados" : "desligada: defina AI_PROVIDER e ANTHROPIC_API_KEY no servidor para habilitar"} />
          <Integration name="Logotipo" status="connected" detail="arquivo do site oficial em /public/brand — substitua pelo vetor original quando disponível" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacidade (LGPD)</CardTitle>
        </CardHeader>
        <CardBody className="text-sm text-fg-muted space-y-2">
          <p>Anamnese, lesões, fotos e medidas ficam restritas ao aluno dono e ao treinador (políticas RLS no banco). Fotos vivem em bucket privado.</p>
          <p>A memória de prescrições guarda só a estrutura do treino, sem nome, observações pessoais ou cargas. Um exemplo pode ser removido do acervo sem apagar o histórico do aluno.</p>
          <p>Nenhum dado pessoal é enviado a serviços de IA por padrão.</p>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-subtle">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Integration({ name, status, detail }: { name: string; status: "connected" | "pending"; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-surface rounded-lg border border-border">
      <div>
        <div className="font-semibold text-sm">{name}</div>
        <div className="text-xs text-fg-subtle mt-0.5">{detail}</div>
      </div>
      <Badge tone={status === "connected" ? "success" : "gold"}>{status === "connected" ? "Ativo" : "Pendente"}</Badge>
    </div>
  );
}
