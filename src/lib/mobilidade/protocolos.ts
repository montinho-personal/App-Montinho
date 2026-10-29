// ============================================================================
// Mobilidade e alongamento (pedido do Montinho, 29/10/2026): os dois
// protocolos dos vídeos do canal, com os MESMOS nomes, tempos e dicas do
// roteiro dele. Texto do Montinho: não mudar sem pedir.
// ============================================================================

export type SlugMobilidade = "superiores" | "inferiores";

/** Como o exercício é dosado: tempo (segundos) ou repetições, em séries, por lado ou não. */
export type Dose = { series: number; segundos?: number; reps?: number; porLado?: boolean; rotuloLado?: string; rotuloReps?: string };

export type ExercicioMobilidade = { id: string; nome: string; dose: Dose; dicas: string[] };
export type BlocoMobilidade = { titulo: string; exercicios: ExercicioMobilidade[] };

export type ProtocoloMobilidade = {
  slug: SlugMobilidade;
  emoji: string;
  nome: string;
  titulo: string;
  chamada: string;
  minutos: number;
  /** Vídeo do canal (Shorts) para fazer junto. */
  videoId: string;
  material: string;
  blocos: BlocoMobilidade[];
};

export const ANTES_DE_COMECAR = [
  "✅ Desconforto leve é normal (4 a 6 de 10)",
  "❌ Dor aguda, choque ou formigamento: pare",
  "✅ Respire devagar, sem prender o ar",
] as const;

export const AVISO_DOR = "⚠️ Dor forte, que piora ou não passa? Procure um médico ou fisioterapeuta.";
export const DESAFIO_7_DIAS = "🔥 Desafio 7 dias: faça todos os dias e me mande sua nota no 1º e no 7º dia.";

const ex = (id: string, nome: string, dose: Dose, ...dicas: string[]): ExercicioMobilidade => ({ id, nome, dose, dicas });

