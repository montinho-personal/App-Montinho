// Central de notificações do aluno (🔔 da barra de cima). Junta, pelo login do
// próprio aluno (RLS), o que o app já tem: recados e celebrações do personal,
// convites e cutucadas de desafio, cutucadas do Ranking, troféus e conquistas
// da Tribo, revisão do “Mito ou verdade?”, avisos que foram ao celular e o
// feriado que vale troféu. Cada fonte falha sozinha sem derrubar as outras.
// Regras de ordem e de “novo” em src/lib/notificacoes/central.ts.
import { listIntervencoes } from "@/lib/data/acompanhamento";
import { listarConquistas, listarReconhecimentos } from "@/lib/data/conquistas";
import { listarMeusDesafios, minhasCutucadas } from "@/lib/data/desafios";
import { minhasCutucadasRanking } from "@/lib/data/ranking";
import { conquistasTribo } from "@/lib/data/tribo";
import { progressoDoAluno } from "@/lib/data/desbloqueia";
import { getDb } from "@/lib/supabase/rls";
import { listarAvaliacoes } from "@/lib/data/medidas";
import { getAluno } from "@/lib/db";
import { evolucaoDaAvaliacao } from "@/lib/medidas/evolucao-avaliacao";
import { FEATURES, isDemoMode } from "@/lib/env";
import { nomeDaConquista } from "@/lib/conquistas/conteudo";
import { nomeDaConquistaTribo } from "@/lib/tribo/regras";
import { resumoRevisao, type ProgressoRevisao } from "@/lib/desbloqueia/revisao";
import { proximoFeriado } from "@/lib/conquistas/feriados";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { curto, DIAS_NA_CENTRAL, montarCentral, type ItemCentral } from "@/lib/notificacoes/central";

const seguro = async <T>(p: Promise<T>, padrao: T): Promise<T> => p.catch(() => padrao);

/** Avisos que chegaram ao celular (só os enviados, com texto). */
async function avisosEnviados(userId: string, desde: string): Promise<Array<{ id: string; titulo: string; corpo: string; url: string | null; enviada_em: string }>> {
  if (isDemoMode()) return [];
  const db = await getDb();
  const { data } = await db
    .from("notificacoes_envios")
    .select("id, titulo, corpo, url, enviada_em")
    .eq("profile_id", userId)
    .eq("status", "enviada")
    .gte("enviada_em", desde)
    .order("enviada_em", { ascending: false })
    .limit(20);
  return ((data ?? []) as Array<{ id: string; titulo: string | null; corpo: string | null; url: string | null; enviada_em: string }>).filter((x) => x.titulo && x.corpo) as never;
}

