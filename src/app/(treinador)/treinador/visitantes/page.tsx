export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { ofertaDoConvite } from "@/lib/visitante/mensagem-convite";
import { notFound } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireTreinadorPage } from "@/lib/auth/session";
import { listarConvites, listarDesafios, listarVisitantes } from "@/lib/data/visitantes";
import { DesafiosClient } from "./DesafiosClient";
import { dataLocal } from "@/lib/aderencia/calcular";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { dataBR, descreverPrazo, estadoDoAcesso, gerarCodigo } from "@/lib/visitante/acesso";
import { ConvitesClient } from "./ConvitesClient";
import { VisitantesPainel, type Pendencia, type PessoaVisitante } from "./VisitantesPainel";
import { tempoRelativo } from "@/lib/format";
import { mensagemBoasVindas } from "@/lib/visitante/boas-vindas-whatsapp";
import { indicacoesPorVisitante } from "@/lib/data/campanhas";
import { treinosParaMontar } from "@/lib/data/treinos-enviados";
import { TreinosParaMontar } from "./TreinosParaMontar";
import { usoDosTreinosProntos } from "@/lib/data/uso-prontos";
import { UsoTreinosProntos } from "./UsoTreinosProntos";
import { descontosAAplicar } from "@/lib/data/indicacao";
import { DescontosIndicacao } from "./DescontosIndicacao";

export const metadata = { title: "Visitantes" };

const OBJETIVO: Record<string, string> = { hipertrofia: "Massa muscular", emagrecimento: "Emagrecer", condicionamento: "Condicionamento", forca: "Força", saude: "Saúde", outro: "Outro" };

