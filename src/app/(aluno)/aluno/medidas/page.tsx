// Minhas medidas e avaliações: registrar números e enviar o arquivo da
// avaliação (bioimpedância, avaliação física). Dá o troféu “Ponto de Partida”.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { listarAvaliacoes } from "@/lib/data/medidas";
import { isDemoMode } from "@/lib/env";
import { MedidasAvaliacoes } from "@/components/medidas/MedidasAvaliacoes";
import { ComparadorMedidas } from "@/components/evolucao/ComparadorMedidas";
import { dataLocal } from "@/lib/aderencia/calcular";
import { getAluno } from "@/lib/db";
import { evolucaoDaAvaliacao } from "@/lib/medidas/evolucao-avaliacao";
import { relatorioAvaliacao } from "@/lib/medidas/relatorio-avaliacao";
import { cardDaAvaliacao } from "@/lib/relatorios/card-relatorio";
import { ParabensAvaliacao } from "@/components/medidas/ParabensAvaliacao";

export const metadata = { title: "Minhas medidas e avaliações" };
export const dynamic = "force-dynamic";

export default async function MedidasPage() {
  const sessao = await requireAlunoPage();
  const { medidas, arquivos } = await listarAvaliacoes(sessao.alunoId);
  const primeiro = medidas.length === 0 && arquivos.length === 0;
  // Evolução na avaliação de 7 dobras mais recente (parabéns + compartilhar).
  const aluno = await getAluno(sessao.alunoId);
  const evolucao = evolucaoDaAvaliacao(medidas, aluno?.objetivo ?? null);
  const relEv = evolucao?.evoluiu ? relatorioAvaliacao(medidas, evolucao.id, aluno?.altura_cm ?? null) : null;
  const cardEv = relEv ? cardDaAvaliacao({ rel: relEv, nome: sessao.nome, evolucao }) : null;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Medidas e avaliações</h1>
        <Link href="/aluno/evolucao" className="alvo text-sm text-fg-muted hover:text-fg">← Evolução</Link>
      </div>
      {evolucao?.evoluiu ? <ParabensAvaliacao e={evolucao} card={cardEv} verHref={`/avaliacao/${evolucao.id}`} /> : null}
      {primeiro ? (
        <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <p className="font-bold text-accent">🏁 Seu Ponto de Partida</p>
          <p className="text-fg-muted">Registre como você está hoje (peso, medidas ou o arquivo de uma avaliação). Daqui a alguns meses, é com isso que você vai ver o quanto evoluiu — e já ganha o troféu “Ponto de Partida”.</p>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Tudo o que você registrar aqui aparece na sua Evolução, no comparador “antes × depois” e no relatório completo.</p>
      )}
      <MedidasAvaliacoes alunoId={sessao.alunoId} medidas={medidas} arquivos={arquivos} nome={sessao.nome.split(" ")[0]} demo={isDemoMode()} />
      {medidas.length >= 2 ? <ComparadorMedidas evolucao={medidas} compartilhar={{ nome: sessao.nome, hoje: dataLocal(new Date()) }} /> : null}
    </div>
  );
}
