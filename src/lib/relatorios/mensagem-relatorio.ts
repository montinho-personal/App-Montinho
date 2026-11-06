// PURO: a mensagem do WhatsApp que o personal manda com o relatório de evolução
// (pedido do Montinho, 06/11/2026: “uma frase que faça o aluno sentir uma emoção
// e ter vontade de abrir”). Escolhe o tom pelos números REAIS do relatório:
// marcas pessoais → carga subindo → cargas estáveis (constância) → início.
// Mostra só uma prévia (o resto fica para abrir). Sem pronome de gênero.
import type { RelatorioPremium } from "./premium";

export type TomRelatorio = "marcas" | "subiu" | "estavel" | "inicio";

const kg = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
const t = (kgTotal: number) => (kgTotal / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function tomDoRelatorio(r: Pick<RelatorioPremium, "semDados" | "marcos" | "exerciciosComparaveis" | "exerciciosQueSubiram" | "treinos">): TomRelatorio {
  if (r.semDados || r.treinos < 2) return "inicio";
  if (r.marcos.length > 0) return "marcas";
  if (r.exerciciosComparaveis > 0 && r.exerciciosQueSubiram / r.exerciciosComparaveis >= 0.5) return "subiu";
  if (r.exerciciosComparaveis > 0) return "estavel";
  return "inicio";
}

export function mensagemRelatorioEvolucao(input: {
  primeiroNome: string;
  r: Pick<RelatorioPremium, "semDados" | "marcos" | "exerciciosComparaveis" | "exerciciosQueSubiram" | "treinos" | "tonelagem" | "destaques" | "semanas">;
  aderenciaPct: number | null;
  url: string;
}): string {
  const { primeiroNome: nome, r, aderenciaPct, url } = input;
  const tom = tomDoRelatorio(r);
  const d = r.destaques[0];
  const previa = d && d.atual.carga > d.inicial.carga ? `Só uma prévia: no exercício ${d.nome} você foi de ${kg(d.inicial.carga)} para ${kg(d.atual.carga)}. O resto eu deixei para você ver 👀` : "Tem bastante coisa lá dentro para você ver 👀";
  const constancia = aderenciaPct != null && aderenciaPct >= 80 ? `🔥 E com ${Math.round(aderenciaPct)}% de constância no período. Isso é raro!` : null;
  const linhas: Array<string | null> = [];
  if (tom === "marcas") {
    const n = r.marcos.length;
    linhas.push(`🏆 ${nome}, saiu o seu relatório de evolução… e tem ${n === 1 ? "uma marca pessoal nova" : `${n} marcas pessoais novas`} lá dentro!`, "", previa, constancia);
  } else if (tom === "subiu") {
    linhas.push(`📈 ${nome}, preparei o seu relatório de evolução e fiquei muito feliz com o que vi!`, "", `A carga subiu em ${r.exerciciosQueSubiram} de ${r.exerciciosComparaveis} exercícios. ${previa}`, constancia);
  } else if (tom === "estavel") {
    linhas.push(
      `💪 ${nome}, preparei o seu relatório de evolução, e ele mostra uma coisa que pouca gente consegue: constância.`,
      "",
      `Foram ${r.treinos} treinos e ${t(r.tonelagem)} toneladas movimentadas. As cargas se estabilizaram, e é justamente nessa fase que o corpo constrói a base para o próximo salto.`,
      constancia,
      "Abre e vê comigo o que vem agora 👀",
    );
  } else {
    linhas.push(`✨ ${nome}, preparei o seu relatório de evolução!`, "", r.treinos ? `Aqui começa a sua história no app: ${r.treinos} ${r.treinos === 1 ? "treino registrado" : "treinos registrados"}. Daqui para frente, cada treino vai aparecer aqui. Quero ver esse gráfico subindo!` : "É o seu ponto de partida: daqui para frente, cada treino vai aparecer aqui. Quero ver esse gráfico subindo!");
  }
  linhas.push("", `📄 Abre aqui: ${url}`, "(lá dentro dá para baixar em PDF)", "", "É impossível dar errado!");
  return linhas.filter((l) => l !== null).join("\n");
}
