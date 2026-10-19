import { NextResponse } from "next/server";
import { z } from "zod";
import { appMode, DEMO_COOKIE } from "@/lib/env";
import { DEMO_PERSONAS } from "@/lib/mock/personas";
import { lerJson } from "@/lib/validacao/schemas";

/** POST /api/auth/demo — escolhe a persona do modo demonstração (só existe em demo). */
export async function POST(request: Request) {
  if (appMode() !== "demo") return NextResponse.json({ error: "Modo demonstração desligado" }, { status: 404 });
  const { data, error } = await lerJson(request, z.object({ persona: z.string().max(40) }));
  if (error) return NextResponse.json(error.body, { status: error.status });
  const p = DEMO_PERSONAS.find((x) => x.chave === data.persona);
  if (!p) return NextResponse.json({ error: "Persona desconhecida" }, { status: 400 });
  const res = NextResponse.json({ ok: true, destino: p.role === "treinador" ? "/treinador" : "/aluno" });
  res.cookies.set(DEMO_COOKIE, p.chave, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}