export default async function VisitantesPage() {
  if (!FEATURES.modoVisitante) notFound();
  await requireTreinadorPage();
  const [convites, visitantes, desafios, indicacoes, paraMontar, usoProntos] = await Promise.all([listarConvites(), listarVisitantes(), listarDesafios(), indicacoesPorVisitante().catch(() => new Map()), treinosParaMontar().catch(() => []), usoDosTreinosProntos().catch(() => [])]);
  const descontos = await descontosAAplicar().catch(() => []);
  const nomeVisitante = new Map(visitantes.map((v) => [v.id, (v.profile?.nome ?? "").split(" ")[0]]));
  const nomeDesafio = new Map(desafios.map((d) => [d.id, d.nome]));
  const curta = (d: string | null) => (d ? d.split("-").reverse().join("/") : null);
  const hoje = dataLocal(new Date());
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "app-montinho.vercel.app";
  const base = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;

  const pessoas: PessoaVisitante[] = visitantes.map((v) => {
    const e = estadoDoAcesso(v.acesso?.fim ?? null);
    const ind = indicacoes.get(v.id);
    const prazo = e.estado === "permanente" ? "Sem prazo" : e.estado === "vencido" ? `Terminou em ${dataBR(e.fim)}` : `Até ${dataBR(e.fim)} (${e.diasRestantes} ${e.diasRestantes === 1 ? "dia" : "dias"})`;
    return {
      id: v.id,
      nome: v.profile?.nome ?? "Sem nome",
      estado: e.estado,
      prazo,
      diasRestantes: e.estado === "ativo" || e.estado === "vencendo" ? e.diasRestantes : null,
      detalhes: [v.convite_codigo ? `Convite ${v.convite_codigo}` : null, v.perfil?.objetivo ? (OBJETIVO[v.perfil.objetivo] ?? v.perfil.objetivo) : null, v.perfil?.frequencia_semanal ? `${v.perfil.frequencia_semanal}×/semana` : null, v.perfil?.interesse_desafios ? "quer ser avisado de desafios" : null].filter((x): x is string => !!x),
      indicacao: ind?.amigos || ind?.convidadoPor ? [ind?.amigos ? `🤝 Convidou ${ind.amigos} ${ind.amigos === 1 ? "amigo" : "amigos"} · ganhou +${ind.diasGanhos} dias` : null, ind?.convidadoPor ? `Entrou pelo convite de ${nomeVisitante.get(ind.convidadoPor) || "outro visitante"}` : null].filter(Boolean).join(" · ") : null,
      questionarioPendente: !v.perfil?.onboarding_concluido_em,
      semWhatsapp: !v.telefone?.trim(),
      ultimoTreino: tempoRelativo(v.ultimo_treino_em),
      telefone: v.telefone ?? null,
      mensagem: mensagemBoasVindas({ nome: v.profile?.nome ?? null, objetivo: v.perfil?.objetivo ?? null, frequenciaSemanal: v.perfil?.frequencia_semanal ?? null, acessoAte: e.estado === "permanente" || e.estado === "vencido" ? null : dataBR(e.fim), appUrl: base }),
    };
  });
  const numeros = { emDia: pessoas.filter((p) => p.estado === "ativo" || p.estado === "permanente").length, terminando: pessoas.filter((p) => p.estado === "vencendo").length, vencidos: pessoas.filter((p) => p.estado === "vencido").length };
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const pendencias = ([
    paraMontar.length ? { chave: "montar", emoji: "📨", texto: `${plural(paraMontar.length, "treino enviado para montar", "treinos enviados para montar")}`, destaque: true } : null,
    descontos.length ? { chave: "descontos", emoji: "🎁", texto: `${plural(descontos.length, "desconto de indicação", "descontos de indicação")} para aplicar`, destaque: true } : null,
    numeros.terminando ? { chave: "terminando", emoji: "⏳", texto: `${plural(numeros.terminando, "acesso terminando", "acessos terminando")}: hora de oferecer a consultoria`, aba: "pessoas" as const, filtro: "terminando" as const } : null,
    pessoas.some((p) => p.semWhatsapp) ? { chave: "whats", emoji: "📱", texto: `${plural(pessoas.filter((p) => p.semWhatsapp).length, "pessoa", "pessoas")} sem WhatsApp`, aba: "pessoas" as const, filtro: "pendentes" as const } : null,
    pessoas.some((p) => p.questionarioPendente) ? { chave: "quest", emoji: "📝", texto: `${plural(pessoas.filter((p) => p.questionarioPendente).length, "questionário pendente", "questionários pendentes")}`, aba: "pessoas" as const, filtro: "pendentes" as const } : null,
  ] as Array<Pendencia | null>).filter((x): x is Pendencia => !!x);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Visitantes</h1>
        <p className="mt-1 text-sm text-fg-muted">Quem entrou por convite: {visitantes.length} no total. Toque numa pessoa para mandar mensagem, dar mais dias ou passar para aluno.</p>
      </header>
      <VisitantesPainel
        pessoas={pessoas}
        pendencias={pendencias}
        numeros={numeros}
        urgentes={
          paraMontar.length || descontos.length ? (
            <div className="space-y-4">
              {paraMontar.length ? (
                <Card id="treinos-para-montar" className="border-accent/50">
                  <CardHeader><CardTitle className="text-base">📨 Treinos para montar <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs text-bg">{paraMontar.length}</span></CardTitle></CardHeader>
                  <CardBody><TreinosParaMontar itens={paraMontar} /></CardBody>
                </Card>
              ) : null}
              {descontos.length ? (
                <Card id="descontos-indicacao" className="border-success/50">
                  <CardHeader><CardTitle className="text-base">🎁 Descontos de indicação a aplicar <span className="ml-1 rounded-full bg-success px-2 py-0.5 text-xs text-bg">{descontos.length}</span></CardTitle></CardHeader>
                  <CardBody>
                    <DescontosIndicacao itens={descontos} />
                    <p className="mt-2 text-[11px] text-fg-subtle">Cada amigo indicado que fecha vale 10% para quem indicou (aluno ou visitante), somando até 30% no mesmo plano, sem prazo. Ao marcar “usado”, saem os mais antigos; o que passou de 30% fica para a próxima.</p>
                  </CardBody>
                </Card>
              ) : null}
            </div>
          ) : null
        }
        convites={
          <ConvitesClient
            sugestao={gerarCodigo("DESAFIO")}
            base={base}
            desafios={desafios.filter((d) => d.ativa && d.meta_treinos).map((d) => ({ id: d.id, nome: d.nome }))}
            convites={convites.map((c) => ({ id: c.id, codigo: c.codigo, prazo: descreverPrazo(c), oferta: ofertaDoConvite(c), usos: c.usos, max_usos: c.max_usos, ativo: c.ativo, valido_ate: c.valido_ate ? dataBR(c.valido_ate) : null, origem: c.origem, desafio: c.campanha_id ? (nomeDesafio.get(c.campanha_id) ?? null) : null }))}
          />
        }
        desafios={<DesafiosClient hoje={hoje} desafios={desafios.map((d) => ({ id: d.id, nome: d.nome, periodo: d.inicio && d.fim ? `${curta(d.inicio)} a ${curta(d.fim)}` : "Sem período", meta: d.meta_treinos, participantes: d.participantes, concluidos: d.concluidos }))} />}
        prontos={<UsoTreinosProntos uso={usoProntos} demo={isDemoMode()} />}
      />
    </div>
  );
}
