// ============================================================================
// POST /api/alunos/[id]/link-acesso — o personal gera o link de criar senha
// do aluno para mandar pelo WhatsApp. Não envia e-mail (não esbarra no limite
// de envios do Supabase) e o link usa token_hash, que funciona em qualquer
// navegador. Só treinador autenticado; o e-mail vem do cadastro do aluno lido
// com RLS. A service role é usada só para gerar o link (admin.generateLink),
// e a ação fica registrada em `intervencoes` (sem o link).
// ============================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAluno } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { criarIntervencao } from "@/lib/data/acompanhamento";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  if (isDemoMode()) return NextResponse.json({ error: "No modo demonstração não há contas reais para gerar link." }, { status: 501 });

  const p = paramsSchema.safeParse(await params);
  if (!p.success) return NextResponse.json({ error: "Aluno inválido." }, { status: 400 });

  const aluno = await getAluno(p.data.id);
  const email = aluno?.profile?.email?.trim();
  if (!aluno || !email) return NextResponse.json({ error: "Aluno sem e-mail cadastrado." }, { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data, error: linkErr } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const hash = data?.properties?.hashed_token;
  if (linkErr || !hash) return NextResponse.json({ error: "Não foi possível gerar o link agora. Tente de novo em instantes." }, { status: 502 });

  const origem = new URL(request.url).origin;
  const link = `${origem}/auth/callback?token_hash=${encodeURIComponent(hash)}&type=recovery&next=${encodeURIComponent("/conta/senha?primeiro=1")}`;

  await criarIntervencao(aluno.id, sessao.userId, { tipo: "decisao", titulo: "Link de acesso gerado", descricao: "Link para criar a senha gerado no painel (enviado pelo personal).", referencia: { origem: "api/alunos/link-acesso" } }).catch(() => undefined);
  return NextResponse.json({ link, email, validoAte: new Date(Date.now() + 60 * 60 * 1000).toISOString() });
}
