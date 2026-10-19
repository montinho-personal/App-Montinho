// Prescrição automática de treino baseada em evidências científicas.
// Utiliza Mifflin-St Jeor para TDEE e engine de regras para seleção de template.

import type { TemplateTreino } from "@/lib/supabase/types-extended";

// ============================================================================
// Tipos de entrada
// ============================================================================
export type Sexo = "masculino" | "feminino";

export type Objetivo =
  | "hipertrofia"
  | "emagrecimento"
  | "forca"
  | "condicionamento"
  | "reabilitacao"
  | "manutencao";

export type NivelExperiencia = "iniciante" | "intermediario" | "avancado";

export type DadosPrescricao = {
  peso_kg: number;
  altura_cm: number;
  idade_anos: number;
  sexo: Sexo;
  objetivo: Objetivo;
  dias_semana: number;         // 2-6
  nivel: NivelExperiencia;
  lesoes?: string;             // texto livre (ex: "joelho direito")
  equipamentos_disponiveis?: string; // texto livre
};

// ============================================================================
// Resultado da prescrição
// ============================================================================
export type ResultadoPrescricao = {
  template_sugerido_id: string | null;
  template_sugerido_nome: string;
  justificativa: string[];
  caloria_manutencao: number;
  caloria_alvo: number;
  proteina_g_dia: number;
  nivel_volume_sugerido: "MEV" | "MAV" | "MRV";
  observacoes_lesao: string | null;
  referencias: string[];
};

// ============================================================================
// TDEE — Mifflin-St Jeor + fator de atividade
// ============================================================================
export function calcularTMB(dados: DadosPrescricao): number {
  const { peso_kg, altura_cm, idade_anos, sexo } = dados;
  if (sexo === "masculino") {
    return 10 * peso_kg + 6.25 * altura_cm - 5 * idade_anos + 5;
  }
  return 10 * peso_kg + 6.25 * altura_cm - 5 * idade_anos - 161;
}

function fatorAtividade(dias: number): number {
  if (dias <= 2) return 1.375; // levemente ativo
  if (dias <= 4) return 1.55;  // moderadamente ativo
  if (dias <= 5) return 1.725; // muito ativo
  return 1.9;                   // extremamente ativo
}

export function calcularTDEE(dados: DadosPrescricao): number {
  return Math.round(calcularTMB(dados) * fatorAtividade(dados.dias_semana));
}

export function calcularCalorias(dados: DadosPrescricao): { manutencao: number; alvo: number } {
  const manutencao = calcularTDEE(dados);
  const { objetivo } = dados;

  let alvo = manutencao;
  if (objetivo === "emagrecimento") alvo = Math.round(manutencao * 0.8);
  else if (objetivo === "hipertrofia" || objetivo === "forca") alvo = Math.round(manutencao * 1.1);

  return { manutencao, alvo };
}

export function calcularProteina(dados: DadosPrescricao): number {
  const { peso_kg, objetivo, nivel } = dados;
  // Phillips & Van Loon 2011: 1.6-2.2g/kg para hipertrofia
  // ISSN Position Stand 2017: 1.4-2.0g/kg para emagrecimento preservando músculo
  let multiplicador = 1.8;
  if (objetivo === "hipertrofia" || objetivo === "forca") multiplicador = nivel === "avancado" ? 2.2 : 2.0;
  if (objetivo === "emagrecimento") multiplicador = 2.2; // mais proteína para preservar massa
  if (objetivo === "manutencao" || objetivo === "condicionamento") multiplicador = 1.6;
  if (objetivo === "reabilitacao") multiplicador = 1.6;
  return Math.round(peso_kg * multiplicador);
}

// ============================================================================
// Engine de regras — seleciona template pelo perfil
// ============================================================================
type RegraTemplate = {
  id: string;
  nome: string;
  matchScore: (dados: DadosPrescricao) => number;
};

const REGRAS: RegraTemplate[] = [
  {
    id: "tpl-001",
    nome: "Iniciante Feminino · Hipertrofia",
    matchScore(d) {
      let s = 0;
      if (d.sexo === "feminino") s += 3;
      if (d.nivel === "iniciante") s += 4;
      if (d.objetivo === "hipertrofia") s += 3;
      if (d.dias_semana >= 4 && d.dias_semana <= 5) s += 2;
      return s;
    },
  },
  {
    id: "tpl-002",
    nome: "Masculino Intermediário · Push/Pull/Legs",
    matchScore(d) {
      let s = 0;
      if (d.sexo === "masculino") s += 2;
      if (d.nivel === "intermediario") s += 4;
      if (d.objetivo === "hipertrofia") s += 3;
      if (d.dias_semana >= 5) s += 3;
      return s;
    },
  },
  {
    id: "tpl-003",
    nome: "Glúteo Intensivo Feminino",
    matchScore(d) {
      let s = 0;
      if (d.sexo === "feminino") s += 3;
      if (d.objetivo === "hipertrofia") s += 2;
      if (d.nivel !== "avancado") s += 1;
      if (d.dias_semana >= 4) s += 2;
      return s;
    },
  },
  {
    id: "tpl-004",
    nome: "Upper/Lower · Força e Hipertrofia",
    matchScore(d) {
      let s = 0;
      if (d.objetivo === "forca" || d.objetivo === "hipertrofia") s += 3;
      if (d.nivel === "intermediario" || d.nivel === "avancado") s += 3;
      if (d.dias_semana === 4) s += 4;
      return s;
    },
  },
  {
    id: "tpl-005",
    nome: "Full Body Iniciante (3x/sem)",
    matchScore(d) {
      let s = 0;
      if (d.nivel === "iniciante") s += 5;
      if (d.dias_semana <= 3) s += 5;
      if (d.objetivo !== "reabilitacao") s += 1;
      return s;
    },
  },
  {
    id: "tpl-006",
    nome: "Emagrecimento com Preservação de Massa",
    matchScore(d) {
      let s = 0;
      if (d.objetivo === "emagrecimento") s += 8;
      if (d.dias_semana >= 3) s += 2;
      return s;
    },
  },
  {
    id: "tpl-007",
    nome: "Condicionamento Funcional",
    matchScore(d) {
      let s = 0;
      if (d.objetivo === "condicionamento" || d.objetivo === "reabilitacao") s += 8;
      if (d.dias_semana >= 3) s += 2;
      return s;
    },
  },
  {
    id: "tpl-008",
    nome: "Manutenção Avançado",
    matchScore(d) {
      let s = 0;
      if (d.nivel === "avancado") s += 3;
      if (d.objetivo === "manutencao") s += 8;
      return s;
    },
  },
];

