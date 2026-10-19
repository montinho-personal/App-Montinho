import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { BRAND } from "@/config/brand";

export const metadata = { title: "Configuração pendente" };

export default function ConfiguracaoPendentePage() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Aplicação ainda não configurada</CardTitle>
      </CardHeader>
      <CardBody className="text-sm text-fg-muted space-y-3">
        <p>
          O app {BRAND.fullName} precisa de um banco Supabase (produção) ou do modo demonstração explícito (desenvolvimento). Por segurança, páginas privadas não abrem sem isso.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-fg-subtle">
          <li>
            Produção: defina <code className="text-fg">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="text-fg">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e <code className="text-fg">SUPABASE_SERVICE_ROLE_KEY</code> (ver SETUP.md).
          </li>
          <li>
            Demonstração local: defina <code className="text-fg">NEXT_PUBLIC_DEMO_MODE=true</code> no <code className="text-fg">.env.local</code>.
          </li>
        </ul>
      </CardBody>
    </Card>
  );
}
