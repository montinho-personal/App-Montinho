// Treinos prontos do Montinho (vitrine do visitante) — nomes de marketing +
// parâmetros. O conteúdo de cada um sai do mesmo gerador com base científica
// (src/lib/visitante/gerar-treino.ts), então segue sempre o mesmo método.
// `aprovado`: só aparece no app real depois que o Montinho aprova o nome
// (na demonstração aparecem todos, para ele ver).
import { gerarOpcoes, gerarPlanoPersonalizado, normalizarParametros, type OpcaoPlano, type ParametrosPlano, type PlanoPersonalizado } from "./gerar-treino";

export type TreinoPronto = {
  slug: string;
  /** Nome que aparece (sem nome de pessoa real nem personagem registrado). */
  nome: string;
  /** Versão com o nome real da inspiração — só aparece com USAR_NOMES_REAIS (precisa de autorização: art. 18 do Código Civil e marcas). */
  nomeReal?: string;
  emoji: string;
  chamada: string;
  descricao: string;
  /** De onde veio a ideia do treino (características do estilo). */
  inspiracao?: string;
  parametros: ParametrosPlano;
  opcao: "A" | "B";
  /** Divisão e jeito próprios (estilos clássicos); sem isto, usa a opção A/B do gerador. */
  personalizado?: PlanoPersonalizado;
  /** Desafio sugerido: N dias seguindo o treino. */
  desafioDias: number;
  aprovado: boolean;
};

/** Desligado: nomes de pessoas/personagens reais só com autorização deles. */
export const USAR_NOMES_REAIS = false;
export const nomeVisivel = (t: Pick<TreinoPronto, "nome" | "nomeReal">) => (USAR_NOMES_REAIS && t.nomeReal ? t.nomeReal : t.nome);

type Extra = Partial<Pick<TreinoPronto, "nomeReal" | "inspiracao" | "personalizado">>;
const T = (slug: string, nome: string, emoji: string, chamada: string, descricao: string, p: Partial<ParametrosPlano>, opcao: "A" | "B", desafioDias: number, aprovado = false, extra: Extra = {}): TreinoPronto => ({
  slug, nome, emoji, chamada, descricao, parametros: normalizarParametros({ ...p, ...(extra.personalizado ? { dias: extra.personalizado.sessoes.length } : {}) }), opcao, desafioDias, aprovado, ...extra,
});

