// ============================================================================
// “Conheça o Montinho” (pedido do Montinho, 29/10/2026): a história dele e a
// consultoria, dentro do app. Fatos tirados do site oficial (minha-historia e
// consultoria): obesidade na infância, efeito sanfona, virada aos ~29 anos,
// −40 kg em 12 meses com ganho de músculo, +20 anos de musculação, 100+ alunos,
// presencial em Alphaville/Barueri/Santana de Parnaíba e online no Brasil.
// Sem preço (os valores são pelo WhatsApp) e sem prometer resultado ou prazo.
// Mudou um fato? Mude aqui — as duas telas leem deste arquivo.
// ============================================================================

export const NUMEROS = [
  { valor: "−40 kg", rotulo: "na própria transformação, em 12 meses" },
  { valor: "+20", rotulo: "anos de musculação" },
  { valor: "100+", rotulo: "alunos acompanhados" },
] as const;

export type Capitulo = { titulo: string; paragrafos: string[]; destaque?: string };

export const HISTORIA: { abertura: string; subtitulo: string; capitulos: Capitulo[]; fecho: string } = {
  abertura: "Eu sei como é.",
  subtitulo: "Não porque eu li em algum lugar. Porque eu vivi.",
  capitulos: [
    {
      titulo: "O gordinho da turma",
      paragrafos: [
        "Eu era o gordinho da turma. O engraçado, o que fazia todo mundo rir. O humor era o meu jeito de ser aceito — e de esconder o que eu sentia quando me olhava no espelho.",
        "E não era falta de tentar. Eu fazia esporte, arte marcial, musculação. Eu vivia tentando mudar o meu corpo.",
      ],
    },
    {
      titulo: "O efeito sanfona",
      paragrafos: [
        "Veio a adolescência e, com ela, todas as dietas da moda. Eu perdia peso fechando a boca. E, poucos meses depois, recuperava tudo.",
        "Eu achava que o problema era eu. Que me faltava força de vontade.",
      ],
      destaque: "Não era força de vontade. Era método.",
    },
    {
      titulo: "A virada",
      paragrafos: [
        "Perto dos 29 anos, eu decidi parar de tentar no escuro. Fui estudar de verdade: fisiologia do exercício, nutrição esportiva, metabolismo. Cursos, livros, conversas com quem entendia.",
        "Mas o que mudou o jogo não foi só estudar. Foi levar isso para a minha rotina de verdade, observar como o meu corpo respondia e ajustar. De novo. E de novo.",
        "Nos 12 meses seguintes, eu perdi mais de 40 kg. E ganhei músculo. Sem milagre. Sem sofrimento que não dá para sustentar.",
      ],
      destaque: "−40 kg em 12 meses. E nunca mais voltei para o meu pior momento.",
    },
    {
      titulo: "A parte que ninguém conta",
      paragrafos: [
        "Eu já engordei um pouco de novo depois disso. Todo mundo engorda. A diferença é que hoje eu percebo cedo e volto rápido.",
        "É isso que eu ensino: não é sobre nunca errar. É sobre quanto tempo você fica fora antes de voltar.",
      ],
    },
    {
      titulo: "Por que eu virei personal",
      paragrafos: [
        "Comecei ajudando amigos e família. E percebi uma coisa: a maioria das pessoas esforçadas já sabe mais ou menos o que fazer. O que falta é conseguir continuar. E ter alguém olhando de perto quando a vida aperta.",
        "Então eu me formei, me aprofundei em musculação e em transformação corporal que dura, separando o que a ciência mostra do que é mito e modismo.",
        "Hoje são mais de 20 anos de musculação e mais de 100 alunos acompanhados — no presencial em Alphaville, Barueri e Santana de Parnaíba, e online em todo o Brasil.",
      ],
    },
    {
      titulo: "O chalalá",
      paragrafos: [
        "Eu chamo de chalalá aquele detalhe a mais que faz diferença: a carga que sobe, a técnica no fim da série, o treino que você fez mesmo num dia corrido.",
        "Foi por isso que eu criei este app. Para o chalalá não depender de memória, de caderninho ou de sorte.",
      ],
    },
  ],
  fecho: "Fazendo o que precisa ser feito, por tempo suficiente, é impossível dar errado.",
};

