// Circunferências com os DOIS lados + pescoço (pedido do Montinho, 04/11/2026:
// “colocar medidas dos lados separados: perna direita, esquerda, braço,
// panturrilha… e pescoço”). Sem migration: o lado DIREITO continua nos campos
// de sempre (`braco_cm`, `coxa_cm`, `panturrilha_cm`, então o histórico segue
// comparável) e o esquerdo + pescoço vão em `evolucao.extras` (0125), que o
// comparador e o relatório já leem pelo nome. Regras puras.
import { CAMPOS_MEDIDA, lerMedida, type CampoMedida, type ChaveMedida } from "@/lib/medidas/campos";

export type ExtraCirc = { nome: string; min: number; max: number; como: string };

export const PESCOCO: ExtraCirc = { nome: "Pescoço", min: 20, max: 80, como: "Logo abaixo do pomo de adão, fita reta, olhando para a frente." };
/** Lado esquerdo de cada campo que já existe (que passa a ser o direito). */
export const ESQUERDO: Partial<Record<ChaveMedida, ExtraCirc>> = {
  braco_cm: { nome: "Braço esquerdo", min: 10, max: 80, como: "Braço esquerdo relaxado, no meio entre o ombro e o cotovelo." },
  coxa_cm: { nome: "Coxa esquerda", min: 20, max: 120, como: "Coxa esquerda, na parte mais grossa (logo abaixo do bumbum), peso nas duas pernas." },
  panturrilha_cm: { nome: "Panturrilha esquerda", min: 15, max: 80, como: "Panturrilha esquerda, na parte mais grossa, em pé." },
};
/** Nome do campo de sempre quando há os dois lados. */
export const ROTULO_DIREITO: Partial<Record<ChaveMedida, string>> = { braco_cm: "Braço direito", coxa_cm: "Coxa direita", panturrilha_cm: "Panturrilha direita" };
export const NOMES_EXTRAS_CIRC = [PESCOCO.nome, ...Object.values(ESQUERDO).map((e) => e!.nome)];

export type ItemCirc = { tipo: "campo"; campo: CampoMedida; rotulo: string } | { tipo: "extra"; extra: ExtraCirc };

/** Ordem na tela: pescoço, tronco, depois cada membro com o direito e o esquerdo juntos. */
export function itensCircunferencia(chaves?: ChaveMedida[]): ItemCirc[] {
  const out: ItemCirc[] = [{ tipo: "extra", extra: PESCOCO }];
  for (const c of CAMPOS_MEDIDA.filter((x) => x.grupo === "circunferencias" && (!chaves || chaves.includes(x.chave)))) {
    out.push({ tipo: "campo", campo: c, rotulo: ROTULO_DIREITO[c.chave] ?? c.rotulo });
    const esq = ESQUERDO[c.chave];
    if (esq) out.push({ tipo: "extra", extra: esq });
  }
  return out;
}

/** Lê os extras digitados (vazio = não anotado). */
export function lerExtrasCirc(valores: Record<string, string>): { extras: Array<{ nome: string; valor: number; unidade: string }>; erro: string | null } {
  const extras: Array<{ nome: string; valor: number; unidade: string }> = [];
  for (const e of [PESCOCO, ...Object.values(ESQUERDO)] as ExtraCirc[]) {
    const { valor, erro } = lerMedida({ chave: "cintura_cm", rotulo: e.nome, unidade: "cm", min: e.min, max: e.max, grupo: "circunferencias" }, valores[e.nome] ?? "");
    if (erro) return { extras: [], erro };
    if (valor != null) extras.push({ nome: e.nome, valor, unidade: "cm" });
  }
  return { extras, erro: null };
}

/** Faz parte de um par direito/esquerdo (braço, coxa, panturrilha)? */
export const ehDeLado = (it: ItemCirc) => (it.tipo === "campo" ? !!ESQUERDO[it.campo.chave] : it.extra.nome !== PESCOCO.nome);
