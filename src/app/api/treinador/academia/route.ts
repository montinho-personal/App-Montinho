// Academia da Tribo — ações do personal (0146). Tudo passa pelas funções do
// banco, que conferem que é o personal (RLS + security definer).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { ajustarExibicao, ajustarObra, apagarRascunho, ativarObra, liberarSerie, salvarRascunho } from "@/lib/data/academia";
import { lerJson, obraAcaoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, obraAcaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    switch (data.acao) {
      case "salvar": {
        const id = await salvarRascunho(
          { nome: data.nome, modelo: data.modelo, area_m2: data.area_m2, materiais_t: data.materiais_t, meta_kg: Math.round(data.meta_t * 1000), banner_dias: data.banner_dias, narrativa: data.narrativa || null, mostrar_contribuicoes: data.mostrar_contribuicoes },
          data.id ?? null,
        );
        return NextResponse.json({ ok: true, id });
      }
      case "apagar":
        await apagarRascunho(data.id);
        return NextResponse.json({ ok: true });
      case "ativar": {
        const em = await ativarObra(data.id, data.confirmacao);
        return NextResponse.json({ ok: true, ativada_em: em });
      }
      case "ajustar":
        await ajustarObra(data.id, data.kg, data.motivo);
        return NextResponse.json({ ok: true });
      case "liberar":
        await liberarSerie(data.set_id, data.motivo);
        return NextResponse.json({ ok: true });
      case "exibicao":
        await ajustarExibicao(data.id, { ...(data.banner_dias != null ? { banner_dias: data.banner_dias } : {}), ...(data.mostrar_contribuicoes != null ? { mostrar_contribuicoes: data.mostrar_contribuicoes } : {}) });
        return NextResponse.json({ ok: true });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: /relation .* does not exist|function .* does not exist/i.test(msg) ? "A Academia da Tribo ainda está sendo ativada no banco." : msg }, { status: 400 });
  }
}
