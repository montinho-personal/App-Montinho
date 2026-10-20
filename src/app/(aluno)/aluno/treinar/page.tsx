import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { requireAlunoPage } from "@/lib/auth/session";
import { getPlanoAtivo } from "@/lib/data/programas";
import { getSessaoEmAndamento, listSessoes } from "@/lib/data/sessoes";
import { estadoSemana } from "@/lib/relatorios/calcular";
import { dataBR } from "@/lib/format";
import { BRAND } from "@/config/brand";

export const metadata = { title: "Treinar" };

export default async function TreinarPage() {
  const sessao = await requireAlunoPage();
  const [plano, emAndamento, sessoes] = await Promise.all([getPlanoAtivo(sessao.alunoId), getSessaoEmAndamento(sessao.alunoId), listSessoes(sessao.alunoId, { limite: 60 })]);
  // Dia ainda sem exercícios (ex.: plano criado pela estratégia) não aparece para o aluno.
  const treinos = plano.treinos.filter((t) => t.ativo && t.exercicios.length > 0);
  const semana = estadoSemana(sessoes, plano.programa?.frequencia, treinos.map((t) => t.letra));
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
        <Link href={`/aluno/treino/${emAndamento.treino_id}?sessao=${emAndamento.id}`} className="block">
          <Card className="border-accent/50 bg-accent-soft">
            <CardBody className="flex items-center gap-3">
              <Icon name="play" className="text-accent" />
              <div className="flex-1">
                <p className="font-bold text-sm">Continuar: {emAndamento.nome_treino}</p>
                <p className="text-xs text-fg-muted">
                  {emAndamento.series_concluidas}/{emAndamento.series_planejadas} séries registradas
                </p>
              </div>
              <Icon name="chevron" className="text-fg-subtle" />
            </CardBody>
          </Card>
        </Link>
      ) : null}

      {treinos.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="text-center py-8 text-sm text-fg-muted">Nenhum treino liberado ainda. Fale com o {BRAND.name}.</CardBody>
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
                            {t.exercicios.length} exercícios{ultima ? ` · último: ${dataBR(ultima)}` : " · ainda não feito"}
                          </p>
                        </div>
                        <Icon name="chevron" className="text-fg-subtle" />
                      </CardBody>
                    </Card>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
