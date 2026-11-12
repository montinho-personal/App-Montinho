// Aula presencial em treino LIVRE (12/11/2026, pedido do Montinho: “preciso do treino livre
// quando vou dar aula para aluno particular”): o personal escolhe os exercícios na hora e
// anota as séries do aluno — a mesma tela do treino livre, com o aluno da aula no cabeçalho.
export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { getSessao, ultimasExecucoes } from "@/lib/data/sessoes";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { getPadraoCarga } from "@/lib/data/padrao-carga";
import { tipoDePeso } from "@/lib/treino/padrao-carga";
import { ehSessaoLivre, textoUltimaVez } from "@/lib/treino/livre";
import { juntarBlocosAdjacentes } from "@/lib/treino/tecnica-aluno";
import type { ConfigTecnica } from "@/lib/treino/tecnica-config";
import { LivreClient, type ExercicioTela } from "@/app/(aluno)/aluno/livre/[id]/LivreClient";

export const metadata = { title: "Aula presencial · treino livre" };

export default async function AulaLivrePage({ params }: { params: Promise<{ id: string; sessao: string }> }) {
  await requireTreinadorPage();
  const { id, sessao: sessaoId } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const s = await getSessao(id, sessaoId);
  if (!s || !ehSessaoLivre(s)) notFound();
  if (s.status !== "em_andamento") redirect(`/treinador/alunos/${id}/treinos-feitos`);
  const tecnicaDe = (p: unknown) => ((p as { tecnica?: string } | null)?.tecnica ?? "normal");
  const [biblioteca, ultimas, padraoCarga] = await Promise.all([
    listarBiblioteca(),
    ultimasExecucoes(id, s.exercicios.map((e) => ({ id: e.id, nome: e.nome, biblioteca_id: e.biblioteca_id }))).catch(() => ({}) as Record<string, null>),
    getPadraoCarga(id).catch(() => ({ anilhas: null, halteres: null })),
  ]);
  const itens = biblioteca.map((i) => ({ id: i.id, nome: i.nome, grupo: i.grupo, sinonimos: i.sinonimos, equipamento: i.equipamento, video: Boolean(i.midia?.verificada), midia: i.midia?.verificada ? { provider: i.midia.provider, id: i.midia.id } : null, passos: i.execucao.slice(0, 3) }));
  const presc = (p: unknown) => (p ?? {}) as { tecnica_config?: ConfigTecnica | null; bloco?: string | null };
  const txt = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");
  const inicial: ExercicioTela[] = juntarBlocosAdjacentes(s.exercicios.filter((e) => e.status !== "pulado").sort((a, b) => a.ordem - b.ordem).map((e) => ({
    seId: e.id,
    nome: e.nome,
    grupo: e.grupo_muscular,
    tipoPeso: tipoDePeso({ nome: e.nome, equipamento: itens.find((i) => i.id === e.biblioteca_id)?.equipamento ?? [] }),
    tecnica: tecnicaDe(e.prescricao),
    config: presc(e.prescricao).tecnica_config ?? null,
    bloco: presc(e.prescricao).bloco ?? null,
    observacao: e.observacao_aluno ?? "",
    ultima: textoUltimaVez(ultimas[e.id]),
    meta: null,
    series: [...e.series].sort((a, b) => a.serie - b.serie).map((x) => ({ key: x.client_key.replace(/^livre:/, ""), serie: x.serie, tipo: x.tipo, carga: txt(x.carga_kg), reps: x.reps != null ? String(x.reps) : "", salva: true, ...(x.blocos?.length ? { blocos: x.blocos.map((b) => ({ carga: txt(b.carga), reps: b.reps != null ? String(b.reps) : "" })) } : {}) })),
  })));
  const nome = aluno.profile?.nome?.split(" ")[0] ?? "Aluno";
  return (
    <div className="mx-auto max-w-md space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">👥 Aula presencial · {nome}</p>
      <LivreClient titulo={`Treino livre de ${nome}`} padraoCarga={padraoCarga} sessaoId={s.id} iniciadoEm={s.iniciado_em} itens={itens} inicial={inicial} voltar={`/treinador/alunos/${id}/aula`} alunoAula={id} aoTerminar={`/treinador/alunos/${id}/treinos-feitos`} />
    </div>
  );
}
