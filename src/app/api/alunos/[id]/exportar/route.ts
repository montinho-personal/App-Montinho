import { requireAcessoAlunoApi } from "@/lib/auth/session";
import { listSessoes } from "@/lib/data/sessoes";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/alunos/[id]/exportar — registros de séries em CSV (dono ou treinador). */
export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireAcessoAlunoApi(id);
  if (error) return error;
  const sessoes = await listSessoes(id, { limite: 1000, status: "todas" });
  const linhas = ["data;treino;status;exercicio;grupo;serie;tipo;carga_kg;reps;rir;desconforto"];
  for (const s of sessoes) {
    const data = (s.finalizado_em ?? s.iniciado_em).slice(0, 10);
    for (const e of s.exercicios) for (const x of e.series) {
      linhas.push([data, `${s.letra ?? ""} ${s.nome_treino ?? ""}`.trim(), s.status, e.nome, e.grupo_muscular ?? "", x.serie, x.tipo, x.carga_kg ?? "", x.reps ?? "", x.rir ?? "", x.desconforto ?? ""].map(csv).join(";"));
    }
  }
  return new Response("﻿" + linhas.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="treinos-${id.slice(0, 8)}.csv"` },
  });
}

function csv(v: unknown): string {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
