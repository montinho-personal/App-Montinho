// Aplica o padrão do personal (até a falha + aquecimento no 1º exercício,
// ./lib/prescricoes/regras) por cima dos treinos ativos do aluno, mantendo
// as edições feitas no montador e os IDs (histórico intacto). Mesmo caminho
// do montador: validação zod, versão nova, RLS. Sem mudança, não grava nada.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { getPlanoAtivo, salvarPlano } from "@/lib/data/programas";
import { criarIntervencao } from "@/lib/data/acompanhamento";
import { comRegras, exerciciosForaDoPadrao } from "@/lib/prescricoes/regras";
import { paraProgramaInput, paraTreinoInput } from "@/lib/prescricoes/converter";
import { lerJson, salvarPlanoSchema } from "@/lib/validacao/schemas";

const schema = z.object({ confirmar: z.literal(true) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const aluno = await getAluno(id);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const atual = await getPlanoAtivo(id);
  if (!atual.programa || !atual.treinos.length) return NextResponse.json({ error: "Este aluno ainda não tem treinos." }, { status: 409 });
  const treinos = atual.treinos.map((t) => paraTreinoInput(t));
  const fora = exerciciosForaDoPadrao(treinos);
  if (fora === 0) return NextResponse.json({ ok: true, alterados: 0 });

  const entrada = { programa: paraProgramaInput(atual.programa), treinos: treinos.map((t) => (t.ativo ? comRegras(t) : t)), motivo: "Padrão do personal: até a falha e aquecimento no 1º exercício" };
  const validado = salvarPlanoSchema.safeParse(entrada);
  if (!validado.success) return NextResponse.json({ error: "Não foi possível aplicar o padrão neste plano.", detalhes: validado.error.issues.slice(0, 5) }, { status: 422 });
  try {
    const r = await salvarPlano(id, sessao.userId, { ...entrada, registrarMemoria: false });
    await criarIntervencao(id, sessao.userId, { tipo: "revisao_treino", titulo: `Treino ajustado (versão ${r.versao.versao})`, descricao: "Até a falha em todas as séries e aquecimento no 1º exercício de cada treino.", referencia: { versao_id: r.versao.id, padrao: "falha_aquecimento" }, visivel_aluno: true }).catch(() => undefined);
    return NextResponse.json({ ok: true, alterados: fora, versao: r.versao.versao });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar" }, { status: 500 });
  }
}
