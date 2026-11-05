import { notFound, redirect } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { Voltar } from "@/components/ui/Voltar";
import { TelaObra } from "@/components/academia/TelaObra";
import { dadosDaObra, participantesDaObra } from "@/lib/data/academia";

export const metadata = { title: "Academia da Tribo" };

/** Memorial de uma academia construída (a obra em andamento abre a tela principal). */
export default async function MemorialObraPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAlunoPage();
  const { id } = await params;
  if (!/^[0-9a-z-]{6,40}$/i.test(id)) notFound();
  const d = await dadosDaObra(id);
  if (!d) notFound();
  if (d.estado === "ativa") redirect("/aluno/academia");
  const participantes = await participantesDaObra(d.id);
  return (
    <div className="space-y-4">
      <Voltar href="/aluno/academia/legado" />
      <div id="quem" />
      <TelaObra d={d} participantes={participantes} />
    </div>
  );
}