export const CONSULTORIA = {
  abertura: "Treino é o começo.",
  subtitulo: "Acompanhamento é o que faz funcionar.",
  intro: [
    "Todo mundo já recebeu um treino. Um PDF, uma planilha, um print. E todo mundo sabe o que acontece duas semanas depois: a rotina aperta, a carga trava, a motivação some — e ninguém percebe.",
    "A minha consultoria existe para essa hora. Eu não entrego o treino e desapareço. Eu acompanho, enxergo quando algo sai do trilho e ajusto junto com você.",
  ],
  pilares: [
    { icone: "🎯", titulo: "Feito para a sua vida real", texto: "Seu objetivo, sua rotina, seu tempo, seu histórico. O plano cabe na semana que você tem, não na semana perfeita." },
    { icone: "👀", titulo: "Eu percebo antes", texto: "Sumiu uma semana? A carga parou de subir? A rotina mudou? Eu vejo no app e a gente ajusta — sem bronca, com estratégia." },
    { icone: "💬", titulo: "Direto comigo no WhatsApp", texto: "Sem intermediário. Mandou o vídeo da série, eu olho a execução e te devolvo o que ajustar." },
    { icone: "🔬", titulo: "Base científica", texto: "Volume, progressão de carga e técnica com base no que a ciência mostra — não no modismo da semana." },
  ],
  modalidades: [
    { nome: "Personal presencial", onde: "Alphaville, Barueri e Santana de Parnaíba", texto: "Eu do seu lado em cada série: corrijo a execução na hora, ajusto a carga ao seu dia e te acompanho pelo WhatsApp entre as aulas. Começa com uma avaliação e reavaliações periódicas decidem o próximo ciclo." },
    { nome: "Consultoria online", onde: "Em qualquer lugar do Brasil", texto: "Anamnese completa, treino no app com vídeo de cada exercício, revisão dos seus vídeos de execução e ajustes quando a evolução trava ou a rotina muda." },
    { nome: "Modelo híbrido", onde: "Presencial + online", texto: "Aulas presenciais para lapidar a técnica e o resto da semana pelo app. Viajou, apertou a semana? O plano se adapta." },
  ],
  passos: [
    { titulo: "Conversa gratuita", texto: "Objetivo, histórico e rotina. Sem compromisso." },
    { titulo: "Planejamento", texto: "Seu treino e seu ponto de partida, montados para a sua rotina real." },
    { titulo: "Acompanhamento ativo", texto: "Faltas, carga travada, rotina nova: a gente percebe e ajusta junto." },
    { titulo: "Evolução contínua", texto: "Reavaliações periódicas e decisões com base nos seus dados." },
  ],
  app: [
    "A carga da última vez já aparece na série — sem caderninho.",
    "Vídeo de cada exercício e as minhas observações no meio do treino.",
    "Dia corrido? O app ajusta o treino ao tempo que você tem.",
    "Volume da semana, recordes e evolução de carga para você ver que está funcionando.",
    "Troféus, Jornada do Chalalá e desafios para você continuar quando a vontade some.",
  ],
  // Mesmo padrão da página Resultados do site (fotos de antes e depois em
  // public/resultados/, textos e falas iguais aos do site).
  resultados: [
    { nome: "Adriana Nascimento", idade: 43, modalidade: "Modelo Híbrido", kg: "−20 kg", tempo: "8 meses", foto: "/resultados/adriana.webp", historia: "Adriana treinava há anos e já havia tentado diferentes esportes e métodos de treinamento, mas sem uma estratégia bem definida. Com um planejamento estruturado e treino periodizado, em poucos meses conquistou uma transformação que ela mesma não acreditava ser possível.", fala: "Finalmente entendi o que estava fazendo errado. Em 8 meses aprendi mais sobre meu corpo e minha mente do que em anos de academia." },
    { nome: "Montinho", idade: 37, modalidade: "Transformação Pessoal", kg: "−40 kg", tempo: "Uma vida toda dedicada", foto: "/resultados/montinho.webp", historia: "Durante anos, eu tentei de tudo para transformar meu corpo. Vivi o efeito sanfona, cometi erros, segui métodos que prometiam resultados rápidos e me frustrei inúmeras vezes. Quando finalmente encontrei um caminho baseado em ciência, estratégia e constância, minha vida mudou. Hoje, esse é o mesmo método que utilizo para ajudar meus alunos a conquistarem resultados reais.", fala: "Se eu consegui transformar minha própria história, acredito que posso ajudar você a transformar a sua também.", destaque: true },
    { nome: "Natália Nascimento", idade: 40, modalidade: "Personal Presencial · Alphaville", kg: "−13 kg", tempo: "9 meses", foto: "/resultados/natalia.webp", historia: "Natália já treinava há anos e sabia exatamente como executar os exercícios. Já havia conquistado um ótimo físico, mas vivia presa ao efeito sanfona. O que faltava não era esforço, e sim um planejamento estruturado, uma estratégia de treino e o suporte necessário para confiar no processo. Com consistência e acompanhamento, voltou a evoluir e conquistou uma transformação duradoura.", fala: "Percebi que não precisava treinar mais, e sim treinar com estratégia. Aprendi a confiar no processo e os resultados apareceram novamente." },
    { nome: "Elisa Cruz", idade: 34, modalidade: "Modelo Híbrido", kg: "−20 kg", tempo: "9 meses", foto: "/resultados/elisa.webp", historia: "Elisa já tinha decidido que era hora de mudar. O meu papel foi transformar essa decisão em um plano claro, adaptado à sua rotina e aos seus objetivos. Com um treino estratégico, acompanhamento próximo e confiança no processo, ela conquistou uma transformação consistente sem precisar viver em função da academia.", fala: "Ter um planejamento feito para a minha realidade fez toda a diferença. Pela primeira vez, consegui manter a consistência e ver resultados de verdade." },
    { nome: "Bruna Rodrigues", idade: 35, modalidade: "Modelo Híbrido", kg: "−22 kg", tempo: null, foto: "/resultados/bruna.webp", historia: "Durante anos, Bruna viveu entre o entusiasmo de começar e a frustração de recomeçar. O efeito sanfona parecia não ter fim. Quando me procurou, construímos um plano pensado para a vida que ela realmente levava. Aos poucos, a constância substituiu a culpa, e o resultado deixou de ser temporário para se tornar um novo estilo de vida.", fala: "Ter um treino personalizado já fez toda a diferença, mas o maior diferencial foi o suporte. Saber que meu treinador já viveu essa mesma luta me deu confiança para não desistir. Hoje tenho resultados que nunca consegui manter antes." },
  ] as { nome: string; idade: number; modalidade: string; kg: string; tempo: string | null; foto: string; historia: string; fala: string; destaque?: boolean }[],
  avisoResultados: "Estas pessoas tinham dúvidas, medos e já tinham tentado de tudo antes. O que mudou foi conseguir continuar, com alguém perto para ajustar quando a rotina mudava. E não se compare com nenhuma delas: cada um tem a própria genética, a própria rotina e a própria história. Não é promessa de resultado nem de prazo.",
  perguntas: [
    { p: "Quanto custa?", r: "Depende da modalidade, da frequência e do tempo de plano. Me chama no WhatsApp que eu te explico tudo, sem compromisso." },
    { p: "Consultoria online funciona mesmo?", r: "Com plano individual e acompanhamento de verdade, sim. Não é um PDF genérico: eu revejo os seus vídeos de execução e ajusto o plano com você." },
    { p: "Posso começar do zero?", r: "Pode. Muitos alunos chegaram sedentários ou depois de várias tentativas. O plano começa onde você está e evolui aos poucos." },
    { p: "E se eu falhar uma semana?", r: "Vai acontecer. O que importa é voltar rápido — e é exatamente aí que eu entro." },
  ],
  fecho: "Você não precisa de mais um treino. Precisa de alguém do seu lado até dar certo.",
};

