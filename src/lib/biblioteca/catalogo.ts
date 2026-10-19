// ============================================================================
// Catálogo oficial de exercícios do Montinho (150 exercícios fundamentais).
//
// • `slug` é o identificador ÚNICO E ESTÁVEL (nunca renomear: é a chave do
//   upsert no banco e das substituições). O nome pode ser corrigido à vontade.
// • `grupo` = músculo principal (conta como série DIRETA no volume semanal).
// • `p` = músculos secundários e o peso de cada um na estimativa PONDERADA
//   (fração de série; critério explícito e ajustável na tabela de volume).
// • `sub` = substituições curadas (slugs). São SUGESTÕES: o personal aprova
//   ou rejeita cada uma na biblioteca; nada é tratado como equivalente só
//   porque trabalha o mesmo músculo.
// • Nenhum vídeo é cadastrado aqui: mídia só entra quando o treinador a
//   adiciona e marca como verificada (a biblioteca sinaliza a pendência).
// • Os nomes da biblioteca de demonstração do ZIP original foram mantidos
//   como sinônimos (ex.: "Supino inclinado halter"), evitando duplicatas.
// ============================================================================

import type { Equipamento, GrupoMuscular } from "@/lib/supabase/types-extended";
import type { Articulacao, CampoRegistro, ExercicioCatalogo, Nivel, PadraoMovimento, RegiaoEstresse } from "./tipos";

type Def = {
  s?: string[];
  p?: Partial<Record<GrupoMuscular, number>>;
  pad: PadraoMovimento;
  art: Articulacao[];
  eq: Equipamento[];
  t: "multi" | "mono";
  n?: Nivel;
  exe: string[];
  err: string[];
  sub: string[];
  reg?: CampoRegistro[];
  est?: RegiaoEstresse[];
  cv?: boolean;
};

function ex(slug: string, nome: string, grupo: GrupoMuscular, d: Def): ExercicioCatalogo {
  return {
    slug,
    nome,
    sinonimos: d.s ?? [],
    grupo,
    pesosSecundarios: d.p ?? {},
    padrao: d.pad,
    articulacoes: d.art,
    equipamento: d.eq,
    tipo: d.t === "multi" ? "multiarticular" : "monoarticular",
    nivel: d.n ?? "iniciante",
    execucao: d.exe,
    erros: d.err,
    substituicoes: d.sub,
    registro: d.reg ?? ["carga", "repeticoes"],
    estresse: d.est ?? [],
    contaVolume: d.cv ?? true,
  };
}

const EMP_H: Articulacao[] = ["ombro", "cotovelo", "escapula"];
const PUX: Articulacao[] = ["ombro", "cotovelo", "escapula"];
const AGACH: Articulacao[] = ["quadril", "joelho", "tornozelo"];
const DOBRA: Articulacao[] = ["quadril", "coluna"];

