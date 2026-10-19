import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { lerJson } from "@/lib/validacao/schemas";
import { criarIntervencao } from "@/lib/data/acompanhamento";

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
  if (inviteErr) {
    // anti-enumeração: mensagem genérica para e-mails já cadastrados
    const msg = /already|registered|exists/i.test(inviteErr.message) ? "Não foi possível enviar o convite para este e-mail." : `Convite falhou: ${inviteErr.message}`;
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  await admin.from("profiles").update({ nome: body.nome, role: "aluno" }).eq("id", invited.user.id);
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
  if (alunoErr) return NextResponse.json({ error: `Erro ao criar aluno: ${alunoErr.message}` }, { status: 500 });

  await criarIntervencao(aluno.id, sessao.userId, { tipo: "decisao", titulo: "Aluno cadastrado", descricao: "Convite de acesso enviado por e-mail.", referencia: { origem: "api/alunos" } }).catch(() => undefined);
  return NextResponse.json(aluno, { status: 201 });
}
