// Aviso no celular quando a avaliação de 7 dobras lançada pelo personal mostra
// evolução (pedido do Montinho, 04/11/2026). Regra pura em
// src/lib/medidas/evolucao-avaliacao.ts; o parabéns também fica no 🔔 e na
// tela de medidas (com o botão de compartilhar), mesmo sem o aviso no celular.
import { getAluno } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { listarAvaliacoes } from "@/lib/data/medidas";
import { inscricoesPushDoAluno } from "@/lib/data/conquistas";
import { configurarVapid, enviarAosAparelhos } from "@/lib/push/enviar";
import { evolucaoDaAvaliacao } from "@/lib/medidas/evolucao-avaliacao";

export async function avisarEvolucaoAvaliacao(alunoId: string, registroId: string): Promise<number> {
  if (isDemoMode() || !configurarVapid()) return 0;
  const [{ medidas }, aluno] = await Promise.all([listarAvaliacoes(alunoId), getAluno(alunoId)]);
  const e = evolucaoDaAvaliacao(medidas, aluno?.objetivo ?? null, registroId);
  if (!e?.evoluiu) return 0;
  const aparelhos = await inscricoesPushDoAluno(alunoId).catch(() => []);
  const res = await enviarAosAparelhos(aparelhos, { titulo: "🎉 Você evoluiu na avaliação física!", corpo: `${e.manchete} Toque para ver e compartilhar.`, url: "/aluno/medidas", tag: `avaliacao-${e.id}` }, { ttl: 3 * 86_400 });
  return res.ok;
}