export type OrigemContato = "historia" | "consultoria";

export const CONTATO: Record<OrigemContato, { ref: string; mensagem: string; botao: string }> = {
  historia: { ref: "APP-HISTORIA", mensagem: "Oi, Montinho! Li a sua história no app e quero saber como é treinar com você.", botao: "💬 Quero treinar com o Montinho" },
  consultoria: { ref: "APP-CONSULTORIA", mensagem: "Oi, Montinho! Vi a consultoria no app e quero saber os valores e como funciona.", botao: "💬 Quero saber os valores" },
};

/** Link do WhatsApp oficial com o código de origem no fim (o Montinho sabe de onde veio a conversa). */
export function linkContato(origem: OrigemContato, whatsapp: string): string {
  const c = CONTATO[origem];
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(`${c.mensagem} [${c.ref}]`)}`;
}

/** Nomes no painel de leads. */
export const ROTULO_CTA_PAGINAS: Record<string, string> = {
  historia: "📖 WhatsApp na página “Minha história”",
  consultoria: "💎 WhatsApp na página “Consultoria”",
};

/** Compartilhar: as páginas públicas do site (quem recebe não precisa de login). */
export const COMPARTILHAR: Record<OrigemContato, { url: string; titulo: string; texto: string }> = {
  historia: { url: "https://www.montinhopersonal.com.br/minha-historia", titulo: "A história do Montinho", texto: "Olha essa história: do “gordinho da turma” a −40 kg em 12 meses. Vale a leitura!" },
  consultoria: { url: "https://www.montinhopersonal.com.br/consultoria", titulo: "Consultoria Montinho", texto: "Conheça a consultoria do Montinho: treino feito para a sua rotina e acompanhamento de verdade." },
};
