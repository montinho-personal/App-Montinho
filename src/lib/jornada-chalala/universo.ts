// ============================================================================
// A JORNADA DO CHALALÁ — universo narrativo (PURO, sem dados do aluno).
//
// Capítulos são agrupamentos narrativos, não bloqueios: a organização visual
// reaproveita CAPITULO_DA_MEDALHA (lib/conquistas/jornada.ts) e o estado de
// cada medalha vem do motor oficial. Aqui ficam só nomes, cenários, falas e
// personagens. Textos seguem as mesmas proibições da biblioteca editorial
// (sem “21 dias”, sem culpa, sem promessa de resultado).
// ============================================================================

export type RegiaoChalala = "bosque" | "ponte" | "mirante" | "montanhas" | "horizonte";

export type CapituloChalala = {
  numero: number;
  /** Título com a voz do Montinho. */
  titulo: string;
  /** Nome do lugar no universo. */
  lugar: string;
  regiao: RegiaoChalala;
  /** Frase narrativa (abre o capítulo no mapa). */
  narrativa: string;
  /** O que acontece aqui (uma linha, para o cabeçalho). */
  tema: string;
  /** Sensação que o cenário deve transmitir (guia de arte). */
  sensacao: string;
};

export const CAPITULOS_CHALALA: CapituloChalala[] = [
  { numero: 1, titulo: "Bora começar!", lugar: "Bosque dos Primeiros Passos", regiao: "bosque", narrativa: "Toda grande história começa com um primeiro passo. E você acabou de dar o seu. Chalalá!", tema: "Primeiros treinos, primeiros registros, início do acompanhamento.", sensacao: "curiosidade, entusiasmo e acolhimento" },
  { numero: 2, titulo: "Um passo de cada vez", lugar: "Ponte da Constância", regiao: "ponte", narrativa: "Não é sobre correr. É sobre encontrar um ritmo que faça sentido pra você.", tema: "Regularidade, metas da semana, construção da rotina.", sensacao: "confiança, estabilidade e continuidade" },
  { numero: 3, titulo: "Olha até onde você chegou!", lugar: "Mirante das Conquistas", regiao: "mirante", narrativa: "Olha só quanta história você já construiu. E ainda tem muito Chalalá pela frente!", tema: "Recordes, evolução, registros e autoconhecimento.", sensacao: "orgulho, reconhecimento e descoberta" },
  { numero: 4, titulo: "A vida acontece. A gente continua.", lugar: "Montanhas da Vida Real", regiao: "montanhas", narrativa: "Às vezes a vida muda os planos. Tudo bem. O importante é saber que seu caminho continua aqui.", tema: "Retornos depois de pausas, reorganização, continuidade.", sensacao: "resiliência, tranquilidade e autonomia" },
  { numero: 5, titulo: "O Chalalá continua!", lugar: "Horizonte das Novas Aventuras", regiao: "horizonte", narrativa: "Você descobriu que o mais importante não é chegar ao fim. É continuar construindo uma vida que vale a pena viver.", tema: "Seis meses, um ano, novos ciclos e novos objetivos.", sensacao: "liberdade, pertencimento e continuidade" },
];

/** Mensagens das microinterações (texto fixo; o acontecimento é real). */
export const FALAS_CHALALA = {
  primeiroTreino: "A aventura começou! Chalalá!",
  medalha: "Toque na medalha pra descobrir o que ela significa.",
  recorde: "Olha só! Mais uma conquista pra sua história!",
  semanaConsistente: "Mais uma semana no ritmo. A lanterna da trilha acendeu.",
  retorno: "Que bom te ver por aqui! Seu caminho estava esperando por você.",
  pausa: "Pausa combinada. O caminho fica guardado.",
  aniversario: (meses: number) => `${meses} meses de caminhada. Olha quanta coisa aconteceu até aqui.`,
  lema: "Não é só sobre começar. É sobre conseguir continuar.",
} as const;

export type PersonagemChalala = {
  id: "montinho" | "colombo" | "oddway" | "fenix";
  nome: string;
  papel: string;
  /** Explicação curta (abre ao tocar no personagem). */
  resumo: string;
  personalidade: string;
  /** Quando aparece (nunca mais de um por tela). */
  quando: string;
  /** Guia de arte: o que a ilustração definitiva precisa ter. */
  arte: string;
  /** Fala curta de exemplo (voz do personagem). */
  fala: string;
};

/** Nomes e papéis aprovados pelo Montinho em 21/10/2026. */
export const PERSONAGENS_CHALALA: PersonagemChalala[] = [
  {
    id: "montinho",
    nome: "Montinho",
    papel: "O Guia",
    resumo: "Aparece em momentos especiais, como o Mestre dos Magos, trazendo conselhos, humor e motivação.",
    personalidade: "Orientação, incentivo, acolhimento e humor. Nunca julga.",
    quando: "Abertura de capítulo, mensagens escritas pelo próprio personal e momentos especiais da jornada.",
    arte: "Representação simbólica provisória: silhueta de guia de trilha com o halter “M” da marca no peito, sem rosto definido. A aparência real do Montinho só entra com referência visual aprovada por ele.",
    fala: "Bora treinar? O chalalá não vai acontecer sozinho!",
  },
  {
    id: "colombo",
    nome: "Colombo",
    papel: "O Explorador",
    resumo: "Curioso, aventureiro e divertido. Representa a descoberta de novos caminhos e celebra as conquistas do aluno.",
    personalidade: "Curioso, aventureiro e divertido. Celebra cada descoberta.",
    quando: "Próxima conquista, medalha nova, recorde e “Montinho Desbloqueia”.",
    arte: "Pequeno explorador redondo com gorro, cachecol e lanterna dourada; proporção adulta de mascote de aventura (não brinquedo). Olhos grandes e simples.",
    fala: "Olha só! Mais uma conquista pra sua história!",
  },
  {
    id: "oddway",
    nome: "Mestre Oddway",
    papel: "O Guardião do Ritmo",
    resumo: "A tartaruga sábia que ensina sobre paciência, constância e respeito ao próprio tempo.",
    personalidade: "Paciente e sábio. Respeita o ritmo de cada um.",
    quando: "Fases do protocolo, semanas consistentes e mensagens sobre continuidade.",
    arte: "Tartaruga exploradora com mochila e bússola; casco com textura discreta em verde-floresta e detalhes em dourado.",
    fala: "Não é sobre correr. É sobre encontrar o seu ritmo.",
  },
  {
    id: "fenix",
    nome: "Fênix",
    papel: "O Símbolo do Recomeço",
    resumo: "Representa a capacidade de voltar depois de uma pausa, sem perder a história construída.",
    personalidade: "Leve e serena. Volta sempre, sem drama.",
    quando: "Retornos depois de pausas e na região das Montanhas da Vida Real.",
    arte: "Ave estilizada em azul-montanha com cauda e pontas das asas em chamas douradas e terracota; traço limpo, sem exagero fantástico.",
    fala: "Que bom te ver por aqui! Seu caminho estava esperando por você.",
  },
];

export const personagemPorId = (id: PersonagemChalala["id"]) => PERSONAGENS_CHALALA.find((p) => p.id === id)!;

/** Paleta do universo (complementa a do app; dourado = progresso e pontos de interesse). */
export const PALETA_CHALALA = {
  grafite: "#171B21",
  dourado: "#BA9E50",
  douradoClaro: "#E3CD8A",
  floresta: "#436657",
  montanha: "#54768A",
  terracota: "#C18B61",
} as const;
