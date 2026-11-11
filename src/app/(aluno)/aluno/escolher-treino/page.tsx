// Meu treino do personal: escolher um treino para hoje — um treino pronto da
// vitrine dos visitantes ou um treino do protocolo de um aluno (04/11/2026).
import { redirect } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { Voltar } from "@/components/ui/Voltar";
import { prontosComoBase, protocolosComoBase } from "@/lib/data/treino-base";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { EscolherTreinoClient } from "./EscolherTreinoClient";

export const metadata = { title: "Escolher um treino" };

export default async function EscolherTreinoPage() {
  const sessao = await requireAlunoPage();
  if (!sessao.comoPersonal) redirect("/aluno/treinar");
  const [prontos, alunos, biblioteca] = await Promise.all([prontosComoBase().catch(() => []), protocolosComoBase(sessao.alunoId).catch(() => []), listarBiblioteca().catch(() => [])]);
  const itens = biblioteca.map((i) => ({ id: i.id, nome: i.nome, grupo: i.grupo, sinonimos: i.sinonimos, equipamento: i.equipamento, video: Boolean(i.midia?.verificada), midia: i.midia?.verificada ? { provider: i.midia.provider, id: i.midia.id } : null, passos: i.execucao.slice(0, 3) }));
  return (
    <div className="space-y-4">
      <Voltar href="/aluno/treinar" />
      <header>
        <h1 className="text-2xl font-bold">Escolher um treino para hoje</h1>
        <p className="mt-1 text-sm text-fg-muted">Monte um só para hoje, ou escolha um treino pronto, um dos seus ou de um aluno. Abre o treino livre já com os exercícios, as séries e as repetições; dá para trocar, tirar e pôr exercício. A ficha do aluno não muda e as cargas dele não vêm junto.</p>
        <p className="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-fg-muted">🔒 Só você vê esta tela. Os alunos não veem os protocolos uns dos outros: para eles aparecem só os treinos prontos e os treinos que você salvar em “Treinos que o Montinho fez”.</p>
      </header>
      <a href="/api/meu-treino?sair=1&para=/treinador/treinos-montinho" className="block rounded-xl border border-border bg-card px-4 py-3 text-sm"><span className="font-bold">🔥 Salvar meus treinos para os alunos</span><span className="block text-xs text-fg-muted">Os treinos que você fez viram “Treinos que o Montinho fez” no app dos alunos.</span></a>
      <EscolherTreinoClient prontos={prontos} alunos={alunos} itens={itens} />
    </div>
  );
}
