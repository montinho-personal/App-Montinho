// Planos do Montinho (pedido do Montinho, 30/10/2026): comparativo simples com
// botão para o WhatsApp em cada plano (sem pagamento no app). O visitante vê a
// Consultoria e, se pode ir a Alphaville, o Pacote Flexível e o Presencial; o
// aluno vê o plano atual e o Pacote Flexível. Ofertas ligadas pelo personal (0130).
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { BRAND } from "@/config/brand";
import { getAluno } from "@/lib/db";
import { listarOfertasConfig } from "@/lib/data/ofertas";
import { ofertasPara } from "@/lib/ofertas/regras";
import { Voltar } from "@/components/ui/Voltar";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import type { OrigemContato } from "@/lib/montinho/apresentacao";

export const metadata = { title: "Planos do Montinho" };

type Plano = { origem: OrigemContato; nome: string; resumo: string; itens: string[]; saibaMais: string; selo?: string; atual?: boolean; promo?: string | null };

export default async function PlanosPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  const visitante = ehVisitante(sessao);
  const podePresencial = aluno?.pode_presencial !== false;
  const config = await listarOfertasConfig();
  const ofertas = ofertasPara({ publico: visitante ? "visitante" : "aluno", podePresencial, config });
  const promoDe = (id: "consultoria" | "pacote") => ofertas.find((o) => o.id === id)?.promo ?? null;
  const whatsapp = BRAND.contact.whatsapp;

  const planos: Plano[] = [
    {
      origem: "consultoria",
      nome: "Consultoria online",
      resumo: "Treino feito para você e eu acompanhando de perto, de onde você estiver.",
      itens: ["Treino montado para você no app, com vídeo de cada exercício", "Eu acompanho cada semana e ajusto quando a carga trava", "Revisão dos seus vídeos de execução pelo WhatsApp", "Direto comigo no WhatsApp, sem intermediário"],
      saibaMais: "/aluno/consultoria",
      atual: !visitante,
      promo: promoDe("consultoria"),
    },
    ...(podePresencial
      ? [
          {
            origem: "pacote" as const,
            nome: "Pacote Flexível · 10 aulas",
            resumo: "5 meses de consultoria online + 10 aulas presenciais para usar quando der.",
            itens: ["Tudo da consultoria online, por 5 meses", "10 aulas comigo em Alphaville, sem horário fixo", "Técnica afinada ao vivo e cargas ajustadas", "Dá para parcelar"],
            saibaMais: "/aluno/pacote-flexivel",
            selo: "Mais completo",
            promo: promoDe("pacote"),
          },
          {
            origem: "presencial" as const,
            nome: "Personal presencial",
            resumo: "Eu do seu lado em cada série, com horário fixo na semana.",
            itens: ["Aulas na semana, no horário combinado", "No seu condomínio, em casa ou na academia (Alphaville e região)", "Avaliação física e treino ajustado a cada aula"],
            saibaMais: "/aluno/presencial",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5 pb-6">
      <Voltar href="/aluno/perfil" />
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Planos do Montinho</p>
        <h1 className="text-3xl font-black leading-tight">Qual é o seu próximo passo?</h1>
        <p className="text-sm text-fg-muted">{visitante ? "Até aqui o treino foi seu. Escolha como quer seguir com o Montinho do lado." : "Você já tem a consultoria. Veja o que dá para somar a ela."} Os valores e o parcelamento eu passo no WhatsApp.</p>
      </header>

      {visitante ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">O que você tem agora</p>
          <p className="font-bold">Visitante · app por conta própria</p>
          <p className="text-sm text-fg-muted">Você monta e anota o seu treino, com troféus, ranking e desafios. Sem treino feito para você e sem acompanhamento.</p>
        </div>
      ) : null}

      {planos.map((p) => (
        <section key={p.origem} className={`space-y-3 rounded-2xl border p-4 ${p.selo ? "border-accent/70 bg-[linear-gradient(160deg,#2a2415_0%,#111111_85%)]" : "border-border bg-card"}`}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-extrabold leading-tight">{p.nome}</h2>
            {p.atual ? <span className="shrink-0 rounded-full border border-success/50 px-2 py-0.5 text-[11px] font-bold text-success">Seu plano</span> : p.selo ? <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-black text-bg">{p.selo}</span> : null}
          </div>
          <p className="text-sm text-fg-muted">{p.resumo}</p>
          <ul className="space-y-1.5 text-sm">
            {p.itens.map((i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-accent">✓</span>{i}</li>)}
          </ul>
          {p.promo ? <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm font-bold text-success">🎁 {p.promo}</p> : null}
          {!p.atual && whatsapp ? <FalarComMontinho origem={p.origem} whatsapp={whatsapp} visitante={visitante} /> : null}
          <Link href={p.saibaMais} className="alvo block text-center text-sm font-semibold text-accent underline-offset-2 hover:underline">Saiba mais →</Link>
        </section>
      ))}

      {!podePresencial ? <p className="text-center text-xs text-fg-subtle">As aulas presenciais são em Alphaville (Barueri/SP). Se você estiver por perto, me chama que eu libero aqui.</p> : null}
    </div>
  );
}
