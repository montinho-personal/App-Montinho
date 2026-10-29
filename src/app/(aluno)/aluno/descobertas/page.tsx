// Montinho Desbloqueia — álbum de descobertas (colecionável) e biblioteca
// livre. O progresso é recompensa por aprender, nunca bloqueio de saúde.
import Link from "next/link";
import { Voltar } from "@/components/ui/Voltar";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { albumParaAluno } from "@/lib/data/desbloqueia";
import { progressoAlbum } from "@/lib/desbloqueia/motor";
import { paraVisao } from "@/components/desbloqueia/visao";
import { DescobertasClient } from "./DescobertasClient";
import { RevisarConhecimento } from "@/components/desbloqueia/RevisarConhecimento";
import { resumoRevisao } from "@/lib/desbloqueia/revisao";

export const metadata = { title: "Montinho Desbloqueia" };

export default async function DescobertasPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const { itens, progresso } = await albumParaAluno(aluno);
  const revisao = resumoRevisao(progresso, new Date().toISOString(), new Set(itens.map((i) => i.conteudo.id)));
  const { explorados, total } = progressoAlbum(itens);
  return (
    <div className="space-y-5">
      <Voltar href="/aluno/conquistas" />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Montinho Desbloqueia</h1>
        <Link href="/aluno/conquistas" className="alvo text-sm text-fg-muted hover:text-fg">Conquistas →</Link>
      </div>
      <p className="text-sm text-fg-muted">Mitos, verdades e a ciência por trás do seu treino. Cada medalha e cada semana de acompanhamento liberam uma nova descoberta — e a biblioteca fica sempre aberta.</p>
      <RevisarConhecimento agora={revisao.agora} primeira={revisao.primeira} aprendidas={revisao.aprendidas} />
      <DescobertasClient itens={itens.map(paraVisao)} explorados={explorados} total={total} />
    </div>
  );
}
