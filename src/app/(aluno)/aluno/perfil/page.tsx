import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { PagamentoStatusPill, AlunoStatusPill } from "@/components/ui/StatusPill";
import { getAluno, listPagamentos } from "@/lib/db";
import { brl, dataBR, diasAte } from "@/lib/format";
import { BRAND } from "@/config/brand";

const ALUNO_ID = "aline";

export default async function PerfilPage() {
  const [aluno, pagamentos] = await Promise.all([
    getAluno(ALUNO_ID),
    listPagamentos(ALUNO_ID),
  ]);
  if (!aluno) return null;
  const dias = diasAte(aluno.acesso_ate);

  return (
    <div className="space-y-5">
      <header className="text-center">
        <Avatar nome={aluno.profile?.nome ?? "?"} size={80} className="mx-auto" />
        <h1 className="text-xl font-bold mt-3">{aluno.profile?.nome}</h1>
        <p className="text-sm text-fg-subtle">{aluno.profile?.email}</p>
        <div className="mt-2">
          <AlunoStatusPill status={aluno.status} />
        </div>
      </header>

      <Card className={dias !== null && dias < 0 ? "border-red/40 bg-red/5" : ""}>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wider font-semibold text-fg-subtle">
              Mensalidade
            </div>
            <Badge tone={dias !== null && dias < 0 ? "red" : "success"}>
              {dias !== null && dias < 0
                ? `Vencida há ${Math.abs(dias)}d`
                : `${dias}d restantes`}
            </Badge>
          </div>
          <div className="text-sm">Acesso ativo até <strong>{dataBR(aluno.acesso_ate)}</strong></div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm">Renovar agora</Button>
            <Button variant="ghost" size="sm">Ver histórico</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {pagamentos.length === 0 ? (
            <div className="px-6 py-6 text-center text-sm text-fg-subtle">
              Sem pagamentos registrados.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pagamentos.map((p) => (
                <li key={p.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold font-mono">{brl(p.valor_centavos)}</div>
                      <div className="text-xs text-fg-subtle mt-0.5">
                        {p.pago_em ? `Pago em ${dataBR(p.pago_em)}` : `Venc: ${dataBR(p.vencimento)}`}
                      </div>
                    </div>
                    <PagamentoStatusPill status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meus dados</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <Row label="Telefone" value={aluno.telefone ?? "—"} />
          <Row label="Nascimento" value={dataBR(aluno.data_nascimento)} />
          <Row label="Altura" value={aluno.altura_cm ? `${aluno.altura_cm}cm` : "—"} />
          <Row label="Início no Squad" value={dataBR(aluno.data_inicio)} />
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-fg-subtle">Objetivo</div>
            <div className="text-sm mt-1">{aluno.objetivo ?? "—"}</div>
          </div>
        </CardBody>
      </Card>

      <Button variant="secondary" size="md" className="w-full">
        Sair da conta
      </Button>

      <p className="text-center text-[10px] text-fg-subtle mt-4">
        {BRAND.fullName} · v1.0
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fg-subtle">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
