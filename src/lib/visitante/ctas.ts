// ============================================================================
// Modo Visitante — convites para falar com o Montinho (CTAs).
// Puro (sem rede). Todo convite comercial leva ao WhatsApp oficial com um
// código de origem (APP-…) no fim da mensagem, para o Montinho saber de onde
// veio a conversa; o do Instagram leva ao perfil. O acesso dura cerca de 30
// dias, então o ritmo é curto (pedido do Montinho, 22/10/2026):
//  • no máximo 1 convite por tela;
//  • um dia sim, um dia não: dia com convite, dia sem;
//  • dispensou ou tocou → some por 2 dias (o Instagram, tocado, não volta);
//  • nunca durante o treino.
// Os avisos de acesso ficam fora do rodízio; o vencido aparece sempre (é informação).
// ============================================================================

export type CtaId = "acesso_vencido" | "acesso_vencendo" | "desafio_concluido" | "constancia" | "evolucao" | "montar_treino" | "instagram";
export type Tela = "aviso" | "inicio" | "evolucao" | "meus_treinos" | "jornada";

export type Cta = {
  id: CtaId;
  canal: "whatsapp" | "instagram";
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
    canal: "whatsapp",
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
    canal: "whatsapp",
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
    canal: "whatsapp",
    ref: "APP-DESAFIO",
    telas: ["inicio", "jornada"],
    prioridade: 80,
    titulo: "Desafio concluído!",
    texto: "Você cumpriu o combinado. Quer continuar evoluindo com um treino feito para você e acompanhamento do Montinho?",
    botao: "Quero saber mais",
    mensagem: "Oi, Montinho! Concluí o desafio no app e quero saber como continuar com você.",
    pausaDias: 2,
  },
  constancia: {
    id: "constancia",
    canal: "whatsapp",
    ref: "APP-CONSTANCIA",
    telas: ["inicio"],
    prioridade: 60,
    titulo: "Você está pegando ritmo",
    texto: "Já são vários treinos registrados. Com um plano feito para o seu objetivo, cada treino rende ainda mais.",
    botao: "Conversar com o Montinho",
    mensagem: "Oi, Montinho! Estou treinando com o app e queria um plano feito para mim.",
    pausaDias: 2,
  },
  evolucao: {
    id: "evolucao",
    canal: "whatsapp",
    ref: "APP-EVOLUCAO",
    telas: ["evolucao"],
    prioridade: 50,
    titulo: "Quer entender sua evolução?",
    texto: "O Montinho olha os seus registros com você e mostra o que ajustar para continuar evoluindo.",
    botao: "Falar com o Montinho",
    mensagem: "Oi, Montinho! Estava vendo minha evolução no app e queria sua opinião.",
    pausaDias: 2,
  },
  montar_treino: {
    id: "montar_treino",
    canal: "whatsapp",
    ref: "APP-MONTAR",
    telas: ["meus_treinos"],
    prioridade: 40,
    titulo: "Prefere um treino feito pelo Montinho?",
    texto: "Ele monta os treinos para o seu objetivo, sua rotina e seu tempo, e acompanha a sua evolução.",
    botao: "Quero um treino feito para mim",
    mensagem: "Oi, Montinho! Estou montando meus treinos no app e queria um feito por você.",
    pausaDias: 2,
  },
  instagram: {
    id: "instagram",
    canal: "instagram",
    ref: "APP-IG",
    telas: ["inicio"],
    prioridade: 10,
    titulo: "Primeiro treino feito ✓",
    texto: "No Instagram o Montinho mostra execução, ajustes e o dia a dia com os alunos. Dá para aprender um pouco a cada post.",
    botao: "Seguir @montinho_personal",
    mensagem: "",
    pausaDias: 2,
  },
};

export const IDS_CTA = Object.keys(CTAS) as CtaId[];
export const LIMITES_CTA = { pausaClique: 2 } as const;

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
    case "instagram":
      return c.acesso !== "vencido" && c.treinosConcluidos >= 1 && !c.eventos.some((e) => e.cta === "instagram" && e.tipo === "clicado");
  }
}

function descansando(cta: Cta, eventos: EventoCta[], agora: number): boolean {
  if (cta.pausaDias === null) return false;
  const doCta = eventos.filter((e) => e.cta === cta.id);
  const ha = (e: EventoCta) => agora - Date.parse(e.created_at);
  if (doCta.some((e) => e.tipo === "dispensado" && ha(e) < cta.pausaDias! * DIA)) return true;
  return doCta.some((e) => e.tipo === "clicado" && ha(e) < LIMITES_CTA.pausaClique * DIA);
}

const diaSP = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const noRodizio = (cta: Cta | undefined) => !!cta && !cta.telas.includes("aviso");

/** Um dia sim, um dia não: se ontem teve convite e hoje ainda não, hoje é dia de folga. */
export function diaDeFolga(eventos: EventoCta[], agora: number): boolean {
  const dias = new Set(eventos.filter((e) => e.tipo === "exibido" && noRodizio(CTAS[e.cta as CtaId])).map((e) => diaSP(Date.parse(e.created_at))));
  return !dias.has(diaSP(agora)) && dias.has(diaSP(agora - DIA));
}

/** O convite desta tela (no máximo um), ou nenhum. */
export function escolherCta(c: ContextoCta): Cta | null {
  const agora = (c.agora ?? new Date()).getTime();
  const folga = diaDeFolga(c.eventos, agora);
  return (
    IDS_CTA.map((id) => CTAS[id])
      .filter((cta) => cta.telas.includes(c.tela) && !(folga && noRodizio(cta)) && elegivel(cta.id, c) && !descansando(cta, c.eventos, agora))
      .sort((a, b) => b.prioridade - a.prioridade)[0] ?? null
  );
}

/** Link do WhatsApp oficial com o código de origem no fim da mensagem (ou o perfil do Instagram). */
export function linkCta(cta: Cta, contato: { whatsapp: string; instagram?: string | null }): string {
  if (cta.canal === "instagram") return `https://instagram.com/${contato.instagram}`;
  return `https://wa.me/${contato.whatsapp}?text=${encodeURIComponent(`${cta.mensagem} [${cta.ref}]`)}`;
}
