// ============================================================================
// Avaliação física de 7 dobras (Jackson & Pollock) — regras PURAS (pedido do
// Montinho, 30/10/2026: “fazer a avaliação e já ir anotando no app”).
//
// Equações (densidade corporal, S = soma das 7 dobras em mm, idade em anos):
//   Homens  (Jackson & Pollock, 1978):         D = 1,112 − 0,00043499·S + 0,00000055·S² − 0,00028826·idade
//   Mulheres (Jackson, Pollock & Ward, 1980):  D = 1,097 − 0,00046971·S + 0,00000056·S² − 0,00012828·idade
//   % de gordura (Siri, 1961):                 %G = 495 / D − 450
// Validadas em adultos (homens 18–61, mulheres 18–55 anos): fora dessa faixa o
// app calcula, mas avisa.
//
// Protocolo de medida (ACSM / ISAK, o que os avaliadores usam na prática):
// lado direito do corpo, pinçar a dobra com polegar e indicador cerca de 1 cm
// acima do ponto, adipômetro perpendicular à dobra, ler 1–2 s depois de soltar
// a pinça, medir em RODÍZIO (passa por todos os pontos e volta), 2 ou 3 vezes.
// Valor do ponto: com 3 leituras, a mediana; com 2, a média. Leituras que
// diferem mais de 2 mm pedem uma nova medida (o app avisa, não bloqueia).
// ============================================================================

export type SexoAvaliacao = "M" | "F";
export type PontoDobra = "peitoral" | "axilar_media" | "triceps" | "subescapular" | "abdominal" | "suprailiaca" | "coxa";

export type InfoPonto = { chave: PontoDobra; nome: string; direcao: string; como: string; comoMulher?: string };

/** Ordem do rodízio (de cima para baixo, como se mede na prática). */
export const PONTOS_7_DOBRAS: InfoPonto[] = [
  { chave: "peitoral", nome: "Peitoral", direcao: "Diagonal", como: "Na metade da distância entre a linha axilar anterior (começo da axila, na frente) e o mamilo.", comoMulher: "A 1/3 da distância entre a linha axilar anterior e o mamilo (mais perto da axila)." },
  { chave: "axilar_media", nome: "Axilar média", direcao: "Vertical", como: "Na linha axilar média (no meio da axila, descendo), na altura do processo xifoide (final do esterno)." },
  { chave: "triceps", nome: "Tríceps", direcao: "Vertical", como: "Atrás do braço, no ponto médio entre o acrômio (ponta do ombro) e o olécrano (ponta do cotovelo), braço relaxado ao lado do corpo." },
  { chave: "subescapular", nome: "Subescapular", direcao: "Diagonal (45°)", como: "1 a 2 cm abaixo do ângulo inferior da escápula (ponta de baixo da omoplata), seguindo a linha natural da pele." },
  { chave: "abdominal", nome: "Abdominal", direcao: "Vertical", como: "2 cm à direita do umbigo." },
  { chave: "suprailiaca", nome: "Supra-ilíaca", direcao: "Diagonal", como: "Logo acima da crista ilíaca (osso do quadril), na linha axilar anterior, acompanhando o ângulo natural do osso." },
  { chave: "coxa", nome: "Coxa", direcao: "Vertical", como: "Na frente da coxa, no ponto médio entre a prega inguinal (dobra da virilha) e a borda de cima da patela; peso na outra perna." },
];

export const NOME_PONTO: Record<PontoDobra, string> = Object.fromEntries(PONTOS_7_DOBRAS.map((p) => [p.chave, p.nome])) as Record<PontoDobra, string>;

export const LIMITES_DOBRA = { min: 2, max: 80, diferencaMaxMm: 2 } as const;
export const FAIXA_VALIDADA: Record<SexoAvaliacao, { min: number; max: number }> = { M: { min: 18, max: 61 }, F: { min: 18, max: 55 } };

const r = (n: number, casas: number) => Math.round(n * 10 ** casas) / 10 ** casas;

/** Valor do ponto a partir das leituras (mm): mediana com 3, média com 2, a própria com 1. */
export function valorDoPonto(leituras: Array<number | null | undefined>): { valor: number | null; remedir: boolean } {
  const v = leituras.filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x >= LIMITES_DOBRA.min && x <= LIMITES_DOBRA.max);
  if (!v.length) return { valor: null, remedir: false };
  const ord = [...v].sort((a, b) => a - b);
  const valor = ord.length >= 3 ? ord[Math.floor(ord.length / 2)] : ord.length === 2 ? (ord[0] + ord[1]) / 2 : ord[0];
  // Pede nova medida quando as leituras usadas não batem (2 mm).
  const remedir = ord.length === 2 ? ord[1] - ord[0] > LIMITES_DOBRA.diferencaMaxMm : ord.length >= 3 ? Math.min(ord[1] - ord[0], ord[2] - ord[1]) > LIMITES_DOBRA.diferencaMaxMm : false;
  return { valor: r(valor, 1), remedir };
}

