import Link from "next/link";
import { FotoPerfil } from "./FotoPerfil";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { Grupo, ItemAbrir, ItemLink } from "@/components/perfil/MenuPerfil";
import { ehVisitante } from "@/lib/auth/guards";
import { AlunoStatusPill } from "@/components/ui/StatusPill";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno, listDieta } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listAdaptacoes, listIntervencoes } from "@/lib/data/acompanhamento";
import { dataBR, diasAte } from "@/lib/format";
import { BRAND } from "@/config/brand";
import { SairButton } from "./SairButton";
import { NotificacoesChalala } from "@/components/aluno/NotificacoesChalala";
import { getPreferencias } from "@/lib/data/notificacoes";
import { appMode } from "@/lib/env";
import { getPadraoCarga } from "@/lib/data/padrao-carga";
import { PadraoCargaPerfil } from "@/components/treinos/PadraoCarga";
import { TelaAcesaPerfil } from "@/components/treinos/TelaAcesa";
import { PulsoPerfil } from "@/components/pulso/PulsoPerfil";
import { consentimentoPulso } from "@/lib/data/pulso";
import { getRankingVisivel } from "@/lib/data/ranking";
import { RankingVisivel } from "@/components/ranking/RankingVisivel";
import { ConectarStrava } from "@/components/strava/ConectarStrava";
import { listarCardio, statusStrava } from "@/lib/data/strava";

