// Depois dos 30 dias do visitante: o convite que aparece ao tocar em “Começar”,
// ao abrir o app e na tela de app fechado. Puro (a oferta vem de campanhas.ts).
import { CTAS, linkCta } from "./ctas";
import { dataBR, estadoDoAcesso, fechamentoDoApp } from "./acesso";
import { linkOferta, type Oferta } from "./campanhas";

export type ConviteFim = { ctaId: string; ref: string; titulo: string; texto: string; botao: string; href: string; expiraEm: string | null; abertoAte: string | null };

/** null = acesso em dia (nada travado). Com oferta (20%/conversa/feedback), ela vem na frente. */
export function conviteDoFim(p: { fim: string | null; oferta: Oferta | null; whatsapp: string; agora?: Date }): ConviteFim | null {
  if (estadoDoAcesso(p.fim, p.agora).estado !== "vencido") return null;
  const fecha = fechamentoDoApp(p.fim);
  const abertoAte = fecha ? dataBR(fecha) : null;
  if (p.oferta) {
    const o = p.oferta;
    return { ctaId: o.id, ref: o.ref, titulo: o.titulo, texto: o.texto, botao: o.botao, href: linkOferta(o, p.whatsapp), expiraEm: o.expiraEm, abertoAte };
  }
  const c = CTAS.acesso_vencido;
  return {
    ctaId: c.id,
    ref: c.ref,
    titulo: "Bora continuar evoluindo com o Montinho?",
    texto: "Com um plano do Montinho, você treina com a ficha feita para você, ajustes toda semana e acompanhamento de perto. Chame no WhatsApp e veja o plano ideal para você.",
    botao: "Quero continuar com o Montinho",
    href: linkCta(c, { whatsapp: p.whatsapp }),
    expiraEm: null,
    abertoAte,
  };
}
