// Edita os dados cadastrais do aluno (só o treinador, via RLS). Atualização
// parcial e validada: campo ausente não é tocado; "" ou null limpa o campo.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinador } from "@/lib/api-auth";
import { lerJson } from "@/lib/validacao/schemas";
import { fimDoDiaBrasilia } from "@/lib/visitante/acesso";

const data = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).transform((v) => v || null);
const texto = (max: number) => z.union([z.string().trim().max(max), z.null()]).transform((v) => v || null);

const schema = z.object({
  nome: z.string().trim().min(2).max(120).optional(),
  telefone: texto(30).optional(),
  data_nascimento: data.optional(),
  sexo: z.enum(["M", "F"]).nullable().optional(),
  altura_cm: z.number().int().min(50).max(260).nullable().optional(),
  objetivo: texto(300).optional(),
  observacoes: texto(2000).optional(),
  status: z.enum(["ativo", "pendente", "inadimplente", "pausado", "arquivado"]).optional(),
  data_inicio: data.optional(),
  acesso_ate: data.optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { db, error } = await requireTreinador();
  if (error) return error;
  const { id } = await params;
  const { data: body, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });

  const { nome, ...campos } = body;
  const update = Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined));
  const q = db!.from("alunos");
  const { data: aluno, error: dbErr } = Object.keys(update).length
    ? await q.update(update).eq("id", id).select("*, profile:profiles(*)").single()
    : await q.select("*, profile:profiles(*)").eq("id", id).single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Visitante: o app trava pelo fim do acesso do visitante (acessos_visitante.fim),
  // não pelo acesso_ate. Mudar o “Acesso até” na ficha também move esse fim
  // (até o fim do dia escolhido, em Brasília). Caso do Reinaldo, 26/11/2026.
  if (update.acesso_ate && aluno.modalidade === "visitante") {
    const fim = fimDoDiaBrasilia(update.acesso_ate as string);
    const { error: e3 } = await db!.from("acessos_visitante").upsert({ aluno_id: id, tipo: "dias", fim, updated_at: new Date().toISOString() }, { onConflict: "aluno_id" });
    if (e3) return NextResponse.json({ error: "Salvou a data, mas não foi possível liberar o acesso do visitante." }, { status: 500 });
  }

  if (nome) {
    const { error: e2 } = await db!.from("profiles").update({ nome }).eq("id", aluno.profile_id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }
  return NextResponse.json(aluno);
}