export const TREINOS_PRONTOS: TreinoPronto[] = [
  // Aprovados pelo Montinho em 23/10/2026
  T("operacao-musa-do-bumbum", "Operação Musa do Bumbum", "🍑", "Glúteo em destaque, 2× na semana", "Glúteo é o primeiro exercício dos dias de inferiores e ganha mais volume, sem abandonar o resto do corpo.", { nivel: "intermediario", dias: 4, minutos: 55, foco: "gluteo" }, "A", 28, true),
  T("shape-de-verao-sem-desculpa", "Shape de Verão Sem Desculpa", "☀️", "5 dias por semana, corpo todo", "Superiores e inferiores com um dia de corpo todo: mais frequência para quem já treina.", { nivel: "intermediario", dias: 5, minutos: 55, foco: "geral" }, "A", 28, true),
  T("perna-de-aco", "Pernas de Aço", "🦵", "Quadríceps, posteriores e panturrilha", "Pernas como prioridade, com um dia só de quadríceps e outro de glúteo e posteriores.", { nivel: "intermediario", dias: 4, minutos: 60, foco: "pernas" }, "B", 28, true),
  T("peitoral-de-respeito", "Peitoral de Respeito", "🛡️", "Peito em destaque, sem esquecer o resto", "Quatro treinos diferentes, com um dia de peito, ombros e tríceps bem completo.", { nivel: "intermediario", dias: 4, minutos: 55, foco: "peito" }, "B", 28, true),
  T("missao-braco-de-respeito", "Missão Braço de Respeito", "💪", "Bíceps e tríceps em destaque", "Superiores e inferiores 2× na semana, com braços como prioridade nos dias de cima.", { nivel: "intermediario", dias: 4, minutos: 55, foco: "bracos" }, "A", 28, true),
  T("em-casa-sem-desculpa", "Em Casa, Sem Desculpa", "🏠", "Treino com halteres e peso do corpo", "Três treinos para fazer em casa, com halteres, elástico e o peso do corpo.", { nivel: "iniciante", dias: 3, minutos: 40, foco: "geral", local: "casa" }, "A", 21, true),

  // Inspirados em ícones do fitness e heróis (nomes que lembram, sem citar a pessoa/personagem)
  T("peitoral-era-de-ouro", "Peitoral Era de Ouro", "🏆", "Peito cheio, no estilo dos anos 70", "Peito e costas no mesmo dia, 2× na semana, com supino inclinado, crucifixo e pullover e bastante volume.", { nivel: "intermediario", minutos: 65, foco: "peito" }, "A", 28, true, {
    nomeReal: "Peitoral do Schwarzenegger",
    inspiracao: "Inspirado no fisiculturismo da Era de Ouro (anos 70), quando os campeões treinavam peito e costas juntos, com muito volume, supino inclinado, crucifixo e pullover.",
    personalizado: { titulo: "Peito e costas juntos, 2× na semana", sessoes: ["PEITO_COSTAS", "INF", "OMBRO_BRACO", "PEITO_COSTAS"], estilo: "volume", preferidos: ["supino-inclinado-barra", "supino-reto-barra", "crucifixo-reto-halteres", "pullover-halter", "barra-fixa-pronada", "remada-curvada-barra"] },
  }),
  T("rotina-era-de-ouro", "Rotina Era de Ouro", "🗿", "6 dias, a divisão clássica dos campeões", "Peito e costas, ombros e braços, pernas, e repete: cada músculo 2× na semana, com volume alto. Para quem já treina há tempo.", { nivel: "avancado", minutos: 75, foco: "geral" }, "A", 28, true, {
    nomeReal: "Treino do Schwarzenegger",
    inspiracao: "Inspirado na divisão dupla que os campeões dos anos 70 popularizaram: 6 dias por semana, peito e costas juntos, ombros com braços, e pernas pesadas.",
    personalizado: { titulo: "Divisão clássica 6× na semana", sessoes: ["PEITO_COSTAS", "OMBRO_BRACO", "INF", "PEITO_COSTAS", "OMBRO_BRACO", "INF"], estilo: "volume", preferidos: ["supino-inclinado-barra", "supino-reto-barra", "barra-fixa-pronada", "remada-curvada-barra", "desenvolvimento-arnold", "pullover-halter", "agachamento-livre", "stiff-barra"] },
  }),
  T("projeto-fera", "Projeto Fera", "🦍", "Força bruta e tamanho", "Poucos exercícios, cargas pesadas e 5 a 8 repetições nos básicos, com descanso maior para render.", { nivel: "intermediario", minutos: 65, foco: "geral" }, "A", 28, true, {
    nomeReal: "Projeto Hulk",
    inspiracao: "Inspirado nos gigantes verdes dos quadrinhos: treino de força com agachamento, supino, remada e terra, em cargas altas.",
    personalizado: { titulo: "Superiores e inferiores pesados 2× na semana", sessoes: ["SUP", "INF", "SUP", "INF"], estilo: "forca", preferidos: ["agachamento-livre", "supino-reto-barra", "remada-curvada-barra", "terra-romeno", "desenvolvimento-barra-em-pe", "barra-fixa-pronada"] },
  }),
  T("rainha-das-pernas", "Rainha das Pernas", "👑", "Pernas e glúteo pesados e frequentes", "Três dias de pernas e glúteo por semana, com hip thrust, agachamento e búlgaro, e dois dias de parte de cima.", { nivel: "intermediario", minutos: 60, foco: "gluteo" }, "A", 28, true, {
    nomeReal: "Treino da Graciane",
    inspiracao: "Inspirado nas musas fitness brasileiras famosas pelas pernas: inferiores pesados e frequentes, com hip thrust, agachamento e búlgaro.",
    personalizado: { titulo: "Pernas e glúteo 3× na semana", sessoes: ["GLUTEO", "SUP", "QUAD", "SUP", "GLUTEO"], estilo: "volume", preferidos: ["hip-thrust-barra", "agachamento-livre", "agachamento-bulgaro", "stiff-barra", "cadeira-abdutora", "agachamento-sumo"] },
  }),
  T("missao-super-heroi", "Missão Super-Herói", "🦸", "Ombros largos, costas em V e braços de cinema", "O treino de quem quer o corpo de herói de filme: ombros, costas e braços em destaque, sem esquecer as pernas.", { nivel: "intermediario", minutos: 55, foco: "superiores" }, "A", 28, true, {
    inspiracao: "Inspirado nas preparações de atores para filmes de heróis: muito trabalho de ombros, costas e braços para o “formato V”.",
    personalizado: { titulo: "Empurrar, puxar, pernas e ombros com braços", sessoes: ["PUSH", "PULL", "INF", "OMBRO_BRACO", "INF"] },
  }),
  T("martelo-do-trovao", "Martelo do Trovão", "⚡", "Ombros e braços de deus nórdico", "Ombros e braços em destaque com volume alto, e pernas para sustentar o martelo.", { nivel: "intermediario", minutos: 55, foco: "ombros" }, "A", 28, true, {
    inspiracao: "Inspirado nos heróis nórdicos do cinema: ombros largos e braços fortes, com muito volume nos dias de cima.",
    personalizado: { titulo: "Ombros e braços em destaque", sessoes: ["OMBRO_BRACO", "INF", "PEITO_COSTAS", "OMBRO_BRACO"], estilo: "volume" },
  }),
  T("deusa-guerreira", "Deusa Guerreira", "⚔️", "Pernas firmes, glúteo forte e core de aço", "Treino de guerreira: inferiores fortes, core firme e parte de cima completa.", { nivel: "iniciante", dias: 4, minutos: 50, foco: "gluteo" }, "A", 28, true, {
    inspiracao: "Inspirado nas heroínas guerreiras do cinema: pernas e glúteo fortes, core firme e corpo todo preparado.",
  }),
  T("fisico-classico", "Físico Clássico", "🏛️", "Costas em V, cintura fina e ombros largos", "Proporção acima de tudo: costas e ombros em destaque, 5 dias por semana. Para quem já treina há tempo.", { nivel: "avancado", dias: 5, minutos: 65, foco: "costas" }, "B", 28, true, {
    inspiracao: "Inspirado na categoria Classic Physique do fisiculturismo, que premia proporção: costas em V, ombros largos e cintura fina.",
  }),

  T("rainha-do-agachamento", "Rainha do Agachamento", "🏋️‍♀️", "Um agachamento diferente em cada série de pernas", "Dois dias de pernas por semana só com variações de agachamento: livre, sumô, búlgaro, hack, frontal, Smith e goblet, alternando entre os dias.", { nivel: "intermediario", minutos: 60, foco: "pernas" }, "A", 28, true, {
    inspiracao: "Inspirado em quem faz do agachamento o centro do treino de pernas: várias versões do mesmo movimento para trabalhar quadríceps e glúteo de ângulos diferentes.",
    personalizado: { titulo: "Agachamentos 2× na semana", sessoes: ["AGACHAMENTOS", "SUP", "AGACHAMENTOS", "SUP"], preferidos: ["agachamento-livre", "agachamento-sumo", "hack-machine", "agachamento-bulgaro", "agachamento-frontal", "agachamento-smith", "agachamento-goblet", "agachamento-pendulo"] },
  }),
  T("rei-do-supino", "Rei do Supino", "🤴", "Supino reto, inclinado, declinado e fechado", "Dois dias de peito por semana com variações de supino, carga pesada nos principais e ombros e tríceps para sustentar.", { nivel: "intermediario", minutos: 70, foco: "peito" }, "A", 28, true, {
    inspiracao: "Inspirado nos amantes do supino: o mesmo movimento em versões diferentes (barra, halteres, Smith, inclinado, declinado e fechado), com cargas altas para ganhar força.",
    personalizado: { titulo: "Supinos 2× na semana", sessoes: ["SUPINOS", "INF", "SUPINOS", "PULL"], estilo: "forca", preferidos: ["supino-reto-barra", "supino-inclinado-barra", "supino-reto-halteres", "supino-inclinado-halteres", "supino-declinado-barra", "supino-reto-smith", "supino-fechado"] },
  }),

  T("musa-da-bulgaria", "Musa da Bulgária", "🇧🇬", "Começa e termina no agachamento búlgaro", "Dois dias de pernas e glúteo por semana: abre com o búlgaro no Smith e fecha com o búlgaro com halteres. No meio, hip thrust, stiff, cadeiras e abdutora.", { nivel: "intermediario", minutos: 60, foco: "gluteo" }, "A", 28, true, {
    inspiracao: "Inspirado no agachamento búlgaro, um dos exercícios mais completos para glúteo e quadríceps: uma perna de cada vez, com o pé de trás apoiado no banco.",
    personalizado: { titulo: "Búlgaro no começo e no fim, 2× na semana", sessoes: ["BULGARA", "SUP", "BULGARA", "SUP"], preferidos: ["hip-thrust-barra", "stiff-barra", "cadeira-abdutora"] },
  }),

  // Divisões por público (pedido do Montinho em 23/10/2026)
  T("iniciante-masculino", "Iniciante Masculino", "🧔", "Para quem está começando: peito, costas e braços 2× na semana", "Três treinos por semana com máquinas fáceis de aprender: dois dias com parte de cima e dois com pernas (um deles é corpo todo).", { nivel: "iniciante", minutos: 50, foco: "superiores" }, "A", 21, true, {
    personalizado: { titulo: "Superiores, inferiores e corpo todo", sessoes: ["SUP", "INF", "FULL"] },
  }),
  T("iniciante-feminino", "Iniciante Feminino", "👩", "Para quem está começando: pernas e glúteo em destaque", "Três treinos por semana com máquinas fáceis de aprender: glúteo, corpo todo e pernas, com a parte de cima no dia do meio.", { nivel: "iniciante", minutos: 50, foco: "gluteo" }, "A", 21, true, {
    personalizado: { titulo: "Glúteo, corpo todo e inferiores", sessoes: ["GLUTEO", "FULL", "INF"] },
  }),
  T("masculino-depois-do-comeco", "Masculino", "🧔‍♂️", "Para quem já passou do começo: 5 dias, parte de cima em destaque", "Peito e costas, ombros e braços, pernas 2× na semana e um dia de superiores. Para quem já treina há alguns meses.", { nivel: "intermediario", minutos: 60, foco: "superiores" }, "A", 28, true, {
    personalizado: { titulo: "Peito e costas, pernas, ombros e braços, superiores e pernas", sessoes: ["PEITO_COSTAS", "INF", "OMBRO_BRACO", "SUP", "QUAD"] },
  }),
  T("feminino-depois-do-comeco", "Feminino", "👩‍🦰", "Para quem já passou do começo: glúteo e pernas 3× na semana", "Glúteo e posteriores, superiores, quadríceps e um dia de corpo todo. Para quem já treina há alguns meses.", { nivel: "intermediario", minutos: 60, foco: "gluteo" }, "A", 28, true, {
    personalizado: { titulo: "Glúteo, superiores, quadríceps e corpo todo", sessoes: ["GLUTEO", "SUP", "QUAD", "FULL"] },
  }),

  // Aguardando aprovação do Montinho (só na demonstração)
  T("projeto-calca-apertada", "Projeto Calça Apertada", "👖", "Pernas e glúteo para quem está começando", "Três treinos por semana, dois focados em pernas e glúteo, com máquinas fáceis de aprender.", { nivel: "iniciante", dias: 3, minutos: 45, foco: "gluteo" }, "B", 21),
  T("comeco-sem-medo", "Começo Sem Medo", "🌱", "O primeiro treino de quem nunca treinou", "Corpo todo 3× na semana, exercícios simples e poucos aparelhos. O jeito mais seguro de começar.", { nivel: "iniciante", dias: 3, minutos: 45, foco: "geral" }, "A", 21),
  T("sofa-nunca-mais", "Sofá Nunca Mais", "🛋️", "Só 2 dias por semana. Sem desculpa.", "Dois treinos de corpo todo, curtos e completos, para sair do zero e criar o hábito.", { nivel: "iniciante", dias: 2, minutos: 40, foco: "geral" }, "A", 21),
  T("sem-tempo-irmao", "Sem Tempo, Irmão", "⏱️", "30 minutos e acabou", "Corpo todo em 30 minutos, 3× na semana. Para a semana corrida não virar semana perdida.", { nivel: "intermediario", dias: 3, minutos: 30, foco: "geral" }, "A", 21),
  T("costas-em-v-de-vitoria", "Costas em V de Vitória", "🦅", "Largura e espessura nas costas", "Puxadas e remadas em primeiro lugar, 2× na semana.", { nivel: "intermediario", dias: 4, minutos: 55, foco: "costas" }, "A", 28),
];

