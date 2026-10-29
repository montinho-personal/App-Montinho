// Aluno registra um cardio (prescrito ou livre). Idempotente pelo client_key;
// o planejado vem da prescrição no servidor. Devolve os troféus novos.
import { NextResponse, after } from "next/server";
import { agendarLembreteTrofeu } from "@/lib/data/lembrete-trofeu";
import { requireAlunoApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { cardioDoAluno, registrarCardio } from "@/lib/data/cardio";
import { CODIGOS_CARDIO, pendentesHoje } from "@/lib/cardio/regras";
import { dataLocal } from "@/lib/aderencia/calcular";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { lerJson, registroCardioSchema } from "@/lib/validacao/schemas";
import { paraComemorar } from "@/lib/conquistas/comemorar";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, registroCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    // Desde um pouco antes do pedido: pega também o troféu que outra tela (ex.: Strava) gravou agora.
    const t0 = new Date(Date.now() - 10 * 60_000).toISOString();
    const registro = await registrarCardio(sessao.alunoId, data, "app");
    const aluno = await getAluno(sessao.alunoId);
    const sync = aluno ? await sincronizarConquistas(aluno).catch(() => null) : null;
    // Comemora aqui todos os troféus do cardio que saíram agora e ainda não foram vistos
    // (vários de uma vez entram na fila; os demais têm o seu próprio momento).
    const novas = sync ? paraComemorar(sync.todas, t0, (c) => (CODIGOS_CARDIO as string[]).includes(c) || c === "dois_folegos" || c === "combo_completo" || c.startsWith("combo_")) : [];
    // Depois de responder: lembrete do próximo troféu que está perto (0104).
    if (aluno) after(() => agendarLembreteTrofeu(aluno).catch(() => undefined));
    return NextResponse.json({ registro, novas }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível registrar" }, { status: 400 });
  }
}

/** Cardio prescrito que ainda falta hoje (para o fim da musculação e o Início). */
export async function GET() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const c = await cardioDoAluno(sessao.alunoId).catch(() => null);
  if (!c) return NextResponse.json({ pendentes: [], jaFezHoje: false });
  const hoje = dataLocal(new Date());
  const pendentes = pendentesHoje(c.prescricoes, c.feitos, hoje);
  return NextResponse.json({ pendentes, jaFezHoje: c.feitos.some((f) => f.data === hoje && f.status !== "nao_realizado") });
}
