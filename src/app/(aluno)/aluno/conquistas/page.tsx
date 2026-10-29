// Minhas conquistas: histórico permanente, “Minha evolução em 30 dias” e
// reconhecimentos escritos pelo personal.
import Link from "next/link";
import { nomeDaConquista } from "@/lib/conquistas/conteudo";
import { BRAND } from "@/config/brand";
import { IncentivoIndicacao } from "@/components/indicacao/IncentivoIndicacao";
import { incentivoIndicacao } from "@/lib/data/indicacao";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { progressoCardio } from "@/lib/data/cardio";
import { acoesAlcance, listarReconhecimentos, progressoExtras, resumoMensalDoAluno } from "@/lib/data/conquistas";
import { ConquistasClient } from "./ConquistasClient";
import { medalhasEmDestaque, proximasMedalhas, vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { mensagemDaJornada } from "@/lib/conquistas/conteudo";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { albumParaAluno } from "@/lib/data/desbloqueia";
import { candidatasAnuncio, progressoAlbum } from "@/lib/desbloqueia/motor";
import { paraVisao } from "@/components/desbloqueia/visao";
import { AnuncioDescoberta } from "@/components/desbloqueia/AnuncioDescoberta";
import { CategoriasTrofeus } from "@/components/conquistas/CategoriasTrofeus";
import { CartaoCarimbos } from "@/components/conquistas/CartaoCarimbos";
import { contarCarimbos } from "@/lib/conquistas/carimbos";
import { TrofeusAoAlcance } from "@/components/conquistas/TrofeusAoAlcance";
import { PainelConquistas } from "@/components/conquistas/PainelConquistas";
import { trofeusNosProximosDias } from "@/lib/conquistas/ao-alcance";
import { tecnicasFeitas } from "@/lib/conquistas/regras";
import { getPlanoAtivo } from "@/lib/data/programas";
import { AbasConquistas } from "@/components/tribo/AbasConquistas";
import { RecadoFechavel } from "@/components/conquistas/RecadoFechavel";

export const metadata = { title: "Conquistas" };

export default async function ConquistasPage({ searchParams }: { searchParams: Promise<{ recado?: string }> }) {
  const { recado: recadoId } = await searchParams;
  const sessao = await requireAlunoPage();
  const incentivo = await incentivoIndicacao(sessao).catch(() => null);
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const [{ mensal, conquistas, sessoes, aderencia }, reconhecimentos, plano, cardio] = await Promise.all([resumoMensalDoAluno(aluno), listarReconhecimentos(aluno.id), getPlanoAtivo(aluno.id).catch(() => null), progressoCardio(aluno.id).catch(() => null)]);
  const extras = await progressoExtras(aluno.id).catch(() => null);
  const hoje = dataLocal(new Date());
  const album = await albumParaAluno(aluno, conquistas);
  const albumResumo = progressoAlbum(album.itens);
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje, cardio, extras });
  // Troféus que dá para ganhar nos próximos dias, com o que fazer em cada um.
  const aoAlcance = trofeusNosProximosDias({ medalhas, aderencia, hoje, tecnicasFeitas: new Set(tecnicasFeitas(sessoes).map((t) => t.familia)), treinos: (plano?.treinos ?? []).map((t) => ({ letra: t.letra, exercicios: t.exercicios })), cardio, acoes: await acoesAlcance(sessao).catch(() => null) });
  const titulos = new Map(conquistas.map((c) => [c.id, c.titulo]));
  const codigoPorId = new Map(conquistas.map((c) => [c.id, c.codigo]));
  // Mensagem escrita pelo personal ligada a uma medalha (a mais recente).
  const reconhecimentosPorCodigo: Record<string, { mensagem: string; data: string }> = {};
  for (const r of [...reconhecimentos].reverse()) {
    const cod = r.conquista_id ? codigoPorId.get(r.conquista_id) : null;
    if (cod) reconhecimentosPorCodigo[cod] = { mensagem: r.mensagem, data: r.created_at };
  }
  const unicas = new Set(medalhas.map((m) => m.codigo as string));
  // Celebração só uma vez (vista_em) e só para conquistas recentes (14 dias).
  const recente = `${somarDias(hoje, -14)}T00:00:00Z`;
  const novas = conquistas.filter((c) => unicas.has(c.codigo) && c.vista_em === null && c.conquistado_em >= recente).map((c) => ({ id: c.id, codigo: c.codigo }));
  // Mensagem do personal em destaque: a do aviso no celular (?recado=) ou a mais recente dos últimos 7 dias (a pessoa pode fechar).
  const recado = reconhecimentos.find((r) => r.id === recadoId) ?? (reconhecimentos[0] && reconhecimentos[0].created_at >= `${somarDias(hoje, -7)}T00:00:00Z` ? reconhecimentos[0] : null);
  const cumpridas = aderencia.sequencia.semanasCumpridas + (aderencia.semanaAtual?.status === "cumprida" ? 1 : 0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Minhas conquistas</h1>
        <Link href="/aluno/evolucao" className="alvo text-sm text-fg-muted hover:text-fg">
          Evolução →
        </Link>
      </div>
      {recado ? (
        <RecadoFechavel id={recado.id} forcar={recado.id === recadoId}>
        <section id="recado" aria-label="Mensagem do seu personal" className="scroll-mt-24 space-y-2 rounded-2xl border border-accent/60 bg-grain-strong p-4">
          <p className="pr-20 text-[11px] font-bold uppercase tracking-wider text-accent">💌 Mensagem do {BRAND.name}</p>
          {recado.conquista_id && titulos.get(recado.conquista_id) ? <p className="text-sm font-bold">🏆 {nomeDaConquista(codigoPorId.get(recado.conquista_id) ?? "", titulos.get(recado.conquista_id))}</p> : null}
          <p className="text-[17px] leading-relaxed">“{recado.mensagem}”</p>
          <p className="text-[11px] text-fg-subtle">Escrita pelo seu personal · {new Date(recado.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
          {BRAND.contact.whatsapp ? (
            <a href={`https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(`Valeu pela mensagem no app, ${BRAND.name}! 💪 Bora pro próximo troféu!`)}`} target="_blank" rel="noopener noreferrer" className="touch flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-bold text-bg">💬 Responder no WhatsApp</a>
          ) : null}
        </section>
        </RecadoFechavel>
      ) : null}
      {/* Central de Conquistas: Minhas (esta tela) · Tribo · Missões coletivas (0115). */}
      <AbasConquistas ativa="minhas" />
      <PainelConquistas
        r={{
          trofeus: medalhas.filter((m) => m.conquistada).length,
          totalTrofeus: medalhas.length,
          carimbos: contarCarimbos(sessoes),
          semanasSeguidas: aderencia.sequencia.atual,
          recordes: conquistas.filter((c) => c.codigo === "recorde").reduce((n, c) => n + Math.max(1, c.dados?.recordes?.length ?? 0), 0),
          cardios: cardio ? cardio.feitos : null,
          aoAlcance: aoAlcance.length,
          ganhosNaSemana: medalhas.filter((m) => m.conquistada && m.nova).length,
        }}
      />
      <div id="ao-alcance" className="scroll-mt-24"><TrofeusAoAlcance itens={aoAlcance} /></div>
      <div id="carimbos" className="scroll-mt-24"><CartaoCarimbos total={contarCarimbos(sessoes)} /></div>
      {incentivo ? <IncentivoIndicacao momento="conquistas" aluno={incentivo.aluno} fecharam={incentivo.fecharam} /> : null}
      <section className="space-y-2" aria-labelledby="categorias-titulo">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="categorias-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Troféus por categoria</h2>
          <Link href="/aluno/conquistas/todas" className="alvo text-xs font-semibold text-accent">Ver todos →</Link>
        </div>
        <CategoriasTrofeus medalhas={medalhas} />
      </section>
      <Link href="/aluno/jornada" className="flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-grain-strong px-4 py-3">
        <span>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">Minha Jornada</span>
          <span className="block text-sm font-semibold">Veja suas medalhas no mapa da sua evolução</span>
        </span>
        <span aria-hidden className="text-accent">→</span>
      </Link>
      <AnuncioDescoberta candidatas={candidatasAnuncio(album.itens).slice(0, 8).map(paraVisao)} explorados={albumResumo.explorados} total={albumResumo.total} origem="conquistas" />
      <ConquistasClient
        nome={(aluno.profile?.nome ?? sessao.nome).split(" ")[0]}
        mensal={mensal}
        conquistas={conquistas.map((c) => ({ id: c.id, codigo: c.codigo, titulo: c.titulo, descricao: c.descricao, conquistado_em: c.conquistado_em, dados: c.dados }))}
        reconhecimentos={reconhecimentos.map((r) => ({ id: r.id, mensagem: r.mensagem, created_at: r.created_at, conquista: r.conquista_id ? (titulos.get(r.conquista_id) ?? null) : null }))}
        destaque={medalhasEmDestaque(medalhas, hoje)}
        proximas={proximasMedalhas(medalhas, 3)}
        ganhas={medalhas.filter((m) => m.conquistada).length}
        total={medalhas.length}
        novas={novas}
        jornada={mensagemDaJornada(cumpridas)}
        reconhecimentosPorCodigo={reconhecimentosPorCodigo}
      />
    </div>
  );
}
