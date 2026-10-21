// ============================================================================
// Ditar treino (PURO, testado). Transforma a fala do personal em exercícios:
//   "crucifixo máquina, supino inclinado, supino reto barra 4 de 10,
//    elevação lateral e um biset de desenvolvimento com elevação frontal.
//    Todos em pirâmide crescente."
// Sem IA: casa as palavras com os nomes/sinônimos da biblioteca e escolhe a
// melhor divisão da frase (funciona sem vírgulas, como sai do microfone).
//   • números: "4 de 10", "4 por 10", "4x10", "3 séries de 8 a 12",
//     "descanso 90", "descanso de 1 minuto e meio";
//   • métodos de bloco (bi-set, tri-set, super-set…) ligam os próximos;
//   • outros métodos valem para o exercício anterior ("supino em drop set")
//     ou para todos ("todos em pirâmide crescente").
// Nada é aplicado sem o personal conferir a prévia.
// ============================================================================

import type { Tecnica } from "@/lib/volume/calcular";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { ehTecnicaBloco, TAMANHO_BLOCO } from "@/lib/volume/tecnicas";
import { configIgual, type SerieConfig } from "@/lib/series";
import { seriesEmPiramide } from "./metodo";

export type ExercicioDitado = {
  /** O que foi falado para este exercício. */
  falado: string;
  escolhido: ItemBiblioteca | null;
  /** Outras opções que casam com a fala (para o personal trocar na prévia). */
  candidatos: ItemBiblioteca[];
  /** "confira" quando há empate entre opções parecidas. */
  confianca: "alta" | "confira";
  series: number | null;
  reps: string | null;
  descansoSeg: number | null;
  metodo: Tecnica | null;
  /** Exercícios com o mesmo número estão no mesmo bi-set/tri-set. */
  bloco: number | null;
};

export type TreinoDitado = {
  exercicios: ExercicioDitado[];
  metodoGeral: Tecnica | null;
  /** Palavras que não viraram exercício nem instrução. */
  naoEntendido: string[];
};

const sem = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// ---------------------------------------------------------------------------
// Números falados por extenso → dígitos
// ---------------------------------------------------------------------------
const UNIDADES: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100,
  duzentos: 200,
};

function numerosPorExtenso(t: string): string {
  // "cento e vinte" / "vinte e cinco" → soma; "um"/"uma" só vira número antes de série/rep/minuto.
  return t.replace(/\b(cento|duzentos|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|zero|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove)((?:\s+e\s+(?:vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove))*)\b/g, (m) =>
    String(m.split(/\s+e\s+/).reduce((s, w) => s + (UNIDADES[w.trim()] ?? 0), 0))
  ).replace(/\b(um|uma)\s+(serie|series|minuto|minutos|repeticao|repeticoes)\b/g, "1 $2");
}

// ---------------------------------------------------------------------------
// Métodos falados
// ---------------------------------------------------------------------------
const METODOS_FALADOS: Array<[RegExp, Tecnica]> = [
  [/\bpiramides?\s+(?:decrescentes?|invertidas?|reversas?)\b/g, "piramide_decrescente"],
  [/\bpiramides?(?:\s+crescentes?)?\b/g, "piramide"],
  [/\b(?:bi\s*-?\s*sets?e?|by\s*sets?|bisets?|bissets?|bisete|bi\s*serie)\b/g, "biset"],
  [/\b(?:tri\s*-?\s*sets?e?|trisets?|tri\s*serie|tree\s*sets?)\b/g, "triset"],
  [/\b(?:super\s*-?\s*sets?e?|supersets?|super\s*serie)\b/g, "superset"],
  [/\b(?:pre\s*-?\s*exaustao)\b/g, "pre_exaustao"],
  [/\bcombinados?\b/g, "combinado"],
  [/\b(?:drop\s*-?\s*sets?e?|dropsets?)\b/g, "dropset"],
  [/\b(?:rest\s*-?\s*pause|restpause|rest\s*pose)\b/g, "rest_pause"],
  [/\bcluster\b/g, "cluster"],
  [/\b(?:myo|mio|maio)\s*-?\s*reps?\b/g, "myo_reps"],
  [/\b(?:3\s*(?:barra|por)?\s*7|tres\s+sete)\b/g, "tres_sete"],
  [/\bsuper\s*slow\b/g, "super_slow"],
  [/\b(?:negativos?|excentrica lenta)\b/g, "negativo"],
  [/\bisometrias?\b/g, "isometria"],
];