export const metadata = { title: "Perfil" };

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const sessao = await requireAlunoPage();
  const { strava } = await searchParams;
  const [aluno, plano, adaptacoes, intervencoes, dieta, prefsNotif, padraoCarga, rankingVisivel, stravaStatus, cardio, pulsoConsent] = await Promise.all([
    getAluno(sessao.alunoId),
    getPlanoAtivo(sessao.alunoId),
    listAdaptacoes(sessao.alunoId),
    listIntervencoes(sessao.alunoId, 10),
    listDieta(sessao.alunoId),
    getPreferencias(sessao.userId),
    getPadraoCarga(sessao.alunoId),
    getRankingVisivel(sessao.alunoId).catch(() => true),
    statusStrava(sessao.alunoId),
    listarCardio(sessao.alunoId, 5).catch(() => []),
    consentimentoPulso(sessao.alunoId).catch(() => "nunca" as const),
  ]);
  if (!aluno) return null;
  const visiveis = intervencoes.filter((i) => i.visivel_aluno);

  const visitante = ehVisitante(sessao);
  const abertas = adaptacoes.filter((a) => a.status === "aberta").length;
  const dias = diasAte(aluno.acesso_ate);
  const whatsapp = BRAND.contact.whatsapp;

  return (
    <div className="space-y-6">
      {/* Cabeçalho: quem eu sou e como está o meu acesso. */}
      <header className="rounded-2xl border border-border bg-surface p-4 text-center">
        <FotoPerfil nome={aluno.profile?.nome ?? sessao.nome} url={aluno.profile?.avatar_url ?? null} />
        <h1 className="mt-3 text-xl font-bold">{aluno.profile?.nome ?? sessao.nome}</h1>
        <p className="text-sm text-fg-subtle">{aluno.profile?.email}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <AlunoStatusPill status={aluno.status} />
          {visitante ? <span className="rounded-full border border-accent/50 px-2.5 py-0.5 text-[11px] font-bold text-accent">Visitante</span> : null}
          {aluno.acesso_ate ? <span className="text-xs text-fg-muted">{dias != null && dias < 0 ? "acesso encerrado" : `acesso até ${dataBR(aluno.acesso_ate)}${dias != null ? ` · ${dias} ${dias === 1 ? "dia" : "dias"}` : ""}`}</span> : null}
        </div>
      </header>

      {/* Visitante: conhecer o Montinho e fechar a consultoria vem primeiro. */}
      {visitante ? (
        <section aria-label="Treine com o Montinho" className="space-y-3 rounded-2xl border border-accent/60 bg-[linear-gradient(160deg,#2a2415_0%,#171717_75%)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Treine com o Montinho</p>
          <p className="text-lg font-black leading-snug">Gostou do app? Na consultoria, o treino é montado para você e eu acompanho de perto.</p>
          {whatsapp ? <FalarComMontinho origem="consultoria" whatsapp={whatsapp} visitante texto="💬 Quero fechar minha consultoria" /> : null}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/aluno/historia" className="touch flex flex-col justify-center rounded-xl border border-border bg-bg px-3 py-2.5">
              <span className="font-bold">📖 Minha história</span>
              <span className="text-[11px] text-fg-muted">Do “gordinho da turma” a −40 kg</span>
            </Link>
            <Link href="/aluno/consultoria" className="touch flex flex-col justify-center rounded-xl border border-border bg-bg px-3 py-2.5">
              <span className="font-bold">💎 Como funciona</span>
              <span className="text-[11px] text-fg-muted">A consultoria, passo a passo</span>
            </Link>
            <Link href="/aluno/presencial" className="touch flex flex-col justify-center rounded-xl border border-border bg-bg px-3 py-2.5">
              <span className="font-bold">🏋️ Presencial</span>
              <span className="text-[11px] text-fg-muted">Eu do seu lado em cada série</span>
            </Link>
            <Link href="/aluno/pacote-flexivel" className="touch flex flex-col justify-center rounded-xl border border-border bg-bg px-3 py-2.5">
              <span className="font-bold">🎟️ Pacote Flexível</span>
              <span className="text-[11px] text-fg-muted">10 aulas, sem horário fixo</span>
            </Link>
          </div>
        </section>
      ) : null}

      <Grupo titulo="Meu acompanhamento">
        <ItemLink icone="🏋️" titulo="Meus treinos" sub="Ver e começar os treinos do seu programa" href="/aluno/treinar" />
        {sessao.comoPersonal ? <ItemLink icone="✏️" titulo="Montar e editar meus treinos" sub="Abre o montador no painel" href={`/api/meu-treino?sair=1&para=/treinador/alunos/${sessao.alunoId}/treinos`} /> : null}
        <ItemAbrir icone="📋" titulo="Meu programa" sub={plano.programa ? plano.programa.nome : "Nenhum programa publicado ainda"}>
          <div className="space-y-2 text-sm">
            {plano.programa ? (
              <>
                <Row label="Protocolo" value={plano.programa.nome} />
                <Row label="Objetivo" value={plano.programa.objetivo ?? "—"} />
                <Row label="Treinos" value={plano.treinos.filter((t) => t.ativo).map((t) => t.letra).join(" · ") || "—"} />
                <Row label="Sessões por semana" value={String(Math.round(Object.values(plano.programa.frequencia).reduce((a, b) => a + (Number(b) || 0), 0)) || "—")} />
                <Row label="Versão atual" value={`v${plano.programa.versao}`} />
              </>
            ) : (
              <p className="text-fg-muted">Nenhum programa publicado ainda.</p>
            )}
            {aluno.objetivo ? <p className="border-t border-border pt-2 text-fg-muted">{aluno.objetivo}</p> : null}
          </div>
        </ItemAbrir>
        <ItemLink icone="📏" titulo="Medidas e avaliações" sub="Peso, medidas, bioimpedância ou o arquivo da avaliação" href="/aluno/medidas" />
        {dieta.length ? <ItemLink icone="🥗" titulo="Plano alimentar" sub="O que o Montinho combinou com você" href="/aluno/dieta" /> : null}
        <ItemAbrir icone="🔁" titulo="Pedidos de adaptação" sub={adaptacoes.length ? `${adaptacoes.length} ${adaptacoes.length === 1 ? "pedido" : "pedidos"}` : "Quando um exercício não der certo"} badge={abertas ? `${abertas} aguardando` : null}>
          {adaptacoes.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhum pedido. Durante o treino, toque em “Não consegui este exercício” para pedir uma alternativa.</p>
          ) : (
            <ul className="divide-y divide-border">
              {adaptacoes.map((a) => (
                <li key={a.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{a.exercicio_nome ?? "Exercício"}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${a.status === "aberta" ? "text-warning" : "text-success"}`}>{a.status === "aberta" ? "aguardando" : a.status}</span>
                  </div>
                  <p className="text-xs text-fg-subtle">
                    {dataBR(a.created_at)} · {a.motivo.replace("_", " ")}
                    {a.descricao ? ` · ${a.descricao}` : ""}
                  </p>
                  {a.resposta ? <p className="mt-1 border-l-2 border-accent pl-2 text-sm">{a.resposta}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </ItemAbrir>
        {visiveis.length ? (
          <ItemAbrir icone="🗒️" titulo="Recados do acompanhamento" sub={`${visiveis.length} ${visiveis.length === 1 ? "recado" : "recados"} do ${BRAND.name}`}>
            <ul className="divide-y divide-border">
              {visiveis.map((i) => (
                <li key={i.id} className="py-2.5">
                  <p className="text-sm">{i.descricao}</p>
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    {i.autor?.nome ?? BRAND.name} · {dataBR(i.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </ItemAbrir>
        ) : null}
      </Grupo>

      <Grupo titulo="Meu treino no app">
        <ItemAbrir icone="⚖️" titulo="Como eu anoto o peso" sub="Anilhas e halteres: total ou por lado">
          <PadraoCargaPerfil inicial={padraoCarga} />
        </ItemAbrir>
        <ItemAbrir icone="📱" titulo="Tela sempre acesa no treino" sub="O celular não apaga no meio da série">
          <TelaAcesaPerfil />
        </ItemAbrir>
        <ItemAbrir id="strava" aberto={!!strava} icone="⌚" titulo="Relógio (Strava)" sub={stravaStatus?.conectado ? "Conectado" : "Batimentos e cardios do relógio"}>
          <ConectarStrava status={stravaStatus} ultimos={cardio} aviso={strava ?? null} />
        </ItemAbrir>
      </Grupo>

      <Grupo titulo="Notificações e privacidade">
        <ItemAbrir icone="🔔" titulo="Chalalá no celular" sub="Escolha os recados que você recebe">
          <NotificacoesChalala inicial={prefsNotif} />
        </ItemAbrir>
        <ItemAbrir icone="💛" titulo="Montinho Pulso" sub="Como você está: energia, corpo e sono">
          <PulsoPerfil inicial={pulsoConsent} />
        </ItemAbrir>
        <ItemAbrir icone="🏆" titulo="Aparecer no ranking" sub={rankingVisivel ? "Você aparece para os outros alunos" : "Você não aparece para os outros"}>
          <RankingVisivel inicial={rankingVisivel} />
        </ItemAbrir>
      </Grupo>

      <Grupo titulo="Indique e ganhe">
        <ItemLink icone="🎁" titulo="Indique um amigo" sub="1 amigo = 10%, 2 = 20%, 3 = 30% de desconto" href="/aluno/indicar" />
      </Grupo>

      {!visitante ? (
        <Grupo titulo="Sobre o Montinho">
          <ItemLink icone="📖" titulo="Minha história" sub="Do “gordinho da turma” a −40 kg" href="/aluno/historia" />
          <ItemLink icone="💎" titulo="A consultoria" sub="Como funciona o acompanhamento" href="/aluno/consultoria" />
          <ItemLink icone="🏋️" titulo="Personal presencial" sub="Eu do seu lado em cada série" href="/aluno/presencial" />
          <ItemLink icone="🎟️" titulo="Pacote Flexível · 10 aulas" sub="Consultoria online + aulas quando você puder" href="/aluno/pacote-flexivel" />
        </Grupo>
      ) : null}

      <Grupo titulo="Minha conta">
        <ItemAbrir icone="👤" titulo="Meus dados" sub="Telefone, nascimento, altura e acesso">
          <div className="space-y-3 text-sm">
            <Row label="Telefone" value={aluno.telefone ?? "—"} />
            <Row label="Nascimento" value={dataBR(aluno.data_nascimento)} />
            <Row label="Altura" value={aluno.altura_cm ? `${aluno.altura_cm} cm` : "—"} />
            <Row label="Início" value={dataBR(aluno.data_inicio)} />
            <Row label="Acesso até" value={dataBR(aluno.acesso_ate)} />
            <p className="border-t border-border pt-2 text-xs text-fg-subtle">Seus dados de saúde e fotos são privados: só você e o {BRAND.name} têm acesso. Para corrigir ou excluir dados, fale com o {BRAND.name}.</p>
          </div>
        </ItemAbrir>
        {appMode() === "live" ? <ItemLink icone="🔑" titulo="Definir ou trocar senha" href="/conta/senha" /> : null}
        {whatsapp ? <ItemLink icone="💬" titulo={`Falar com o ${BRAND.name}`} sub="WhatsApp" href={`https://wa.me/${whatsapp}`} externo /> : null}
      </Grupo>

      <SairButton />

      <p className="text-center text-[10px] text-fg-subtle">{BRAND.fullName}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-subtle">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
