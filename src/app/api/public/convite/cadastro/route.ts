import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FEATURES, isDemoMode } from "@/lib/env";
import { cadastroVisitanteSchema, lerJson } from "@/lib/validacao/schemas";
import { codigoValido, fimDoAcesso, MENSAGEM_CONVITE, normalizarCodigo, type MotivoConviteInvalido } from "@/lib/visitante/acesso";
import type { Convite } from "@/lib/supabase/types";

/**
 * POST /api/public/convite/cadastro — cadastro do visitante por código.
 * Usa a service role só para o que exige: reservar a vaga do convite de forma
 * atômica (reservar_convite) e criar o login sem mandar e-mail (createUser
 * com e-mail já confirmado — o limite de e-mails do Supabase não trava).
 * Se algo falhar depois da reserva, a vaga é devolvida e o login desfeito.
 */
export async function POST(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (isDemoMode()) return NextResponse.json({ error: "No modo demonstração não é possível criar contas." }, { status: 501 });

  const { data: body, error: vErr } = await lerJson(request, cadastroVisitanteSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const codigo = normalizarCodigo(body.codigo);
  if (!codigoValido(codigo)) return NextResponse.json({ error: MENSAGEM_CONVITE.inexistente }, { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data: reservados } = await admin.rpc("reservar_convite", { p_codigo: codigo });
  const convite = (Array.isArray(reservados) ? reservados[0] : null) as Convite | null;
  if (!convite) {
    const { data: info } = await admin.rpc("convite_publico", { p_codigo: codigo });
    const motivo = ((Array.isArray(info) ? info[0]?.situacao : null) ?? "inexistente") as MotivoConviteInvalido | "ok";
    return NextResponse.json({ error: MENSAGEM_CONVITE[motivo === "ok" ? "esgotado" : motivo] }, { status: 410 });
  }
  const devolver = () => admin.rpc("devolver_convite", { p_id: convite.id }).then(() => undefined, () => undefined);

  const { data: criado, error: userErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.senha,
    email_confirm: true,
    user_metadata: { nome: body.nome, role: "aluno" },
  });
  if (userErr || !criado.user) {
    await devolver();
    const jaExiste = /already|registered|exists/i.test(userErr?.message ?? "");
    return NextResponse.json(
      { error: jaExiste ? "Esse e-mail já tem uma conta no app. Toque em “Já tenho conta” e entre com ele." : "Não foi possível criar a conta agora. Tente de novo em instantes." },
      { status: jaExiste ? 409 : 500 }
    );
  }
  const userId = criado.user.id;

  const agora = new Date();
  const fim = fimDoAcesso(convite, agora);
  try {
    await admin.from("profiles").update({ nome: body.nome, role: "aluno" }).eq("id", userId);
    const { data: aluno, error: alunoErr } = await admin
      .from("alunos")
      .insert({ profile_id: userId, status: "ativo", modalidade: "visitante", data_inicio: agora.toISOString().slice(0, 10), acesso_ate: fim ? fim.toISOString().slice(0, 10) : null })
      .select("id")
      .single();
    if (alunoErr || !aluno) throw alunoErr ?? new Error("aluno");
    const { error: acessoErr } = await admin.from("acessos_visitante").insert({
      aluno_id: aluno.id,
      convite_id: convite.id,
      campanha_id: convite.campanha_id,
      tipo: convite.tipo_acesso,
      inicio: agora.toISOString(),
      fim: fim?.toISOString() ?? null,
      renovavel: convite.renovavel,
      origem: convite.origem,
    });
    if (acessoErr) throw acessoErr;
    await admin.from("perfil_visitante").insert({ aluno_id: aluno.id, aceite_privacidade_em: agora.toISOString() });
  } catch {
    // Desfaz o login recém-criado (vazio, sem nenhum treino) e devolve a vaga.
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    await devolver();
    return NextResponse.json({ error: "Não foi possível concluir o cadastro agora. Tente de novo em instantes." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fim: fim?.toISOString() ?? null }, { status: 201 });
}
