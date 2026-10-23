// Salva a opção escolhida (Monte com IA) ou um treino pronto como treinos
// próprios do visitante. O plano é montado de novo aqui, no servidor.
import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { getPlanoAtivo } from "@/lib/data/programas";
import { opcoesParaVisitante } from "@/lib/data/plano-visitante";
import { salvarPlanoProprio } from "@/lib/data/meus-treinos";
import { marcaDoPronto, planoDoPronto, prontoPorSlug } from "@/lib/visitante/treinos-prontos";
import { requireVisitanteEmDiaApi } from "@/lib/visitante/guarda-api";
import { lerJson, salvarPlanoVisitanteSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireVisitanteEmDiaApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, salvarPlanoVisitanteSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const atuais = (await getPlanoAtivo(sessao.alunoId)).treinos.filter((t) => t.ativo && t.autoria === "proprio");
    if (data.origem.tipo === "pronto") {
      const pronto = prontoPorSlug(data.origem.slug);
      if (!pronto || (!pronto.aprovado && !isDemoMode())) return NextResponse.json({ error: "Treino pronto não encontrado." }, { status: 404 });
      const { biblioteca } = await opcoesParaVisitante(pronto.parametros);
      const plano = planoDoPronto(pronto, biblioteca.map((i) => i.slug));
      if (!plano) return NextResponse.json({ error: "Não foi possível montar este treino agora." }, { status: 500 });
      const r = await salvarPlanoProprio(sessao.alunoId, plano, biblioteca, { observacoes: marcaDoPronto(pronto), substituir: data.substituir, ativosAtuais: atuais });
      return NextResponse.json({ ok: true, ...r }, { status: 201 });
    }
    const origem = data.origem;
    const { biblioteca, opcoes } = await opcoesParaVisitante(origem.parametros);
    const plano = opcoes.find((o) => o.id === origem.opcao);
    if (!plano) return NextResponse.json({ error: "Opção não encontrada. Peça o treino de novo." }, { status: 404 });
    const r = await salvarPlanoProprio(sessao.alunoId, plano, biblioteca, { substituir: data.substituir, ativosAtuais: atuais });
    return NextResponse.json({ ok: true, ...r }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível salvar agora.";
    return NextResponse.json({ error: /Você já tem/.test(msg) ? msg : "Não foi possível salvar agora." }, { status: /Você já tem/.test(msg) ? 409 : 500 });
  }
}
