// “Como filmar o seu exercício” (04/11/2026, pedido do Montinho: “ter no menu,
// ensinando a pessoa como gravar”). Mesmo vídeo e mesmas regras da página do site
// /videos/como-filmar-seu-exercicio. Trocou o vídeo? Mude só o VIDEO_ID.

export const VIDEO_COMO_FILMAR_ID = "L5w4DBU2la8";
export const VIDEO_COMO_FILMAR_URL = `https://www.youtube.com/shorts/${VIDEO_COMO_FILMAR_ID}`;
export const VIDEO_COMO_FILMAR_EMBED = `https://www.youtube.com/embed/${VIDEO_COMO_FILMAR_ID}?rel=0&modestbranding=1&playsinline=1`;
/** Tela do app com o vídeo e as regras. */
export const TELA_COMO_FILMAR = "/aluno/como-filmar";

export const REGRAS_FILMAR: Array<{ emoji: string; titulo: string; texto: string }> = [
  { emoji: "↔️", titulo: "Filme de lado", texto: "É o ângulo que mostra profundidade, coluna, tronco e o caminho da barra. Na dúvida, de lado." },
  { emoji: "📏", titulo: "Câmera na altura da articulação", texto: "Exercício de perna: na altura do quadril. De tronco: na altura do ombro. Nem do chão, nem de cima." },
  { emoji: "🧍", titulo: "Corpo inteiro no quadro", texto: "Com a carga e os pés dentro da imagem, a uns 2 a 3 metros de distância." },
  { emoji: "🔁", titulo: "Grave a série inteira", texto: "A técnica aparece nas primeiras e, principalmente, nas últimas repetições, quando o cansaço chega." },
];

export const DICAS_FILMAR = [
  "Sem tripé? Apoie o celular numa garrafa, mochila, anilha, banco ou na própria máquina.",
  "Se alguém filmar para você, a pessoa fica parada, na altura certa, sem seguir o movimento.",
  "Vergonha todo mundo sente: escolha um horário mais vazio e deixe a câmera virada para a parede. O vídeo fica só entre nós dois.",
];

export const O_QUE_O_MONTINHO_OLHA = ["Amplitude", "Coluna", "Joelho entrando", "Cotovelo saindo do lugar", "Tronco balançando"];
