export const dynamic = "force-dynamic";

import { AjusteTecladoIphone } from "@/components/layout/AjusteTecladoIphone";
import Link from "next/link";
import { BrandLockup, FioMarca } from "@/components/brand/BrandLockup";
import { Icon } from "@/components/ui/Icon";
import { BRAND } from "@/config/brand";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { requireAlunoPage } from "@/lib/auth/session";
import { avatarDoUsuario } from "@/lib/data/perfil";
import { AvisoAcessoVisitante } from "@/components/visitante/AvisoAcessoVisitante";
import { RegistrarAcesso } from "@/components/aluno/RegistrarAcesso";
import { PedirNotificacoes } from "@/components/aluno/PedirNotificacoes";
import { SinoNotificacoes } from "@/components/aluno/SinoNotificacoes";
import { proximoFeriado } from "@/lib/conquistas/feriados";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { ConviteFimCard, TravaVisitanteProvider } from "@/components/visitante/TravaVisitante";
import { SairButton } from "./aluno/perfil/SairButton";
import { FEATURES } from "@/lib/env";
import { appEncerrado, dataBR, estadoDoAcesso } from "@/lib/visitante/acesso";
import { campanhaDoVisitante } from "@/lib/data/campanhas";
import { conviteDoFim } from "@/lib/visitante/trava";

const TABS = [
  { label: "Início", href: "/aluno", icon: "home" },
  { label: "Treinar", href: "/aluno/treinar", icon: "dumbbell" },
  { label: "Jornada", href: "/aluno/jornada", icon: "map" },
  { label: "Conquistas", href: "/aluno/conquistas", icon: "trophy" },
  { label: "Ranking", href: "/aluno/ranking", icon: "podium" },
  { label: "Evolução", href: "/aluno/evolucao", icon: "chart" },
  { label: "Perfil", href: "/aluno/perfil", icon: "user" },
] as const;
// Visitante: a Consultoria também no menu (pedido do Montinho, 29/10/2026).
const TAB_CONSULTORIA = { label: "Consultoria", href: "/aluno/consultoria", icon: "sparkles" } as const;

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requireAlunoPage();
  const iniciais = (sessao.nome ?? "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  const foto = await avatarDoUsuario(sessao.userId).catch(() => null);
  const ig = BRAND.contact.instagram;
  // Visitante depois dos 30 dias: treino travado + convite; passados os dias de vitrine, o app fecha.
  const visitante = FEATURES.modoVisitante && sessao.modalidade === "visitante";
  const fimAcesso = sessao.acessoFim ?? null;
  const vencido = visitante && estadoDoAcesso(fimAcesso).estado === "vencido";
  const camp = vencido ? await campanhaDoVisitante(sessao.alunoId, fimAcesso).catch(() => null) : null;
  const convite = vencido && BRAND.contact.whatsapp ? conviteDoFim({ fim: fimAcesso, oferta: camp?.oferta ?? null, whatsapp: BRAND.contact.whatsapp }) : null;
  const fechado = vencido && appEncerrado(fimAcesso);
  // Aviso diário para ativar as notificações: cita o feriado que vale troféu se estiver perto (até 4 dias).
  const hoje = dataLocal(new Date());
  const fer = proximoFeriado(hoje);
  const avisoFeriado = fer && fer.dia <= somarDias(hoje, 4) ? `${fer.feriado.emoji} ${fer.dia === hoje ? "Hoje" : `Dia ${fer.dia.slice(8, 10)}/${fer.dia.slice(5, 7)}`} é ${fer.feriado.nome}: treinar vale troféu especial com o nome do feriado!` : null;
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="relative bg-[linear-gradient(180deg,#161616_0%,#0a0a0a_100%)]">
        <div className="relative max-w-md mx-auto flex items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/aluno" aria-label="Ir para o início" className="rounded-md">
            <BrandLockup priority />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            {ig ? (
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" aria-label={`Instagram do ${BRAND.name} (@${ig})`} className="grid h-10 w-10 place-items-center rounded-full border border-border text-fg-muted transition-colors hover:border-white/40 hover:text-fg max-[369px]:hidden">
                <Icon name="instagram" size={19} />
              </a>
            ) : null}
            {fechado ? null : <SinoNotificacoes />}
            <Link href="/aluno/perfil" aria-label="Meu perfil" className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/25 bg-[linear-gradient(180deg,#3a3a3a,#1c1c1c)] text-sm font-bold text-fg">
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt="" className="h-full w-full object-cover" />
              ) : (
                iniciais || "?"
              )}
            </Link>
          </div>
        </div>
        <FioMarca />
      </header>
      {sessao.comoPersonal ? (
        <div className="bg-accent text-bg">
          <div className="max-w-md mx-auto flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-semibold">
            <span>🏋️ Você está no app como aluno</span>
            <a href="/api/meu-treino?sair=1" className="rounded-full bg-bg/15 px-3 py-1 hover:bg-bg/25">↩ Voltar ao painel</a>
          </div>
        </div>
      ) : null}
      {fechado ? (
        <main id="conteudo" className="flex-1 pb-12">
          <div className="max-w-md mx-auto space-y-4 px-4 py-6">
            <div>
              <h1 className="text-2xl font-black">Seus 30 dias com o app terminaram</h1>
              <p className="mt-1 text-sm text-fg-muted">
                {camp?.treinosConcluidos ? `Você fez ${camp.treinosConcluidos} ${camp.treinosConcluidos === 1 ? "treino" : "treinos"} com a gente. ` : ""}Seu histórico, suas medalhas e a sua Jornada ficam guardados: com um plano do {BRAND.name}, tudo continua de onde parou.
              </p>
            </div>
            {convite ? <ConviteFimCard trava={convite} tela="encerrado" titulo={`Acesso encerrado em ${dataBR(fimAcesso!)}`} /> : null}
            <SairButton />
          </div>
        </main>
      ) : (
        <TravaVisitanteProvider trava={convite}>
          <main id="conteudo" className="flex-1 pb-28">
            <div className="max-w-md mx-auto px-4 py-5">
              {convite ? (
                <div className="mb-4">
                  <ConviteFimCard trava={convite} tela="aviso" titulo={`Seus 30 dias terminaram em ${dataBR(fimAcesso!)}`} />
                </div>
              ) : sessao.modalidade === "visitante" ? (
                <AvisoAcessoVisitante alunoId={sessao.alunoId} fim={fimAcesso} />
              ) : null}
              {children}
            </div>
          </main>
          <MobileTabBar items={visitante ? [...TABS.slice(0, 5), TAB_CONSULTORIA, ...TABS.slice(5)] : [...TABS]} />
        </TravaVisitanteProvider>
      )}
      <RegistrarAcesso id={sessao.alunoId} />
      {fechado ? null : <PedirNotificacoes extra={avisoFeriado} ativo={!convite} />}
      <AjusteTecladoIphone />
    </div>
  );
}
