// “Monte com IA”: entende o pedido (IA quando ligada; senão o leitor simples)
// e devolve as opções A e B montadas pelo gerador com base científica.
// Pedido que fala de dor/lesão/gestação não vira treino: vai para o Montinho.
import { NextResponse } from "next/server";
import { FEATURES, isDemoMode } from "@/lib/env";
import { entenderPedidoComIA } from "@/lib/ia/entender-pedido";
import { opcaoParaTela, opcoesParaVisitante, padraoDoVisitante } from "@/lib/data/plano-visitante";
import { normalizarParametros } from "@/lib/visitante/gerar-treino";
import { lerPedido, MENSAGEM_SAUDE, resumoDoPedido } from "@/lib/visitante/pedido-treino";
import { nomeVisivel, prontosParecidos, prontosVisiveis } from "@/lib/visitante/treinos-prontos";
import { requireVisitanteEmDiaApi } from "@/lib/visitante/guarda-api";
import { entenderPedidoSchema, lerJson } from "@/lib/validacao/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { sessao, error } = await requireVisitanteEmDiaApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, entenderPedidoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });

  const padrao = await padraoDoVisitante(sessao.alunoId);
  const simples = lerPedido(data.texto, padrao);
  if (simples.bloqueio) return NextResponse.json({ bloqueio: "saude", mensagem: MENSAGEM_SAUDE });
  let parametros = simples.parametros;
  let usouIA = false;
  // A IA completa o que o leitor simples não entendeu (frases livres).
  if (FEATURES.iaMemoria && !isDemoMode() && simples.entendeu.length < 3) {
    const ia = await entenderPedidoComIA(data.texto);
    if (ia?.saude) return NextResponse.json({ bloqueio: "saude", mensagem: MENSAGEM_SAUDE });
    if (ia) {
      parametros = { ...padrao, ...ia.parametros, ...Object.fromEntries(simples.entendeu.map((k) => [k, simples.parametros[k]])) };
      usouIA = true;
    }
  }
  const p = normalizarParametros({ ...parametros, ...(data.ajuste ?? {}) });
  const { biblioteca, opcoes } = await opcoesParaVisitante(p);
  const parecidos = prontosParecidos(p, prontosVisiveis(isDemoMode())).map((t) => ({ slug: t.slug, nome: nomeVisivel(t), emoji: t.emoji, chamada: t.chamada }));
  return NextResponse.json({ parametros: p, resumo: resumoDoPedido(p), usouIA, opcoes: opcoes.map((o) => opcaoParaTela(o, biblioteca)), parecidos });
}
