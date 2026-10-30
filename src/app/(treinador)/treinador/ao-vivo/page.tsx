// “Treinando agora”: quem está treinando, ao vivo, e o recado no meio do treino.
import { requireTreinadorPage } from "@/lib/auth/session";
import { outrasAtividadesAgora, treinandoAgora } from "@/lib/data/ao-vivo";
import { AoVivoClient } from "./AoVivoClient";

export const metadata = { title: "Treinando agora" };
export const dynamic = "force-dynamic";

export default async function AoVivoPage() {
  await requireTreinadorPage();
  const [lista, outras] = await Promise.all([treinandoAgora().catch(() => []), outrasAtividadesAgora().catch(() => [])]);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black">🟢 Treinando agora</h1>
        <p className="mt-1 text-sm text-fg-muted">Quem está com o treino aberto neste momento — e quem está no cardio ou na mobilidade. A lista se atualiza sozinha. Mande um recado e ele aparece na tela do treino e no celular do aluno.</p>
      </header>
      <AoVivoClient inicial={lista} outrasInicial={outras} agoraInicial={new Date().toISOString()} />
    </div>
  );
}