export async function centralDoAluno(s: { alunoId: string; userId: string }): Promise<ItemCentral[]> {
  const agora = new Date();
  const agoraIso = agora.toISOString();
  const desde = new Date(agora.getTime() - DIAS_NA_CENTRAL * 86_400_000).toISOString();
  const hoje = dataLocal(agora);

  const [recados, celebracoes, desafios, cutucadas, cutucadasRanking, trofeus, tribo, progresso, avisos] = await Promise.all([
    seguro(listIntervencoes(s.alunoId, 15), []),
    seguro(listarReconhecimentos(s.alunoId, 10), []),
    seguro(listarMeusDesafios(s.alunoId), []),
    seguro(minhasCutucadas(s.alunoId), []),
    seguro(minhasCutucadasRanking(s.alunoId), []),
    seguro(listarConquistas(s.alunoId, { desde, limite: 20 }), []),
    seguro(conquistasTribo(s.alunoId), []),
    seguro(progressoDoAluno(s.alunoId), []),
    seguro(avisosEnviados(s.userId, desde), []),
  ]);

  const itens: ItemCentral[] = [];

  // Pede ação: convite de desafio esperando resposta.
  for (const d of desafios) {
    if (d.meuStatus !== "convidado" || d.situacao === "encerrado") continue;
    itens.push({ id: `convite:${d.id}`, tipo: "acao", emoji: "⚔️", titulo: `Convite para o desafio “${d.nome}”`, texto: "Toque para aceitar ou recusar.", href: `/aluno/desafios/${d.id}`, quando: `${d.inicio}T12:00:00Z` });
  }
  // Pede ação: perguntas do “Mito ou verdade?” na hora de revisar (volta 1× por dia).
  const rev = resumoRevisao(progresso as ProgressoRevisao[], agoraIso);
  if (rev.agora > 0 && rev.primeira) {
    itens.push({ id: `revisao:${hoje}`, tipo: "acao", emoji: "🔁", titulo: rev.agora === 1 ? "1 pergunta do Mito ou verdade para revisar" : `${rev.agora} perguntas do Mito ou verdade para revisar`, texto: "Acertar agora fixa de vez o que você aprendeu.", href: `/aluno/descobertas/${rev.primeira}`, quando: agoraIso });
  }

  // Recados e celebrações do personal.
  for (const r of recados) {
    if (!r.visivel_aluno) continue;
    const aoVivo = r.referencia?.ao_vivo === true;
    itens.push({ id: `recado:${r.id}`, tipo: "recado", emoji: aoVivo ? "👀" : "💬", titulo: aoVivo ? "Recado do Montinho no seu treino" : r.titulo?.trim() || "Recado do Montinho", texto: curto(r.descricao), href: "/aluno/perfil", quando: r.created_at });
  }
  for (const c of celebracoes) {
    itens.push({ id: `celebrou:${c.id}`, tipo: "recado", emoji: "🎉", titulo: "O Montinho celebrou com você", texto: curto(c.mensagem), href: "/aluno/conquistas", quando: c.created_at });
  }

  // Social: cutucadas.
  for (const c of cutucadas) {
    itens.push({ id: `cutucada:${c.id}`, tipo: "social", emoji: c.emoji || "🔥", titulo: `${c.de} te cutucou no desafio “${c.desafio}”`, texto: "Bora responder no placar?", href: `/aluno/desafios/${c.desafioId}`, quando: c.em });
  }
  for (const c of cutucadasRanking) {
    itens.push({ id: `cutucada-ranking:${c.id}`, tipo: "social", emoji: c.emoji || "🔥", titulo: `${c.de} te cutucou no Ranking`, texto: "Devolva a cutucada ou desafie de volta.", href: "/aluno/ranking", quando: c.created_at });
  }

  // Troféus e conquistas da Tribo.
  // Recordes do mesmo dia viram um item só (“3 recordes novos”).
  const recordesPorDia = new Map<string, typeof trofeus>();
  for (const t of trofeus) {
    if (t.codigo === "relatorio_mensal") continue;
    if (t.codigo === "recorde") {
      const dia = dataLocal(t.conquistado_em);
      recordesPorDia.set(dia, [...(recordesPorDia.get(dia) ?? []), t]);
      continue;
    }
    itens.push({ id: `trofeu:${t.id}`, tipo: "trofeu", emoji: "🏆", titulo: `Troféu novo: ${nomeDaConquista(t.codigo, t.titulo)}`, texto: "Abra para ver e compartilhar.", href: "/aluno/conquistas", quando: t.conquistado_em });
  }
  for (const [dia, lista] of recordesPorDia) {
    const n = lista.length;
    itens.push({ id: `recordes:${dia}:${n}`, tipo: "trofeu", emoji: "📈", titulo: n === 1 ? "Novo recorde pessoal!" : `${n} recordes pessoais no mesmo dia!`, texto: "Veja em Evolução quanto você subiu.", href: "/aluno/evolucao", quando: lista[0].conquistado_em });
  }
  for (const t of tribo.filter((x) => x.conquistado_em >= desde).slice(0, 5)) {
    itens.push({ id: `tribo:${t.id}`, tipo: "trofeu", emoji: "🤝", titulo: `Conquista da Tribo: ${nomeDaConquistaTribo(t)}`, texto: "Você ajudou a tribo a chegar lá.", href: "/aluno/conquistas/tribo", quando: t.conquistado_em });
  }

  // O que foi ao celular (fica guardado aqui, para quem não viu na hora).
  for (const a of avisos) {
    // Lançamento/inauguração da obra já entram abaixo, guardados (sem repetir).
    if (a.url?.startsWith("/aluno/academia")) continue;
    const href = a.url && a.url.startsWith("/aluno") ? a.url : "/aluno";
    itens.push({ id: `push:${a.id}`, tipo: "lembrete", emoji: "🔔", titulo: curto(a.titulo, 80), texto: curto(a.corpo), href, quando: a.enviada_em });
  }

  // Evolução na avaliação física de 7 dobras (pedido do Montinho, 04/11/2026): parabéns + compartilhar.
  const ev = await seguro(
    (async () => {
      const [{ medidas }, aluno] = await Promise.all([listarAvaliacoes(s.alunoId), getAluno(s.alunoId)]);
      const e = evolucaoDaAvaliacao(medidas, aluno?.objetivo ?? null);
      const reg = e?.evoluiu ? medidas.find((m) => m.id === e.id) : null;
      return e && reg && reg.created_at >= desde ? { e, quando: reg.created_at } : null;
    })(),
    null,
  );
  if (ev) itens.push({ id: `avaliacao:${ev.e.id}`, tipo: "trofeu", emoji: "🎉", titulo: `Você evoluiu na avaliação física! ${ev.e.manchete}`, texto: "Toque para ver o que melhorou e compartilhar.", href: "/aluno/medidas", quando: ev.quando });

  // Academia da Tribo (0146): lançamento e inauguração ficam guardados aqui para quem estava sem internet.
  const obras = await seguro(import("@/lib/data/academia").then((m) => m.listarObras()), []);
  for (const o of obras) {
    if (o.estado !== "rascunho" && o.ativada_em && o.ativada_em >= desde)
      itens.push({ id: `obra:${o.id}:lancamento`, tipo: "aviso", emoji: "🏗️", titulo: "A tribo vai construir uma academia!", texto: `A obra da ${o.nome} começou do zero. Cada tonelada na musculação ajuda a construir.`, href: "/aluno/academia", quando: o.ativada_em });
    if (o.estado === "concluida" && o.concluida_em && o.concluida_em >= desde)
      itens.push({ id: `obra:${o.id}:inauguracao`, tipo: "trofeu", emoji: "🎉", titulo: `Inauguramos a ${o.nome}!`, texto: "Venha conhecer a obra que a tribo construiu junta.", href: `/aluno/academia/${o.id}`, quando: o.concluida_em });
  }

  // Feriado que vale troféu (desde 3 dias antes até o dia).
  const fer = proximoFeriado(hoje);
  if (fer && fer.dia <= somarDias(hoje, 3)) {
    const ehHoje = fer.dia === hoje;
    itens.push({ id: `feriado:${fer.dia}`, tipo: "aviso", emoji: fer.feriado.emoji, titulo: ehHoje ? `Hoje é ${fer.feriado.nome}: treino vale troféu especial` : `${fer.feriado.nome} em ${fer.dia.slice(8, 10)}/${fer.dia.slice(5, 7)}: treino vale troféu especial`, texto: "Treine no dia e ganhe o troféu com o nome do feriado.", href: "/aluno/treinar", quando: ehHoje ? agoraIso : `${somarDias(fer.dia, -3)}T11:00:00Z` });
  }

  // Multimodalidade: o WOD do dia publicado e ainda não feito (pede ação).
  if (FEATURES.multimodalidade) {
    const wod = await seguro(import("@/lib/data/wod-dia").then(async (m) => {
      const w = await m.wodDoDia(hoje);
      if (!w) return null;
      // Só para quem quer (ou ainda não disse o que gosta de treinar).
      const { modalidadesDoAluno } = await import("@/lib/data/modalidades-interesse");
      const { querAvisoDoWod } = await import("@/lib/modalidades/interesse");
      if (!querAvisoDoWod(await modalidadesDoAluno(s.alunoId))) return null;
      const minha = await m.minhaSessaoDoWod(s.alunoId, w.id);
      return minha ? null : w;
    }), null);
    if (wod) itens.push({ id: `wod:${wod.id}`, tipo: "acao", emoji: "🔥", titulo: `WOD do dia no ar: ${curto(wod.titulo, 60)}`, texto: "Faça hoje e veja onde você fica no ranking do dia.", href: "/aluno/wod", quando: wod.updated_at });
  }

  return montarCentral(itens, agoraIso);
}