export const CATALOGO: ExercicioCatalogo[] = [
  // ==========================================================================
  // PEITORAL (16)
  // ==========================================================================
  ex("supino-reto-barra", "Supino reto com barra", "peito", {
    s: ["supino reto", "supino reto barra", "bench press", "supino livre"],
    p: { triceps: 0.5, ombro_anterior: 0.5 }, pad: "empurrar_horizontal", art: EMP_H, eq: ["barra", "banco"], t: "multi", n: "intermediario",
    exe: ["Escápulas encaixadas e pés firmes no chão.", "Desça a barra controlada até a linha do mamilo.", "Empurre até quase estender os cotovelos, sem tirar o quadril do banco."],
    err: ["Cotovelos totalmente abertos a 90° do tronco.", "Quicar a barra no peito.", "Tirar o quadril do banco para subir mais carga."],
    sub: ["supino-reto-halteres", "supino-reto-maquina", "supino-reto-smith"], est: ["ombro"],
  }),
  ex("supino-reto-halteres", "Supino reto com halteres", "peito", {
    s: ["supino halter", "supino reto halter", "dumbbell press"],
    p: { triceps: 0.5, ombro_anterior: 0.5 }, pad: "empurrar_horizontal", art: EMP_H, eq: ["halter", "banco"], t: "multi",
    exe: ["Leve os halteres ao peito com antebraços na vertical.", "Desça até sentir alongamento no peitoral, cotovelos a cerca de 45–60°.", "Empurre aproximando levemente os halteres no topo."],
    err: ["Descer além do confortável para o ombro.", "Bater os halteres no topo e perder tensão.", "Arquear a lombar excessivamente."],
    sub: ["supino-reto-barra", "supino-reto-maquina", "flexao-de-bracos"], est: ["ombro"],
  }),
  ex("supino-reto-maquina", "Supino reto na máquina", "peito", {
    s: ["supino máquina", "chest press", "supino articulado"],
    p: { triceps: 0.5, ombro_anterior: 0.5 }, pad: "empurrar_horizontal", art: EMP_H, eq: ["maquina"], t: "multi",
    exe: ["Ajuste o banco para as pegadas ficarem na altura do meio do peito.", "Mantenha as costas apoiadas e escápulas encaixadas.", "Empurre e volte devagar, sem deixar o peso encostar."],
    err: ["Banco alto demais, empurrando com o ombro.", "Tirar as costas do encosto.", "Amplitude curta por excesso de carga."],
    sub: ["supino-reto-halteres", "supino-reto-barra", "supino-reto-smith"],
  }),
  ex("supino-inclinado-barra", "Supino inclinado com barra", "peito", {
    s: ["supino inclinado", "incline bench press"],
    p: { ombro_anterior: 0.5, triceps: 0.5 }, pad: "empurrar_inclinado", art: EMP_H, eq: ["barra", "banco"], t: "multi", n: "intermediario",
    exe: ["Banco entre 30° e 45°.", "Desça a barra até a parte alta do peito.", "Empurre na vertical, mantendo as escápulas encaixadas."],
    err: ["Banco muito inclinado, virando desenvolvimento.", "Barra descendo no pescoço.", "Perder o apoio dos pés."],
    sub: ["supino-inclinado-halteres", "supino-inclinado-maquina", "supino-inclinado-smith"], est: ["ombro"],
  }),
  ex("supino-inclinado-halteres", "Supino inclinado com halteres", "peito", {
    s: ["supino inclinado halter", "incline dumbbell press"],
    p: { ombro_anterior: 0.5, triceps: 0.5 }, pad: "empurrar_inclinado", art: EMP_H, eq: ["halter", "banco"], t: "multi",
    exe: ["Banco entre 30° e 45°, halteres na linha da parte alta do peito.", "Desça controlando até um alongamento confortável.", "Suba aproximando os halteres sem encostá-los."],
    err: ["Abrir demais os cotovelos.", "Usar impulso do quadril.", "Amplitude curta."],
    sub: ["supino-inclinado-barra", "supino-inclinado-maquina", "supino-inclinado-smith"], est: ["ombro"],
  }),
  ex("supino-inclinado-maquina", "Supino inclinado na máquina", "peito", {
    s: ["supino inclinado máquina", "incline chest press"],
    p: { ombro_anterior: 0.5, triceps: 0.5 }, pad: "empurrar_inclinado", art: EMP_H, eq: ["maquina"], t: "multi",
    exe: ["Ajuste o assento para a pegada ficar na parte alta do peito.", "Costas apoiadas e peito aberto.", "Empurre e retorne em 2–3 segundos."],
    err: ["Assento baixo, levando a força para o ombro.", "Encolher os ombros.", "Retorno sem controle."],
    sub: ["supino-inclinado-halteres", "supino-inclinado-barra", "supino-inclinado-smith"],
  }),
  ex("supino-declinado-barra", "Supino declinado com barra", "peito", {
    s: ["supino declinado", "decline bench press"],
    p: { triceps: 0.5, ombro_anterior: 0.25 }, pad: "empurrar_horizontal", art: EMP_H, eq: ["barra", "banco"], t: "multi", n: "intermediario",
    exe: ["Prenda bem as pernas no apoio do banco declinado.", "Desça a barra até a parte baixa do peito.", "Empurre mantendo os punhos alinhados com os cotovelos."],
    err: ["Descer a barra no pescoço.", "Peso alto sem ajudante.", "Punhos dobrados para trás."],
    sub: ["supino-reto-barra", "crossover-polia-alta", "mergulho-paralelas"],
  }),
  ex("supino-reto-smith", "Supino reto no Smith", "peito", {
    s: ["supino smith", "smith press"],
    p: { triceps: 0.5, ombro_anterior: 0.5 }, pad: "empurrar_horizontal", art: EMP_H, eq: ["smith", "banco"], t: "multi",
    exe: ["Posicione o banco para a barra descer na linha do mamilo.", "Destrave a barra com as escápulas encaixadas.", "Desça controlando e empurre sem travar os cotovelos."],
    err: ["Banco mal posicionado, barra no pescoço ou no abdômen.", "Esquecer de travar a barra ao terminar.", "Quicar no peito."],
    sub: ["supino-reto-barra", "supino-reto-maquina", "supino-reto-halteres"], est: ["ombro"],
  }),
  ex("supino-inclinado-smith", "Supino inclinado no Smith", "peito", {
    s: ["supino inclinado smith"],
    p: { ombro_anterior: 0.5, triceps: 0.5 }, pad: "empurrar_inclinado", art: EMP_H, eq: ["smith", "banco"], t: "multi",
    exe: ["Banco a 30–45° alinhado para a barra descer na parte alta do peito.", "Escápulas encaixadas.", "Empurre sem travar os cotovelos."],
    err: ["Banco mal alinhado.", "Ombros subindo em direção às orelhas.", "Amplitude curta."],
    sub: ["supino-inclinado-barra", "supino-inclinado-halteres", "supino-inclinado-maquina"], est: ["ombro"],
  }),
  ex("crucifixo-reto-halteres", "Crucifixo reto com halteres", "peito", {
    s: ["crucifixo", "crucifixo reto", "dumbbell fly"],
    p: { ombro_anterior: 0.25 }, pad: "aducao_horizontal", art: ["ombro"], t: "mono", eq: ["halter", "banco"],
    exe: ["Cotovelos levemente flexionados e fixos durante todo o movimento.", "Abra os braços até sentir alongamento no peitoral.", "Feche como se abraçasse uma árvore."],
    err: ["Flexionar e estender o cotovelo (vira supino).", "Descer além do confortável para o ombro.", "Carga alta perdendo a técnica."],
    sub: ["crucifixo-maquina", "crossover-polia-media", "crucifixo-inclinado-halteres"], est: ["ombro"],
  }),
  ex("crucifixo-inclinado-halteres", "Crucifixo inclinado com halteres", "peito", {
    s: ["crucifixo inclinado", "incline fly"],
    p: { ombro_anterior: 0.25 }, pad: "aducao_horizontal", art: ["ombro"], t: "mono", eq: ["halter", "banco"],
    exe: ["Banco a 30°, cotovelos levemente flexionados.", "Abra os braços em arco até o alongamento.", "Feche na linha da parte alta do peito."],
    err: ["Transformar em supino.", "Amplitude exagerada.", "Banco muito inclinado."],
    sub: ["crossover-polia-baixa", "crucifixo-reto-halteres", "crucifixo-maquina"], est: ["ombro"],
  }),
  ex("crucifixo-maquina", "Crucifixo na máquina (peck deck)", "peito", {
    s: ["peck deck", "voador", "crucifixo máquina", "fly máquina", "pec deck"],
    p: { ombro_anterior: 0.25 }, pad: "aducao_horizontal", art: ["ombro"], t: "mono", eq: ["maquina"],
    exe: ["Ajuste o assento para as alças ficarem na altura do peito.", "Costas apoiadas e cotovelos levemente flexionados.", "Feche os braços contraindo o peitoral e volte devagar."],
    err: ["Assento baixo ou alto demais.", "Projetar a cabeça para frente.", "Deixar o peso bater no retorno."],
    sub: ["crossover-polia-media", "crucifixo-reto-halteres"],
  }),
  ex("crossover-polia-alta", "Crossover na polia alta", "peito", {
    s: ["crossover", "cross over", "cruzamento de cabos", "crossover alto"],
    p: { ombro_anterior: 0.25 }, pad: "aducao_horizontal", art: ["ombro"], t: "mono", eq: ["polia"],
    exe: ["Polias acima da cabeça, um pé à frente e tronco levemente inclinado.", "Traga as mãos para baixo e para frente, na linha do abdômen.", "Volte controlando até o alongamento."],
    err: ["Usar o peso do corpo para puxar.", "Flexionar demais os cotovelos.", "Encolher os ombros."],
    sub: ["crossover-polia-media", "crucifixo-maquina", "supino-declinado-barra"],
  }),
  ex("crossover-polia-baixa", "Crossover na polia baixa", "peito", {
    s: ["crossover baixo", "low cable fly"],
    p: { ombro_anterior: 0.25 }, pad: "aducao_horizontal", art: ["ombro"], t: "mono", eq: ["polia"],
    exe: ["Polias na altura mais baixa.", "Traga as mãos de baixo para cima até a altura do peito.", "Cotovelos levemente flexionados e fixos."],
    err: ["Elevar os ombros.", "Puxar com bíceps.", "Arquear a lombar."],
    sub: ["crucifixo-inclinado-halteres", "crossover-polia-media"],
  }),
  ex("crossover-polia-media", "Crucifixo na polia (altura média)", "peito", {
    s: ["crucifixo polia", "cable fly", "crossover médio"],
    p: { ombro_anterior: 0.25 }, pad: "aducao_horizontal", art: ["ombro"], t: "mono", eq: ["polia"],
    exe: ["Polias na altura do ombro.", "Feche as mãos à frente do peito em arco.", "Volte devagar até o alongamento."],
    err: ["Transformar em empurrar.", "Corpo balançando.", "Cotovelos estendidos e travados."],
    sub: ["crucifixo-maquina", "crucifixo-reto-halteres", "crossover-polia-alta"],
  }),
  ex("flexao-de-bracos", "Flexão de braços", "peito", {
    s: ["flexão", "apoio", "push up", "flexão de braço"],
    p: { triceps: 0.5, ombro_anterior: 0.5, core: 0.25 }, pad: "empurrar_horizontal", art: EMP_H, eq: ["peso_corporal"], t: "multi",
    exe: ["Mãos um pouco mais abertas que os ombros e corpo alinhado.", "Desça o peito até perto do chão.", "Empurre mantendo abdômen e glúteos contraídos."],
    err: ["Quadril caindo ou empinado.", "Cotovelos abertos a 90°.", "Amplitude curta."],
    sub: ["supino-reto-halteres", "supino-reto-maquina"], reg: ["repeticoes", "carga"],
  }),

  // ==========================================================================
  // COSTAS (20)
  // ==========================================================================
  ex("puxada-frontal-aberta", "Puxada frontal aberta (pulley)", "costas", {
    s: ["pulley", "pulley frente", "puxada frontal", "puxada aberta", "lat pulldown", "pulldown", "puxada no pulley", "puxada alta"],
    p: { biceps: 0.5, ombro_posterior: 0.25 }, pad: "puxar_vertical", art: PUX, eq: ["polia"], t: "multi",
    exe: ["Pegada pronada um pouco mais aberta que os ombros, coxas presas no apoio.", "Puxe a barra até a parte alta do peito, levando os cotovelos para baixo.", "Suba controlando até alongar as costas."],
    err: ["Puxar atrás da nuca.", "Jogar o tronco para trás com impulso.", "Puxar só com os braços, sem descer as escápulas."],
    sub: ["puxada-maquina-articulada", "barra-fixa-pronada", "barra-fixa-graviton"],
  }),
  ex("puxada-frontal-supinada", "Puxada frontal supinada", "costas", {
    s: ["puxada supinada", "pulley supinado", "pulldown supinado"],
    p: { biceps: 0.75 }, pad: "puxar_vertical", art: PUX, eq: ["polia"], t: "multi",
    exe: ["Pegada supinada na largura dos ombros.", "Puxe a barra até o peito com os cotovelos junto ao corpo.", "Suba controlando."],
    err: ["Jogar o tronco para trás.", "Cotovelos abrindo.", "Amplitude curta no alto."],
    sub: ["barra-fixa-supinada", "puxada-triangulo", "puxada-frontal-aberta"],
  }),
  ex("puxada-triangulo", "Puxada com triângulo (pegada neutra)", "costas", {
    s: ["puxada triângulo", "pulley triângulo", "puxada neutra", "pulldown neutro"],
    p: { biceps: 0.5 }, pad: "puxar_vertical", art: PUX, eq: ["polia"], t: "multi",
    exe: ["Triângulo na barra alta, tronco levemente inclinado para trás.", "Puxe até o peito levando os cotovelos para baixo e para trás.", "Retorne até estender os braços."],
    err: ["Balançar o tronco.", "Encolher os ombros.", "Retorno rápido."],
    sub: ["puxada-frontal-supinada", "puxada-frontal-aberta", "puxada-maquina-articulada"],
  }),
  ex("puxada-unilateral-polia", "Puxada unilateral na polia", "costas", {
    s: ["puxada unilateral", "pulldown unilateral"],
    p: { biceps: 0.5 }, pad: "puxar_vertical", art: PUX, eq: ["polia"], t: "multi",
    exe: ["Sentado ou ajoelhado, segure a alça com uma mão.", "Puxe o cotovelo em direção ao quadril.", "Volte alongando a lateral das costas."],
    err: ["Girar o tronco para ajudar.", "Puxar com o bíceps.", "Encolher o ombro."],
    sub: ["puxada-frontal-aberta", "puxada-triangulo"],
  }),
  ex("puxada-maquina-articulada", "Puxada na máquina articulada", "costas", {
    s: ["puxada máquina", "puxada articulada", "pulldown máquina"],
    p: { biceps: 0.5 }, pad: "puxar_vertical", art: PUX, eq: ["maquina"], t: "multi",
    exe: ["Ajuste o assento e prenda as coxas.", "Puxe as alças levando os cotovelos para baixo.", "Volte devagar até alongar."],
    err: ["Amplitude curta.", "Tirar o quadril do banco.", "Puxar com impulso."],
    sub: ["puxada-frontal-aberta", "puxada-triangulo", "barra-fixa-graviton"],
  }),
  ex("barra-fixa-pronada", "Barra fixa pronada", "costas", {
    s: ["barra fixa", "pull up", "pullup", "barra"],
    p: { biceps: 0.5, ombro_posterior: 0.25 }, pad: "puxar_vertical", art: PUX, eq: ["barra_fixa", "peso_corporal"], t: "multi", n: "avancado",
    exe: ["Pegada pronada um pouco mais aberta que os ombros.", "Puxe o corpo até o queixo passar a barra.", "Desça controlando até estender os braços."],
    err: ["Balançar o corpo (kipping) sem intenção.", "Meia repetição.", "Encolher os ombros no topo."],
    sub: ["barra-fixa-graviton", "puxada-frontal-aberta", "puxada-maquina-articulada"], reg: ["repeticoes", "carga"],
  }),
  ex("barra-fixa-supinada", "Barra fixa supinada", "costas", {
    s: ["chin up", "chinup", "barra supinada"],
    p: { biceps: 0.75 }, pad: "puxar_vertical", art: PUX, eq: ["barra_fixa", "peso_corporal"], t: "multi", n: "avancado",
    exe: ["Pegada supinada na largura dos ombros.", "Puxe até o queixo passar a barra.", "Desça controlando."],
    err: ["Balançar.", "Meia amplitude.", "Projetar a cabeça para frente."],
    sub: ["puxada-frontal-supinada", "barra-fixa-graviton"], reg: ["repeticoes", "carga"],
  }),
  ex("barra-fixa-graviton", "Barra fixa assistida (graviton)", "costas", {
    s: ["graviton", "barra assistida", "pull up assistido"],
    p: { biceps: 0.5 }, pad: "puxar_vertical", art: PUX, eq: ["maquina"], t: "multi",
    exe: ["Escolha a assistência (quanto maior, mais fácil).", "Ajoelhe no apoio e puxe até o queixo passar a barra.", "Desça controlando."],
    err: ["Assistência excessiva sem progressão.", "Amplitude curta.", "Balançar."],
    sub: ["barra-fixa-pronada", "puxada-frontal-aberta"], reg: ["assistencia", "repeticoes"],
  }),
  ex("remada-curvada-barra", "Remada curvada com barra", "costas", {
    s: ["remada curvada", "bent over row", "remada curvada pronada"],
    p: { biceps: 0.5, ombro_posterior: 0.5, lombar: 0.25 }, pad: "puxar_horizontal", art: [...PUX, "quadril", "coluna"], eq: ["barra"], t: "multi", n: "intermediario",
    exe: ["Tronco inclinado a cerca de 45°, coluna neutra e joelhos levemente flexionados.", "Puxe a barra em direção ao umbigo.", "Desça controlando sem arredondar as costas."],
    err: ["Arredondar a lombar.", "Levantar o tronco a cada repetição.", "Usar impulso das pernas."],
    sub: ["remada-cavalinho", "remada-apoiada-banco", "remada-maquina-articulada"], est: ["lombar"],
  }),
  ex("remada-curvada-supinada", "Remada curvada supinada", "costas", {
    s: ["remada supinada", "remada yates"],
    p: { biceps: 0.75, lombar: 0.25 }, pad: "puxar_horizontal", art: [...PUX, "quadril", "coluna"], eq: ["barra"], t: "multi", n: "intermediario",
    exe: ["Pegada supinada, tronco inclinado e coluna neutra.", "Puxe a barra até a parte baixa do abdômen.", "Desça controlando."],
    err: ["Tronco subindo demais.", "Arredondar a coluna.", "Puxar só com os braços."],
    sub: ["remada-curvada-barra", "remada-baixa-triangulo", "remada-cavalinho"], est: ["lombar"],
  }),
  ex("remada-unilateral-halter", "Remada unilateral com halter (serrote)", "costas", {
    s: ["serrote", "remada serrote", "remada serrote unilateral", "one arm row"],
    p: { biceps: 0.5, ombro_posterior: 0.25 }, pad: "puxar_horizontal", art: PUX, eq: ["halter", "banco"], t: "multi",
    exe: ["Mão e joelho apoiados no banco, coluna neutra.", "Puxe o halter em direção ao quadril.", "Desça alongando sem girar o tronco."],
    err: ["Girar o tronco para subir.", "Puxar para o peito em vez do quadril.", "Encolher o ombro."],
    sub: ["remada-baixa-unilateral", "remada-apoiada-banco", "remada-maquina-articulada"],
  }),
  ex("remada-baixa-triangulo", "Remada sentada na polia (triângulo)", "costas", {
    s: ["remada baixa", "remada baixa triângulo", "remada sentada", "seated row", "remada no cabo"],
    p: { biceps: 0.5, ombro_posterior: 0.25 }, pad: "puxar_horizontal", art: PUX, eq: ["polia"], t: "multi",
    exe: ["Sente com joelhos levemente flexionados e coluna neutra.", "Puxe o triângulo até o abdômen, juntando as escápulas.", "Volte alongando sem perder a postura."],
    err: ["Balançar o tronco para frente e para trás.", "Arredondar a coluna no retorno.", "Encolher os ombros."],
    sub: ["remada-maquina-articulada", "remada-baixa-aberta", "remada-cavalinho"],
  }),
  ex("remada-baixa-aberta", "Remada sentada pegada aberta", "costas", {
    s: ["remada aberta", "remada baixa aberta", "wide grip row"],
    p: { ombro_posterior: 0.5, biceps: 0.25, trapezio: 0.25 }, pad: "puxar_horizontal", art: PUX, eq: ["polia"], t: "multi",
    exe: ["Barra longa com pegada pronada aberta.", "Puxe até a parte alta do abdômen com cotovelos abertos.", "Retorne controlando."],
    err: ["Puxar com impulso.", "Cotovelos baixos demais (vira remada fechada).", "Encolher os ombros."],
    sub: ["remada-baixa-triangulo", "crucifixo-invertido-maquina", "remada-maquina-articulada"],
  }),
  ex("remada-baixa-unilateral", "Remada baixa unilateral na polia", "costas", {
    s: ["remada unilateral polia", "remada unilateral no cabo"],
    p: { biceps: 0.5 }, pad: "puxar_horizontal", art: PUX, eq: ["polia"], t: "multi",
    exe: ["Alça na polia média ou baixa.", "Puxe o cotovelo para trás junto ao corpo.", "Volte alongando sem girar o tronco."],
    err: ["Rotacionar o tronco.", "Puxar com o bíceps.", "Retorno sem controle."],
    sub: ["remada-unilateral-halter", "remada-baixa-triangulo"],
  }),
  ex("remada-cavalinho", "Remada cavalinho", "costas", {
    s: ["cavalinho", "t-bar row", "remada t", "remada na barra t"],
    p: { biceps: 0.5, ombro_posterior: 0.25, lombar: 0.25 }, pad: "puxar_horizontal", art: [...PUX, "quadril"], eq: ["barra", "maquina"], t: "multi", n: "intermediario",
    exe: ["Tronco inclinado, coluna neutra, pés firmes.", "Puxe a pegada em direção ao abdômen.", "Desça controlando sem arredondar."],
    err: ["Arredondar a lombar.", "Subir o tronco a cada repetição.", "Usar impulso."],
    sub: ["remada-curvada-barra", "remada-maquina-articulada", "remada-apoiada-banco"], est: ["lombar"],
  }),
  ex("remada-maquina-articulada", "Remada na máquina articulada", "costas", {
    s: ["remada máquina", "remada articulada", "remada hammer"],
    p: { biceps: 0.5, ombro_posterior: 0.25 }, pad: "puxar_horizontal", art: PUX, eq: ["maquina"], t: "multi",
    exe: ["Peito apoiado no encosto e pés firmes.", "Puxe as alças levando os cotovelos para trás.", "Volte alongando as costas."],
    err: ["Tirar o peito do apoio.", "Amplitude curta.", "Encolher os ombros."],
    sub: ["remada-baixa-triangulo", "remada-apoiada-banco", "remada-cavalinho"],
  }),
  ex("remada-apoiada-banco", "Remada com halteres apoiada no banco inclinado", "costas", {
    s: ["remada apoiada", "chest supported row", "remada no banco inclinado"],
    p: { biceps: 0.5, ombro_posterior: 0.5 }, pad: "puxar_horizontal", art: PUX, eq: ["halter", "banco"], t: "multi",
    exe: ["Deite de bruços no banco a 30–45°.", "Puxe os halteres levando os cotovelos para trás.", "Desça até estender os braços."],
    err: ["Tirar o peito do banco.", "Encolher os ombros.", "Amplitude curta."],
    sub: ["remada-maquina-articulada", "remada-curvada-barra", "remada-unilateral-halter"],
  }),
  ex("pulldown-bracos-estendidos", "Pulldown com braços estendidos", "costas", {
    s: ["pullover na polia", "pulldown braço estendido", "straight arm pulldown"],
    p: { triceps: 0.25 }, pad: "extensao_ombro", art: ["ombro"], t: "mono", eq: ["polia"],
    exe: ["Barra ou corda na polia alta, tronco levemente inclinado.", "Com os cotovelos quase estendidos, leve a barra até as coxas.", "Volte devagar até alongar."],
    err: ["Flexionar os cotovelos (vira tríceps).", "Usar o tronco para empurrar.", "Encolher os ombros."],
    sub: ["pullover-halter", "puxada-frontal-aberta"],
  }),
  ex("pullover-halter", "Pullover com halter", "costas", {
    s: ["pullover", "pull over"],
    p: { peito: 0.5, triceps: 0.25 }, pad: "extensao_ombro", art: ["ombro"], t: "mono", eq: ["halter", "banco"], n: "intermediario",
    exe: ["Deitado no banco, halter seguro com as duas mãos acima do peito.", "Leve o halter para trás da cabeça com cotovelos levemente flexionados.", "Volte até a linha do peito."],
    err: ["Descer além do confortável para o ombro.", "Flexionar e estender o cotovelo.", "Arquear a lombar."],
    sub: ["pulldown-bracos-estendidos"], est: ["ombro"],
  }),
  ex("remada-invertida", "Remada invertida", "costas", {
    s: ["remada australiana", "inverted row", "remada no smith invertida", "remada no trx"],
    p: { biceps: 0.5, ombro_posterior: 0.5, core: 0.25 }, pad: "puxar_horizontal", art: PUX, eq: ["smith", "trx", "peso_corporal"], t: "multi",
    exe: ["Deite sob a barra (Smith) ou segure a fita, corpo alinhado.", "Puxe o peito até a barra.", "Desça controlando sem deixar o quadril cair."],
    err: ["Quadril caindo.", "Puxar com o pescoço.", "Meia amplitude."],
    sub: ["remada-baixa-triangulo", "remada-apoiada-banco"], reg: ["repeticoes", "carga"],
  }),

  // ==========================================================================
  // OMBROS (16)
  // ==========================================================================
  ex("desenvolvimento-barra-em-pe", "Desenvolvimento militar em pé", "ombro_anterior", {
    s: ["desenvolvimento militar", "militar", "overhead press", "press militar", "desenvolvimento com barra"],
    p: { triceps: 0.5, ombro_lateral: 0.5, core: 0.25 }, pad: "empurrar_vertical", art: ["ombro", "cotovelo", "escapula", "coluna"], eq: ["barra"], t: "multi", n: "avancado",
    exe: ["Barra apoiada na frente dos ombros, glúteos e abdômen contraídos.", "Empurre a barra acima da cabeça passando rente ao rosto.", "Desça controlando até a altura do queixo."],
    err: ["Arquear a lombar para empurrar.", "Barra indo para frente do corpo.", "Usar impulso das pernas sem intenção."],
    sub: ["desenvolvimento-halteres-sentado", "desenvolvimento-maquina", "desenvolvimento-smith"], est: ["ombro", "lombar"],
  }),
  ex("desenvolvimento-halteres-sentado", "Desenvolvimento com halteres sentado", "ombro_anterior", {
    s: ["desenvolvimento halter", "desenvolvimento com halteres", "dumbbell shoulder press"],
    p: { triceps: 0.5, ombro_lateral: 0.5 }, pad: "empurrar_vertical", art: ["ombro", "cotovelo", "escapula"], eq: ["halter", "banco"], t: "multi",
    exe: ["Banco a 80–90°, halteres na altura das orelhas.", "Empurre para cima aproximando levemente os halteres.", "Desça até a altura das orelhas, sem perder o controle."],
    err: ["Afastar as costas do banco.", "Descer pouco.", "Cotovelos muito para trás do corpo."],
    sub: ["desenvolvimento-maquina", "desenvolvimento-smith", "desenvolvimento-arnold"], est: ["ombro"],
  }),
  ex("desenvolvimento-maquina", "Desenvolvimento na máquina", "ombro_anterior", {
    s: ["desenvolvimento máquina", "shoulder press máquina"],
    p: { triceps: 0.5, ombro_lateral: 0.5 }, pad: "empurrar_vertical", art: ["ombro", "cotovelo", "escapula"], eq: ["maquina"], t: "multi",
    exe: ["Ajuste o assento para as pegadas ficarem na altura dos ombros.", "Costas apoiadas.", "Empurre e volte devagar."],
    err: ["Assento baixo ou alto demais.", "Arquear a lombar.", "Retorno sem controle."],
    sub: ["desenvolvimento-halteres-sentado", "desenvolvimento-smith"], est: ["ombro"],
  }),
  ex("desenvolvimento-smith", "Desenvolvimento no Smith", "ombro_anterior", {
    s: ["desenvolvimento smith", "smith shoulder press"],
    p: { triceps: 0.5, ombro_lateral: 0.5 }, pad: "empurrar_vertical", art: ["ombro", "cotovelo", "escapula"], eq: ["smith", "banco"], t: "multi",
    exe: ["Banco a 80–90° posicionado para a barra descer à frente do rosto.", "Empurre até quase estender os cotovelos.", "Desça até a altura do queixo."],
    err: ["Barra descendo atrás da nuca.", "Banco mal posicionado.", "Arquear a lombar."],
    sub: ["desenvolvimento-maquina", "desenvolvimento-halteres-sentado", "desenvolvimento-barra-em-pe"], est: ["ombro"],
  }),
  ex("desenvolvimento-arnold", "Desenvolvimento Arnold", "ombro_anterior", {
    s: ["arnold press", "arnold"],
    p: { triceps: 0.5, ombro_lateral: 0.5 }, pad: "empurrar_vertical", art: ["ombro", "cotovelo", "escapula"], eq: ["halter", "banco"], t: "multi", n: "intermediario",
    exe: ["Comece com os halteres à frente do rosto, palmas para você.", "Gire as palmas para frente enquanto empurra para cima.", "Volte fazendo o caminho inverso."],
    err: ["Girar rápido sem controle.", "Arquear a lombar.", "Carga alta demais."],
    sub: ["desenvolvimento-halteres-sentado", "desenvolvimento-maquina"], est: ["ombro"],
  }),
  ex("landmine-press", "Desenvolvimento na barra guiada (landmine)", "ombro_anterior", {
    s: ["landmine press", "landmine", "desenvolvimento landmine"],
    p: { peito: 0.25, triceps: 0.5, core: 0.25 }, pad: "empurrar_vertical", art: ["ombro", "cotovelo", "escapula"], eq: ["barra"], t: "multi", n: "intermediario",
    exe: ["Ponta da barra presa no canto ou suporte, segure a outra ponta na altura do ombro.", "Empurre para cima e para frente.", "Desça controlando."],
    err: ["Girar o tronco.", "Arquear a lombar.", "Encolher o ombro."],
    sub: ["desenvolvimento-halteres-sentado", "desenvolvimento-maquina"],
  }),
  ex("elevacao-lateral-halteres", "Elevação lateral com halteres", "ombro_lateral", {
    s: ["elevação lateral", "lateral raise", "abdução de ombro"],
    p: { trapezio: 0.25 }, pad: "abducao_ombro", art: ["ombro"], t: "mono", eq: ["halter"],
    exe: ["Em pé, halteres ao lado do corpo, cotovelos levemente flexionados.", "Eleve os braços lateralmente até a altura dos ombros.", "Desça devagar."],
    err: ["Usar impulso do tronco.", "Subir acima da linha do ombro encolhendo o trapézio.", "Carga alta demais."],
    sub: ["elevacao-lateral-polia", "elevacao-lateral-maquina"],
  }),
  ex("elevacao-lateral-polia", "Elevação lateral na polia", "ombro_lateral", {
    s: ["elevação lateral polia", "elevação lateral no cabo", "cable lateral raise"],
    p: { trapezio: 0.25 }, pad: "abducao_ombro", art: ["ombro"], t: "mono", eq: ["polia"],
    exe: ["Polia baixa, cabo passando à frente ou atrás do corpo.", "Eleve o braço lateralmente até a altura do ombro.", "Volte controlando."],
    err: ["Inclinar o tronco para puxar.", "Flexionar o cotovelo durante o movimento.", "Encolher o ombro."],
    sub: ["elevacao-lateral-halteres", "elevacao-lateral-maquina"],
  }),
  ex("elevacao-lateral-maquina", "Elevação lateral na máquina", "ombro_lateral", {
    s: ["elevação lateral máquina", "lateral raise machine"],
    p: { trapezio: 0.25 }, pad: "abducao_ombro", art: ["ombro"], t: "mono", eq: ["maquina"],
    exe: ["Ajuste o assento para o eixo da máquina ficar na linha do ombro.", "Eleve os braços até a altura dos ombros.", "Desça devagar."],
    err: ["Assento desalinhado.", "Encolher os ombros.", "Impulso."],
    sub: ["elevacao-lateral-halteres", "elevacao-lateral-polia"],
  }),
  ex("elevacao-frontal-halteres", "Elevação frontal com halteres", "ombro_anterior", {
    s: ["elevação frontal", "front raise"],
    p: { peito: 0.25 }, pad: "flexao_ombro", art: ["ombro"], t: "mono", eq: ["halter"],
    exe: ["Halteres à frente das coxas.", "Eleve os braços à frente até a altura dos ombros.", "Desça controlando."],
    err: ["Balançar o tronco.", "Subir acima da cabeça.", "Carga alta."],
    sub: ["elevacao-frontal-anilha", "desenvolvimento-halteres-sentado"], est: ["ombro"],
  }),
  ex("elevacao-frontal-anilha", "Elevação frontal com anilha", "ombro_anterior", {
    s: ["elevação frontal anilha", "plate raise"],
    p: { peito: 0.25 }, pad: "flexao_ombro", art: ["ombro"], t: "mono", eq: ["anilha"],
    exe: ["Segure a anilha com as duas mãos à frente do quadril.", "Eleve até a altura dos olhos.", "Desça devagar."],
    err: ["Impulso do quadril.", "Arquear a lombar.", "Subir rápido."],
    sub: ["elevacao-frontal-halteres"], est: ["ombro"],
  }),
  ex("crucifixo-invertido-halteres", "Crucifixo invertido com halteres", "ombro_posterior", {
    s: ["crucifixo invertido", "crucifixo inverso", "reverse fly", "posterior de ombro"],
    p: { trapezio: 0.25, costas: 0.25 }, pad: "abducao_horizontal", art: ["ombro", "escapula"], t: "mono", eq: ["halter"],
    exe: ["Tronco inclinado à frente (ou apoiado no banco), coluna neutra.", "Abra os braços lateralmente até a linha dos ombros.", "Desça controlando."],
    err: ["Juntar demais as escápulas (vira remada).", "Impulso do tronco.", "Carga alta."],
    sub: ["crucifixo-invertido-maquina", "face-pull"],
  }),
  ex("crucifixo-invertido-maquina", "Crucifixo invertido na máquina", "ombro_posterior", {
    s: ["peck deck invertido", "voador invertido", "reverse pec deck"],
    p: { trapezio: 0.25, costas: 0.25 }, pad: "abducao_horizontal", art: ["ombro", "escapula"], t: "mono", eq: ["maquina"],
    exe: ["Sente de frente para o encosto, alças na altura dos ombros.", "Abra os braços para trás com cotovelos levemente flexionados.", "Volte devagar."],
    err: ["Encolher os ombros.", "Tirar o peito do apoio.", "Amplitude curta."],
    sub: ["crucifixo-invertido-halteres", "face-pull"],
  }),
  ex("face-pull", "Face pull", "ombro_posterior", {
    s: ["face pull", "puxada para o rosto"],
    p: { trapezio: 0.5, costas: 0.25 }, pad: "abducao_horizontal", art: ["ombro", "escapula", "cotovelo"], t: "multi", eq: ["polia", "corda"],
    exe: ["Corda na polia alta, na altura do rosto.", "Puxe a corda em direção à testa abrindo os cotovelos.", "Gire as mãos para fora no final e volte."],
    err: ["Puxar para o pescoço ou peito.", "Usar o tronco.", "Carga alta perdendo a rotação."],
    sub: ["crucifixo-invertido-maquina", "crucifixo-invertido-halteres"],
  }),
  ex("remada-alta", "Remada alta", "ombro_lateral", {
    s: ["remada alta barra", "upright row", "remada alta polia"],
    p: { trapezio: 0.5, biceps: 0.25 }, pad: "abducao_ombro", art: ["ombro", "cotovelo", "escapula"], t: "multi", eq: ["barra", "polia"], n: "intermediario",
    exe: ["Pegada um pouco mais aberta que os ombros.", "Puxe a barra até a parte baixa do peito com os cotovelos à frente.", "Desça controlando."],
    err: ["Pegada muito fechada.", "Subir os cotovelos acima dos ombros com dor.", "Impulso do quadril."],
    sub: ["elevacao-lateral-halteres", "elevacao-lateral-polia"], est: ["ombro"],
  }),
  ex("rotacao-externa-polia", "Rotação externa na polia", "ombro_posterior", {
    s: ["rotação externa", "manguito", "external rotation"],
    pad: "rotacao_externa", art: ["ombro"], t: "mono", eq: ["polia"],
    exe: ["Cotovelo junto ao corpo a 90°, alça na altura do cotovelo.", "Gire o antebraço para fora sem afastar o cotovelo.", "Volte devagar."],
    err: ["Afastar o cotovelo do corpo.", "Girar o tronco.", "Carga alta."],
    sub: ["face-pull"],
  }),

  // ==========================================================================
  // TRAPÉZIO (4)
  // ==========================================================================
  ex("encolhimento-barra", "Encolhimento com barra", "trapezio", {
    s: ["encolhimento", "shrug", "encolhimento barra"],
    p: { antebraco: 0.25 }, pad: "elevacao_escapular", art: ["escapula"], t: "mono", eq: ["barra"],
    exe: ["Barra à frente das coxas, braços estendidos.", "Eleve os ombros em direção às orelhas.", "Segure 1 segundo e desça devagar."],
    err: ["Girar os ombros.", "Flexionar os cotovelos.", "Amplitude curta por carga alta."],
    sub: ["encolhimento-halteres", "encolhimento-maquina"],
  }),
  ex("encolhimento-halteres", "Encolhimento com halteres", "trapezio", {
    s: ["encolhimento halter", "encolhimento com halter", "dumbbell shrug"],
    p: { antebraco: 0.25 }, pad: "elevacao_escapular", art: ["escapula"], t: "mono", eq: ["halter"],
    exe: ["Halteres ao lado do corpo.", "Eleve os ombros o máximo possível.", "Desça devagar."],
    err: ["Rodar os ombros.", "Pescoço projetado à frente.", "Movimento curto."],
    sub: ["encolhimento-barra", "encolhimento-maquina"],
  }),
  ex("encolhimento-maquina", "Encolhimento na máquina ou Smith", "trapezio", {
    s: ["encolhimento smith", "encolhimento máquina"],
    pad: "elevacao_escapular", art: ["escapula"], t: "mono", eq: ["maquina", "smith"],
    exe: ["Posicione-se com os braços estendidos.", "Eleve os ombros em direção às orelhas.", "Desça controlando."],
    err: ["Flexionar os cotovelos.", "Movimento rápido.", "Amplitude curta."],
    sub: ["encolhimento-barra", "encolhimento-halteres"],
  }),
  ex("caminhada-fazendeiro", "Caminhada do fazendeiro", "trapezio", {
    s: ["farmer walk", "farmer's walk", "carregamento"],
    p: { antebraco: 0.5, core: 0.5 }, pad: "carregamento", art: ["escapula", "punho", "quadril"], t: "multi", eq: ["halter", "kettlebell"],
    exe: ["Segure halteres pesados ao lado do corpo.", "Caminhe com passos curtos, tronco ereto e ombros firmes.", "Mantenha o abdômen contraído."],
    err: ["Inclinar o tronco.", "Ombros caídos para frente.", "Passos longos e instáveis."],
    sub: ["encolhimento-halteres"], reg: ["carga", "distancia", "tempo"], cv: false,
  }),

  // ==========================================================================
  // BÍCEPS (14)
  // ==========================================================================
  ex("rosca-direta-barra", "Rosca direta com barra reta", "biceps", {
    s: ["rosca direta", "rosca barra", "barbell curl"],
    p: { antebraco: 0.25 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["barra"],
    exe: ["Em pé, pegada supinada na largura dos ombros.", "Flexione os cotovelos sem movê-los para frente.", "Desça até estender os braços."],
    err: ["Balançar o tronco.", "Cotovelos avançando.", "Meia amplitude."],
    sub: ["rosca-direta-barra-w", "rosca-polia-baixa", "rosca-alternada-halteres"], est: ["cotovelo_punho"],
  }),
  ex("rosca-direta-barra-w", "Rosca direta com barra W", "biceps", {
    s: ["rosca direta w", "rosca direta barra w", "rosca barra w", "ez bar curl"],
    p: { antebraco: 0.25 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["barra_w"],
    exe: ["Segure nas angulações internas da barra W.", "Flexione os cotovelos mantendo-os junto ao corpo.", "Desça controlando."],
    err: ["Impulso do quadril.", "Cotovelos à frente.", "Descer rápido."],
    sub: ["rosca-direta-barra", "rosca-polia-baixa", "rosca-scott-barra-w"],
  }),
  ex("rosca-alternada-halteres", "Rosca alternada com halteres", "biceps", {
    s: ["rosca alternada", "alternating curl"],
    p: { antebraco: 0.25 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["halter"],
    exe: ["Halteres ao lado do corpo, palmas para dentro.", "Suba girando a palma para cima, um braço de cada vez.", "Desça devagar."],
    err: ["Girar o tronco.", "Subir o cotovelo.", "Descer rápido."],
    sub: ["rosca-direta-halteres", "rosca-inclinada-halteres", "rosca-direta-barra-w"],
  }),
  ex("rosca-direta-halteres", "Rosca direta com halteres", "biceps", {
    s: ["rosca simultânea", "rosca halteres", "dumbbell curl"],
    p: { antebraco: 0.25 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["halter"],
    exe: ["Palmas para frente, cotovelos junto ao corpo.", "Suba os dois halteres juntos.", "Desça controlando."],
    err: ["Balançar o tronco.", "Cotovelos avançando.", "Meia amplitude."],
    sub: ["rosca-alternada-halteres", "rosca-direta-barra-w"],
  }),
  ex("rosca-martelo", "Rosca martelo", "biceps", {
    s: ["martelo", "hammer curl", "rosca martelo halter"],
    p: { antebraco: 0.5 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["halter"],
    exe: ["Pegada neutra (palmas uma para a outra).", "Flexione os cotovelos sem mover os ombros.", "Desça devagar."],
    err: ["Balançar.", "Cotovelos à frente.", "Punho dobrado."],
    sub: ["rosca-martelo-corda", "rosca-alternada-halteres"],
  }),
  ex("rosca-martelo-corda", "Rosca martelo na polia com corda", "biceps", {
    s: ["rosca corda", "hammer curl corda", "rosca martelo polia"],
    p: { antebraco: 0.5 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["polia", "corda"],
    exe: ["Corda na polia baixa, pegada neutra.", "Flexione os cotovelos mantendo-os fixos.", "Volte até estender."],
    err: ["Inclinar o tronco.", "Cotovelos abrindo.", "Meia amplitude."],
    sub: ["rosca-martelo", "rosca-polia-baixa"],
  }),
  ex("rosca-scott-barra-w", "Rosca Scott com barra W", "biceps", {
    s: ["rosca scott", "scott", "preacher curl", "rosca scott barra"],
    p: { antebraco: 0.25 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["barra_w", "banco"],
    exe: ["Axilas encaixadas no topo do banco Scott.", "Desça até quase estender os cotovelos.", "Suba sem tirar os braços do apoio."],
    err: ["Estender completamente com carga alta (estresse no cotovelo).", "Tirar os braços do apoio.", "Subir com impulso."],
    sub: ["rosca-scott-maquina", "rosca-scott-halter", "rosca-spider"], est: ["cotovelo_punho"],
  }),
  ex("rosca-scott-halter", "Rosca Scott unilateral com halter", "biceps", {
    s: ["rosca scott halter", "rosca scott unilateral"],
    p: { antebraco: 0.25 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["halter", "banco"],
    exe: ["Braço apoiado no banco Scott.", "Desça devagar até quase estender.", "Suba contraindo o bíceps."],
    err: ["Tirar o braço do apoio.", "Descer rápido.", "Punho dobrado."],
    sub: ["rosca-scott-barra-w", "rosca-scott-maquina", "rosca-concentrada"], est: ["cotovelo_punho"],
  }),
  ex("rosca-scott-maquina", "Rosca Scott na máquina", "biceps", {
    s: ["rosca scott máquina", "rosca máquina", "machine preacher curl"],
    pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["maquina"],
    exe: ["Ajuste o assento para os braços apoiarem por inteiro.", "Flexione os cotovelos até o topo.", "Desça controlando."],
    err: ["Assento mal ajustado.", "Amplitude curta.", "Retorno sem controle."],
    sub: ["rosca-scott-barra-w", "rosca-scott-halter"],
  }),
  ex("rosca-concentrada", "Rosca concentrada", "biceps", {
    s: ["concentrada", "concentration curl"],
    pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["halter", "banco"],
    exe: ["Sentado, cotovelo apoiado na parte interna da coxa.", "Suba o halter girando a palma para cima.", "Desça devagar."],
    err: ["Usar o tronco.", "Tirar o cotovelo da coxa.", "Meia amplitude."],
    sub: ["rosca-scott-halter", "rosca-polia-baixa"],
  }),
  ex("rosca-inclinada-halteres", "Rosca inclinada com halteres", "biceps", {
    s: ["rosca inclinada", "incline curl"],
    pad: "flexao_cotovelo", art: ["cotovelo", "ombro"], t: "mono", eq: ["halter", "banco"], n: "intermediario",
    exe: ["Banco a 45–60°, braços pendendo atrás da linha do tronco.", "Flexione os cotovelos sem trazê-los à frente.", "Desça alongando."],
    err: ["Cotovelos indo para frente.", "Tirar as costas do banco.", "Carga alta."],
    sub: ["rosca-alternada-halteres", "rosca-polia-unilateral-tras"], est: ["ombro"],
  }),
  ex("rosca-polia-baixa", "Rosca direta na polia", "biceps", {
    s: ["rosca polia", "rosca no cabo", "cable curl", "rosca na polia baixa"],
    p: { antebraco: 0.25 }, pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["polia"],
    exe: ["Barra reta ou W na polia baixa.", "Flexione os cotovelos mantendo-os junto ao corpo.", "Volte até estender."],
    err: ["Inclinar o tronco para trás.", "Cotovelos à frente.", "Retorno rápido."],
    sub: ["rosca-direta-barra-w", "rosca-direta-barra"],
  }),
  ex("rosca-polia-unilateral-tras", "Rosca unilateral na polia por trás do corpo", "biceps", {
    s: ["rosca bayesian", "bayesian curl", "rosca polia por trás"],
    pad: "flexao_cotovelo", art: ["cotovelo", "ombro"], t: "mono", eq: ["polia"], n: "intermediario",
    exe: ["De costas para a polia baixa, braço estendido para trás.", "Flexione o cotovelo mantendo o braço atrás da linha do corpo.", "Volte alongando."],
    err: ["Trazer o cotovelo para frente.", "Girar o tronco.", "Carga alta."],
    sub: ["rosca-inclinada-halteres", "rosca-polia-baixa"],
  }),
  ex("rosca-spider", "Rosca spider", "biceps", {
    s: ["spider curl", "rosca aranha"],
    pad: "flexao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["barra_w", "halter", "banco"], n: "intermediario",
    exe: ["Deitado de bruços no banco inclinado, braços pendendo na vertical.", "Flexione os cotovelos contraindo o bíceps.", "Desça devagar."],
    err: ["Mover os ombros.", "Impulso.", "Descer rápido."],
    sub: ["rosca-scott-barra-w", "rosca-concentrada"],
  }),

  // ==========================================================================
  // TRÍCEPS (14)
  // ==========================================================================
  ex("triceps-corda", "Tríceps corda na polia", "triceps", {
    s: ["tríceps corda", "tríceps corda polia", "triceps rope pushdown", "tríceps na corda"],
    pad: "extensao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["polia", "corda"],
    exe: ["Corda na polia alta, cotovelos junto ao corpo.", "Estenda os cotovelos abrindo a corda no final.", "Volte até cerca de 90° sem mover os ombros."],
    err: ["Cotovelos se afastando do corpo.", "Inclinar o tronco sobre a corda.", "Subir as mãos acima do peito."],
    sub: ["triceps-barra-polia", "triceps-barra-v", "triceps-maquina"],
  }),
  ex("triceps-barra-polia", "Tríceps pulley com barra reta", "triceps", {
    s: ["tríceps pulley", "tríceps barra", "triceps pushdown", "tríceps na polia"],
    pad: "extensao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["polia"],
    exe: ["Barra reta na polia alta, pegada pronada.", "Estenda os cotovelos mantendo-os junto ao corpo.", "Volte controlando."],
    err: ["Cotovelos abrindo.", "Usar o peso do corpo.", "Amplitude curta."],
    sub: ["triceps-corda", "triceps-barra-v", "triceps-maquina"],
  }),
  ex("triceps-barra-v", "Tríceps na polia com barra V", "triceps", {
    s: ["tríceps barra v", "tríceps v"],
    pad: "extensao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["polia"],
    exe: ["Barra V na polia alta.", "Estenda os cotovelos sem afastá-los do corpo.", "Volte devagar."],
    err: ["Cotovelos abrindo.", "Impulso do tronco.", "Ombros subindo."],
    sub: ["triceps-barra-polia", "triceps-corda"],
  }),
  ex("triceps-unilateral-polia", "Tríceps unilateral na polia (pegada inversa)", "triceps", {
    s: ["tríceps unilateral", "tríceps inverso unilateral"],
    pad: "extensao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["polia"],
    exe: ["Alça na polia alta, palma para cima.", "Estenda o cotovelo mantendo-o junto ao corpo.", "Volte controlando."],
    err: ["Cotovelo saindo do lugar.", "Girar o tronco.", "Punho dobrado."],
    sub: ["triceps-corda", "triceps-barra-polia"],
  }),
  ex("triceps-testa-barra-w", "Tríceps testa com barra W", "triceps", {
    s: ["tríceps testa", "testa", "skull crusher", "tríceps testa barra w"],
    pad: "extensao_cotovelo", art: ["cotovelo", "ombro"], t: "mono", eq: ["barra_w", "banco"], n: "intermediario",
    exe: ["Deitado, barra acima do peito com braços estendidos.", "Flexione os cotovelos levando a barra à testa ou atrás da cabeça.", "Estenda sem abrir os cotovelos."],
    err: ["Cotovelos abrindo.", "Mover os ombros.", "Descer rápido."],
    sub: ["triceps-testa-halteres", "triceps-frances-polia", "triceps-corda"], est: ["cotovelo_punho"],
  }),
  ex("triceps-testa-halteres", "Tríceps testa com halteres", "triceps", {
    s: ["tríceps testa halter", "skull crusher halter"],
    pad: "extensao_cotovelo", art: ["cotovelo", "ombro"], t: "mono", eq: ["halter", "banco"],
    exe: ["Deitado, halteres acima do peito com pegada neutra.", "Flexione os cotovelos levando os halteres ao lado da cabeça.", "Estenda controlando."],
    err: ["Cotovelos abrindo.", "Mover os braços.", "Carga alta."],
    sub: ["triceps-testa-barra-w", "triceps-frances-halter"], est: ["cotovelo_punho"],
  }),
  ex("triceps-frances-halter", "Tríceps francês com halter", "triceps", {
    s: ["tríceps francês", "francês", "overhead extension", "tríceps nuca"],
    pad: "extensao_cotovelo", art: ["cotovelo", "ombro"], t: "mono", eq: ["halter", "banco"],
    exe: ["Sentado, halter seguro com as duas mãos acima da cabeça.", "Desça o halter atrás da cabeça flexionando os cotovelos.", "Estenda sem abrir os cotovelos."],
    err: ["Arquear a lombar.", "Cotovelos abertos.", "Amplitude curta."],
    sub: ["triceps-frances-polia", "triceps-testa-halteres"], est: ["cotovelo_punho", "ombro"],
  }),
  ex("triceps-frances-polia", "Tríceps francês na polia", "triceps", {
    s: ["tríceps acima da cabeça polia", "overhead cable extension", "francês na polia"],
    pad: "extensao_cotovelo", art: ["cotovelo", "ombro"], t: "mono", eq: ["polia", "corda"],
    exe: ["De costas para a polia, corda atrás da cabeça.", "Estenda os cotovelos à frente e para cima.", "Volte alongando sem abrir os cotovelos."],
    err: ["Mover os ombros.", "Arquear a lombar.", "Retorno rápido."],
    sub: ["triceps-frances-halter", "triceps-testa-barra-w"], est: ["ombro"],
  }),
  ex("triceps-coice-halter", "Tríceps coice com halter", "triceps", {
    s: ["tríceps coice", "kickback de tríceps", "triceps kickback"],
    pad: "extensao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["halter", "banco"],
    exe: ["Tronco inclinado com apoio, braço junto ao corpo.", "Estenda o cotovelo levando o halter para trás.", "Volte até 90°."],
    err: ["Cotovelo caindo.", "Balançar o braço.", "Carga alta."],
    sub: ["triceps-coice-polia", "triceps-corda"],
  }),
  ex("triceps-coice-polia", "Tríceps coice na polia", "triceps", {
    s: ["tríceps coice na polia", "kickback de tríceps na polia"],
    pad: "extensao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["polia"],
    exe: ["Polia baixa, tronco inclinado, braço junto ao corpo.", "Estenda o cotovelo para trás.", "Volte controlando."],
    err: ["Mover o ombro.", "Tronco subindo.", "Impulso."],
    sub: ["triceps-coice-halter", "triceps-unilateral-polia"],
  }),
  ex("mergulho-paralelas", "Mergulho nas paralelas", "triceps", {
    s: ["paralela", "paralelas", "dips", "mergulho"],
    p: { peito: 0.5, ombro_anterior: 0.5 }, pad: "empurrar_vertical", art: ["ombro", "cotovelo", "escapula"], t: "multi", eq: ["paralelas", "peso_corporal"], n: "avancado",
    exe: ["Braços estendidos nas paralelas, corpo levemente inclinado.", "Desça até os cotovelos chegarem a cerca de 90°.", "Empurre até estender."],
    err: ["Descer além do confortável para o ombro.", "Ombros subindo para as orelhas.", "Balançar as pernas."],
    sub: ["triceps-maquina", "supino-fechado", "mergulho-banco"], reg: ["repeticoes", "carga", "assistencia"], est: ["ombro", "cotovelo_punho"],
  }),
  ex("mergulho-banco", "Mergulho no banco", "triceps", {
    s: ["tríceps banco", "bench dips", "mergulho entre bancos"],
    p: { ombro_anterior: 0.25 }, pad: "extensao_cotovelo", art: ["cotovelo", "ombro"], t: "multi", eq: ["banco", "peso_corporal"],
    exe: ["Mãos no banco atrás do corpo, pernas à frente.", "Desça flexionando os cotovelos até cerca de 90°.", "Empurre até estender."],
    err: ["Descer demais forçando o ombro.", "Afastar o quadril do banco.", "Cotovelos abrindo."],
    sub: ["triceps-maquina", "triceps-corda"], reg: ["repeticoes", "carga"], est: ["ombro"],
  }),
  ex("supino-fechado", "Supino com pegada fechada", "triceps", {
    s: ["supino fechado", "close grip bench press", "supino pegada fechada"],
    p: { peito: 0.5, ombro_anterior: 0.25 }, pad: "empurrar_horizontal", art: EMP_H, t: "multi", eq: ["barra", "banco"], n: "intermediario",
    exe: ["Pegada na largura dos ombros.", "Desça a barra até a parte baixa do peito com os cotovelos próximos ao corpo.", "Empurre até estender."],
    err: ["Pegada fechada demais (dor no punho).", "Cotovelos abrindo.", "Quicar no peito."],
    sub: ["mergulho-paralelas", "triceps-maquina"], est: ["cotovelo_punho"],
  }),
  ex("triceps-maquina", "Tríceps na máquina", "triceps", {
    s: ["tríceps máquina", "mergulho na máquina", "dip machine"],
    p: { peito: 0.25 }, pad: "extensao_cotovelo", art: ["cotovelo"], t: "mono", eq: ["maquina"],
    exe: ["Ajuste o assento para os cotovelos ficarem alinhados ao eixo.", "Estenda os cotovelos até o final.", "Volte devagar."],
    err: ["Assento mal ajustado.", "Ombros subindo.", "Amplitude curta."],
    sub: ["triceps-corda", "mergulho-paralelas"],
  }),

  // ==========================================================================
  // QUADRÍCEPS (16)
  // ==========================================================================
  ex("agachamento-livre", "Agachamento livre com barra", "quadriceps", {
    s: ["agachamento", "agachamento livre", "squat", "back squat", "agachamento com barra"],
    p: { gluteo: 0.5, adutores: 0.25, lombar: 0.25 }, pad: "agachar", art: AGACH, t: "multi", eq: ["barra"], n: "intermediario",
    exe: ["Barra apoiada no trapézio, pés na largura dos ombros.", "Desça empurrando o quadril para trás e os joelhos na direção dos pés.", "Suba mantendo o peito aberto e a coluna neutra."],
    err: ["Joelhos caindo para dentro.", "Calcanhares saindo do chão.", "Perder a curvatura neutra da coluna no fundo."],
    sub: ["agachamento-smith", "hack-machine", "leg-press-45"], est: ["joelho", "lombar", "quadril"],
  }),
  ex("agachamento-frontal", "Agachamento frontal", "quadriceps", {
    s: ["front squat", "agachamento frente"],
    p: { gluteo: 0.5, core: 0.25 }, pad: "agachar", art: AGACH, t: "multi", eq: ["barra"], n: "avancado",
    exe: ["Barra apoiada na frente dos ombros, cotovelos altos.", "Desça com o tronco mais vertical que no agachamento livre.", "Suba sem deixar os cotovelos caírem."],
    err: ["Cotovelos caindo.", "Tronco inclinando demais.", "Calcanhares subindo."],
    sub: ["agachamento-goblet", "hack-machine", "agachamento-livre"], est: ["joelho", "lombar"],
  }),
  ex("agachamento-smith", "Agachamento no Smith", "quadriceps", {
    s: ["agachamento smith", "smith squat"],
    p: { gluteo: 0.5, adutores: 0.25 }, pad: "agachar", art: AGACH, t: "multi", eq: ["smith"],
    exe: ["Barra no trapézio, pés levemente à frente da linha da barra.", "Desça controlando até onde mantém a coluna neutra.", "Suba empurrando o chão."],
    err: ["Pés muito atrás (estresse no joelho).", "Joelhos para dentro.", "Amplitude curta."],
    sub: ["agachamento-livre", "hack-machine", "leg-press-45"], est: ["joelho"],
  }),
  ex("agachamento-goblet", "Agachamento goblet", "quadriceps", {
    s: ["goblet squat", "agachamento com halter", "agachamento taça"],
    p: { gluteo: 0.5, core: 0.25 }, pad: "agachar", art: AGACH, t: "multi", eq: ["halter", "kettlebell"],
    exe: ["Segure o halter ou kettlebell junto ao peito.", "Desça entre as pernas mantendo o tronco ereto.", "Suba empurrando o chão."],
    err: ["Tronco caindo para frente.", "Joelhos para dentro.", "Calcanhares subindo."],
    sub: ["agachamento-livre", "agachamento-smith", "leg-press-45"], est: ["joelho"],
  }),
  ex("hack-machine", "Agachamento no hack", "quadriceps", {
    s: ["hack", "hack machine", "hack squat", "agachamento hack"],
    p: { gluteo: 0.5 }, pad: "agachar", art: AGACH, t: "multi", eq: ["maquina"],
    exe: ["Costas e ombros apoiados, pés na largura do quadril.", "Desça até a amplitude que mantém a lombar apoiada.", "Suba sem travar os joelhos."],
    err: ["Tirar a lombar do encosto.", "Travar os joelhos no topo.", "Joelhos para dentro."],
    sub: ["leg-press-45", "agachamento-pendulo", "agachamento-smith"], est: ["joelho"],
  }),
  ex("leg-press-45", "Leg press 45°", "quadriceps", {
    s: ["leg press", "leg press 45", "leg 45", "leg press 45º"],
    p: { gluteo: 0.5, adutores: 0.25 }, pad: "agachar", art: AGACH, t: "multi", eq: ["maquina"],
    exe: ["Lombar e quadril apoiados, pés na largura do quadril no meio da plataforma.", "Desça até onde o quadril não sai do banco.", "Empurre sem travar os joelhos."],
    err: ["Quadril saindo do banco no fundo.", "Travar os joelhos.", "Joelhos para dentro."],
    sub: ["leg-press-horizontal", "hack-machine", "agachamento-smith"], est: ["joelho"],
  }),
  ex("leg-press-horizontal", "Leg press horizontal", "quadriceps", {
    s: ["leg horizontal", "leg press sentado"],
    p: { gluteo: 0.5 }, pad: "agachar", art: AGACH, t: "multi", eq: ["maquina"],
    exe: ["Costas apoiadas, pés na plataforma na largura do quadril.", "Flexione os joelhos até cerca de 90°.", "Empurre sem travar."],
    err: ["Tirar o quadril do banco.", "Travar os joelhos.", "Amplitude curta."],
    sub: ["leg-press-45", "hack-machine"], est: ["joelho"],
  }),
  ex("agachamento-pendulo", "Agachamento no pêndulo", "quadriceps", {
    s: ["pendulum squat", "pêndulo"],
    p: { gluteo: 0.5 }, pad: "agachar", art: AGACH, t: "multi", eq: ["maquina"], n: "intermediario",
    exe: ["Ombros no apoio e pés no centro da plataforma.", "Desça controlando até a amplitude confortável.", "Suba empurrando a plataforma."],
    err: ["Calcanhares subindo.", "Retorno rápido.", "Travar os joelhos."],
    sub: ["hack-machine", "leg-press-45"], est: ["joelho"],
  }),
  ex("agachamento-maquina-v", "Agachamento na máquina (V-squat)", "quadriceps", {
    s: ["v squat", "agachamento máquina", "belt squat"],
    p: { gluteo: 0.5 }, pad: "agachar", art: AGACH, t: "multi", eq: ["maquina"],
    exe: ["Posicione os ombros sob os apoios.", "Desça mantendo a coluna neutra.", "Suba sem travar os joelhos."],
    err: ["Joelhos para dentro.", "Amplitude curta.", "Calcanhares subindo."],
    sub: ["hack-machine", "leg-press-45", "agachamento-smith"], est: ["joelho"],
  }),
  ex("cadeira-extensora", "Cadeira extensora", "quadriceps", {
    s: ["extensora", "leg extension", "cadeira extensora bilateral"],
    pad: "extensao_joelho", art: ["joelho"], t: "mono", eq: ["maquina"],
    exe: ["Ajuste o encosto para o joelho alinhar com o eixo da máquina.", "Estenda os joelhos até o final e segure 1 segundo.", "Desça devagar."],
    err: ["Impulso para subir.", "Tirar o quadril do banco.", "Descer rápido."],
    sub: ["cadeira-extensora-unilateral", "sissy-squat"], est: ["joelho"],
  }),
  ex("cadeira-extensora-unilateral", "Cadeira extensora unilateral", "quadriceps", {
    s: ["extensora unilateral"],
    pad: "extensao_joelho", art: ["joelho"], t: "mono", eq: ["maquina"],
    exe: ["Mesmo ajuste da extensora, uma perna de cada vez.", "Estenda até o final.", "Desça devagar."],
    err: ["Girar o quadril.", "Impulso.", "Amplitude curta."],
    sub: ["cadeira-extensora"], est: ["joelho"],
  }),
  ex("afundo-halteres", "Afundo com halteres", "quadriceps", {
    s: ["afundo", "passada estacionária", "lunge", "avanço parado"],
    p: { gluteo: 0.5, adutores: 0.25 }, pad: "avanco", art: AGACH, t: "multi", eq: ["halter"],
    exe: ["Um pé à frente e outro atrás, tronco ereto.", "Desça o joelho de trás em direção ao chão.", "Suba empurrando com a perna da frente."],
    err: ["Joelho da frente caindo para dentro.", "Passo curto demais.", "Tronco inclinando."],
    sub: ["agachamento-bulgaro", "passada-andando", "subida-no-banco"], est: ["joelho"],
  }),
  ex("passada-andando", "Passada andando", "quadriceps", {
    s: ["passada", "avanço", "walking lunge", "afundo andando"],
    p: { gluteo: 0.5, adutores: 0.25 }, pad: "avanco", art: AGACH, t: "multi", eq: ["halter", "peso_corporal"],
    exe: ["Dê um passo à frente e desça o joelho de trás.", "Suba e traga a outra perna para o próximo passo.", "Mantenha o tronco ereto."],
    err: ["Passos curtos.", "Joelho para dentro.", "Perder o equilíbrio por pressa."],
    sub: ["afundo-halteres", "agachamento-bulgaro"], reg: ["carga", "repeticoes", "distancia"], est: ["joelho"],
  }),
  ex("agachamento-bulgaro", "Agachamento búlgaro", "quadriceps", {
    s: ["búlgaro", "bulgaro", "afundo búlgaro", "split squat", "bulgarian split squat"],
    p: { gluteo: 0.5, adutores: 0.25 }, pad: "avanco", art: AGACH, t: "multi", eq: ["halter", "banco"], n: "intermediario",
    exe: ["Pé de trás apoiado no banco, pé da frente afastado.", "Desça o quadril até a coxa da frente ficar perto da horizontal.", "Suba empurrando com a perna da frente."],
    err: ["Pé da frente muito perto do banco.", "Joelho para dentro.", "Tronco instável."],
    sub: ["afundo-halteres", "subida-no-banco", "leg-press-45"], est: ["joelho", "quadril"],
  }),
  ex("sissy-squat", "Sissy squat", "quadriceps", {
    s: ["sissy"],
    pad: "extensao_joelho", art: ["joelho", "tornozelo"], t: "multi", eq: ["peso_corporal", "maquina"], n: "avancado",
    exe: ["Apoie os pés e segure em um suporte.", "Incline o corpo para trás levando os joelhos à frente.", "Volte contraindo o quadríceps."],
    err: ["Flexionar o quadril.", "Descer além do controle.", "Fazer com dor no joelho."],
    sub: ["cadeira-extensora"], reg: ["repeticoes", "carga"], est: ["joelho"],
  }),
  ex("subida-no-banco", "Subida no banco (step-up)", "quadriceps", {
    s: ["step up", "subida na caixa", "subida no step"],
    p: { gluteo: 0.5 }, pad: "avanco", art: AGACH, t: "multi", eq: ["halter", "banco"],
    exe: ["Pé inteiro apoiado no banco.", "Suba empurrando com a perna de cima, sem impulso da de baixo.", "Desça controlando."],
    err: ["Impulsionar com a perna de trás.", "Banco alto demais.", "Joelho para dentro."],
    sub: ["afundo-halteres", "agachamento-bulgaro"], est: ["joelho"],
  }),

  // ==========================================================================
  // POSTERIORES DE COXA (12)
  // ==========================================================================
  ex("stiff-barra", "Stiff com barra", "posteriores", {
    s: ["stiff", "stiff barra", "stiff leg deadlift"],
    p: { gluteo: 0.5, lombar: 0.25 }, pad: "dobradica_quadril", art: DOBRA, t: "multi", eq: ["barra"], n: "intermediario",
    exe: ["Joelhos levemente flexionados e fixos.", "Desça a barra rente às pernas empurrando o quadril para trás.", "Suba contraindo glúteos e posteriores, coluna neutra."],
    err: ["Arredondar a lombar.", "Flexionar os joelhos (vira terra).", "Afastar a barra das pernas."],
    sub: ["terra-romeno", "stiff-halteres", "mesa-flexora"], est: ["lombar"],
  }),
  ex("stiff-halteres", "Stiff com halteres", "posteriores", {
    s: ["stiff halter", "stiff com halter"],
    p: { gluteo: 0.5, lombar: 0.25 }, pad: "dobradica_quadril", art: DOBRA, t: "multi", eq: ["halter"],
    exe: ["Halteres à frente das coxas, joelhos levemente flexionados.", "Desça empurrando o quadril para trás.", "Suba mantendo a coluna neutra."],
    err: ["Arredondar as costas.", "Descer além da flexibilidade.", "Joelhos flexionando."],
    sub: ["stiff-barra", "terra-romeno", "stiff-unilateral"], est: ["lombar"],
  }),
  ex("stiff-unilateral", "Stiff unilateral com halter", "posteriores", {
    s: ["stiff unilateral", "single leg rdl", "terra romeno unilateral"],
    p: { gluteo: 0.5, core: 0.25 }, pad: "dobradica_quadril", art: DOBRA, t: "multi", eq: ["halter", "kettlebell"], n: "intermediario",
    exe: ["Apoie-se em uma perna com o joelho levemente flexionado.", "Incline o tronco levando a outra perna para trás.", "Volte contraindo o glúteo."],
    err: ["Girar o quadril.", "Arredondar as costas.", "Perder o equilíbrio por pressa."],
    sub: ["stiff-halteres", "terra-romeno"], est: ["lombar"],
  }),
  ex("terra-romeno", "Levantamento terra romeno", "posteriores", {
    s: ["terra romeno", "rdl", "romanian deadlift"],
    p: { gluteo: 0.5, lombar: 0.25, antebraco: 0.25 }, pad: "dobradica_quadril", art: DOBRA, t: "multi", eq: ["barra"], n: "intermediario",
    exe: ["Comece em pé com a barra.", "Desça empurrando o quadril para trás até sentir os posteriores alongarem.", "Suba contraindo os glúteos, barra rente às pernas."],
    err: ["Arredondar a lombar.", "Descer a barra longe das pernas.", "Hiperestender a coluna no topo."],
    sub: ["stiff-barra", "stiff-halteres", "good-morning"], est: ["lombar"],
  }),
  ex("levantamento-terra", "Levantamento terra", "posteriores", {
    s: ["terra", "deadlift", "levantamento terra convencional"],
    p: { gluteo: 0.5, costas: 0.25, lombar: 0.5, quadriceps: 0.25, trapezio: 0.25, antebraco: 0.25 }, pad: "dobradica_quadril", art: [...DOBRA, "joelho"], t: "multi", eq: ["barra"], n: "avancado",
    exe: ["Barra sobre o meio dos pés, pegada fora das pernas.", "Peito aberto, coluna neutra, empurre o chão com as pernas.", "Termine em pé com quadril estendido, sem inclinar para trás."],
    err: ["Arredondar a lombar.", "Barra afastando das pernas.", "Puxar com os braços."],
    sub: ["terra-romeno", "terra-sumo", "hip-thrust-barra"], est: ["lombar"],
  }),
  ex("good-morning", "Good morning", "posteriores", {
    s: ["bom dia", "good morning com barra"],
    p: { gluteo: 0.5, lombar: 0.5 }, pad: "dobradica_quadril", art: DOBRA, t: "multi", eq: ["barra"], n: "avancado",
    exe: ["Barra no trapézio, joelhos levemente flexionados.", "Incline o tronco empurrando o quadril para trás.", "Volte contraindo glúteos e posteriores."],
    err: ["Arredondar a coluna.", "Carga alta cedo demais.", "Flexionar muito os joelhos."],
    sub: ["terra-romeno", "stiff-barra"], est: ["lombar"],
  }),
  ex("mesa-flexora", "Mesa flexora", "posteriores", {
    s: ["flexora deitada", "leg curl", "lying leg curl", "flexora"],
    p: { panturrilha: 0.25 }, pad: "flexao_joelho", art: ["joelho"], t: "mono", eq: ["maquina"],
    exe: ["Deitado, joelhos logo abaixo da borda do banco.", "Flexione os joelhos levando o rolo aos glúteos.", "Desça devagar."],
    err: ["Tirar o quadril do banco.", "Impulso.", "Descer rápido."],
    sub: ["cadeira-flexora", "flexora-em-pe", "flexao-joelhos-bola"],
  }),
  ex("cadeira-flexora", "Cadeira flexora", "posteriores", {
    s: ["flexora sentada", "seated leg curl"],
    p: { panturrilha: 0.25 }, pad: "flexao_joelho", art: ["joelho"], t: "mono", eq: ["maquina"],
    exe: ["Ajuste o encosto para o joelho alinhar com o eixo.", "Trave as coxas e flexione os joelhos.", "Volte controlando."],
    err: ["Coxas soltas.", "Amplitude curta.", "Retorno sem controle."],
    sub: ["mesa-flexora", "cadeira-flexora-unilateral", "flexora-em-pe"],
  }),
  ex("cadeira-flexora-unilateral", "Cadeira flexora unilateral", "posteriores", {
    s: ["flexora unilateral sentada"],
    pad: "flexao_joelho", art: ["joelho"], t: "mono", eq: ["maquina"],
    exe: ["Mesmo ajuste da cadeira flexora, uma perna por vez.", "Flexione até o final.", "Volte devagar."],
    err: ["Girar o quadril.", "Impulso.", "Amplitude curta."],
    sub: ["cadeira-flexora", "flexora-em-pe"],
  }),
  ex("flexora-em-pe", "Flexora em pé unilateral", "posteriores", {
    s: ["flexora em pé", "standing leg curl", "flexora unilateral"],
    pad: "flexao_joelho", art: ["joelho"], t: "mono", eq: ["maquina", "polia", "caneleira"],
    exe: ["Apoie-se na máquina ou use a polia com caneleira.", "Flexione o joelho levando o calcanhar ao glúteo.", "Desça controlando."],
    err: ["Movimentar o quadril.", "Impulso.", "Tronco inclinando."],
    sub: ["mesa-flexora", "cadeira-flexora-unilateral"],
  }),
  ex("flexao-nordica", "Flexão nórdica", "posteriores", {
    s: ["nordic", "nordic curl", "nórdica"],
    pad: "flexao_joelho", art: ["joelho"], t: "mono", eq: ["peso_corporal"], n: "avancado",
    exe: ["Ajoelhado com os tornozelos presos.", "Incline o corpo à frente o mais devagar possível.", "Use as mãos para amortecer e volte."],
    err: ["Flexionar o quadril.", "Cair sem controle.", "Volume alto sem adaptação."],
    sub: ["mesa-flexora", "flexao-joelhos-bola"], reg: ["repeticoes", "assistencia"],
  }),
  ex("flexao-joelhos-bola", "Flexão de joelhos na bola suíça", "posteriores", {
    s: ["leg curl na bola", "flexora na bola"],
    p: { gluteo: 0.25, core: 0.25 }, pad: "flexao_joelho", art: ["joelho", "quadril"], t: "multi", eq: ["bola"],
    exe: ["Deitado, calcanhares sobre a bola e quadril elevado.", "Traga a bola em direção aos glúteos flexionando os joelhos.", "Volte sem baixar o quadril."],
    err: ["Quadril caindo.", "Movimento rápido.", "Arquear a lombar."],
    sub: ["mesa-flexora", "flexao-nordica"], reg: ["repeticoes"],
  }),

  // ==========================================================================
  // GLÚTEOS E ADUTORES (13)
  // ==========================================================================
  ex("hip-thrust-barra", "Hip thrust com barra", "gluteo", {
    s: ["hip thrust", "elevação pélvica com barra", "elevação de quadril"],
    p: { posteriores: 0.25, quadriceps: 0.25 }, pad: "extensao_quadril", art: ["quadril"], t: "mono", eq: ["barra", "banco"],
    exe: ["Parte alta das costas no banco, barra sobre o quadril com proteção.", "Empurre o quadril para cima até alinhar tronco e coxas.", "Segure 1 segundo e desça controlando."],
    err: ["Hiperestender a lombar no topo.", "Pés longe ou perto demais.", "Joelhos abrindo ou fechando."],
    sub: ["hip-thrust-maquina", "elevacao-pelvica-solo", "elevacao-pelvica-unilateral"],
  }),
  ex("hip-thrust-maquina", "Hip thrust na máquina", "gluteo", {
    s: ["elevação pélvica máquina", "glute drive"],
    p: { posteriores: 0.25 }, pad: "extensao_quadril", art: ["quadril"], t: "mono", eq: ["maquina"],
    exe: ["Ajuste o cinto sobre o quadril.", "Eleve o quadril até alinhar com o tronco.", "Desça devagar."],
    err: ["Arquear a lombar.", "Amplitude curta.", "Retorno rápido."],
    sub: ["hip-thrust-barra", "elevacao-pelvica-solo"],
  }),
  ex("elevacao-pelvica-solo", "Elevação pélvica no solo (ponte de glúteo)", "gluteo", {
    s: ["ponte de glúteo", "glute bridge", "elevação pélvica", "ponte"],
    p: { posteriores: 0.25 }, pad: "extensao_quadril", art: ["quadril"], t: "mono", eq: ["peso_corporal", "barra", "anilha"],
    exe: ["Deitado, joelhos flexionados e pés no chão.", "Eleve o quadril contraindo os glúteos.", "Desça controlando."],
    err: ["Arquear a lombar.", "Empurrar com as pontas dos pés.", "Movimento rápido."],
    sub: ["hip-thrust-barra", "hip-thrust-maquina", "elevacao-pelvica-unilateral"], reg: ["carga", "repeticoes"],
  }),
  ex("elevacao-pelvica-unilateral", "Elevação pélvica unilateral", "gluteo", {
    s: ["hip thrust unilateral", "ponte unilateral"],
    p: { posteriores: 0.25, core: 0.25 }, pad: "extensao_quadril", art: ["quadril"], t: "mono", eq: ["peso_corporal", "banco"],
    exe: ["Costas no banco, uma perna apoiada e a outra elevada.", "Eleve o quadril sem girar.", "Desça devagar."],
    err: ["Quadril girando.", "Lombar arqueada.", "Amplitude curta."],
    sub: ["hip-thrust-barra", "elevacao-pelvica-solo"], reg: ["repeticoes", "carga"],
  }),
  ex("gluteo-coice-polia", "Glúteo coice na polia", "gluteo", {
    s: ["coice na polia", "glúteo polia", "kickback glúteo", "coice", "glúteo coice polia"],
    p: { posteriores: 0.25 }, pad: "extensao_quadril", art: ["quadril"], t: "mono", eq: ["polia", "caneleira"],
    exe: ["Caneleira presa na polia baixa, tronco levemente inclinado.", "Leve a perna para trás contraindo o glúteo.", "Volte sem encostar o peso."],
    err: ["Arquear a lombar para subir mais.", "Girar o quadril.", "Impulso."],
    sub: ["gluteo-maquina", "coice-quatro-apoios"],
  }),
  ex("gluteo-maquina", "Glúteo na máquina (coice)", "gluteo", {
    s: ["glúteo máquina", "coice na máquina", "glute kickback machine"],
    p: { posteriores: 0.25 }, pad: "extensao_quadril", art: ["quadril"], t: "mono", eq: ["maquina"],
    exe: ["Apoie o peito e os antebraços na máquina.", "Empurre a plataforma para trás estendendo o quadril.", "Volte devagar."],
    err: ["Arquear a lombar.", "Amplitude curta.", "Retorno rápido."],
    sub: ["gluteo-coice-polia", "coice-quatro-apoios"],
  }),
  ex("coice-quatro-apoios", "Coice em quatro apoios com caneleira", "gluteo", {
    s: ["coice no solo", "quatro apoios", "donkey kick"],
    p: { posteriores: 0.25 }, pad: "extensao_quadril", art: ["quadril"], t: "mono", eq: ["caneleira", "peso_corporal"],
    exe: ["Em quatro apoios, coluna neutra.", "Eleve a perna para trás e para cima com o joelho flexionado.", "Volte devagar."],
    err: ["Arquear a lombar.", "Girar o quadril.", "Movimento rápido."],
    sub: ["gluteo-coice-polia", "gluteo-maquina"],
  }),
  ex("cadeira-abdutora", "Cadeira abdutora", "gluteo", {
    s: ["abdutora", "abdução de quadril máquina", "hip abduction"],
    p: { abdutores: 0.5 }, pad: "abducao_quadril", art: ["quadril"], t: "mono", eq: ["maquina"],
    exe: ["Sente com as costas apoiadas.", "Abra as pernas contra a resistência.", "Volte devagar sem deixar o peso bater."],
    err: ["Impulso.", "Amplitude curta.", "Retorno rápido."],
    sub: ["abducao-polia", "caminhada-lateral-elastico"], est: ["quadril"],
  }),
  ex("abducao-polia", "Abdução de quadril na polia", "gluteo", {
    s: ["abdução na polia", "abdução em pé", "cable hip abduction"],
    p: { abdutores: 0.5 }, pad: "abducao_quadril", art: ["quadril"], t: "mono", eq: ["polia", "caneleira"],
    exe: ["Caneleira na polia baixa, de lado para a máquina.", "Afaste a perna lateralmente.", "Volte controlando."],
    err: ["Inclinar o tronco.", "Girar o pé para fora.", "Impulso."],
    sub: ["cadeira-abdutora", "caminhada-lateral-elastico"],
  }),
  ex("caminhada-lateral-elastico", "Caminhada lateral com elástico", "gluteo", {
    s: ["monster walk", "caminhada lateral", "passo lateral com elástico"],
    p: { abdutores: 0.5 }, pad: "abducao_quadril", art: ["quadril"], t: "mono", eq: ["elastico"],
    exe: ["Elástico acima dos joelhos ou nos tornozelos, semiagachado.", "Dê passos laterais mantendo a tensão.", "Não deixe os joelhos se aproximarem."],
    err: ["Ficar em pé reto.", "Arrastar os pés.", "Joelhos para dentro."],
    sub: ["cadeira-abdutora", "abducao-polia"], reg: ["repeticoes", "distancia"],
  }),
  ex("agachamento-sumo", "Agachamento sumô", "gluteo", {
    s: ["sumô", "agachamento sumo", "sumo squat"],
    p: { adutores: 0.5, quadriceps: 0.5 }, pad: "agachar", art: AGACH, t: "multi", eq: ["halter", "kettlebell", "barra"],
    exe: ["Pés bem afastados e pontas para fora.", "Desça com os joelhos na direção dos pés.", "Suba contraindo os glúteos."],
    err: ["Joelhos para dentro.", "Tronco caindo.", "Calcanhares subindo."],
    sub: ["terra-sumo", "agachamento-goblet", "leg-press-45"], est: ["joelho", "quadril"],
  }),
  ex("terra-sumo", "Levantamento terra sumô", "gluteo", {
    s: ["terra sumo", "sumo deadlift"],
    p: { posteriores: 0.5, adutores: 0.5, quadriceps: 0.25, lombar: 0.25 }, pad: "dobradica_quadril", art: [...DOBRA, "joelho"], t: "multi", eq: ["barra"], n: "avancado",
    exe: ["Pés afastados, pegada por dentro das pernas.", "Peito aberto, empurre o chão afastando os joelhos.", "Termine com o quadril estendido."],
    err: ["Arredondar a lombar.", "Joelhos para dentro.", "Quadril subindo antes do peito."],
    sub: ["levantamento-terra", "agachamento-sumo", "hip-thrust-barra"], est: ["lombar", "quadril"],
  }),
  ex("cadeira-adutora", "Cadeira adutora", "adutores", {
    s: ["adutora", "adução de quadril", "hip adduction"],
    pad: "aducao_quadril", art: ["quadril"], t: "mono", eq: ["maquina"],
    exe: ["Sente com as costas apoiadas e as pernas abertas.", "Feche as pernas contra a resistência.", "Volte devagar."],
    err: ["Abrir além do confortável.", "Impulso.", "Retorno rápido."],
    sub: ["agachamento-sumo"], est: ["quadril"],
  }),

  // ==========================================================================
  // PANTURRILHAS (6)
  // ==========================================================================
  ex("panturrilha-em-pe-maquina", "Panturrilha em pé na máquina", "panturrilha", {
    s: ["panturrilha em pé", "gêmeos em pé", "standing calf raise", "panturrilha"],
    pad: "flexao_plantar", art: ["tornozelo"], t: "mono", eq: ["maquina"],
    exe: ["Ombros sob o apoio e pontas dos pés na plataforma.", "Desça os calcanhares até alongar.", "Suba o máximo possível e segure 1 segundo."],
    err: ["Quicar no fundo.", "Flexionar os joelhos.", "Amplitude curta."],
    sub: ["panturrilha-smith", "panturrilha-leg-press", "panturrilha-unilateral-degrau"],
  }),
  ex("panturrilha-sentado", "Panturrilha sentado", "panturrilha", {
    s: ["sóleo", "panturrilha sentada", "seated calf raise"],
    pad: "flexao_plantar", art: ["tornozelo"], t: "mono", eq: ["maquina"],
    exe: ["Joelhos sob o apoio e pontas dos pés na plataforma.", "Desça os calcanhares até alongar.", "Suba e segure no topo."],
    err: ["Amplitude curta.", "Movimento rápido.", "Impulso das pernas."],
    sub: ["panturrilha-em-pe-maquina", "panturrilha-leg-press"],
  }),
  ex("panturrilha-leg-press", "Panturrilha no leg press", "panturrilha", {
    s: ["panturrilha leg", "gêmeos no leg press"],
    pad: "flexao_plantar", art: ["tornozelo"], t: "mono", eq: ["maquina"],
    exe: ["Pontas dos pés na borda inferior da plataforma, joelhos estendidos sem travar.", "Empurre com as pontas dos pés.", "Volte até alongar."],
    err: ["Destravar a plataforma sem segurança.", "Flexionar os joelhos.", "Amplitude curta."],
    sub: ["panturrilha-em-pe-maquina", "panturrilha-smith"],
  }),
  ex("panturrilha-smith", "Panturrilha em pé no Smith", "panturrilha", {
    s: ["panturrilha smith"],
    pad: "flexao_plantar", art: ["tornozelo"], t: "mono", eq: ["smith"],
    exe: ["Pontas dos pés sobre um degrau ou anilha, barra no trapézio.", "Desça os calcanhares e suba o máximo.", "Segure no topo."],
    err: ["Quicar.", "Flexionar os joelhos.", "Amplitude curta."],
    sub: ["panturrilha-em-pe-maquina", "panturrilha-leg-press"],
  }),
  ex("panturrilha-unilateral-degrau", "Panturrilha unilateral no degrau com halter", "panturrilha", {
    s: ["panturrilha unilateral", "single leg calf raise"],
    pad: "flexao_plantar", art: ["tornozelo"], t: "mono", eq: ["halter", "peso_corporal"],
    exe: ["Ponta de um pé no degrau, halter na mão do mesmo lado.", "Desça o calcanhar e suba o máximo.", "Use a outra mão para equilíbrio."],
    err: ["Flexionar o joelho.", "Amplitude curta.", "Movimento rápido."],
    sub: ["panturrilha-em-pe-maquina", "panturrilha-smith"], reg: ["carga", "repeticoes"],
  }),
  ex("panturrilha-burrinho", "Panturrilha burrinho", "panturrilha", {
    s: ["donkey calf raise", "burrinho"],
    pad: "flexao_plantar", art: ["tornozelo"], t: "mono", eq: ["maquina"],
    exe: ["Tronco inclinado e apoiado, quadril sob o apoio da máquina.", "Desça os calcanhares até alongar.", "Suba e segure."],
    err: ["Flexionar os joelhos.", "Quicar.", "Amplitude curta."],
    sub: ["panturrilha-em-pe-maquina", "panturrilha-leg-press"],
  }),

  // ==========================================================================
  // ABDÔMEN (10)
  // ==========================================================================
  ex("abdominal-supra", "Abdominal supra (crunch)", "abdomen", {
    s: ["abdominal", "crunch", "supra", "abdominal reto"],
    pad: "flexao_tronco", art: ["coluna"], t: "mono", eq: ["peso_corporal"],
    exe: ["Deitado, joelhos flexionados e mãos ao lado da cabeça.", "Enrole o tronco tirando as escápulas do chão.", "Desça devagar."],
    err: ["Puxar o pescoço com as mãos.", "Impulso.", "Subir com o quadril."],
    sub: ["abdominal-polia", "abdominal-maquina"], reg: ["repeticoes", "carga"],
  }),
  ex("abdominal-infra", "Abdominal infra (elevação de pernas deitado)", "abdomen", {
    s: ["infra", "abdominal infra", "elevação de pernas", "leg raise"],
    p: { core: 0.25 }, pad: "flexao_quadril", art: ["quadril", "coluna"], t: "mono", eq: ["peso_corporal"],
    exe: ["Deitado, mãos sob o quadril ou ao lado do corpo.", "Eleve as pernas e tire levemente o quadril do chão.", "Desça sem deixar a lombar arquear."],
    err: ["Arquear a lombar.", "Impulso das pernas.", "Movimento rápido."],
    sub: ["elevacao-pernas-suspenso", "elevacao-joelhos-paralelas"], reg: ["repeticoes"], est: ["lombar"],
  }),
  ex("elevacao-pernas-suspenso", "Elevação de pernas suspenso na barra", "abdomen", {
    s: ["hanging leg raise", "elevação de pernas na barra"],
    p: { core: 0.25, antebraco: 0.25 }, pad: "flexao_quadril", art: ["quadril", "coluna"], t: "mono", eq: ["barra_fixa"], n: "avancado",
    exe: ["Pendurado na barra, corpo parado.", "Eleve as pernas (ou joelhos) enrolando a pelve.", "Desça controlando sem balançar."],
    err: ["Balançar o corpo.", "Usar só os flexores do quadril sem enrolar a pelve.", "Descer rápido."],
    sub: ["elevacao-joelhos-paralelas", "abdominal-infra"], reg: ["repeticoes"],
  }),
  ex("elevacao-joelhos-paralelas", "Elevação de joelhos nas paralelas", "abdomen", {
    s: ["captain's chair", "cadeira romana abdominal", "elevação de joelhos"],
    p: { core: 0.25 }, pad: "flexao_quadril", art: ["quadril", "coluna"], t: "mono", eq: ["paralelas"],
    exe: ["Antebraços no apoio e costas no encosto.", "Eleve os joelhos ao peito enrolando a pelve.", "Desça devagar."],
    err: ["Balançar.", "Ombros encolhidos.", "Movimento curto."],
    sub: ["elevacao-pernas-suspenso", "abdominal-infra"], reg: ["repeticoes"],
  }),
  ex("abdominal-polia", "Abdominal na polia (crunch ajoelhado)", "abdomen", {
    s: ["abdominal polia", "cable crunch", "abdominal ajoelhado"],
    pad: "flexao_tronco", art: ["coluna"], t: "mono", eq: ["polia", "corda"],
    exe: ["Ajoelhado, corda junto à cabeça.", "Enrole o tronco levando os cotovelos aos joelhos.", "Volte devagar sem mover o quadril."],
    err: ["Sentar no calcanhar (usar quadril).", "Puxar com os braços.", "Movimento rápido."],
    sub: ["abdominal-maquina", "abdominal-supra"],
  }),
  ex("abdominal-maquina", "Abdominal na máquina", "abdomen", {
    s: ["abdominal máquina", "ab crunch machine"],
    pad: "flexao_tronco", art: ["coluna"], t: "mono", eq: ["maquina"],
    exe: ["Ajuste o assento e segure as alças.", "Enrole o tronco contra a resistência.", "Volte devagar."],
    err: ["Puxar com os braços.", "Impulso.", "Amplitude curta."],
    sub: ["abdominal-polia", "abdominal-supra"],
  }),
  ex("abdominal-bicicleta", "Abdominal bicicleta (oblíquos)", "abdomen", {
    s: ["bicicleta", "abdominal oblíquo", "bicycle crunch", "oblíquos"],
    p: { core: 0.25 }, pad: "rotacao_tronco", art: ["coluna", "quadril"], t: "mono", eq: ["peso_corporal"],
    exe: ["Deitado, mãos ao lado da cabeça.", "Leve o cotovelo em direção ao joelho oposto, alternando.", "Mantenha a lombar apoiada."],
    err: ["Puxar o pescoço.", "Pressa.", "Lombar saindo do chão."],
    sub: ["russian-twist", "abdominal-supra"], reg: ["repeticoes"],
  }),
  ex("abdominal-canivete", "Abdominal canivete (V-up)", "abdomen", {
    s: ["canivete", "v up", "abdominal v"],
    p: { core: 0.25 }, pad: "flexao_tronco", art: ["coluna", "quadril"], t: "mono", eq: ["peso_corporal"], n: "intermediario",
    exe: ["Deitado, braços estendidos acima da cabeça.", "Suba tronco e pernas ao mesmo tempo, tocando as mãos nos pés.", "Desça controlando."],
    err: ["Impulso.", "Arquear a lombar na descida.", "Dobrar os joelhos demais."],
    sub: ["abdominal-supra", "abdominal-infra"], reg: ["repeticoes"], est: ["lombar"],
  }),
  ex("russian-twist", "Russian twist", "abdomen", {
    s: ["rotação russa", "giro russo", "russian twist com anilha"],
    p: { core: 0.5 }, pad: "rotacao_tronco", art: ["coluna"], t: "mono", eq: ["peso_corporal", "anilha", "halter"],
    exe: ["Sentado, tronco inclinado para trás e pés no chão ou elevados.", "Gire o tronco levando a carga de um lado ao outro.", "Mantenha a coluna alongada."],
    err: ["Arredondar as costas.", "Girar só os braços.", "Velocidade excessiva."],
    sub: ["pallof-press", "abdominal-bicicleta"], reg: ["repeticoes", "carga"], est: ["lombar"],
  }),
  ex("roda-abdominal", "Roda abdominal", "abdomen", {
    s: ["ab wheel", "rodinha", "rollout"],
    p: { core: 0.5, costas: 0.25 }, pad: "antiextensao", art: ["ombro", "coluna"], t: "multi", eq: ["roda"], n: "intermediario",
    exe: ["Ajoelhado, mãos na roda abaixo dos ombros.", "Role à frente mantendo o abdômen firme e a lombar neutra.", "Volte puxando com o abdômen."],
    err: ["Deixar a lombar arquear.", "Ir além do que consegue voltar.", "Quadril subindo primeiro."],
    sub: ["prancha-frontal", "dead-bug"], reg: ["repeticoes"], est: ["lombar"],
  }),

  // ==========================================================================
  // CORE E LOMBAR (6)
  // ==========================================================================
  ex("prancha-frontal", "Prancha frontal", "core", {
    s: ["prancha", "plank", "prancha abdominal"],
    p: { abdomen: 0.5 }, pad: "antiextensao", art: ["coluna"], t: "mono", eq: ["peso_corporal"],
    exe: ["Antebraços no chão, cotovelos sob os ombros.", "Corpo alinhado da cabeça aos pés.", "Contraia abdômen e glúteos e respire normalmente."],
    err: ["Quadril caindo.", "Quadril alto demais.", "Prender a respiração."],
    sub: ["dead-bug", "roda-abdominal"], reg: ["tempo"],
  }),
  ex("prancha-lateral", "Prancha lateral", "core", {
    s: ["side plank", "prancha de lado"],
    p: { abdomen: 0.5 }, pad: "antiflexao_lateral", art: ["coluna", "ombro"], t: "mono", eq: ["peso_corporal"],
    exe: ["Apoie o antebraço sob o ombro, corpo de lado.", "Eleve o quadril alinhando o corpo.", "Mantenha a posição."],
    err: ["Quadril caindo.", "Ombro afastado do cotovelo.", "Girar o tronco."],
    sub: ["pallof-press", "caminhada-fazendeiro"], reg: ["tempo"],
  }),
  ex("dead-bug", "Dead bug", "core", {
    s: ["inseto morto", "deadbug"],
    p: { abdomen: 0.5 }, pad: "antiextensao", art: ["coluna", "quadril", "ombro"], t: "mono", eq: ["peso_corporal"],
    exe: ["Deitado, braços para cima e quadril e joelhos a 90°.", "Estenda braço e perna opostos sem tirar a lombar do chão.", "Volte e alterne."],
    err: ["Lombar arqueando.", "Pressa.", "Prender a respiração."],
    sub: ["prancha-frontal", "perdigueiro"], reg: ["repeticoes", "tempo"],
  }),
  ex("pallof-press", "Pallof press", "core", {
    s: ["pallof", "antirrotação na polia"],
    p: { abdomen: 0.5 }, pad: "antirrotacao", art: ["coluna"], t: "mono", eq: ["polia", "elastico"],
    exe: ["De lado para a polia, alça junto ao peito.", "Empurre a alça à frente sem deixar o tronco girar.", "Volte devagar."],
    err: ["Girar o tronco.", "Ficar perto demais da polia.", "Joelhos travados."],
    sub: ["prancha-lateral", "russian-twist"], reg: ["carga", "repeticoes", "tempo"],
  }),
  ex("hiperextensao-lombar", "Hiperextensão lombar (banco 45°)", "lombar", {
    s: ["hiperextensão", "extensão lombar", "banco romano", "back extension", "lombar 45"],
    p: { gluteo: 0.5, posteriores: 0.5 }, pad: "extensao_tronco", art: ["coluna", "quadril"], t: "multi", eq: ["banco", "peso_corporal"],
    exe: ["Quadril na borda do banco 45°, pés presos.", "Desça o tronco com a coluna neutra.", "Suba até alinhar o corpo, sem hiperestender."],
    err: ["Hiperestender a coluna no topo.", "Movimento rápido.", "Arredondar demais a coluna com carga."],
    sub: ["good-morning", "perdigueiro"], reg: ["repeticoes", "carga"], est: ["lombar"],
  }),
  ex("perdigueiro", "Perdigueiro (bird dog)", "core", {
    s: ["bird dog", "quatro apoios alternado"],
    p: { lombar: 0.5, gluteo: 0.25 }, pad: "antirrotacao", art: ["coluna", "quadril", "ombro"], t: "mono", eq: ["peso_corporal"],
    exe: ["Em quatro apoios, coluna neutra.", "Estenda braço e perna opostos sem girar o quadril.", "Volte e alterne."],
    err: ["Arquear a lombar.", "Girar o quadril.", "Pressa."],
    sub: ["dead-bug", "hiperextensao-lombar"], reg: ["repeticoes", "tempo"],
  }),

  // ==========================================================================
  // ANTEBRAÇO (3)
  // ==========================================================================
  ex("rosca-punho", "Rosca de punho (flexão de punho)", "antebraco", {
    s: ["rosca punho", "flexão de punho", "wrist curl"],
    pad: "flexao_punho", art: ["punho"], t: "mono", eq: ["barra", "halter", "banco"],
    exe: ["Antebraços apoiados no banco, palmas para cima.", "Flexione os punhos subindo a barra.", "Desça devagar."],
    err: ["Mover os cotovelos.", "Amplitude curta.", "Carga alta."],
    sub: ["extensao-punho", "caminhada-fazendeiro"], est: ["cotovelo_punho"],
  }),
  ex("extensao-punho", "Extensão de punho (rosca de punho inversa)", "antebraco", {
    s: ["rosca punho inversa", "extensão de punho", "reverse wrist curl"],
    pad: "extensao_punho", art: ["punho"], t: "mono", eq: ["barra", "halter", "banco"],
    exe: ["Antebraços apoiados, palmas para baixo.", "Estenda os punhos para cima.", "Desça devagar."],
    err: ["Carga alta.", "Mover os cotovelos.", "Movimento rápido."],
    sub: ["rosca-punho", "rosca-inversa"], est: ["cotovelo_punho"],
  }),
  ex("rosca-inversa", "Rosca inversa (pegada pronada)", "antebraco", {
    s: ["rosca pronada", "reverse curl"],
    p: { biceps: 0.5 }, pad: "flexao_cotovelo", art: ["cotovelo", "punho"], t: "mono", eq: ["barra", "barra_w"],
    exe: ["Pegada pronada na largura dos ombros.", "Flexione os cotovelos mantendo os punhos firmes.", "Desça controlando."],
    err: ["Punhos dobrando.", "Balançar.", "Cotovelos à frente."],
    sub: ["rosca-martelo", "extensao-punho"], est: ["cotovelo_punho"],
  }),
];

/** Grupos que o catálogo precisa cobrir (requisito da biblioteca). */
export const GRUPOS_OBRIGATORIOS: GrupoMuscular[] = [
  "peito", "costas", "ombro_anterior", "ombro_lateral", "ombro_posterior", "trapezio", "biceps", "triceps", "antebraco",
  "quadriceps", "posteriores", "gluteo", "adutores", "panturrilha", "abdomen", "core", "lombar",
];

export const CATALOGO_VERSAO = 1;

export function catalogoPorSlug(): Map<string, ExercicioCatalogo> {
  return new Map(CATALOGO.map((e) => [e.slug, e]));
}
