import { BRAND } from "@/config/brand";
import { FEATURES } from "@/lib/env";
import { eventosCta } from "@/lib/data/ctas";
import { dataBR, estadoDoAcesso } from "@/lib/visitante/acesso";
import { escolherCta, linkCta } from "@/lib/visitante/ctas";
import { CtaCard } from "./CtaCard";

/** Faixa do visitante quando o acesso está perto de acabar ou já acabou (com o convite para o WhatsApp). */
export async function AvisoAcessoVisitante({ alunoId, fim }: { alunoId: string; fim: string | null }) {
  if (!FEATURES.modoVisitante || !BRAND.contact.whatsapp) return null;
  const e = estadoDoAcesso(fim);
  if (e.estado === "permanente" || e.estado === "ativo") return null;
  const cta = escolherCta({ tela: "aviso", acesso: e.estado, desafioConcluido: false, treinosConcluidos: 0, temTreinoProprio: false, eventos: await eventosCta(alunoId).catch(() => []) });
  if (!cta) return null;
  const titulo = e.estado === "vencido" ? `Seu acesso terminou em ${dataBR(e.fim)}` : `Seu acesso termina em ${e.diasRestantes} ${e.diasRestantes === 1 ? "dia" : "dias"} (${dataBR(e.fim)})`;
  return (
    <div className="mb-4">
      <CtaCard id={cta.id} tela="aviso" refCodigo={cta.ref} titulo={titulo} texto={cta.texto} botao={cta.botao} href={linkCta(cta, BRAND.contact)} dispensavel={cta.pausaDias !== null} destaque={e.estado === "vencido"} />
    </div>
  );
}
