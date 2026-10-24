// “Criar com IA” do montador do personal: monta um treino com o pedido do
// personal + o contexto do aluno (anamnese, programa, outros treinos). Sem IA
// ligada (ou na demonstração): { ia: false }. Só o personal; nada é gravado
// aqui — a prévia aparece no montador e ele aplica se quiser.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getAluno, getAnamnese } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { criarTreinoComIA, type ContextoCriar } from "@/lib/ia/criar-treino";
import { criarTreinoIASchema, lerJson } from "@/lib/validacao/schemas";

export const maxDuration = 60;

function idade(nasc: string | null | undefined): number | null {
  if (!nasc) return null;
  const n = new Date(nasc);
  if (Number.isNaN(n.getTime())) return null;
  const hoje = new Date();
  return hoje.getFullYear() - n.getFullYear() - (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate()) ? 1 : 0);
}

export async function POST(request: Request) {
  const { error: erroAuth } = await requireTreinadorApi();
  if (erroAuth) return erroAuth;
  const { data, error } = await lerJson(request, criarTreinoIASchema);
  if (error) return NextResponse.json(error.body, { status: error.status });
  if (!FEATURES.iaMemoria || isDemoMode()) return NextResponse.json({ ia: false, resultado: null });
  const aluno = await getAluno(data.aluno_id);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  const [anamnese, plano, biblioteca] = await Promise.all([getAnamnese(data.aluno_id).catch(() => null), getPlanoAtivo(data.aluno_id), listarBiblioteca()]);
  const restricoes = [
    anamnese?.lesoes ? `Lesões: ${anamnese.lesoes}` : null,
    anamnese?.dores_atuais ? `Dores atuais: ${anamnese.dores_atuais}` : null,
    anamnese?.cirurgias ? `Cirurgias: ${anamnese.cirurgias}` : null,
    anamnese?.doencas_cronicas ? `Doenças: ${anamnese.doencas_cronicas}` : null,
    aluno.observacoes ? `Observações do personal: ${aluno.observacoes}` : null,
  ].filter((x): x is string => !!x).map((x) => x.slice(0, 400));
  const contexto: ContextoCriar = {
    letra: data.letra,
    objetivo: plano.programa?.objetivo ?? aluno.objetivo ?? anamnese?.objetivo_principal ?? null,
    nivel: plano.programa?.nivel ?? null,
    sexo: (aluno as { sexo?: string | null }).sexo ?? null,
    idade: idade((aluno as { data_nascimento?: string | null }).data_nascimento),
    restricoes,
    prioridades: (plano.programa?.prioridades as string[] | undefined) ?? [],
    focoDoDia: data.foco ?? null,
    duracaoMin: plano.programa?.duracao_min ?? null,
    outrosTreinos: plano.treinos.filter((t) => t.ativo && t.letra !== data.letra).map((t) => ({ letra: t.letra, exercicios: t.exercicios.map((e) => e.nome).slice(0, 15) })),
  };
  const resultado = await criarTreinoComIA(data.pedido, contexto, biblioteca.map((i) => ({ id: i.id, nome: i.nome, sinonimos: i.sinonimos })));
  return NextResponse.json({ ia: true, resultado });
}
