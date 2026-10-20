// Todas as minhas conquistas: a coleção completa das 14 medalhas únicas e as
// conquistas que se repetem (recordes e retomadas), em seções próprias.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { listarReconhecimentos, resumoMensalDoAluno } from "@/lib/data/conquistas";
import { vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { CONTEUDO, CATEGORIA_ROTULO } from "@/lib/conquistas/conteudo";
import { dataLocal } from "@/lib/aderencia/calcular";
import { VitrineMedalhas } from "@/components/conquistas/VitrineMedalhas";
import { Card, CardBody } from "@/components/ui/Card";
import { ColecaoVista } from "./ColecaoVista";

export const metadata = { title: "Todas as minhas conquistas" };
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function TodasConquistasPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const { m } = await searchParams;
  const [{ conquistas, sessoes, aderencia }, reconhecimentos] = await Promise.all([resumoMensalDoAluno(aluno), listarReconhecimentos(aluno.id)]);
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje: dataLocal(new Date()) });
  const codigoPorId = new Map(conquistas.map((c) => [c.id, c.codigo]));
  const porCodigo: Record<string, { mensagem: string; data: string }> = {};
  for (const r of [...reconhecimentos].reverse()) {
    const cod = r.conquista_id ? codigoPorId.get(r.conquista_id) : null;
    if (cod) porCodigo[cod] = { mensagem: r.mensagem, data: r.created_at };
  }
  const recordes = conquistas.filter((c) => c.codigo === "recorde");
  const voltas = conquistas.filter((c) => c.codigo === "eu_voltei");
  const ganhas = medalhas.filter((x) => x.conquistada).length;
  const nome = (aluno.profile?.nome ?? sessao.nome).split(" ")[0];

  return (
    <div className="space-y-5">
      <ColecaoVista />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Todas as minhas conquistas</h1>
        <Link href="/aluno/conquistas" className="alvo text-sm text-fg-muted hover:text-fg">← Voltar</Link>
      </div>
      <p className="text-sm text-fg-muted">A ordem é uma jornada sugerida: cada medalha tem o seu critério e nenhuma depende de outra. <span className="font-semibold text-fg">{ganhas} de {medalhas.length}</span> conquistadas.</p>

      <VitrineMedalhas medalhas={medalhas} nome={nome} reconhecimentos={porCodigo} inicial={medalhas.some((x) => x.codigo === m) ? m! : null} />

      <section className="space-y-2" aria-labelledby="rec-titulo">
        <h2 id="rec-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">{CONTEUDO.recorde.nome} · {CATEGORIA_ROTULO.desempenho}</h2>
        <Card>
          <CardBody className="space-y-2 text-sm">
            <p className="text-fg-muted">{CONTEUDO.recorde.importancia}</p>
            {recordes.length ? (
              <ul className="space-y-1">
                {recordes.slice(0, 20).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2"><span className="min-w-0">{(c.dados.recordes ?? []).map((r) => r.exercicio).join(", ") || c.descricao}</span><time className="shrink-0 text-xs text-fg-subtle">{fmt.format(new Date(c.conquistado_em))}</time></li>
                ))}
              </ul>
            ) : <p className="text-xs text-fg-subtle">{CONTEUDO.recorde.comoConquistar}</p>}
            <p className="text-[11px] text-fg-subtle">{recordes.length} treino(s) com recorde. {CONTEUDO.recorde.explicacao}</p>
          </CardBody>
        </Card>
      </section>

      <section className="space-y-2" aria-labelledby="volta-titulo">
        <h2 id="volta-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">{CONTEUDO.eu_voltei.nome} · {CATEGORIA_ROTULO.retomada}</h2>
        <Card>
          <CardBody className="space-y-2 text-sm">
            <p className="text-fg-muted">{CONTEUDO.eu_voltei.importancia} {CONTEUDO.eu_voltei.explicacao}</p>
            {voltas.length ? (
              <ul className="space-y-1">
                {voltas.map((c) => <li key={c.id} className="flex justify-between gap-2"><span>Retomada{c.dados.diasAfastado ? ` depois de ${c.dados.diasAfastado} dias` : ""}</span><time className="text-xs text-fg-subtle">{fmt.format(new Date(c.conquistado_em))}</time></li>)}
              </ul>
            ) : <p className="text-xs text-fg-subtle">{CONTEUDO.eu_voltei.comoConquistar}</p>}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
