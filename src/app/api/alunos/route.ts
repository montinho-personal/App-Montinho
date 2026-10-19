import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/alunos
 * Cria aluno: invite Supabase Auth → profile criado por trigger → INSERT alunos.
 * Body: { nome, email, telefone?, data_nascimento?, sexo?, objetivo?, observacoes?,
 *         valor_mensalidade_centavos?, data_inicio? }
 */
export async function POST(request: Request) {
  const { error } = await requireTreinador();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.nome || !body?.email) {
    return NextResponse.json({ error: "nome e email são obrigatórios" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // 1. Invita usuário via Supabase Auth — o trigger on_auth_user_created cria o profile
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    body.email,
    {
      data: {
        nome: body.nome,
        role: "aluno",
      },
    }
  );

  if (inviteErr) {
    return NextResponse.json({ error: `Convite falhou: ${inviteErr.message}` }, { status: 422 });
  }

  // 2. Aguarda o profile ser criado pelo trigger (normalmente instantâneo)
  // Garante que o profile existe antes de criar o aluno
  await admin
    .from("profiles")
    .update({ nome: body.nome, role: "aluno" })
    .eq("id", invited.user.id);

  // 3. Cria registro em alunos
  const { data: aluno, error: alunoErr } = await admin
    .from("alunos")
    .insert({
      profile_id: invited.user.id,
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

  if (alunoErr) {
    return NextResponse.json({ error: `Erro ao criar aluno: ${alunoErr.message}` }, { status: 500 });
  }

  return NextResponse.json(aluno, { status: 201 });
}
