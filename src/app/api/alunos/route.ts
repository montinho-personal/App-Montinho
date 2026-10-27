import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { lerJson } from "@/lib/validacao/schemas";
import { criarIntervencao } from "@/lib/data/acompanhamento";
import { contaOrfa } from "@/lib/auth/conta-orfa";

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  telefone: z.string().trim().max(30).nullable().optional(),
  data_nascimento: z.string().max(10).nullable().optional(),
  sexo: z.enum(["M", "F", "NI"]).nullable().optional(),
  objetivo: z.string().trim().max(300).nullable().optional(),
  observacoes: z.string().trim().max(1000).nullable().optional(),
  data_inicio: z.string().max(10).nullable().optional(),
  acesso_ate: z.string().max(10).nullable().optional(),
});

/**
 * POST /api/alunos — cadastra aluno por convite.
 * ÚNICO ponto que usa a service role (convite em auth.users). A autorização é
 * verificada explicitamente antes (treinador autenticado) e a ação fica
 * registrada em `intervencoes` para auditoria.
 */
export async function POST(request: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  if (isDemoMode()) return NextResponse.json({ error: "No modo demonstração não é possível convidar alunos." }, { status: 501 });

  const { data: body, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });

  const admin = createSupabaseAdminClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(body.email, { data: { nome: body.nome, role: "aluno" } });
  // E-mail com login de aluno sem ficha (pediu o link antes do cadastro): liga a ficha a esse login.
  const orfa = inviteErr && /already|registered|exists/i.test(inviteErr.message) ? await contaOrfa(admin, body.email) : null;
  const userId = invited?.user?.id ?? orfa;
  if (inviteErr && !orfa) {
    // Só o treinador autenticado chega aqui: a mensagem pode ser específica.
    const msg = /already|registered|exists/i.test(inviteErr.message)
      ? "Este e-mail já tem uma conta no app (de aluno ou de personal). Use outro e-mail — para testar, dá para usar um apelido do Gmail, ex.: seunome+aluno@gmail.com."
      : `Convite falhou: ${inviteErr.message}`;
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  if (!userId) return NextResponse.json({ error: "Convite falhou. Tente de novo." }, { status: 500 });
  await admin.from("profiles").update({ nome: body.nome, role: "aluno" }).eq("id", userId);
  const { data: aluno, error: alunoErr } = await admin
    .from("alunos")
    .insert({
      profile_id: userId,
      telefone: body.telefone ?? null,
      data_nascimento: body.data_nascimento ?? null,
      sexo: body.sexo ?? null,
      objetivo: body.objetivo ?? null,
      observacoes: body.observacoes ?? null,
      status: "pendente",
      data_inicio: body.data_inicio ?? new Date().toISOString().slice(0, 10),
      acesso_ate: body.acesso_ate ?? null,
    })
    .select("*, profile:profiles(*)")
    .single();
  if (alunoErr) return NextResponse.json({ error: `Erro ao criar aluno: ${alunoErr.message}` }, { status: 500 });

  await criarIntervencao(aluno.id, sessao.userId, { tipo: "decisao", titulo: "Aluno cadastrado", descricao: orfa ? "E-mail já tinha login no app: ficha ligada a ele (entra pelo “esqueci a senha” ou pelo link)." : "Convite de acesso enviado por e-mail.", referencia: { origem: "api/alunos" } }).catch(() => undefined);
  return NextResponse.json({ ...aluno, ...(orfa ? { aviso: "Esse e-mail já tinha login no app. A ficha foi ligada a ele: peça para a pessoa entrar em “esqueci a senha” para criar a senha." } : {}) }, { status: 201 });
}