/** Densidade corporal pelas equações de 7 dobras. */
export function densidade7Dobras(soma: number, idade: number, sexo: SexoAvaliacao): number {
  return sexo === "M"
    ? 1.112 - 0.00043499 * soma + 0.00000055 * soma ** 2 - 0.00028826 * idade
    : 1.097 - 0.00046971 * soma + 0.00000056 * soma ** 2 - 0.00012828 * idade;
}

/** % de gordura pela equação de Siri. */
export const gorduraSiri = (densidade: number) => 495 / densidade - 450;

export type ResultadoPollock = {
  completo: boolean;
  faltam: PontoDobra[];
  pontos: Partial<Record<PontoDobra, number>>;
  remedir: PontoDobra[];
  soma: number | null;
  densidade: number | null;
  gorduraPct: number | null;
  massaGordaKg: number | null;
  massaMagraKg: number | null;
  avisos: string[];
};

/** Calcula tudo o que dá com o que já foi anotado (vai preenchendo enquanto a avaliação acontece). */
export function calcularPollock(e: { sexo: SexoAvaliacao | null; idade: number | null; pesoKg: number | null; leituras: Partial<Record<PontoDobra, Array<number | null | undefined>>> }): ResultadoPollock {
  const pontos: Partial<Record<PontoDobra, number>> = {};
  const remedir: PontoDobra[] = [];
  for (const p of PONTOS_7_DOBRAS) {
    const v = valorDoPonto(e.leituras[p.chave] ?? []);
    if (v.valor != null) pontos[p.chave] = v.valor;
    if (v.remedir) remedir.push(p.chave);
  }
  const faltam = PONTOS_7_DOBRAS.map((p) => p.chave).filter((k) => pontos[k] == null);
  const completo = faltam.length === 0;
  const soma = completo ? r(Object.values(pontos).reduce((a, b) => a + (b ?? 0), 0), 1) : null;
  const avisos: string[] = [];
  let densidade: number | null = null;
  let gorduraPct: number | null = null;
  if (completo && soma != null && e.sexo && e.idade != null && e.idade > 0) {
    const faixa = FAIXA_VALIDADA[e.sexo];
    if (e.idade < faixa.min || e.idade > faixa.max) avisos.push(`A equação foi validada de ${faixa.min} a ${faixa.max} anos: com ${e.idade} anos, use o resultado com cautela.`);
    densidade = r(densidade7Dobras(soma, e.idade, e.sexo), 4);
    gorduraPct = r(gorduraSiri(densidade7Dobras(soma, e.idade, e.sexo)), 1);
    if (gorduraPct < 2 || gorduraPct > 60) avisos.push("Resultado fora do esperado: confira as dobras anotadas.");
  } else if (completo && !e.sexo) avisos.push("Informe o sexo para calcular (as equações são diferentes).");
  else if (completo && (e.idade == null || e.idade <= 0)) avisos.push("Informe a idade para calcular.");
  if (remedir.length) avisos.push(`Leituras com mais de ${LIMITES_DOBRA.diferencaMaxMm} mm de diferença em: ${remedir.map((k) => NOME_PONTO[k]).join(", ")}. Vale medir de novo.`);
  const massaGordaKg = gorduraPct != null && e.pesoKg ? r((e.pesoKg * gorduraPct) / 100, 1) : null;
  const massaMagraKg = massaGordaKg != null && e.pesoKg ? r(e.pesoKg - massaGordaKg, 1) : null;
  return { completo, faltam, pontos, remedir, soma, densidade, gorduraPct, massaGordaKg, massaMagraKg, avisos };
}

/** Idade em anos completos numa data (AAAA-MM-DD). */
export function idadeNaData(nascimento: string | null | undefined, data: string): number | null {
  if (!nascimento || !/^\d{4}-\d{2}-\d{2}/.test(nascimento)) return null;
  const [an, mn, dn] = nascimento.slice(0, 10).split("-").map(Number);
  const [a, m, d] = data.slice(0, 10).split("-").map(Number);
  let idade = a - an;
  if (m < mn || (m === mn && d < dn)) idade--;
  return idade >= 0 && idade < 120 ? idade : null;
}

/** Medidas extras para guardar junto da avaliação (cada dobra, soma e densidade), no formato de `evolucao.extras`. */
export function extrasDoPollock(res: ResultadoPollock): Array<{ nome: string; valor: number; unidade: string }> {
  const out: Array<{ nome: string; valor: number; unidade: string }> = [];
  for (const p of PONTOS_7_DOBRAS) {
    const v = res.pontos[p.chave];
    if (v != null) out.push({ nome: `Dobra ${p.nome.toLowerCase()}`, valor: v, unidade: "mm" });
  }
  if (res.soma != null) out.push({ nome: "Soma das 7 dobras", valor: res.soma, unidade: "mm" });
  if (res.densidade != null) out.push({ nome: "Densidade corporal", valor: res.densidade, unidade: "g/mL" });
  if (res.massaGordaKg != null) out.push({ nome: "Massa gorda", valor: res.massaGordaKg, unidade: "kg" });
  return out;
}
