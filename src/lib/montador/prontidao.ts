// ============================================================================
// “Seu protocolo está quase pronto” (montador, aprovado pelo Montinho em
// 29/10/2026): mostra o que já está configurado, com base em requisitos
// OBJETIVOS. Não trava salvar, não exige ordem e não julga a prescrição (nada
// de “volume bom/ruim”). Itens opcionais são só lembretes. PURO e testado.
// ============================================================================

export type EntradaProntidao = {
  nomeProtocolo: string;
  split: string;
  fase: string;
  treinos: Array<{ letra: string; ativo: boolean; frequencia: number; exercicios: Array<{ nome: string; series: number; reps: string; alerta: boolean }> }>;
};

export type ItemProntidao = { id: string; texto: string; ok: boolean; opcional: boolean; detalhe?: string };

export function prontidaoDoProtocolo(e: EntradaProntidao): { itens: ItemProntidao[]; prontos: number; total: number; pronto: boolean } {
  const ativos = e.treinos.filter((t) => t.ativo);
  const nomeados = ativos.flatMap((t) => t.exercicios.filter((x) => x.nome.trim()).map((x) => ({ ...x, letra: t.letra })));
  const semExercicio = ativos.filter((t) => !t.exercicios.some((x) => x.nome.trim())).map((t) => t.letra);
  const foraDaSemana = ativos.filter((t) => !(t.frequencia > 0)).map((t) => t.letra);
  const incompletos = nomeados.filter((x) => !(x.series > 0) || !x.reps.trim());
  const comAlerta = nomeados.filter((x) => x.alerta);
  const lista = (l: string[]) => l.join(", ");
  const itens: ItemProntidao[] = [
    { id: "divisao", texto: "Divisão semanal definida", ok: !!e.split.trim() && ativos.length > 0, opcional: false },
    { id: "exercicios", texto: "Exercícios em todos os treinos ativos", ok: ativos.length > 0 && semExercicio.length === 0, opcional: false, detalhe: semExercicio.length ? `Sem exercícios: ${lista(semExercicio)}` : undefined },
    { id: "series", texto: "Séries e repetições configuradas", ok: nomeados.length > 0 && incompletos.length === 0, opcional: false, detalhe: incompletos.length ? `${incompletos.length} ${incompletos.length === 1 ? "exercício sem" : "exercícios sem"} séries ou repetições` : undefined },
    { id: "calendario", texto: "Todos os treinos ativos no calendário", ok: ativos.length > 0 && foraDaSemana.length === 0, opcional: false, detalhe: foraDaSemana.length ? `Fora da semana: ${lista(foraDaSemana)}` : undefined },
    { id: "fase", texto: "Fase do protocolo escolhida", ok: !!e.fase, opcional: true },
    { id: "nome", texto: "Nome do protocolo", ok: !!e.nomeProtocolo.trim() && e.nomeProtocolo.trim() !== "Programa atual", opcional: true },
    { id: "restricoes", texto: "Exercícios com ⚠ conferidos com a anamnese", ok: comAlerta.length === 0, opcional: true, detalhe: comAlerta.length ? `${comAlerta.length} com ⚠: ${comAlerta.slice(0, 3).map((x) => x.nome).join(", ")}${comAlerta.length > 3 ? "…" : ""}` : undefined },
  ];
  const obrigatorios = itens.filter((i) => !i.opcional);
  return { itens, prontos: itens.filter((i) => i.ok).length, total: itens.length, pronto: obrigatorios.every((i) => i.ok) };
}
