import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { requireAlunoPage } from "@/lib/auth/session";
import { getPlanoAtivo } from "@/lib/data/programas";
import { getSessaoEmAndamento, listSessoes } from "@/lib/data/sessoes";
import { estadoSemana } from "@/lib/relatorios/calcular";
import { dataBR } from "@/lib/format";
import { BRAND } from "@/config/brand";
import { FEATURES } from "@/lib/env";
import { ehVisitante } from "@/lib/auth/guards";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { contextoExtraGerado } from "@/lib/data/extra-gerado";
import { hrefDaSessao } from "@/lib/treino/livre";

export const metadata = { title: "Treinar" };

export default async function TreinarPage() {
  const sessao = await requireAlunoPage();
  const [plano, emAndamento, sessoes, extra] = await Promise.all([getPlanoAtivo(sessao.alunoId), getSessaoEmAndamento(sessao.alunoId), listSessoes(sessao.alunoId, { limite: 60 }), contextoExtraGerado(sessao.alunoId).catch(() => null)]);
  // Dia ainda sem exercícios (ex.: plano criado pela estratégia) não aparece para o aluno.
  const treinos = plano.treinos.filter((t) => t.ativo && t.exercicios.length > 0);
  const semana = estadoSemana(sessoes, plano.programa?.frequencia, treinos.map((t) => t.letra));
  // Modo Visitante: quem monta os próprios treinos vê o atalho do montador.
  const visitante = FEATURES.modoVisitante && ehVisitante(sessao);
  const podeMontar = visitante && podeRegistrar("visitante", sessao.acessoFim ?? null);
  const ultimaPorLetra = new Map<string, string>();
  for (const s of sessoes) if (s.letra && !ultimaPorLetra.has(s.letra)) ultimaPorLetra.set(s.letra, s.finalizado_em ?? s.iniciado_em);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Treinar</h1>
        {plano.programa?.nome && plano.programa.nome !== "Programa atual" ? <p className="text-sm font-semibold text-accent">{plano.programa.nome}</p> : null}
        <p className="text-sm text-fg-muted mt-1">A semana é flexível: escolha o treino de hoje. O sugerido vem primeiro.</p>
      </header>

      {emAndamento ? (
        <Link href={hrefDaSessao(emAndamento)} className="block">
          <Card className="border-accent/50 bg-accent-soft">
            <CardBody className="flex items-center gap-3">
              <Icon name="play" className="text-accent" />
              <div className="flex-1">
                <p className="font-bold text-sm">Continuar: {emAndamento.nome_treino}</p>
                <p className="text-xs text-fg-muted">
                  {emAndamento.series_planejadas ? `${emAndamento.series_concluidas}/${emAndamento.series_planejadas} séries registradas` : emAndamento.series_concluidas === 1 ? "1 série registrada" : `${emAndamento.series_concluidas} séries registradas`}
                </p>
              </div>
              <Icon name="chevron" className="text-fg-subtle" />
            </CardBody>
          </Card>
        </Link>
      ) : null}

      {podeMontar && !emAndamento ? (
        <Link href="/aluno/livre" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-accent/60">
          <span className="text-2xl" aria-hidden>🎲</span>
          <span><span className="block font-bold">Treino livre</span><span className="block text-xs text-fg-muted">Sem ficha: decida cada exercício na hora e anote tudo.</span></span>
        </Link>
      ) : null}

      {podeMontar ? (
        <Link href={treinos.length ? "/aluno/meus-treinos" : "/aluno/meus-treinos/novo"} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent/50 px-4 text-sm font-semibold text-accent">
          <Icon name="plus" size={18} /> {treinos.length ? "Montar ou editar meus treinos" : "Montar meu primeiro treino"}
        </Link>
      ) : null}

      {treinos.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="text-center py-8 text-sm text-fg-muted">{visitante ? "Você ainda não tem treinos. Monte o primeiro no botão acima." : `Nenhum treino liberado ainda. Fale com o ${BRAND.name}.`}</CardBody>
        </Card>
      ) : (
        <ul className="space-y-3">
          {treinos
            .slice()
            .sort((a, b) => (a.letra === semana.proximaLetra ? -1 : b.letra === semana.proximaLetra ? 1 : 0))
            .map((t) => {
              const sugerido = t.letra === semana.proximaLetra;
              const feitoSemana = semana.letrasFeitasSemana.includes(t.letra);
              const ultima = ultimaPorLetra.get(t.letra);
              return (
                <li key={t.id}>
                  <Link href={`/aluno/treino/${t.id}`} className="block">
                    <Card className={`transition-colors hover:border-accent/40 ${sugerido ? "border-accent/50" : ""}`}>
                      <CardBody className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${sugerido ? "bg-accent text-bg" : "bg-accent/10 border border-accent/30 text-accent"}`} aria-hidden>
                          <span className="text-xl font-black">{t.letra}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm truncate">{t.nome}</p>
                            {sugerido ? <span className="text-[10px] uppercase tracking-wider font-bold text-accent">sugerido</span> : null}
                            {feitoSemana ? <span className="text-[10px] uppercase tracking-wider font-bold text-success">feito esta semana</span> : null}
                          </div>
                          <p className="text-xs text-fg-subtle mt-0.5">
                            {t.exercicios.length} {t.exercicios.length === 1 ? "exercício" : "exercícios"}{ultima ? ` · último: ${dataBR(ultima)}` : " · ainda não feito"}
                          </p>
                        </div>
                        <Icon name="chevron" className="text-fg-subtle" />
                      </CardBody>
                    </Card>
                  </Link>
                </li>
              );
            })}
          {extra?.habilitado ? <CardExtra ctx={extra} /> : null}
        </ul>
      )}
    </div>
  );
}

/**
 * O treino extra no fim da lista. Apagado e sem clique enquanto a semana não
 * está cumprida (todos os treinos programados), para o aluno ver o que vem
 * depois sem pular a sequência. Pedido do Montinho, 22/10/2026.
 */
function CardExtra({ ctx }: { ctx: NonNullable<Awaited<ReturnType<typeof contextoExtraGerado>>> }) {
  const liberado = !ctx.bloqueio;
  const falta = ctx.programados ? Math.max(0, ctx.programados - ctx.feitos) : null;
  const titulo = "Treino extra";
  const texto = liberado
    ? "Semana cumprida! Monte o seu treino extra em três toques."
    : !ctx.cumprida
      ? `Para liberar o treino extra, complete primeiro todos os treinos do seu protocolo nesta semana${ctx.programados ? `: ${ctx.feitos} de ${ctx.programados} feitos${falta ? `, falta${falta > 1 ? "m" : ""} ${falta}` : ""}` : ""}.`
      : ctx.bloqueio!;
  const conteudo = (
    <Card className={liberado ? "border-accent/50 transition-colors hover:border-accent" : "border-dashed opacity-60"}>
      <CardBody className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${liberado ? "bg-accent text-bg" : "border border-border text-fg-subtle"}`} aria-hidden>
          {liberado ? <span className="text-xl font-black">+</span> : <Icon name="lock" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm">{titulo}</p>
            <span className={`text-[10px] uppercase tracking-wider font-bold ${liberado ? "text-accent" : "text-fg-subtle"}`}>{liberado ? "liberado" : "bloqueado"}</span>
          </div>
          <p className="text-xs text-fg-subtle mt-0.5">{texto}</p>
          {!liberado && !ctx.cumprida && ctx.programados ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
              <div className="h-full bg-fg-subtle" style={{ width: `${Math.min(100, Math.round((ctx.feitos / ctx.programados) * 100))}%` }} />
            </div>
          ) : null}
        </div>
        {liberado ? <Icon name="chevron" className="text-fg-subtle" /> : null}
      </CardBody>
    </Card>
  );
  return (
    <li>
      {liberado ? (
        <Link href="/aluno/extra" className="block">
          {conteudo}
        </Link>
      ) : (
        <div aria-disabled="true" aria-label={`${titulo}, bloqueado. ${texto}`}>
          {conteudo}
        </div>
      )}
    </li>
  );
}