/** Palavras que ligam a fala e não fazem parte do nome do exercício. */
const LIGACAO = new Set(
  "eu quero queria vou vamos coloca colocar coloque faz fazer faca bota botar um uma uns umas o a os as e de da do das dos na no nas nos em com pra para por pelo pela mais tambem depois entao seguida primeiro primeira segundo segunda terceiro ultimo exercicio exercicios treino serie series metodo tecnica ai ok pronto isso aqui ali tipo exemplo agora todos todas tudo todo ele ela fechar fecha finaliza finalizar terminar termina comecar comeca seguido junto juntos sequencia ate".split(" ")
);

/** Palavras que não ajudam a diferenciar exercícios no nome da biblioteca. */
const IGNORAR_NO_NOME = new Set("de da do das dos na no nas nos com o a os as em e para".split(" "));

type Token = { tipo: "palavra"; w: string } | { tipo: "num"; series: number | null; reps: string | null; descanso: number | null } | { tipo: "metodo"; m: Tecnica; geral: boolean } | { tipo: "fim" };

function tokenizar(fala: string): Token[] {
  let t = ` ${sem(fala)} `
    .replace(/[“”"']/g, " ")
    .replace(/(\d)\s*[x×]\s*(\d)/g, "$1 por $2")
    .replace(/[,;.!?:\n]+/g, " ¶ ");
  t = numerosPorExtenso(t);
  // "supino reto inclinado" → o personal quis o inclinado
  t = t.replace(/\breto\s+(inclinado|declinado)\b/g, "$1").replace(/\b(inclinado|declinado)\s+reto\b/g, "$1");
  // "treino A de peito", "treino de pernas" etc. — é o título, não exercício
  t = t.replace(/\btreino\s+(?:[a-f]\s+)?(?:(?:de|do|da)\s+)?(?:peito|costas|pernas?|ombros?|bracos?|gluteos?|biceps|triceps|inferiores?|superiores?|abdomen|full\s*body|quadriceps|posterior(?:es)?)\b(?:\s+e\s+(?:peito|costas|pernas?|ombros?|bracos?|gluteos?|biceps|triceps|abdomen))*/g, " ¶ ");

  const especiais: Token[] = [];
  const marca = (tok: Token) => {
    especiais.push(tok);
    return ` §${especiais.length - 1} `;
  };
  // descanso
  t = t.replace(/\b(?:descanso|descansa|descansar|intervalo)\s+(?:de\s+)?(\d+)\s*(segundos?|seg|s|minutos?|min)?(\s+e\s+meio)?/g, (_m, n: string, u: string | undefined, meio: string | undefined) => {
    const v = Number(n);
    const seg = u && /^min/.test(u) ? v * 60 + (meio ? 30 : 0) : v <= 5 && !u ? v * 60 : v;
    return marca({ tipo: "num", series: null, reps: null, descanso: seg });
  });
  // séries × repetições
  t = t.replace(/\b(\d+)\s*(?:series?\s*)?(?:de|por|vezes)\s*(\d+)(?:\s*(?:a|ate|-)\s*(\d+))?(?:\s*(?:repeticoes|repeticao|reps?))?/g, (_m, s: string, r1: string, r2: string | undefined) =>
    marca({ tipo: "num", series: Number(s), reps: r2 ? `${r1}-${r2}` : r1, descanso: null })
  );
  t = t.replace(/\b(\d+)\s*series?\b/g, (_m, s: string) => marca({ tipo: "num", series: Number(s), reps: null, descanso: null }));
  t = t.replace(/\b(\d+)(?:\s*(?:a|ate|-)\s*(\d+))?\s*(?:repeticoes|repeticao|reps?)\b/g, (_m, r1: string, r2: string | undefined) => marca({ tipo: "num", series: null, reps: r2 ? `${r1}-${r2}` : r1, descanso: null }));
  // métodos (com "todos/tudo ... <método>" = vale para o treino inteiro)
  for (const [re, m] of METODOS_FALADOS) {
    t = t.replace(new RegExp(`\\b(todos|todas|tudo|treino todo|treino inteiro)\\b((?:\\s+\\S+){0,4}?)\\s+(?:${re.source})`, "g"), (_x, _a, meio: string) => `${meio} ${marca({ tipo: "metodo", m, geral: true })}`);
    t = t.replace(re, () => marca({ tipo: "metodo", m, geral: false }));
  }

  const out: Token[] = [];
  for (const w of t.split(/\s+/).filter(Boolean)) {
    if (w === "¶") out.push({ tipo: "fim" });
    else if (/^§\d+$/.test(w)) out.push(especiais[Number(w.slice(1))]);
    else out.push({ tipo: "palavra", w: w.replace(/[^a-z0-9-]/g, "") });
  }
  return out.filter((x) => x.tipo !== "palavra" || x.w);
}

// ---------------------------------------------------------------------------
// Casar trechos com a biblioteca
// ---------------------------------------------------------------------------
type Indexado = { item: ItemBiblioteca; nomes: string[][] };

function palavrasDe(s: string): string[] {
  return sem(s)
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(" ")
    .filter((w) => w && !IGNORAR_NO_NOME.has(w));
}

function indexar(itens: ItemBiblioteca[]): Indexado[] {
  return itens.map((item) => ({ item, nomes: [palavrasDe(item.nome), ...item.sinonimos.map(palavrasDe)].filter((n) => n.length) }));
}

const casa = (falada: string, doNome: string) => doNome === falada || (falada.length >= 3 && doNome.startsWith(falada)) || (doNome.length >= 4 && falada.startsWith(doNome) && falada.length - doNome.length <= 2);

/** Cobertura do nome (0–1) se TODAS as palavras faladas estão no nome; senão -1. */
function cobertura(tokens: string[], nome: string[]): number {
  const usados = new Set<number>();
  for (const t of tokens) {
    const i = nome.findIndex((w, k) => !usados.has(k) && casa(t, w));
    if (i < 0) return -1;
    usados.add(i);
  }
  return usados.size / nome.length;
}

type Casamento = { score: number; opcoes: Array<{ item: ItemBiblioteca; cob: number }> };

// Nomes começam pelo movimento ("Supino inclinado na máquina"): a fala que
// começa como o nome ganha um bônus — desempata "crucifixo máquina | supino…"
// contra "crucifixo | máquina supino…" quando não há pausa na fala.
const BONUS_INICIO = 3;

function casar(tokens: string[], idx: Indexado[], favoritos: Set<string>, uso: Map<string, number>): Casamento | null {
  const opcoes: Array<{ item: ItemBiblioteca; cob: number }> = [];
  for (const x of idx) {
    let melhor = -1;
    for (const n of x.nomes) {
      const c = cobertura(tokens, n);
      if (c > 0) melhor = Math.max(melhor, c + (casa(tokens[0], n[0]) ? BONUS_INICIO : 0));
    }
    if (melhor > 0) opcoes.push({ item: x.item, cob: melhor });
  }
  if (!opcoes.length) return null;
  opcoes.sort((a, b) => b.cob - a.cob || Number(favoritos.has(b.item.id)) - Number(favoritos.has(a.item.id)) || (uso.get(b.item.id) ?? 0) - (uso.get(a.item.id) ?? 0) || a.item.nome.length - b.item.nome.length);
  const top = opcoes[0].cob;
  const inicio = top >= BONUS_INICIO;
  return { score: tokens.length * 10 + (inicio ? top - BONUS_INICIO : top) * 4 - (inicio ? 0 : BONUS_INICIO), opcoes };
}

const CUSTO_TRECHO = 8;
const CUSTO_DESCONHECIDA = 3;
const MAX_PALAVRAS = 7;

/** Divide uma sequência de palavras em exercícios (programação dinâmica). */
function dividir(palavras: string[], idx: Indexado[], fav: Set<string>, uso: Map<string, number>): Array<{ ini: number; fim: number; c: Casamento } | { ini: number; fim: number; c: null }> {
  const n = palavras.length;
  const melhor: number[] = Array(n + 1).fill(-Infinity);
  const de: Array<{ i: number; c: Casamento | null } | null> = Array(n + 1).fill(null);
  melhor[0] = 0;
  const cache = new Map<string, Casamento | null>();
  for (let j = 1; j <= n; j++) {
    // pular a palavra j-1 (ligação não custa; desconhecida custa um pouco)
    const pulo = melhor[j - 1] - (LIGACAO.has(palavras[j - 1]) ? 0 : CUSTO_DESCONHECIDA);
    if (pulo > melhor[j]) {
      melhor[j] = pulo;
      de[j] = { i: j - 1, c: null };
    }
    for (let i = Math.max(0, j - MAX_PALAVRAS); i < j; i++) {
      if (melhor[i] === -Infinity) continue;
      const trecho = palavras.slice(i, j).filter((w) => !IGNORAR_NO_NOME.has(w));
      if (!trecho.length || LIGACAO.has(palavras[i]) || LIGACAO.has(palavras[j - 1])) continue;
      const chave = trecho.join(" ");
      if (!cache.has(chave)) cache.set(chave, casar(trecho, idx, fav, uso));
      const c = cache.get(chave)!;
      if (!c) continue;
      const v = melhor[i] + c.score - CUSTO_TRECHO;
      if (v > melhor[j]) {
        melhor[j] = v;
        de[j] = { i, c };
      }
    }
  }
  const out: Array<{ ini: number; fim: number; c: Casamento | null }> = [];
  for (let j = n; j > 0; ) {
    const d = de[j]!;
    out.push({ ini: d.i, fim: j, c: d.c });
    j = d.i;
  }
  return out.reverse();
}

export function interpretarDitado(fala: string, itens: ItemBiblioteca[], opcoes: { favoritos?: Set<string>; uso?: Map<string, number> } = {}): TreinoDitado {
  const fav = opcoes.favoritos ?? new Set<string>();
  const uso = opcoes.uso ?? new Map<string, number>();
  const idx = indexar(itens);
  const tokens = tokenizar(fala);
  const exercicios: ExercicioDitado[] = [];
  const naoEntendido: string[] = [];
  let metodoGeral: Tecnica | null = null;
  let blocoAberto: { id: number; resta: number; metodo: Tecnica } | null = null;
  let proximoBloco = 1;

  const novoExercicio = (falado: string, c: Casamento) => {
    const [top, ...resto] = c.opcoes;
    const empate = resto.some((o) => o.cob === top.cob);
    const ex: ExercicioDitado = {
      falado,
      escolhido: top.item,
      candidatos: c.opcoes.slice(0, 6).map((o) => o.item),
      confianca: empate ? "confira" : "alta",
      series: null,
      reps: null,
      descansoSeg: null,
      metodo: null,
      bloco: null,
    };
    if (blocoAberto) {
      ex.metodo = blocoAberto.metodo;
      ex.bloco = blocoAberto.id;
      blocoAberto.resta--;
      if (blocoAberto.resta <= 0) blocoAberto = null;
    }
    exercicios.push(ex);
  };

  // "drop set na extensora": o método espera para saber a quem se refere.
  let metodoPendente: Tecnica | null = null;
  const aplicarPendenteNoAnterior = () => {
    const alvo = exercicios[exercicios.length - 1];
    if (metodoPendente && alvo && alvo.bloco == null) alvo.metodo = metodoPendente;
    metodoPendente = null;
  };

  let palavras: string[] = [];
  const descarregar = () => {
    if (!palavras.length) return;
    let alvoDoPendente = false;
    if (metodoPendente) {
      if (/^(na|no|nas|nos|em|para|pra|pro)$/.test(palavras[0])) alvoDoPendente = true;
      else aplicarPendenteNoAnterior();
    }
    for (const p of dividir(palavras, idx, fav, uso)) {
      const falado = palavras.slice(p.ini, p.fim).join(" ");
      if (p.c && alvoDoPendente) {
        alvoDoPendente = false;
        const ja = exercicios.find((e) => e.escolhido && p.c!.opcoes.some((o) => o.item.id === e.escolhido!.id));
        if (ja) {
          if (ja.bloco == null) ja.metodo = metodoPendente;
          metodoPendente = null;
          continue;
        }
        novoExercicio(falado, p.c);
        aplicarPendenteNoAnterior();
      } else if (p.c) novoExercicio(falado, p.c);
      else if (!LIGACAO.has(falado)) naoEntendido.push(falado);
    }
    if (metodoPendente) aplicarPendenteNoAnterior();
    palavras = [];
  };

  for (const tk of tokens) {
    if (tk.tipo === "palavra") {
      palavras.push(tk.w);
      continue;
    }
    descarregar();
    if (metodoPendente) aplicarPendenteNoAnterior();
    if (tk.tipo === "num") {
      const alvo = exercicios[exercicios.length - 1];
      if (!alvo) continue;
      // num bi-set, "3 de 12" dito no fim vale para o bloco todo
      const grupo = alvo.bloco != null ? exercicios.filter((e) => e.bloco === alvo.bloco) : [alvo];
      for (const e of grupo) {
        if (tk.series != null && (e === alvo || e.series == null)) e.series = tk.series;
        if (tk.reps != null && (e === alvo || e.reps == null)) e.reps = tk.reps;
        if (tk.descanso != null) e.descansoSeg = tk.descanso;
      }
    } else if (tk.tipo === "metodo") {
      if (ehTecnicaBloco(tk.m)) {
        if (tk.geral) continue;
        blocoAberto = { id: proximoBloco++, resta: TAMANHO_BLOCO[tk.m] ?? 2, metodo: tk.m };
      } else if (tk.geral || !exercicios.length) {
        metodoGeral = tk.m;
      } else {
        metodoPendente = tk.m;
      }
    }
  }
  descarregar();
  aplicarPendenteNoAnterior();

  // Bloco que ficou com um exercício só não é bi-set.
  for (const e of exercicios) {
    if (e.bloco != null && exercicios.filter((x) => x.bloco === e.bloco).length < 2) {
      e.bloco = null;
      e.metodo = null;
    }
  }
  return { exercicios, metodoGeral, naoEntendido };
}

/** Método final de cada exercício (o geral só entra onde não há outro). */
export function metodoFinal(e: ExercicioDitado, geral: Tecnica | null): { tecnica: Tecnica; piramide: "crescente" | "decrescente" | null } {
  const piramideDe = (m: Tecnica | null) => (m === "piramide" ? "crescente" : m === "piramide_decrescente" ? "decrescente" : null);
  if (e.bloco != null) return { tecnica: e.metodo ?? "biset", piramide: piramideDe(geral) };
  const m = e.metodo ?? geral ?? "normal";
  return { tecnica: m, piramide: piramideDe(m) };
}

/** Linha pronta para entrar no montador (depois da conferência na prévia). */
export type LinhaDitada = {
  item: ItemBiblioteca;
  series: number | null;
  reps: string | null;
  descansoSeg: number | null;
  tecnica: Tecnica;
  piramide: "crescente" | "decrescente" | null;
  bloco: number | null;
};

/** Séries da linha: padrão 3× 10-12; pirâmide sem reps faladas = 4 séries 20-15-12-10. */
export function configDaLinha(l: Pick<LinhaDitada, "series" | "reps" | "descansoSeg" | "piramide">): SerieConfig {
  const semReps = !l.reps;
  let cfg = configIgual(l.series ?? (l.piramide && semReps ? 4 : 3), l.reps ?? "10-12", null);
  if (l.descansoSeg != null && cfg.modo === "iguais") cfg = { ...cfg, descanso_seg: l.descansoSeg };
  return l.piramide && semReps ? seriesEmPiramide(cfg, l.piramide === "decrescente") : cfg;
}

export function resumoSeries(cfg: SerieConfig): string {
  if (cfg.modo === "iguais") return `${cfg.series}× ${cfg.reps}${cfg.descanso_seg ? ` · desc. ${cfg.descanso_seg}s` : ""}`;
  const d = cfg.series[0]?.descanso_seg;
  return `${cfg.series.length}× ${cfg.series.map((x) => x.reps).join("-")}${d ? ` · desc. ${d}s` : ""}`;
}
