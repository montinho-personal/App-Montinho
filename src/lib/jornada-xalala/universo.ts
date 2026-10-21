// ============================================================================
// A JORNADA DO XALALÁ — universo narrativo (PURO, sem dados do aluno).
//
// Capítulos são agrupamentos narrativos, não bloqueios: a organização visual
// reaproveita CAPITULO_DA_MEDALHA (lib/conquistas/jornada.ts) e o estado de
// cada medalha vem do motor oficial. Aqui ficam só nomes, cenários, falas e
// personagens. Textos seguem as mesmas proibições da biblioteca editorial
// (sem “21 dias”, sem culpa, sem promessa de resultado).
// ============================================================================

export type RegiaoXalala = "bosque" | "ponte" | "mirante" | "montanhas" | "horizonte";

export type CapituloXalala = {
  numero: number;
  /** Título com a voz do Montinho. */
  titulo: string;
  /** Nome do lugar no universo. */
  lugar: string;
  regiao: RegiaoXalala;
  /** Frase narrativa (abre o capítulo no mapa). */
  narrativa: string;
  /** O que acontece aqui (uma linha, para o cabeçalho). */
  tema: string;
  /** Sensação que o cenário deve transmitir (guia de arte). */
  sensacao: string;
};

export const CAPITULOS_XALALA: CapituloXalala[] = [
  { numero: 1, titulo: "Bora começar!", lugar: "Bosque dos Primeiros Passos", regiao: "bosque", narrativa: "Toda grande história começa com um primeiro passo. E você acabou de dar o seu. Chalalá!", tema: "Primeiros treinos, primeiros registros, início do acompanhamento.", sensacao: "curiosidade, entusiasmo e acolhimento" },
  { numero: 2, titulo: "Um passo de cada vez", lugar: "Ponte da Constância", regiao: "ponte", narrativa: "Não é sobre correr. É sobre encontrar um ritmo que faça sentido pra você.", tema: "Regularidade, metas da semana, construção da rotina.", sensacao: "confiança, estabilidade e continuidade" },
  { numero: 3, titulo: "Olha até onde você chegou!", lugar: "Mirante das Conquistas", regiao: "mirante", narrativa: "Olha só quanta história você já construiu. E ainda tem muito Xalalá pela frente!", tema: "Recordes, evolução, registros e autoconhecimento.", sensacao: "orgulho, reconhecimento e descoberta" },
  { numero: 4, titulo: "A vida acontece. A gente continua.", lugar: "Montanhas da Vida Real", regiao: "montanhas", narrativa: "Às vezes a vida muda os planos. Tudo bem. O importante é saber que seu caminho continua aqui.", tema: "Retornos depois de pausas, reorganização, continuidade.", sensacao: "resiliência, tranquilidade e autonomia" },
  { numero: 5, titulo: "O Xalalá continua!", lugar: "Horizonte das Novas Aventuras", regiao: "horizonte", narrativa: "Você descobriu que o mais importante não é chegar ao fim. É continuar construindo uma vida que vale a pena viver.", tema: "Seis meses, um ano, novos ciclos e novos objetivos.", sensacao: "liberdade, pertencimento e continuidade" },
];

/** Mensagens das microinterações (texto fixo; o acontecimento é real). */
export const FALAS_XALALA = {
  primeiroTreino: "A aventura começou! Chalalá!",
  medalha: "Toque na medalha pra descobrir o que ela significa.",
  recorde: "Olha só! Mais uma conquista pra sua história!",
  semanaConsistente: "Mais uma semana no ritmo. A lanterna da trilha acendeu.",
  retorno: "Que bom te ver por aqui! Seu caminho estava esperando por você.",
  pausa: "Pausa combinada. O caminho fica guardado.",
  aniversario: (meses: number) => `${meses} meses de caminhada. Olha quanta coisa aconteceu até aqui.`,
  lema: "Não é só sobre começar. É sobre conseguir continuar.",
} as const;

export type PersonagemXalala = {
  id: "montinho" | "pingo" | "tempo" | "vira";
  nome: string;
  papel: string;
  personalidade: string;
  /** Quando aparece (nunca mais de um por tela). */
  quando: string;
  /** Guia de arte: o que a ilustração definitiva precisa ter. */
  arte: string;
  /** Fala curta de exemplo (voz do personagem). */
  fala: string;
};

export const PERSONAGENS_XALALA: PersonagemXalala[] = [
  {
    id: "montinho",
    nome: "Montinho",
    papel: "O Guia",
    personalidade: "Orientação, incentivo, acolhimento e humor. Nunca julga.",
    quando: "Abertura de capítulo e mensagens escritas pelo próprio personal.",
    arte: "Representação simbólica provisória: silhueta de guia de trilha com o halter “M” da marca no peito, sem rosto definido. A aparência real do Montinho só entra com referência visual aprovada por ele.",
    fala: "Bora treinar? O chalalá não vai acontecer sozinho!",
  },
  {
    id: "pingo",
    nome: "Pingo",
    papel: "O Explorador",
    personalidade: "Curioso, expressivo e divertido. Celebra cada descoberta.",
    quando: "Medalha nova, recorde e “Montinho Desbloqueia”.",
    arte: "Pequeno explorador redondo com cachecol e lanterna dourada; proporção adulta de mascote de aventura (não brinquedo). Olhos grandes e simples, sem boca exagerada.",
    fala: "Olha só! Mais uma conquista pra sua história!",
  },
  {
    id: "tempo",
    nome: "Tempo",
    papel: "O Guardião do Ritmo",
    personalidade: "Paciente. Respeita o ritmo de cada um.",
    quando: "Semanas consistentes e mensagens sobre continuidade.",
    arte: "Tartaruga exploradora com mochila e bússola; casco com textura discreta em verde-floresta e detalhes em dourado.",
    fala: "Não é sobre correr. É sobre encontrar o seu ritmo.",
  },
  {
    id: "vira",
    nome: "Vira",
    papel: "O Símbolo do Recomeço",
    personalidade: "Leve. Volta sempre, sem drama.",
    quando: "Retornos depois de pausas.",
    arte: "Ave estilizada (andorinha) em azul-montanha com ponta de asa dourada; traço limpo, sem fantasia.",
    fala: "Que bom te ver por aqui! Seu caminho estava esperando por você.",
  },
];

/** Paleta do universo (complementa a do app; dourado = progresso e pontos de interesse). */
export const PALETA_XALALA = {
  grafite: "#171B21",
  dourado: "#BA9E50",
  douradoClaro: "#E3CD8A",
  floresta: "#436657",
  montanha: "#54768A",
  terracota: "#C18B61",
} as const;