export const PROTOCOLOS: Record<SlugMobilidade, ProtocoloMobilidade> = {
  superiores: {
    slug: "superiores",
    emoji: "💪",
    nome: "Mobilidade de Superiores",
    titulo: "MOBILIDADE DE SUPERIORES",
    chamada: "Ombro, pescoço ou costas travados?",
    minutos: 22,
    videoId: "Gp9VutEudWQ",
    material: "tapete, rolo, uma parede e um bastão (cabo de vassoura)",
    blocos: [
      {
        titulo: "1. Soltar",
        exercicios: [
          ex("rolo-toracica", "Rolo na torácica", { series: 1, segundos: 40 }, "Braços cruzados, role do meio das costas até os ombros", "Vai doer, e é normal. Achou o nó? Fique parado em cima dele", "Não role sobre a lombar"),
          ex("extensao-toracica-rolo", "Extensão da torácica no rolo", { series: 2, reps: 8 }, "Mãos na nuca, deixe as costas “abraçarem” o rolo e volte", "Quadril fica no chão o tempo todo"),
          ex("rolo-lateral-tronco", "Rolo na lateral do tronco", { series: 1, segundos: 40, porLado: true }, "Braço por cima da cabeça, role da axila até as costelas", "Devagar. No ponto que dói mais, pare em cima"),
          ex("rolo-dorsal-rotacao", "Rolo no dorsal com rotação", { series: 1, segundos: 40, porLado: true }, "Rolo embaixo da lateral das costas, gire o tronco devagar sobre ele", "Respire fundo a cada giro"),
          ex("abertura-peitoral-rolo", "Abertura de peitoral no rolo", { series: 2, segundos: 30 }, "Rolo ao longo da coluna, braços abertos e relaxados", "Deixe o peso dos braços abrir o peito. Não force"),
        ],
      },
      {
        titulo: "2. Alongar",
        exercicios: [
          ex("peitoral-parede", "Peitoral na parede", { series: 2, segundos: 30, porLado: true }, "Mão na parede na altura do ombro, gire o corpo para o lado oposto", "Sentiu no peito e na frente do ombro? É aí"),
          ex("triceps-dorsal-cabeca", "Tríceps e dorsal por trás da cabeça", { series: 2, segundos: 30, porLado: true }, "Puxe o cotovelo com a outra mão e incline o tronco para o lado", "Costela para dentro, sem arquear a lombar"),
          ex("pescoco-lateral", "Pescoço lateral", { series: 2, segundos: 20, porLado: true }, "Leve a orelha em direção ao ombro, sem forçar", "O ombro do outro lado fica para baixo"),
          ex("flexores-punho", "Flexores do punho", { series: 2, segundos: 20, porLado: true }, "Braço esticado, palma para frente, puxe os dedos para trás", "Vale para quem fica o dia no computador"),
        ],
      },
      {
        titulo: "3. Mobilizar",
        exercicios: [
          ex("passagem-ombro-bastao", "Passagem de ombro com bastão", { series: 2, reps: 10 }, "Mãos bem afastadas, leve o bastão da frente do quadril até atrás das costas e volte", "Braços esticados. Travou? Afaste mais as mãos", "Pode usar cabo de vassoura ou toalha"),
          ex("rotacao-ombro-bastao", "Rotação de ombro com bastão nas costas", { series: 2, reps: 10, porLado: true }, "Bastão atrás das costas, uma mão em cima e outra embaixo", "Puxe devagar com uma mão e depois com a outra, sem forçar", "Troque a posição das mãos e repita"),
        ],
      },
      {
        titulo: "4. Ativar",
        exercicios: [
          ex("abertura-bracos-pe", "Abertura de braços em pé", { series: 2, reps: 12 }, "Braços na altura do ombro, abra bem e volte controlando", "Peito aberto, ombros longe das orelhas"),
          ex("anjo-parede", "Anjo na parede", { series: 2, reps: 10 }, "Costas, cabeça e braços encostados na parede", "Suba e desça devagar sem desencostar. Não sobe? Vá conquistando"),
        ],
      },
    ],
  },
  inferiores: {
    slug: "inferiores",
    emoji: "🦵",
    nome: "Mobilidade de Inferiores",
    titulo: "MOBILIDADE DE INFERIORES",
    chamada: "Quadril, lombar ou joelho travados?",
    minutos: 22,
    videoId: "ILCXLmG2ucQ",
    material: "tapete, rolo e uma parede ou apoio",
    blocos: [
      {
        titulo: "1. Soltar",
        exercicios: [ex("rolo-liberacao", "Rolo de liberação", { series: 1, segundos: 40, porLado: true }, "Vai doer, e é normal. Role devagar", "Achou o nó, o ponto que dói mais? Fique parado em cima dele", "Não role sobre o joelho")],
      },
      {
        titulo: "2. Alongar",
        exercicios: [
          ex("gluteo-4-deitado", "Glúteo em “4” deitado", { series: 2, segundos: 30, porLado: true }, "Cruze o tornozelo sobre o joelho e puxe a coxa em direção ao peito", "Cabeça e ombros relaxados no chão"),
          ex("posterior-deitado", "Posterior deitado", { series: 2, segundos: 30, porLado: true, rotuloLado: "cada perna" }, "Deitado, estique a perna para cima e puxe com as mãos atrás da coxa", "Não alcança? Use uma faixa, toalha ou elástico no pé"),
          ex("posterior-sentado", "Posterior sentado", { series: 2, segundos: 30, porLado: true, rotuloLado: "cada perna" }, "Uma perna estendida: coluna reta e vá com as mãos o máximo que conseguir", "O objetivo é chegar nos pés sem dobrar a coluna"),
        ],
      },
      {
        titulo: "3. Quadril",
        exercicios: [
          ex("90-90-troca", "90/90 com troca", { series: 2, reps: 10, rotuloReps: "trocas" }, "Pernas em 90°: gire os joelhos de um lado para o outro", "Devagar, sem tirar os pés do chão"),
          ex("90-90-inclinacao", "90/90 com inclinação", { series: 2, reps: 8, porLado: true }, "No 90/90, leve o peito à frente sobre a perna da frente e volte", "Coluna longa. Troque de lado no meio"),
          ex("pombo", "Pombo", { series: 2, segundos: 30, porLado: true }, "Perna da frente dobrada, a de trás estendida, quadril reto", "Mais fácil: almofada embaixo do quadril"),
        ],
      },
      {
        titulo: "4. Ajoelhado",
        exercicios: [
          ex("mobilidade-tornozelo", "Mobilidade de tornozelo", { series: 2, reps: 10, porLado: true }, "Leve o joelho da frente para a frente e volte", "Calcanhar sempre no chão"),
          ex("quadriceps-flexor-quadril", "Quadríceps e flexor do quadril", { series: 2, segundos: 30, porLado: true }, "Segure o pé de trás e puxe o calcanhar ao glúteo", "Aperte o glúteo e não arqueie a lombar", "Sem equilíbrio? Apoie na parede"),
        ],
      },
      {
        titulo: "5. Firmar",
        exercicios: [ex("prancha-isometrica", "Prancha isométrica", { series: 2, segundos: 60 }, "Corpo reto da cabeça ao calcanhar, barriga e glúteo firmes", "Muito difícil? Joelhos no chão")],
      },
      {
        titulo: "6. Finalizar",
        exercicios: [
          ex("cachorro-olhando-baixo", "Cachorro olhando para baixo", { series: 2, segundos: 40 }, "Fique parado em cima, pernas esticadas e calcanhares no chão", "Não chega? Vá até onde der e, a cada dia, force um pouco mais"),
          ex("cocoras", "Cócoras", { series: 3, segundos: 30 }, "Desça até embaixo com o calcanhar no chão; cotovelos abrem os joelhos", "Calcanhar saindo? Segure num apoio"),
        ],
      },
    ],
  },
};

export const SLUGS_MOBILIDADE = Object.keys(PROTOCOLOS) as SlugMobilidade[];
export const ehSlugMobilidade = (s: string): s is SlugMobilidade => s in PROTOCOLOS;

/** “40 s cada lado”, “2 × 8”, “2 × 1 min”, “2 × 10 trocas”. */
export function textoDose(d: Dose): string {
  const valor = d.segundos != null ? (d.segundos >= 60 && d.segundos % 60 === 0 ? `${d.segundos / 60} min` : `${d.segundos} s`) : `${d.reps}${d.rotuloReps ? ` ${d.rotuloReps}` : ""}`;
  const lado = d.porLado ? ` ${d.rotuloLado ?? "cada lado"}` : "";
  return d.series > 1 ? `${d.series} × ${valor}${lado}` : `${valor}${lado}`;
}

export const todosExercicios = (p: ProtocoloMobilidade) => p.blocos.flatMap((b) => b.exercicios);
export const linkVideo = (p: ProtocoloMobilidade) => `https://www.youtube.com/shorts/${p.videoId}`;
