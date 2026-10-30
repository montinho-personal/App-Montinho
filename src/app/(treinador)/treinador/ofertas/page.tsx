// Ofertas e planos (pedido do Montinho, 30/10/2026): liga/desliga as ofertas
// que aparecem no app (cartão no Início e no fim do treino, página Planos) e
// marca quem pode fazer aula presencial em Alphaville (Pacote Flexível). 0130.
import { requireTreinadorPage } from "@/lib/auth/session";
import { eventosDasOfertas, listarOfertasConfig, pessoasPresencial } from "@/lib/data/ofertas";
import { conversaoPorLugar } from "@/lib/ofertas/regras";
import { ConversaoOfertas } from "./ConversaoOfertas";
import { OfertasClient } from "./OfertasClient";

export const metadata = { title: "Ofertas e planos" };

export default async function OfertasPage() {
  await requireTreinadorPage();
  const [config, pessoas, eventos] = await Promise.all([listarOfertasConfig(), pessoasPresencial(), eventosDasOfertas(30).catch(() => [])]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Ofertas e planos</h1>
        <p className="text-sm text-fg-muted">O que aparece para alunos e visitantes chamarem você no WhatsApp. O app mostra no Início, no fim do treino e na página Planos, sem exagero: visitante no máximo 1 vez por dia, aluno 1 vez por semana, e nunca com dor anotada.</p>
      </header>
      <ConversaoOfertas linhas={conversaoPorLugar(eventos)} />
      <OfertasClient config={config} pessoas={pessoas} />
    </div>
  );
}
