// Copia o protocolo de treino deste aluno para outro aluno (pedido do Montinho,
// 29/10/2026): tudo igual — treinos, exercícios, séries, técnicas, divisão —,
// MENOS as cargas. No aluno de destino, os treinos que ele tinha são
// arquivados (ativo=false), nunca apagados. Versão nova pelo salvarPlano.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { getPlanoAtivo, salvarPlano } from "@/lib/data/programas";
import { ehLivreMetas, salvarLivreMetas } from "@/lib/data/livre-metas";
import { copiarProtocolo } from "@/lib/prescricoes/copiar";
import { paraTreinoInput } from "@/lib/prescricoes/converter";
import { lerJson, salvarPlanoSchema } from "@/lib/validacao/schemas";

const schema = z.object({ destino_id: z.string().min(1).max(64) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (data.destino_id === id) return NextResponse.json({ error: "Escolha outro aluno." }, { status: 400 });
  const [origemAluno, destinoAluno] = await Promise.all([getAluno(id), getAluno(data.destino_id)]);
  if (!origemAluno || !destinoAluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const [origem, destino] = await Promise.all([getPlanoAtivo(id), getPlanoAtivo(data.destino_id)]);
  const copia = copiarProtocolo(origem, destino.programa);
  if (!copia.treinos.length && !ehLivreMetas(origem.programa)) return NextResponse.json({ error: "Este aluno ainda não tem treinos para copiar." }, { status: 409 });

  const nomeOrigem = origemAluno.profile?.nome ?? "outro aluno";
  const entrada = {
    programa: copia.programa,
    treinos: [...copia.treinos, ...destino.treinos.filter((t) => t.ativo).map((t) => paraTreinoInput(t, false))],
    motivo: `Protocolo copiado de ${nomeOrigem} (sem as cargas)`,
  };
  const validado = salvarPlanoSchema.safeParse(entrada);
  if (!validado.success) return NextResponse.json({ error: "Não foi possível copiar este protocolo.", detalhes: validado.error.issues.slice(0, 5) }, { status: 422 });
  try {
    const r = await salvarPlano(data.destino_id, sessao.userId, { ...entrada, registrarMemoria: false });
    // Protocolo livre (por metas) vai junto; se o destino era livre e o de origem não, volta para fichas.
    if (ehLivreMetas(origem.programa) !== ehLivreMetas(destino.programa)) await salvarLivreMetas(data.destino_id, copia.programa.metas_volume, ehLivreMetas(origem.programa)).catch(() => undefined);
    return NextResponse.json({ ok: true, treinos: copia.treinos.length, versao: r.versao.versao });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível copiar" }, { status: 500 });
  }
}
