// ============================================================================
// Modo Visitante — convites para falar com o Montinho no WhatsApp (CTAs).
// Puro (sem rede). Todo convite comercial leva ao WhatsApp oficial com um
// código de origem (APP-…) no fim da mensagem, para o Montinho saber de onde
// veio a conversa. Regras anti-chatice:
//  • no máximo 1 convite por tela;
//  • dispensou → some por alguns dias; tocou → some por 14 dias;
//  • já apareceu muitas vezes na semana → descansa;
//  • nunca durante o treino.
// O aviso de acesso vencido é a exceção: aparece sempre (é informação).
// ============================================================================

export type CtaId = "acesso_vencido" | "acesso_vencendo" | "desafio_concluido" | "constancia" | "evolucao" | "montar_treino";
export type Tela = "aviso" | "inicio" | "evolucao" | "meus_treinos" | "jornada";

export type Cta = {
  id: CtaId;
  ref: string;
  telas: Tela[];
  prioridade: number;
  titulo: string;
  texto: string;
  botao: string;
  mensagem: string;
  /** Pode ser dispensado (X)? Por quantos dias some. */
  pausaDias: number | null;
};

export const CTAS: Record<CtaId, Cta> = {
  acesso_vencido: {
    id: "acesso_vencido",
    ref: "APP-FIM",
    telas: ["aviso"],
    prioridade: 100,
    titulo: "Seu acesso terminou",
    texto: "Seus treinos, medalhas e a sua Jornada continuam aqui para você ver. Para voltar a treinar com o app, fale com o Montinho.",
    botao: "Quero continuar",
    mensagem: "Oi, Montinho! Meu acesso ao app terminou e quero continuar treinando.",
    pausaDias: null,
  },
  acesso_vencendo: {
    id: "acesso_vencendo",
    ref: "APP-VENC",
    telas: ["aviso"],
    prioridade: 90,
    titulo: "Seu acesso está terminando",
    texto: "Quer continuar evoluindo depois disso? O Montinho te explica como.",
    botao: "Falar com o Montinho",
    mensagem: "Oi, Montinho! Meu acesso ao app está terminando e quero continuar.",
    pausaDias: 2,
  },
  desafio_concluido: {
    id: "desafio_concluido",
    ref: "APP-DESAFIO",
    telas: ["inicio", "jornada"],
    prioridade: 80,
    titulo: "Desafio concluído!",
    texto: "Você cumpriu o combinado. Quer continuar evoluindo com um treino feito para você e acompanhamento do Montinho?",
    botao: "Quero saber mais",
    mensagem: "Oi, Montinho! Concluí o desafio no app e quero saber como continuar com você.",
    pausaDias: 7,
  },
  constancia: {
    id: "constancia",
    ref: "APP-CONSTANCIA",
    telas: ["inicio"],
    prioridade: 60,
    titulo: "Você está pegando ritmo",
    texto: "Já são vários treinos registrados. Com um plano feito para o seu objetivo, cada treino rende ainda mais.",
    botao: "Conversar com o Montinho",
    mensagem: "Oi, Montinho! Estou treinando com o app e queria um plano feito para mim.",
    pausaDias: 10,
  },
  evolucao: {
    id: "evolucao",
    ref: "APP-EVOLUCAO",
    telas: ["evolucao"],
    prioridade: 50,
    titulo: "Quer entender sua evolução?",
    texto: "O Montinho olha os seus registros com você e mostra o que ajustar para continuar evoluindo.",
    botao: "Falar com o Montinho",
    mensagem: "Oi, Montinho! Estava vendo minha evolução no app e queria sua opinião.",
    pausaDias: 10,
  },
  montar_treino: {
    id: "montar_treino",
    ref: "APP-MONTAR",
    telas: ["meus_treinos"],
    prioridade: 40,
    titulo: "Prefere um treino feito pelo Montinho?",
    texto: "Ele monta os treinos para o seu objetivo, sua rotina e seu tempo, e acompanha a sua evolução.",
    botao: "Quero um treino feito para mim",
    mensagem: "Oi, Montinho! Estou montando meus treinos no app e queria um feito por você.",
    pausaDias: 10,
  },
};

export const IDS_CTA = Object.keys(CTAS) as CtaId[];
export const LIMITES_CTA = { pausaClique: 14, exibicoesSemana: 6 } as const;

export type EventoCta = { cta: string; tipo: "exibido" | "clicado" | "dispensado"; created_at: string };

export type ContextoCta = {
  tela: Tela;
  acesso: "permanente" | "ativo" | "vencendo" | "vencido";
  desafioConcluido: boolean;
  treinosConcluidos: number;
  temTreinoProprio: boolean;
  eventos: EventoCta[];
  agora?: Date;
};

const DIA = 86_400_000;

function elegivel(id: CtaId, c: ContextoCta): boolean {
  switch (id) {
    case "acesso_vencido":
      return c.acesso === "vencido";
    case "acesso_vencendo":
      return c.acesso === "vencendo";
    case "desafio_concluido":
      return c.acesso !== "vencido" && c.desafioConcluido;
    case "constancia":
      return c.acesso !== "vencido" && c.treinosConcluidos >= 6;
    case "evolucao":
      return c.acesso !== "vencido" && c.treinosConcluidos >= 4;
    case "montar_treino":
      return c.acesso !== "vencido" && c.temTreinoProprio;
  }
}

function descansando(cta: Cta, eventos: EventoCta[], agora: number): boolean {
  if (cta.pausaDias === null) return false;
  const doCta = eventos.filter((e) => e.cta === cta.id);
  const ha = (e: EventoCta) => agora - Date.parse(e.created_at);
  if (doCta.some((e) => e.tipo === "dispensado" && ha(e) < cta.pausaDias! * DIA)) return true;
  if (doCta.some((e) => e.tipo === "clicado" && ha(e) < LIMITES_CTA.pausaClique * DIA)) return true;
  return doCta.filter((e) => e.tipo === "exibido" && ha(e) < 7 * DIA).length >= LIMITES_CTA.exibicoesSemana;
}

/** O convite desta tela (no máximo um), ou nenhum. */
export function escolherCta(c: ContextoCta): Cta | null {
  const agora = (c.agora ?? new Date()).getTime();
  return (
    IDS_CTA.map((id) => CTAS[id])
      .filter((cta) => cta.telas.includes(c.tela) && elegivel(cta.id, c) && !descansando(cta, c.eventos, agora))
      .sort((a, b) => b.prioridade - a.prioridade)[0] ?? null
  );
}

/** Link do WhatsApp oficial com o código de origem no fim da mensagem. */
export function linkCta(cta: Cta, whatsapp: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(`${cta.mensagem} [${cta.ref}]`)}`;
}
