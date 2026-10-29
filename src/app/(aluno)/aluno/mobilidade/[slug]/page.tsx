// Protocolo de mobilidade guiado (superiores ou inferiores).
import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { mobilidadeAberta, pessoasParaEnviar } from "@/lib/data/mobilidade";
import { EnviarMobilidade } from "@/components/mobilidade/EnviarMobilidade";
import { ehSlugMobilidade, PROTOCOLOS } from "@/lib/mobilidade/protocolos";
import { MobilidadeClient } from "@/components/mobilidade/MobilidadeClient";
import { Voltar } from "@/components/ui/Voltar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: ehSlugMobilidade(slug) ? PROTOCOLOS[slug].nome : "Mobilidade" };
}

export default async function ProtocoloMobilidadePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!ehSlugMobilidade(slug)) notFound();
  const sessao = await requireAlunoPage();
  // Continua a que ficou aberta (até 6 h), em vez de começar outra.
  const aberta = await mobilidadeAberta(sessao.alunoId, slug);
  // O personal no app como aluno também pode mandar para alguém no WhatsApp.
  const pessoas = sessao.comoPersonal ? await pessoasParaEnviar(sessao.alunoId) : null;
  return (
    <div className="space-y-3">
      <Voltar href="/aluno/mobilidade" />
      {pessoas ? <EnviarMobilidade pessoas={pessoas} inicial={slug} /> : null}
      <MobilidadeClient slug={slug} nome={sessao.nome} demo={isDemoMode()} emAndamento={aberta ? { id: aberta.id, iniciado_em: aberta.iniciado_em, nota_antes: aberta.nota_antes } : null} />
    </div>
  );
}
