import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

/**
 * POST /api/dieta/calculo
 * Método do Pedro: proteína (g/kg) + gordura (g/kg) → macros + alvo calórico.
 */
export async function POST(req: Request) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const peso = Number(body?.peso_kg);
  if (!Number.isFinite(peso) || peso <= 0) {
    return NextResponse.json({ error: "peso_kg inválido" }, { status: 400 });
  }

  const proteinaGPorKg = Number(body.proteina_g_por_kg ?? 2.2);
  const gorduraGPorKg = Number(body.gordura_g_por_kg ?? 0.5);
  const proteinaG = Math.round(peso * proteinaGPorKg);
  const gorduraG = Math.round(peso * gorduraGPorKg);
  const proteinaKcal = proteinaG * 4;
  const gorduraKcal = gorduraG * 9;
  const caloriasAlvo = Number(body.calorias_alvo || proteinaKcal + gorduraKcal + 900);
  const carboG = Math.max(0, Math.round((caloriasAlvo - proteinaKcal - gorduraKcal) / 4));

  const resultado = {
    proteina_g: proteinaG,
    gordura_g: gorduraG,
    carbo_g: carboG,
    calorias_alvo: caloriasAlvo,
  };

  if (body.aluno_id) {
    await admin!.from("squad_dieta_calculos").insert({
      aluno_id: body.aluno_id,
      peso_kg: peso,
      proteina_g_por_kg: proteinaGPorKg,
      gordura_g_por_kg: gorduraGPorKg,
      calorias_alvo: caloriasAlvo,
      metodo: { fonte: "pré-configurado Pedro", pendente_validacao: true },
      resultado,
    });
  }

  return NextResponse.json({ ok: true, resultado });
}
