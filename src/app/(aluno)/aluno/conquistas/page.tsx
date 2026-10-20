// Minhas conquistas: histórico permanente, “Minha evolução em 30 dias” e
// reconhecimentos escritos pelo personal.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { listarReconhecimentos, resumoMensalDoAluno } from "@/lib/data/conquistas";
import { ConquistasClient } from "./ConquistasClient";
import { medalhasEmDestaque, proximasMedalhas, vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { mensagemDaJornada } from "@/lib/conquistas/conteudo";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";

export const metadata = { title: "Conquistas" };

export default async function ConquistasPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const [{ mensal, conquistas, sessoes, aderencia }, reconhecimentos] = await Promise.all([resumoMensalDoAluno(aluno), listarReconhecimentos(aluno.id)]);
  const hoje = dataLocal(new Date());
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje });
  const titulos = new Map(conquistas.map((c) => [c.id, c.titulo]));
  const codigoPorId = new Map(conquistas.map((c) => [c.id, c.codigo]));
  // Mensagem escrita pelo personal ligada a uma medalha (a mais recente).
  const reconhecimentosPorCodigo: Record<string, { mensagem: string; data: string }> = {};
  for (const r of [...reconhecimentos].reverse()) {
    const cod = r.conquista_id ? codigoPorId.get(r.conquista_id) : null;
    if (cod) reconhecimentosPorCodigo[cod] = { mensagem: r.mensagem, data: r.created_at };
  }
  const unicas = new Set(medalhas.map((m) => m.codigo as string));
  // Celebração só uma vez (vista_em) e só para conquistas recentes (14 dias).
  const recente = `${somarDias(hoje, -14)}T00:00:00Z`;
  const novas = conquistas.filter((c) => unicas.has(c.codigo) && c.vista_em === null && c.conquistado_em >= recente).map((c) => ({ id: c.id, codigo: c.codigo }));
  const cumpridas = aderencia.sequencia.semanasCumpridas + (aderencia.semanaAtual?.status === "cumprida" ? 1 : 0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Minhas conquistas</h1>
        <Link href="/aluno/evolucao" className="alvo text-sm text-fg-muted hover:text-fg">
          Evolução →
        </Link>
      </div>
      <Link href="/aluno/jornada" className="flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-grain-strong px-4 py-3">
        <span>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">Minha Jornada</span>
          <span className="block text-sm font-semibold">Veja suas medalhas no mapa da sua evolução</span>
        </span>
        <span aria-hidden className="text-accent">→</span>
      </Link>
      <ConquistasClient
        nome={(aluno.profile?.nome ?? sessao.nome).split(" ")[0]}
        mensal={mensal}
        conquistas={conquistas.map((c) => ({ id: c.id, codigo: c.codigo, titulo: c.titulo, descricao: c.descricao, conquistado_em: c.conquistado_em, dados: c.dados }))}
        reconhecimentos={reconhecimentos.map((r) => ({ id: r.id, mensagem: r.mensagem, created_at: r.created_at, conquista: r.conquista_id ? (titulos.get(r.conquista_id) ?? null) : null }))}
        destaque={medalhasEmDestaque(medalhas, hoje)}
        proximas={proximasMedalhas(medalhas, 3)}
        ganhas={medalhas.filter((m) => m.conquistada).length}
        total={medalhas.length}
        novas={novas}
        jornada={mensagemDaJornada(cumpridas)}
        reconhecimentosPorCodigo={reconhecimentosPorCodigo}
      />
    </div>
  );
}
