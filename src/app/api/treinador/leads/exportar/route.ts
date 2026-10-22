import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { carregarLeads } from "@/lib/data/leads";
import { csvLeads } from "@/lib/visitante/leads";

/** GET /api/treinador/leads/exportar — planilha (CSV) dos leads, para importar em qualquer CRM. */
export async function GET() {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { leads } = await carregarLeads();
  const hoje = new Date().toISOString().slice(0, 10);
  return new NextResponse(csvLeads(leads), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-montinho-${hoje}.csv"`, "Cache-Control": "no-store" },
  });
}
