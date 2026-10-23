// Modo Visitante — “subir o treino que já tenho”: lê um treino escrito, colado
// (WhatsApp), ditado pela voz ou transcrito de uma foto/PDF e monta o rascunho.
// Contas puras e testadas: cada linha vira um exercício com séries, repetições,
// carga e descanso; o nome é procurado na biblioteca (nome e sinônimos, sem
// acento). O que não for encontrado vira “exercício com o seu nome”: fica salvo
// para acompanhar a evolução, mas não entra no volume por músculo.

import { normalizarNome } from "@/lib/grupos";

export type ItemParaCasar = { id: string; nome: string; sinonimos: string[] };

export type ExercicioLido = {
  /** Linha original (para a pessoa conferir). */
  texto: string;
  /** Nome como a pessoa escreveu (limpo). */
  nome: string;
  series: number;
  reps: string;
  cargaKg: number | null;
  descansoSeg: number | null;
  /** Exercício da biblioteca encontrado (null = fica com o nome da pessoa). */
  bibliotecaId: string | null;
  confianca: "certeza" | "parecido" | "nenhuma";
};

export type TreinoLido = { nome: string; exercicios: ExercicioLido[] };

export const PADRAO_LIDO = { series: 3, reps: "10-12", descansoSeg: 90 } as const;
export const MAX_TREINOS_LIDOS = 8;
export const MAX_EXERCICIOS_TREINO = 15;

// Números por extenso (voz): “três séries de doze”.
const EXTENSO: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
};

function trocarExtenso(t: string): string {
  // “vinte e cinco” → 25; depois as palavras soltas.
  let s = t.replace(/\b(vinte|trinta|quarenta|cinquenta|sessenta) e (um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove)\b/g, (_m, a: string, b: string) => String(EXTENSO[a] + EXTENSO[b]));
  s = s.replace(/\b[a-z]+\b/g, (p) => (p in EXTENSO && p !== "um" && p !== "uma" ? String(EXTENSO[p]) : p));
  // “um/uma” só quando ligado a número de série/rep (“uma série”), para não estragar nomes.
  s = s.replace(/\b(um|uma) (serie|series|vez|vezes)\b/g, "1 $2");
  return s;
}

const CABECALHO = /^(?:treino|dia|ficha|sessao|parte)\s*([a-h]|\d{1,2})?\b[\s:.\-–—]*(.*)$/i;
const SO_LETRA = /^([a-h])\s*[:.\-–—)]\s*(.*)$/i;