export const prontosVisiveis = (demo: boolean) => TREINOS_PRONTOS.filter((t) => demo || t.aprovado);
export const prontoPorSlug = (slug: string) => TREINOS_PRONTOS.find((t) => t.slug === slug) ?? null;

/** O plano do treino pronto (os treinos A, B, C… com os exercícios da biblioteca). */
export function planoDoPronto(t: TreinoPronto, disponiveis: Iterable<string>): OpcaoPlano | null {
  if (t.personalizado) return gerarPlanoPersonalizado(t.parametros, t.personalizado, disponiveis);
  return gerarOpcoes(t.parametros, disponiveis).find((o) => o.id === t.opcao) ?? null;
}

/** Marca guardada nas observações dos treinos criados a partir do pronto (para o desafio). */
export const marcaDoPronto = (t: Pick<TreinoPronto, "nome" | "nomeReal">) => `Treino pronto do Montinho: ${nomeVisivel(t)}.`;
export function prontoDaMarca(observacoes: string | null | undefined): TreinoPronto | null {
  const m = (observacoes ?? "").match(/^Treino pronto do Montinho: (.+)\.$/);
  return m ? TREINOS_PRONTOS.find((t) => t.nome === m[1] || t.nomeReal === m[1]) ?? null : null;
}

/** Prontos que combinam com o pedido (mesmo foco e dias próximos), para o “Monte com IA”. */
export function prontosParecidos(p: ParametrosPlano, lista: TreinoPronto[]): TreinoPronto[] {
  return lista
    .filter((t) => t.parametros.local === p.local && (t.parametros.foco === p.foco || (p.foco === "geral" && t.parametros.foco === "geral")))
    .sort((a, b) => Math.abs(a.parametros.dias - p.dias) - Math.abs(b.parametros.dias - p.dias))
    .slice(0, 2);
}

/** Desafio: treinos feitos desde o início, dentro dos N dias. Meta = dias por semana × semanas. */
export function progressoDesafio(t: Pick<TreinoPronto, "desafioDias" | "parametros">, inicio: string, hoje: string, datasTreinos: string[]): { feitos: number; meta: number; diaAtual: number; terminou: boolean; concluido: boolean } {
  const dia = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 86_400_000);
  const diaAtual = Math.max(1, dia(hoje) - dia(inicio) + 1);
  const fim = dia(inicio) + t.desafioDias - 1;
  const feitos = datasTreinos.filter((d) => dia(d) >= dia(inicio) && dia(d) <= fim).length;
  const meta = Math.round((t.desafioDias / 7) * t.parametros.dias);
  return { feitos, meta, diaAtual: Math.min(diaAtual, t.desafioDias), terminou: diaAtual > t.desafioDias, concluido: feitos >= meta };
}

/** Marca dos treinos salvos pelo “Monte com IA” (para contar quantos usam). */
export const MARCA_MONTE_IA = "Montado no Monte com IA do Montinho.";
