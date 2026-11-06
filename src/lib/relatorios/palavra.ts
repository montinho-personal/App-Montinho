// PURO: o fechamento do relatório de evolução (aprovado pelo Montinho em
// 06/11/2026): manchete da capa e a “Palavra do Montinho” em 4 partes —
// 🔥 Continue assim · 🎯 Atenção para evoluir · 🚀 Missão dos próximos 30 dias ·
// ✍️ Frase do Montinho (só quando ele escreve). Tudo com número real do
// relatório; nunca diz “piorou”; sem pronome de gênero. O personal pode trocar
// qualquer texto antes de enviar (`PalavraSalva`, guardada numa intervenção).
import type { ExercicioPremium, RelatorioPremium } from "./premium";

type R = Pick<RelatorioPremium, "semDados" | "treinos" | "semanas" | "tonelagem" | "marcos" | "exerciciosComparaveis" | "exerciciosQueSubiram" | "destaques" | "exercicios" | "fim">;

export type Palavra = { continuar: string; atencao: string; missao: string; frase: string | null };
export type PalavraSalva = { continuar?: string; atencao?: string; missao?: string; frase?: string; salvoEm: string };

/** Quanto tempo uma Palavra editada pelo personal continua valendo no relatório. */
export const DIAS_PALAVRA_SALVA = 30;

const kg = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T12:00:00Z`) - Date.parse(`${a.slice(0, 10)}T12:00:00Z`)) / 86_400_000);

/** “8 meses” ou “5 semanas”. */
export function duracaoTxt(semanas: number): string {
  if (semanas >= 9) {
    const m = Math.max(2, Math.round(semanas / 4.345));
    return `${m} meses`;
  }
  return `${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
}

/** Exercícios com a carga igual nos últimos 3 treinos (o último nos 30 dias antes do fim). */
export function cargasParadas(exercicios: ExercicioPremium[], fim: string): Array<{ nome: string; carga: number; vezes: number }> {
  const out: Array<{ nome: string; carga: number; vezes: number }> = [];
  for (const e of exercicios) {
    const p = e.pontos.filter((x) => x.cargaMax != null && x.cargaMax > 0);
    if (p.length < 3) continue;
    const ult = p.at(-1)!;
    if (diasEntre(ult.data, fim) > 30) continue;
    let vezes = 1;
    for (let i = p.length - 2; i >= 0 && p[i].cargaMax === ult.cargaMax; i--) vezes++;
    if (vezes >= 3) out.push({ nome: e.nome, carga: ult.cargaMax!, vezes });
  }
  return out.sort((a, b) => b.vezes - a.vezes);
}

/** Manchete da capa: o maior feito verdadeiro do período. */
export function destaqueDaCapa(r: R, aderenciaPct: number | null): { titulo: string; sub: string | null } | null {
  if (r.semDados || !r.treinos) return null;
  const d = r.destaques.find((x) => x.atual.carga > x.inicial.carga);
  const sub = d ? (d.atual.carga >= d.inicial.carga * 2 ? `E o exercício ${d.nome} dobrou: de ${kg(d.inicial.carga)} para ${kg(d.atual.carga)}.` : `No exercício ${d.nome}: de ${kg(d.inicial.carga)} para ${kg(d.atual.carga)}.`) : null;
  const tempo = duracaoTxt(r.semanas);
  if (r.marcos.length >= 2) return { titulo: `${r.marcos.length} marcas pessoais em ${tempo} 🏆`, sub };
  if (r.marcos.length === 1) return { titulo: `Nova marca pessoal em ${tempo} 🏆`, sub };
  if (r.exerciciosComparaveis && r.exerciciosQueSubiram / r.exerciciosComparaveis >= 0.5) return { titulo: `A carga subiu em ${r.exerciciosQueSubiram} de ${r.exerciciosComparaveis} exercícios 📈`, sub };
  if (aderenciaPct != null && aderenciaPct >= 80) return { titulo: `${aderenciaPct}% de constância em ${tempo} 🔥`, sub };
  return { titulo: `${r.treinos} ${r.treinos === 1 ? "treino" : "treinos"} em ${tempo} 💪`, sub };
}