/** Nome do treino a partir do cabeçalho (“Treino A - Peito e tríceps” → “Peito e tríceps”). */
function nomeDoCabecalho(original: string, n: number): string {
  const limpo = original.replace(/^[\s#*•\-–—]+/, "").replace(/[:\s]+$/, "").trim();
  const m = limpo.match(/^(?:treino|dia|ficha|sessão|sessao|parte)\s*([a-h]|\d{1,2})?\s*[:.\-–—]?\s*(.*)$/i);
  const resto = (m?.[2] ?? "").trim();
  if (resto.length >= 2) return resto.slice(0, 60);
  if (m?.[1]) return `Treino ${m[1].toUpperCase()}`;
  return limpo.length >= 2 ? limpo.slice(0, 60) : `Treino ${n}`;
}

function ehCabecalho(norm: string, original: string): boolean {
  if (CABECALHO.test(norm)) {
    // “Treino A” / “Dia 1: costas” — sem séries/reps na linha.
    return !/\d+\s*[x×]\s*\d+/.test(norm) && !/\bseries?\b/.test(norm);
  }
  if (/:\s*$/.test(original.trim()) && !/\d/.test(norm)) return true; // “Pernas:”
  return false;
}

const STOP = new Set(["de", "da", "do", "das", "dos", "com", "na", "no", "nas", "nos", "a", "o", "e", "em", "para", "pra", "aquele", "aquela", "exercicio", "maquina"]);
const raiz = (p: string) => (p.length >= 5 ? p.slice(0, p.length - 2) : p.replace(/s$/, ""));
const palavras = (s: string) => normalizarNome(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((p) => p && !STOP.has(p)).map(raiz);

/** Procura o exercício na biblioteca: nome/sinônimo igual = certeza; maioria das palavras em comum = parecido. */
export function casarExercicio(nome: string, itens: ItemParaCasar[]): { id: string | null; confianca: ExercicioLido["confianca"] } {
  const alvo = normalizarNome(nome);
  if (!alvo) return { id: null, confianca: "nenhuma" };
  for (const i of itens) if ([i.nome, ...i.sinonimos].some((n) => normalizarNome(n) === alvo)) return { id: i.id, confianca: "certeza" };
  const p = new Set(palavras(nome));
  if (!p.size) return { id: null, confianca: "nenhuma" };
  let melhor: { id: string; nota: number } | null = null;
  for (const i of itens) {
    for (const n of [i.nome, ...i.sinonimos]) {
      const q = new Set(palavras(n));
      if (!q.size) continue;
      const comum = [...p].filter((x) => q.has(x)).length;
      // Precisa cobrir quase tudo o que a pessoa escreveu e a maior parte do nome da biblioteca.
      const nota = comum / Math.max(p.size, q.size);
      if (comum >= 1 && comum / p.size >= 0.75 && nota >= 0.6 && (!melhor || nota > melhor.nota)) melhor = { id: i.id, nota };
    }
  }
  return melhor ? { id: melhor.id, confianca: melhor.nota >= 0.99 ? "certeza" : "parecido" } : { id: null, confianca: "nenhuma" };
}

/** Lê uma linha de exercício: séries × reps, carga, descanso; o resto é o nome. */
export function lerLinha(original: string): Omit<ExercicioLido, "bibliotecaId" | "confianca"> | null {
  let t = trocarExtenso(normalizarNome(original).replace(/[×]/g, "x"));
  t = t.replace(/^[\s#*•\-–—>]+/, "").replace(/^\d{1,2}\s*[).º°-]\s+/, ""); // tira “1)”, “2.”, “-”
  let series: number | null = null;
  let reps: string | null = null;
  let carga: number | null = null;
  let descanso: number | null = null;
  const tirar = (re: RegExp, f: (m: RegExpMatchArray) => void) => {
    const m = t.match(re);
    if (m) {
      f(m);
      t = (t.slice(0, m.index) + " " + t.slice((m.index ?? 0) + m[0].length)).trim();
    }
  };
  // Descanso: “descanso 60s”, “60 seg”, “1 min”, “1’30”.
  tirar(/\b(?:descanso|intervalo|pausa)\s*(?:de\s*)?(\d{2,3})\b(?!\s*(?:s|seg|segundos?|min|minutos?)\b)/, (m) => (descanso = Number(m[1])));
  tirar(/\b(?:descanso|intervalo|pausa)?\s*(\d{1,3})\s*(s|seg|segundos?)\b/, (m) => (descanso = Number(m[1])));
  tirar(/\b(?:descanso|intervalo|pausa)?\s*(\d)\s*(?:min|minutos?)(?:\s*e?\s*(\d{1,2})\s*(?:s|seg)?)?\b/, (m) => (descanso = Number(m[1]) * 60 + Number(m[2] ?? 0)));
  // Carga: “30kg”, “30 quilos”, “12,5 kg”.
  tirar(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:kg|kgs|quilos?|kilos?)\b/, (m) => (carga = Number(m[1].replace(",", "."))));
  // Séries × reps: “4x10”, “3 x 8-12”, “4x12/10/8”, “3 series de 12”, “3 de 15”.
  tirar(/\b(\d{1,2})\s*x\s*(\d{1,3}(?:\s*(?:-|a|ate)\s*\d{1,3})?(?:\s*\/\s*\d{1,3})*)\b/, (m) => {
    series = Number(m[1]);
    reps = m[2];
  });
  if (series == null) tirar(/\b(\d{1,2})\s*(?:series?|sets?|vezes)\s*(?:de|com|x)?\s*(\d{1,3}(?:\s*(?:-|a|ate)\s*\d{1,3})?)?\s*(?:repeticoes|reps?|rep)?\b/, (m) => {
    series = Number(m[1]);
    if (m[2]) reps = m[2];
  });
  if (series == null) tirar(/\b(\d{1,2})\s*de\s*(\d{1,3}(?:\s*(?:-|a|ate)\s*\d{1,3})?)\b/, (m) => {
    series = Number(m[1]);
    reps = m[2];
  });
  if (reps == null) tirar(/\b(\d{1,3}(?:\s*(?:-|a|ate)\s*\d{1,3})?)\s*(?:repeticoes|reps?)\b/, (m) => (reps = m[1]));
  if (/\b(falha|ate a falha)\b/.test(t)) t = t.replace(/\b(ate a )?falha\b/g, " ");
  const nomeNorm = t.replace(/\b(series?|repeticoes|reps?|de|com|carga|peso|descanso)\s*$/g, "").replace(/[,;:|()]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/[a-z]{2}/.test(nomeNorm)) return null;
  // Nome final: mantém a grafia da pessoa (com acento) quando possível.
  const nome = nomeOriginal(original, nomeNorm);
  const repsTxt = normalizarReps(reps);
  return {
    texto: original.trim().slice(0, 200),
    nome,
    series: Math.min(10, Math.max(1, series ?? PADRAO_LIDO.series)),
    reps: repsTxt,
    cargaKg: carga != null && carga > 0 && carga <= 500 ? carga : null,
    descansoSeg: descanso != null && descanso >= 15 && descanso <= 600 ? descanso : null,
  };
}

/** “12/10/8” → “8-12”; “8 a 12” → “8-12”; vazio → padrão. */
function normalizarReps(r: string | null): string {
  if (!r) return PADRAO_LIDO.reps;
  const nums = r.match(/\d{1,3}/g)?.map(Number).filter((n) => n > 0 && n <= 100) ?? [];
  if (!nums.length) return PADRAO_LIDO.reps;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? String(min) : `${min}-${max}`;
}

/** Recupera o nome com a grafia original (acentos/maiúsculas) correspondente ao trecho normalizado. */
function nomeOriginal(original: string, nomeNorm: string): string {
  const palavrasNome = nomeNorm.split(" ");
  const orig = original.replace(/^[\s#*•\-–—>]+/, "").replace(/^\d{1,2}\s*[).º°-]\s+/, "").split(/\s+/);
  // Pega, em ordem, cada palavra do nome uma vez só (“de” do nome ≠ “de” de “3 séries de 12”).
  const achadas: string[] = [];
  let k = 0;
  for (const w of orig) {
    if (k < palavrasNome.length && normalizarNome(w).replace(/[^a-z0-9]/g, "") === palavrasNome[k].replace(/[^a-z0-9]/g, "")) {
      achadas.push(w);
      k++;
    }
  }
  const nome = (achadas.length === palavrasNome.length ? achadas.join(" ") : nomeNorm).replace(/[,;:]+$/, "").trim();
  const final = nome.length > 60 ? nome.slice(0, 60).trim() : nome;
  return final.charAt(0).toUpperCase() + final.slice(1);
}

/** Separa “supino 4x10, puxada 3x12” (voz/WhatsApp) em itens, sem quebrar nomes com vírgula. */
// Número em dígito ou por extenso (como sai do microfone).
const N = "(?:\\d{1,3}|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezoito|vinte)";
// Fim de um exercício falado: “4 de 10”, “4x10”, “3 séries de 12”, “8 a 12”, “com 30 quilos”, “descanso 60”.
const FIM_DE_ITEM = new RegExp(
  `(\\b${N}\\s*(?:x|×|de|por)\\s*${N}(?:\\s*(?:a|-|até)\\s*${N})?(?:\\s*repeti[cç](?:ão|ões|oes))?|\\b${N}\\s*s[eé]ries?(?:\\s*(?:de|com)\\s*${N}(?:\\s*(?:a|-|até)\\s*${N})?)?(?:\\s*repeti[cç](?:ão|ões|oes))?)((?:\\s*(?:com\\s*)?\\d{1,3}(?:[.,]\\d{1,2})?\\s*(?:kg|quilos?|kilos?))?(?:\\s*(?:e\\s*)?descanso\\s*(?:de\\s*)?\\d{1,3}\\s*(?:s|seg|segundos?|min|minutos?)?)?)(?=\\s+[a-zà-ú]|\\s*$)`,
  "gi"
);

/** Fala corrida (sem vírgula): separa depois de cada “4 de 10”, “três séries de doze”, “30 quilos”… */
export function separarFalaCorrida(linha: string): string {
  return linha.replace(FIM_DE_ITEM, "$1$2;");
}

function quebrarItens(linhaOriginal: string): string[] {
  const linha = separarFalaCorrida(linhaOriginal);
  const partes = linha.split(/\s*;\s*|\s+(?:e depois|depois|e em seguida|em seguida)\s+/i);
  const out: string[] = [];
  for (const p of partes) {
    const virgulas = p.split(/\s*,\s*/);
    const comNumero = virgulas.filter((v) => /\d+\s*[x×]\s*\d+|\d+\s*s[ée]ries?|\b(tr[eê]s|quatro|cinco|duas|dois)\s+s[eé]ries?/i.test(v)).length;
    if (virgulas.length > 1 && comNumero >= 2) out.push(...virgulas);
    else out.push(p);
  }
  return out.map((x) => x.trim()).filter(Boolean);
}

/** Lê o texto inteiro: um ou vários treinos (cabeçalhos “Treino A”, “Dia 1”, “Pernas:”). */
export function lerTreinoEscrito(texto: string, itens: ItemParaCasar[]): TreinoLido[] {
  const treinos: TreinoLido[] = [];
  let atual: TreinoLido | null = null;
  const linhas = texto.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  for (const linha of linhas.slice(0, 200)) {
    const norm = normalizarNome(linha.replace(/^[\s#*•\-–—]+/, ""));
    if (ehCabecalho(norm, linha) || (SO_LETRA.test(norm) && !/\d/.test(norm.slice(2)) && norm.length <= 40)) {
      if (treinos.length >= MAX_TREINOS_LIDOS) break;
      atual = { nome: nomeDoCabecalho(linha, treinos.length + 1), exercicios: [] };
      treinos.push(atual);
      continue;
    }
    for (const item of quebrarItens(linha)) {
      const ex = lerLinha(item);
      if (!ex) continue;
      if (!atual) {
        atual = { nome: "Meu treino", exercicios: [] };
        treinos.push(atual);
      }
      if (atual.exercicios.length >= MAX_EXERCICIOS_TREINO) continue;
      const m = casarExercicio(ex.nome, itens);
      atual.exercicios.push({ ...ex, bibliotecaId: m.id, confianca: m.confianca });
    }
  }
  return treinos.filter((t) => t.exercicios.length > 0);
}
