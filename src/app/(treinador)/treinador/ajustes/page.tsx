import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function AjustesPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <Badge tone="accent">Ajustes</Badge>
        <h1 className="text-3xl font-bold mt-3">Configurações da conta</h1>
        <p className="text-fg-muted text-sm mt-1">Perfil, integrações e preferências do Squad.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Perfil do treinador</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input defaultValue="Treinador Demo" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input defaultValue="treinador@exemplo.com" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input placeholder="(48) 99999-0000" />
          </div>
          <Button variant="primary" size="sm">Salvar alterações</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Integration name="Supabase" status="pending" detail="aguardando credenciais" />
        </CardBody>
      </Card>
    </div>
  );
}

function Integration({
  name,
  status,
  detail,
}: {
  name: string;
  status: "connected" | "pending";
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
      <div>
        <div className="font-semibold text-sm">{name}</div>
        <div className="text-xs text-fg-subtle mt-0.5">{detail}</div>
      </div>
      <Badge tone={status === "connected" ? "success" : "gold"}>
        {status === "connected" ? "Conectado" : "Pendente"}
      </Badge>
    </div>
  );
}
