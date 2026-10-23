// Minhas medidas e avaliações: registrar números e enviar o arquivo da
// avaliação (bioimpedância, avaliação física). Dá o troféu “Ponto de Partida”.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { listarAvaliacoes } from "@/lib/data/medidas";
import { isDemoMode } from "@/lib/env";
import { MedidasAvaliacoes } from "@/components/medidas/MedidasAvaliacoes";
import { ComparadorMedidas } from "@/components/evolucao/ComparadorMedidas";

export const metadata = { title: "Minhas medidas e avaliações" };
export const dynamic = "force-dynamic";

export default async function MedidasPage() {
  const sessao = await requireAlunoPage();
  const { medidas, arquivos } = await listarAvaliacoes(sessao.alunoId);
  const primeiro = medidas.length === 0 && arquivos.length === 0;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Medidas e avaliações</h1>
        <Link href="/aluno/evolucao" className="alvo text-sm text-fg-muted hover:text-fg">← Evolução</Link>
      </div>
      {primeiro ? (
        <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <p className="font-bold text-accent">🏁 Seu Ponto de Partida</p>
          <p className="text-fg-muted">Registre como você está hoje (peso, medidas ou o arquivo de uma avaliação). Daqui a alguns meses, é com isso que você vai ver o quanto evoluiu — e já ganha o troféu “Ponto de Partida”.</p>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Tudo o que você registrar aqui aparece na sua Evolução, no comparador “antes × depois” e no relatório completo.</p>
      )}
      <MedidasAvaliacoes alunoId={sessao.alunoId} medidas={medidas} arquivos={arquivos} nome={sessao.nome.split(" ")[0]} demo={isDemoMode()} />
      {medidas.length >= 2 ? <ComparadorMedidas evolucao={medidas} /> : null}
    </div>
  );
}