// ============================================================================
// Volume sugerido por nível
// ============================================================================
function nivelVolume(nivel: NivelExperiencia): "MEV" | "MAV" | "MRV" {
  if (nivel === "iniciante") return "MEV";
  if (nivel === "intermediario") return "MAV";
  return "MAV"; // avançados geralmente ficam entre MAV e MRV dependendo do bloco
}

// ============================================================================
// Referências científicas utilizadas
// ============================================================================
const REFS_PRESCRICAO = [
  "Mifflin MD, et al. (1990). Am J Clin Nutr. 51(2):241-7 — Fórmula TMB Mifflin-St Jeor.",
  "Schoenfeld BJ, et al. (2017). J Sports Sci. 35(11):1073-82 — Relação dose-resposta volume×hipertrofia (base MEV/MAV/MRV).",
  "Phillips SM & Van Loon LJ. (2011). J Sports Sci. 29(S1):S29-38 — Ingestão proteica para maximizar hipertrofia (1.6-2.2g/kg).",
  "Morton RW, et al. (2018). Br J Sports Med. 52(6):376-84 — Meta-análise proteína e composição corporal.",
  "Schoenfeld BJ. (2021). Science and Development of Muscle Hypertrophy. Human Kinetics.",
];

// ============================================================================
// Função principal
// ============================================================================
export function gerarPrescricao(
  dados: DadosPrescricao,
  templates: TemplateTreino[]
): ResultadoPrescricao {
  // Selecionar melhor template pelo score
  const scores = REGRAS.map((r) => ({ ...r, score: r.matchScore(dados) }))
    .sort((a, b) => b.score - a.score);

  const melhorRegra = scores[0];
  const templateEncontrado = templates.find((t) => t.id === melhorRegra?.id) ?? null;

  const { manutencao, alvo } = calcularCalorias(dados);
  const proteina = calcularProteina(dados);
  const volumeLabel = nivelVolume(dados.nivel);

  // Montar justificativa
  const justificativa: string[] = [];

  justificativa.push(
    `Nível ${dados.nivel}: iniciamos em ${volumeLabel} (${
      volumeLabel === "MEV"
        ? "Mínimo Efetivo de Volume"
        : volumeLabel === "MAV"
        ? "Volume Adaptativo Máximo"
        : "Volume Máximo Recuperável"
    }) por grupo muscular.`
  );

  if (dados.objetivo === "hipertrofia") {
    justificativa.push(
      `Hipertrofia: Schoenfeld et al. (2017) mostra que 10-20 séries/semana por grupo muscular maximiza ganho de massa. Com ${dados.dias_semana} dias/semana, a divisão ${templateEncontrado?.nome ?? "sugerida"} distribui o volume de forma ótima.`
    );
  }

  if (dados.objetivo === "emagrecimento") {
    justificativa.push(
      `Emagrecimento: déficit de ~20% (${manutencao} → ${alvo} kcal). Proteína elevada (${proteina}g/dia) preserva massa muscular conforme Morton et al. (2018).`
    );
  }

  if (dados.objetivo === "forca") {
    justificativa.push(
      `Força: protocolo periodizado com ênfase em faixas de 3-6 repetições (RPE 8-9). Volume reduzido compensa com intensidade elevada.`
    );
  }

  if (dados.sexo === "feminino" && (dados.objetivo === "hipertrofia" || dados.objetivo === "emagrecimento")) {
    justificativa.push(
      `Para mulheres, prioridade aos grupos glúteo e posterior de coxa — maior resposta adaptativa nessa população conforme literatura especializada.`
    );
  }

  if (dados.dias_semana <= 3) {
    justificativa.push(
      `${dados.dias_semana} dias/semana: treino full body maximiza frequência por grupo muscular, essencial para iniciantes (Phillips & Van Loon, 2011).`
    );
  }

  justificativa.push(
    `TDEE estimado (Mifflin-St Jeor, 1990): ${manutencao} kcal/dia. Meta calórica: ${alvo} kcal/dia. Proteína: ${proteina}g/dia.`
  );

  // Observação sobre lesão
  let observacoesLesao: string | null = null;
  if (dados.lesoes?.trim()) {
    observacoesLesao = `⚠️ Lesão reportada: "${dados.lesoes}". Adaptar ou substituir exercícios que sobrecarreguem a região afetada. Considerar avaliação fisioterapêutica antes de iniciar.`;
  }

  return {
    template_sugerido_id: templateEncontrado?.id ?? null,
    template_sugerido_nome: templateEncontrado?.nome ?? "Template personalizado",
    justificativa,
    caloria_manutencao: manutencao,
    caloria_alvo: alvo,
    proteina_g_dia: proteina,
    nivel_volume_sugerido: volumeLabel,
    observacoes_lesao: observacoesLesao,
    referencias: REFS_PRESCRICAO,
  };
}