/** A Palavra automática (antes de qualquer edição do personal). */
export function palavraAutomatica(input: { r: R; aderenciaPct: number | null; ultimas4Pct: number | null; metaSemanal: number | null }): Palavra {
  const { r, aderenciaPct, ultimas4Pct, metaSemanal } = input;
  if (r.semDados || !r.treinos) {
    return {
      continuar: "O primeiro passo já foi dado: o acompanhamento começou. Daqui para frente, cada treino registrado vira um número aqui.",
      atencao: "Registrar todos os treinos no app, com a carga e as repetições. É isso que deixa este relatório completo.",
      missao: metaSemanal ? `Fazer os ${metaSemanal} treinos da semana durante as próximas 4 semanas.` : "Registrar todos os treinos no app nas próximas 4 semanas.",
      frase: null,
    };
  }
  const d = r.destaques.find((x) => x.atual.carga > x.inicial.carga);
  const paradas = cargasParadas(r.exercicios, r.fim);

  // 🔥 Continue assim
  const partes: string[] = [];
  if (aderenciaPct != null && aderenciaPct >= 70) partes.push(`Sua constância foi de ${aderenciaPct}%`);
  else partes.push(`Foram ${r.treinos} treinos e ${(r.tonelagem / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} toneladas movimentadas`);
  if (d) partes.push(`no exercício ${d.nome} você foi de ${kg(d.inicial.carga)} para ${kg(d.atual.carga)}`);
  else if (r.marcos.length) partes.push(`${r.marcos.length === 1 ? "saiu uma marca pessoal nova" : `saíram ${r.marcos.length} marcas pessoais novas`}`);
  const continuar = `${partes.join(" e ")}. ${aderenciaPct != null && aderenciaPct >= 80 ? "Isso é resultado de quem não falha." : "Cada treino desses conta."}`;

  // 🎯 Atenção para evoluir (até 2 pontos)
  const atencoes: string[] = [];
  if (paradas[0]) atencoes.push(`O exercício ${paradas[0].nome} está há ${paradas[0].vezes} treinos com ${kg(paradas[0].carga)}. Quando passar do topo das repetições, é hora de subir um pouco a carga.`);
  if (ultimas4Pct != null && ultimas4Pct < 70) atencoes.push(`Nas últimas 4 semanas a constância ficou em ${ultimas4Pct}%. Voltar ao ritmo da semana é o que mais faz a carga subir.`);
  if (!atencoes.length) atencoes.push("Manter a técnica caprichada e anotar sempre no mesmo aparelho: é assim que a evolução continua aparecendo nos números.");
  const atencao = atencoes.join(" ");

  // 🚀 Missão (uma só)
  let missao: string;
  if (metaSemanal && (ultimas4Pct == null || ultimas4Pct < 100)) missao = `Fazer os ${metaSemanal} treinos da semana em todas as próximas 4 semanas.`;
  else if (paradas[0]) missao = `Passar dos ${kg(paradas[0].carga)} no exercício ${paradas[0].nome}.`;
  else if (d) missao = `Bater uma nova marca no exercício ${d.nome} (hoje: ${kg(d.atual.carga)}).`;
  else missao = metaSemanal ? `Manter os ${metaSemanal} treinos por semana nas próximas 4 semanas.` : "Registrar todos os treinos no app nas próximas 4 semanas.";

  return { continuar, atencao, missao, frase: null };
}

/** Junta a Palavra automática com o que o personal editou (se ainda vale). */
export function palavraFinal(auto: Palavra, salva: PalavraSalva | null, hoje: string): Palavra & { editada: boolean } {
  if (!salva || diasEntre(salva.salvoEm, hoje) > DIAS_PALAVRA_SALVA) return { ...auto, editada: false };
  const t = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    continuar: t(salva.continuar) ?? auto.continuar,
    atencao: t(salva.atencao) ?? auto.atencao,
    missao: t(salva.missao) ?? auto.missao,
    frase: t(salva.frase),
    editada: true,
  };
}

/** Lê a Palavra salva de uma intervenção (`referencia.palavra_relatorio`). */
export function lerPalavraSalva(intervencoes: Array<{ referencia?: unknown; created_at: string }>): PalavraSalva | null {
  for (const i of intervencoes) {
    const ref = (i.referencia ?? {}) as { palavra_relatorio?: Record<string, unknown> };
    const p = ref.palavra_relatorio;
    if (p && typeof p === "object") {
      const s = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
      return { continuar: s("continuar"), atencao: s("atencao"), missao: s("missao"), frase: s("frase"), salvoEm: i.created_at };
    }
  }
  return null;
}
