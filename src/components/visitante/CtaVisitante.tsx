import { BRAND } from "@/config/brand";
import { FEATURES } from "@/lib/env";
import { eventosCta } from "@/lib/data/ctas";
import { listSessoes } from "@/lib/data/sessoes";
import { listarConquistas } from "@/lib/data/conquistas";
import { getPlanoAtivo } from "@/lib/data/programas";
import { classificarSessao } from "@/lib/aderencia/calcular";
import { escolherCta, linkCta, type Tela } from "@/lib/visitante/ctas";
import { estadoDoAcesso } from "@/lib/visitante/acesso";
import { CtaCard } from "./CtaCard";

/** Convite (no máximo um) desta tela para o visitante falar com o Montinho no WhatsApp. */
export async function CtaVisitante({ alunoId, tela, acessoFim }: { alunoId: string; tela: Tela; acessoFim: string | null }) {
  if (!FEATURES.modoVisitante || !BRAND.contact.whatsapp) return null;
  const acesso = estadoDoAcesso(acessoFim).estado;
  const precisaDados = tela !== "aviso";
  const [eventos, sessoes, conquistas, plano] = await Promise.all([
    eventosCta(alunoId).catch(() => []),
    precisaDados ? listSessoes(alunoId, { limite: 200 }).catch(() => []) : Promise.resolve([]),
    precisaDados ? listarConquistas(alunoId).catch(() => []) : Promise.resolve([]),
    tela === "meus_treinos" ? getPlanoAtivo(alunoId).catch(() => null) : Promise.resolve(null),
  ]);
  const cta = escolherCta({
    tela,
    acesso,
    desafioConcluido: conquistas.some((c) => c.codigo === "desafio_concluido"),
    treinosConcluidos: sessoes.filter((s) => classificarSessao(s) === "concluida").length,
    temTreinoProprio: Boolean(plano?.treinos.some((t) => t.ativo && t.autoria === "proprio")),
    eventos,
  });
  if (!cta || (cta.canal === "instagram" && !BRAND.contact.instagram)) return null;
  return (
    <CtaCard
      id={cta.id}
      tela={tela}
      refCodigo={cta.ref}
      titulo={cta.titulo}
      texto={cta.texto}
      botao={cta.botao}
      href={linkCta(cta, BRAND.contact)}
      canal={cta.canal}
      dispensavel={cta.pausaDias !== null}
      destaque={cta.id === "acesso_vencido" || cta.id === "desafio_concluido"}
    />
  );
}
