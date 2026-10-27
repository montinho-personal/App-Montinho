export const dynamic = "force-dynamic";

import Link from "next/link";
import { Voltar } from "@/components/ui/Voltar";
import { notFound } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getPlanoAtivo } from "@/lib/data/programas";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { ArquivarTreino } from "./ArquivarTreino";
import { CtaVisitante } from "@/components/visitante/CtaVisitante";
import { ComeceAquiSite } from "@/components/visitante/ComeceAquiSite";
import { meusEnviosPendentes } from "@/lib/data/treinos-enviados";
import { listSessoes } from "@/lib/data/sessoes";
import { dataLocal } from "@/lib/aderencia/calcular";
import { nomeVisivel, progressoDesafio, prontoDaMarca, prontosVisiveis } from "@/lib/visitante/treinos-prontos";
import { BRAND } from "@/config/brand";

export const metadata = { title: "Meus treinos" };

export default async function MeusTreinosPage() {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  if (!ehVisitante(sessao) && !isDemoMode()) notFound();
  const plano = await getPlanoAtivo(sessao.alunoId);
  const meus = plano.treinos.filter((t) => t.ativo && t.autoria === "proprio");
  const pode = podeRegistrar("visitante", sessao.acessoFim ?? null);
  const enviados = await meusEnviosPendentes(sessao.alunoId).catch(() => []);
  const vitrine = prontosVisiveis(isDemoMode());

  // Desafio do treino pronto em andamento (treinos criados a partir dele).
  const doPronto = meus.map((t) => ({ t, pronto: prontoDaMarca(t.observacoes) })).filter((x) => x.pronto);
  const pronto = doPronto[0]?.pronto ?? null;
  let desafio: ReturnType<typeof progressoDesafio> | null = null;
  if (pronto) {
    const ids = new Set(doPronto.filter((x) => x.pronto?.slug === pronto.slug).map((x) => x.t.id));
    const inicio = doPronto.map((x) => dataLocal(x.t.created_at)).sort()[0];
    const sessoes = await listSessoes(sessao.alunoId, { limite: 200, status: "todas" }).catch(() => []);
    const datas = sessoes.filter((x) => x.treino_id && ids.has(x.treino_id) && x.status !== "em_andamento" && (x.series_concluidas ?? 0) > 0).map((x) => dataLocal(x.iniciado_em));
    desafio = progressoDesafio(pronto, inicio, dataLocal(new Date()), datas);
  }

  return (
    <div className="space-y-5">
      <Voltar href="/aluno/treinar" />
      <header>
        <h1 className="text-2xl font-bold">Meus treinos</h1>
        <p className="text-sm text-fg-muted mt-1">Monte pela biblioteca do Montinho (com vídeo de execução) ou suba o treino que você já tem: escrevendo, colando, ditando ou por foto/PDF. Até 8 treinos (A a H).</p>
      </header>
      {pode ? (
        <Link href="/aluno/meus-treinos/novo" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-bg">
          <Icon name="plus" size={18} /> Montar ou subir um treino
        </Link>
      ) : null}
      {pode ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/aluno/monte-com-ia" className="flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/10 px-4 py-3">
            <span className="text-2xl" aria-hidden>✨</span>
            <span><span className="block font-bold">Monte com IA</span><span className="block text-xs text-fg-muted">Fale ou escreva o treino que você quer: duas opções na hora.</span></span>
          </Link>
          <Link href="/aluno/livre" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-accent/60">
            <span className="text-2xl" aria-hidden>🎲</span>
            <span><span className="block font-bold">Treino livre (de hoje)</span><span className="block text-xs text-fg-muted">Um treino do dia: decida cada exercício na hora e anote séries, cargas e técnicas.</span></span>
          </Link>
          <Link href="/aluno/protocolo-livre" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-accent/60">
            <span className="text-2xl" aria-hidden>🎯</span>
            <span><span className="block font-bold">Protocolo livre (a semana)</span><span className="block text-xs text-fg-muted">Sem treinos A/B/C: só as séries por semana de cada músculo. O app conta e sugere o que falta.</span></span>
          </Link>
          {vitrine.length ? (
            <Link href="/aluno/treinos-prontos" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-accent/60">
              <span className="text-2xl" aria-hidden>🔥</span>
              <span><span className="block font-bold">Treinos prontos do Montinho</span><span className="block text-xs text-fg-muted">{vitrine.slice(0, 2).map((t) => nomeVisivel(t)).join(", ")} e mais. Com desafio.</span></span>
            </Link>
          ) : null}
        </div>
      ) : null}
      {pronto && desafio ? (
        <section className="space-y-2 rounded-xl border border-accent/40 bg-grain-strong px-4 py-3" aria-label="Desafio">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">{pronto.emoji} Desafio {pronto.desafioDias} dias · {nomeVisivel(pronto)}</p>
          {desafio.concluido ? (
            <p className="text-sm font-semibold">🏆 Desafio concluído! {desafio.feitos} treinos. Isso é constância de verdade.</p>
          ) : desafio.terminou ? (
            <p className="text-sm">O desafio terminou com {desafio.feitos} de {desafio.meta} treinos. Bora de novo? Cada treino conta.</p>
          ) : (
            <p className="text-sm">Dia {desafio.diaAtual} de {pronto.desafioDias} · <span className="font-bold">{desafio.feitos} de {desafio.meta} treinos</span></p>
          )}
          <div className="h-2 overflow-hidden rounded-full bg-bg/60" aria-hidden><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.round((desafio.feitos / Math.max(1, desafio.meta)) * 100))}%` }} /></div>
          {desafio.concluido || desafio.terminou ? (
            <a href={`https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(`Olá, Montinho! Terminei o desafio ${nomeVisivel(pronto)} e quero um treino feito para mim. [APP-DESAFIO-PRONTO]`)}`} target="_blank" rel="noopener noreferrer" className="alvo inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline">Quero o próximo passo com o Montinho →</a>
          ) : null}
        </section>
      ) : null}
      {enviados.length ? (
        <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm" role="status">
          📨 {enviados.length === 1 ? "Você enviou 1 treino" : `Você enviou ${enviados.length} treinos`} para o Montinho montar. Quando estiver pronto, aparece aqui.
        </p>
      ) : null}
      {pode && meus.length < 2 ? <ComeceAquiSite tela="meus_treinos" /> : null}
      {meus.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="text-center py-8 text-sm text-fg-muted">Você ainda não tem treino aqui. Toque em “Montar ou subir um treino”: dá para montar pela biblioteca ou subir o treino que você já tem.</CardBody>
        </Card>
      ) : (
        <ul className="space-y-3">
          {meus.map((t) => (
            <li key={t.id}>
              <Card>
                <CardBody className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-xl font-black text-accent" aria-hidden>
                      {t.letra}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-snug">{t.nome}</p>
                      <p className="text-xs text-fg-subtle">{t.exercicios.length} {t.exercicios.length === 1 ? "exercício" : "exercícios"} · {t.exercicios.reduce((n, e) => n + e.series, 0)} {t.exercicios.reduce((n, e) => n + e.series, 0) === 1 ? "série" : "séries"}</p>
                    </div>
                  </div>
                  {/* Botões numa linha própria: no celular não espremem o nome do treino. */}
                  <div className={pode ? "flex justify-end gap-2" : "hidden"}>
                  {pode ? (
                    <Link href={`/aluno/meus-treinos/${t.id}`} className="alvo min-h-11 rounded-lg border border-border px-3 text-sm leading-[2.6rem]">Editar</Link>
                  ) : null}
                  {pode && meus.length < 8 ? (
                    <Link href={`/aluno/meus-treinos/novo?copiar=${t.id}`} className="alvo min-h-11 rounded-lg border border-border px-3 text-sm leading-[2.6rem]" aria-label={`Copiar ${t.nome}`}>Copiar</Link>
                  ) : null}
                  {pode ? <ArquivarTreino id={t.id} nome={t.nome} /> : null}
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <CtaVisitante alunoId={sessao.alunoId} tela="meus_treinos" acessoFim={sessao.acessoFim ?? null} />
      <Link href="/aluno/treinar" className="alvo block text-center text-sm text-accent underline-offset-2 hover:underline">Ir para Treinar</Link>
    </div>
  );
}
