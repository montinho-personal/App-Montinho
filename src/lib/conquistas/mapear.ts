// Converte a sessão persistida no formato usado pelas regras de conquistas e
// pela evolução invisível (uma única fonte para os dois).
import type { SessaoCompleta } from "@/lib/data/sessoes";
import type { SessaoConquista } from "./regras";

export const sessaoParaConquista = (s: SessaoCompleta): SessaoConquista => ({
  id: s.id,
  iniciado_em: s.iniciado_em,
  status: s.status,
  modo: s.modo ?? "normal",
  series_planejadas: s.series_planejadas,
  series_concluidas: s.series_concluidas,
  treino_id: s.treino_id,
  letra: s.letra,
  nome_treino: s.nome_treino,
  duracao_seg: s.duracao_seg,
  feedback_percepcao: s.feedback_percepcao,
  checkin_pre: s.checkin_pre ?? null,
  conta_aderencia: s.conta_aderencia !== false,
  origem: s.origem ?? "app",
  exercicios: s.exercicios.map((e) => ({ exercicio_id: e.exercicio_id, nome: e.nome, series: e.series.map((x) => ({ tipo: x.tipo, carga_kg: x.carga_kg, reps: x.reps })) })),
});
