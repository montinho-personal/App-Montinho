// ============================================================================
// Histórico de Adriana Nascimento no app anterior — transcrito dos prints
// enviados pelo personal (tela “Progressão” › exercício › 90 dias).
// O app anterior só mostra o resumo do dia: séries, carga máxima e volume.
// Nada foi reconstruído por série. A letra do treino só é preenchida quando
// sai dos próprios dados (exercício exclusivo de um treino no mesmo dia, ou
// volume que bate exatamente com as repetições prescritas).
// ============================================================================

import { BIBLIOTECA, NOME_ALUNA } from "@/lib/prescricoes/miss-terracos-tambore";
import type { ImportacaoResumo, LinhaResumo } from "./resumo";

const ABD = "Cadeira abdutora";
const EXT = "Cadeira extensora";
const PANT = "Panturrilha no leg press horizontal (180°)";
const LEG = "Leg press horizontal (180°)";
const SMITH = "Agachamento no Smith";
const ELEV = "Elevação pélvica com barra";
const FLEX = "Cadeira flexora";
const STIFF = "Stiff com halteres";
const PRANCHA = "Abdominal prancha";
const PRANCHA_OBS = "60 s completos — informado pelo personal (o app anterior não registrava a prancha).";

const l = (data: string, exercicio: string, nomeOriginal: string, series: number, cargaMax: number | null, volume: number | null, letra: string | null = null, observacao: string | null = null): LinhaResumo => ({
  data, exercicio, nomeOriginal, bibliotecaId: BIBLIOTECA[exercicio]?.id ?? null, letra, series, cargaMax, volume, observacao,
});

export const LINHAS: LinhaResumo[] = [
  // Cadeira abdutora (6 sessões)
  l("2026-10-07", ABD, "Cadeira Abdutora", 4, 80, 3070, "C", "Treino C deduzido: cadeira flexora e stiff (só no C) no mesmo dia."),
  l("2026-10-09", ABD, "Cadeira Abdutora", 4, 80, 4610),
  l("2026-10-13", ABD, "Cadeira Abdutora", 4, 80, 3900),
  l("2026-10-15", ABD, "Cadeira Abdutora", 4, 100, 4210, "A", "Treino A deduzido: cadeira extensora (só no A) no mesmo dia."),
  l("2026-10-16", ABD, "Cadeira Abdutora", 4, 90, 3440, "C", "Treino C deduzido: panturrilha 4×15 (bi-set do C) no mesmo dia."),
  l("2026-10-19", ABD, "Cadeira Abdutora", 4, 110, 4900, "A", "Treino A deduzido: cadeira extensora (só no A) no mesmo dia."),
  // Panturrilha no leg press 180 (07/10 aparece com 0 séries: registrado, não feito)
  l("2026-10-07", PANT, "Panturrilha no leg press 180", 0, null, null, "C", "0 séries no app anterior — não conta como feito."),
  l("2026-10-08", PANT, "Panturrilha no leg press 180", 4, 55, 4200, "D", "Volume ÷ 80 repetições (4×20 do treino D) = 52,5 kg de média."),
  l("2026-10-16", PANT, "Panturrilha no leg press 180", 4, 55, 2445, "C", "Volume ÷ 60 repetições (4×15 do bi-set do C) ≈ 40,8 kg de média."),
  // Cadeira extensora (só no treino A)
  l("2026-10-15", EXT, "Cadeira Extensora", 4, 43, 1996, "A"),
  l("2026-10-19", EXT, "Cadeira Extensora", 4, 43, 1996, "A"),
  // Leg press 180 (só no treino A)
  l("2026-10-15", LEG, "Leg press 180", 4, 100, 4467, "A"),
  l("2026-10-19", LEG, "Leg press 180", 4, 100, 4647, "A"),
  // Agachamento no Smith (só no treino A)
  l("2026-10-15", SMITH, "Agachamento no Smith", 4, 35, 1040, "A"),
  l("2026-10-19", SMITH, "Agachamento no Smith", 4, 35, 1201, "A"),
  // Elevação pélvica (só no treino A)
  l("2026-10-15", ELEV, "Elevação pelvica", 4, 40, 1260, "A"),
  l("2026-10-19", ELEV, "Elevação pelvica", 4, 40, 1260, "A"),
  // Cadeira flexora (só no treino C)
  l("2026-10-07", FLEX, "Cadeira Flexora", 4, 30, 1026, "C"),
  l("2026-10-16", FLEX, "Cadeira Flexora", 4, 36, 1425, "C"),
  // Stiff com halteres (só no treino C). O app anterior mostra 8 e 16 séries
  // (a ficha prevê 4×10): transcrito como está, sem ajustar.
  l("2026-10-07", STIFF, "Stiff com Halteres", 8, 28, 2120, "C", "App anterior registrou 8 séries (a ficha prevê 4×10)."),
  l("2026-10-16", STIFF, "Stiff com Halteres", 16, 32, 4720, "C", "App anterior registrou 16 séries (a ficha prevê 4×10)."),
  // Prancha: 1 × 60 s completos em todos os dias de treino A e C identificados.
  ...["2026-10-07", "2026-10-15", "2026-10-16", "2026-10-19"].map((d) => l(d, PRANCHA, "Abdominal prancha", 1, null, null, ["2026-10-15", "2026-10-19"].includes(d) ? "A" : "C", PRANCHA_OBS)),
];

export const IMPORTACAO: ImportacaoResumo = {
  id: "adriana-app-anterior-v1",
  alunoNome: NOME_ALUNA,
  titulo: "Histórico do app anterior (resumo por dia)",
  fonte: "app_anterior",
  linhas: LINHAS,
  avisos: [
    "O app anterior não mostra a carga e as repetições de cada série — só o resumo do dia. Por isso estes registros não têm e1RM nem comparação de repetições.",
    "Entra no gráfico de evolução por exercício e como base de carga para os recordes. Não entra em aderência, sequência nem conquistas.",
  ],
};
