"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { eventoGa } from "@/components/analytics/ga";

// Caminho gratuito “Como começar a treinar” do site do Montinho (5 passos).
// UTM só com a origem e a tela — nada que identifique a pessoa.
export const URL_COMECE_TREINO = "https://www.montinhopersonal.com.br/comece/treino";

/** Box para o visitante que não sabe por onde começar a montar o treino. */
export function ComeceAquiSite({ tela }: { tela: string }) {
  const href = `${URL_COMECE_TREINO}?utm_source=app_montinho&utm_medium=visitante&utm_campaign=comece_treino&utm_content=${encodeURIComponent(tela)}`;
  return (
    <Card className="border-accent/40 bg-grain-strong">
      <CardBody className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Não sabe por onde começar?</p>
        <h2 className="text-lg font-bold leading-tight">Descubra o que o seu treino precisa antes de escolher os exercícios</h2>
        <p className="text-sm text-fg-muted">
          O Montinho montou um caminho gratuito em 5 passos para quem quer começar do jeito certo:
        </p>
        <ol className="space-y-1.5 text-sm">
          <li>1. Seu perfil e o que hoje te atrapalha</li>
          <li>2. A divisão de treino que cabe na sua semana</li>
          <li>3. Quantas séries cada músculo precisa</li>
          <li>4. As cargas certas para começar</li>
          <li>5. Um vídeo da sua execução avaliado pelo próprio Montinho</li>
        </ol>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-fg">
          <span className="inline-flex items-center gap-1"><Icon name="timer" size={14} /> Uns 10 minutos</span>
          <span>· Grátis</span>
          <span>· Direto do celular</span>
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => eventoGa("comece_treino_click", { tela })}
          className="touch flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-accent/10 px-4 font-semibold text-accent hover:bg-accent/20"
        >
          Começar meu caminho <Icon name="chevron" size={18} />
        </a>
        <p className="text-center text-xs text-fg-subtle">Abre no site do Montinho. Depois é só voltar aqui e montar o seu treino com o que descobriu.</p>
      </CardBody>
    </Card>
  );
}
