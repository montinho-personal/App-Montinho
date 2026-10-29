// “Seu protocolo em ação” no topo do montador (aprovado pelo Montinho em 29/10/2026):
// só dados que o app registrou — treinos da semana, último treino feito e a última
// carga que subiu — com atalhos para Treinos feitos e Evolução. Sem nota, sem rótulo
// negativo e sem dizer que o resultado foi causado pelo protocolo. Sem registro =
// “sem registros no app” (não quer dizer que não treinou).
import Link from "next/link";

export type DadosEmAcao = {
  semana: { meta: number | null; feitos: number; pausada: boolean } | null;
  ultimo: { titulo: string; quando: string } | null;
  alta: { nome: string; antes: number; agora: number } | null;
};

const kg = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;

export function ProtocoloEmAcao({ alunoId, nome, d }: { alunoId: string; nome: string; d: DadosEmAcao }) {
  const primeiro = nome.split(" ")[0];
  const semRegistro = !d.ultimo;
  return (
    <section aria-label="Seu protocolo em ação" className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">📈 Seu protocolo em ação</p>
      {semRegistro ? (
        <p className="mt-1 text-sm text-fg-muted">{primeiro} ainda não tem treinos registrados no app. Quando treinar, o resultado aparece aqui.</p>
      ) : (
        <ul className="mt-1.5 grid gap-1 text-sm sm:grid-cols-3">
          <li>
            <span className="text-fg-subtle">Esta semana: </span>
            {d.semana?.pausada ? <strong>pausa combinada</strong> : d.semana?.meta ? <strong>{d.semana.feitos.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de {d.semana.meta} treinos</strong> : <strong>{d.semana?.feitos ?? 0} {(d.semana?.feitos ?? 0) === 1 ? "treino" : "treinos"}</strong>}
          </li>
          <li className="min-w-0 truncate">
            <span className="text-fg-subtle">Último treino: </span>
            <strong>{d.ultimo!.titulo}</strong> <span className="text-fg-subtle">· {d.ultimo!.quando}</span>
          </li>
          <li className="min-w-0 truncate">
            <span className="text-fg-subtle">Carga em alta: </span>
            {d.alta ? (
              <strong>
                {d.alta.nome}: {kg(d.alta.antes)} → {kg(d.alta.agora)}
              </strong>
            ) : (
              <span className="text-fg-muted">nada registrado ainda</span>
            )}
          </li>
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
        <Link href={`/treinador/alunos/${alunoId}/treinos-feitos`} className="text-accent underline-offset-2 hover:underline">📋 Treinos feitos e anotações</Link>
        <Link href={`/relatorio/${alunoId}`} className="text-accent underline-offset-2 hover:underline">📄 Evolução completa</Link>
      </div>
    </section>
  );
}
