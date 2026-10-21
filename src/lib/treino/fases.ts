// Fases do protocolo (definidas pelo personal no montador). Usadas no
// cabeçalho do treino, no treino do aluno e nas medalhas de fase.
export const FASES = ["adaptacao", "intensificacao", "consolidacao"] as const;
export type Fase = (typeof FASES)[number];

export const FASE_INFO: Record<Fase, { rotulo: string; cor: string; resumo: string }> = {
  adaptacao: { rotulo: "Adaptação", cor: "#60a5fa", resumo: "Aprender os movimentos e preparar o corpo." },
  intensificacao: { rotulo: "Intensificação", cor: "#f87171", resumo: "Mais esforço: cargas, técnicas e volume sobem." },
  consolidacao: { rotulo: "Consolidação", cor: "#34d399", resumo: "Firmar os ganhos e manter o que foi construído." },
};

export const ehFase = (v: unknown): v is Fase => typeof v === "string" && (FASES as readonly string[]).includes(v);
