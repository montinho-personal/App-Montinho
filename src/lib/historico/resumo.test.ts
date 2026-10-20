import { describe, expect, it } from "vitest";
import { baseCargaDoResumo, diasDoResumo, linhasParaGravar } from "./resumo";
import { IMPORTACAO, LINHAS } from "./adriana-nascimento";
import { importacoesParaAluno } from "./index";
import { evolucaoExercicio } from "@/lib/relatorios/calcular";
import { recordesDaSessao, type SessaoConquista } from "@/lib/conquistas/regras";
import { PRESCRICAO } from "@/lib/prescricoes/miss-terracos-tambore";
import type { SessaoCompleta } from "@/lib/data/sessoes";

describe("histórico da Adriana (resumo do app anterior)", () => {
  it("transcreve exatamente os prints e ignora o dia com 0 séries", () => {
    const g = linhasParaGravar(IMPORTACAO);
    expect(LINHAS).toHaveLength(44);
    expect(g).toHaveLength(43);
    // Todos os 25 exercícios da ficha têm histórico.
    expect(new Set(g.map((l) => l.exercicio_nome)).size).toBe(new Set(PRESCRICAO.treinos.flatMap((t) => t.exercicios.map((e) => e.nome))).size);
    expect(new Set(g.map((l) => `${l.data}:${l.letra}`))).toEqual(new Set(["2026-10-07:C", "2026-10-08:D", "2026-10-09:B", "2026-10-13:B", "2026-10-15:A", "2026-10-16:C", "2026-10-19:A"]));
    expect(g.every((l) => l.reps_total === null)).toBe(true);
    expect(g.filter((l) => l.exercicio_nome === "Stiff com halteres").map((l) => l.series)).toEqual([8, 16]);
    expect(g.filter((l) => l.exercicio_nome === "Abdominal prancha").map((l) => [l.data.slice(5), l.letra, l.series, l.carga_max_kg])).toEqual([["10-07", "C", 1, null], ["10-15", "A", 1, null], ["10-16", "C", 1, null], ["10-19", "A", 1, null]]);
    expect(diasDoResumo(LINHAS)).toEqual(["2026-10-07", "2026-10-08", "2026-10-09", "2026-10-13", "2026-10-15", "2026-10-16", "2026-10-19"]);
    const abd = g.filter((l) => l.exercicio_nome === "Cadeira abdutora").map((l) => [l.data.slice(5), l.carga_max_kg, l.volume_kg]);
    expect(g.filter((l) => l.exercicio_nome === "Leg press horizontal (180°)").map((l) => [l.carga_max_kg, l.volume_kg])).toEqual([[100, 4467], [100, 4647]]);
    expect(g.filter((l) => l.exercicio_nome === "Agachamento no Smith").map((l) => [l.carga_max_kg, l.volume_kg])).toEqual([[35, 1040], [35, 1201]]);
    expect(abd).toEqual([["10-07", 80, 3070], ["10-09", 80, 4610], ["10-13", 80, 3900], ["10-15", 100, 4210], ["10-16", 90, 3440], ["10-19", 110, 4900]]);
  });

  it("nomes ligam ao treino atual e à biblioteca", () => {
    const nomesPlano = new Set(PRESCRICAO.treinos.flatMap((t) => t.exercicios.map((e) => e.nome)));
    for (const l of LINHAS) {
      expect(nomesPlano.has(l.exercicio)).toBe(true);
      expect(l.bibliotecaId).toBeTruthy();
    }
  });

  it("letras deduzidas conferem com a prescrição (volume ÷ repetições prescritas)", () => {
    const repsTotal = (letra: string, nome: string) => {
      const e = PRESCRICAO.treinos.find((t) => t.letra === letra)!.exercicios.find((x) => x.nome === nome)!;
      const sc = e.series_config as { modo: string; series: number | Array<{ reps: string }>; reps?: string };
      return sc.modo === "iguais" ? Number(sc.reps) * (sc.series as number) : (sc.series as Array<{ reps: string }>).reduce((a, s) => a + Number(s.reps), 0);
    };
    const pant = LINHAS.filter((l) => l.exercicio.startsWith("Panturrilha") && l.series > 0);
    expect(4200 / repsTotal("D", pant[0].exercicio)).toBe(52.5);
    expect(pant.map((l) => l.letra)).toEqual(["D", "C"]);
    expect(LINHAS.filter((l) => l.letra === "A").every((l) => PRESCRICAO.treinos.find((t) => t.letra === "A")!.exercicios.some((e) => e.nome === l.exercicio))).toBe(true);
  });

  it("só aparece para a aluna certa", () => {
    expect(importacoesParaAluno("Adriana Nascimento")).toHaveLength(1);
    expect(importacoesParaAluno("Aline")).toHaveLength(0);
  });
});

describe("resumo no gráfico de evolução", () => {
  const resumos = linhasParaGravar(IMPORTACAO);
  it("entra como ponto 'resumo' sem e1RM; registro do app tem prioridade no mesmo dia", () => {
    const app = { id: "s1", status: "concluida", iniciado_em: "2026-10-19T12:00:00Z", finalizado_em: "2026-10-19T13:00:00Z", exercicios: [{ nome: "Cadeira abdutora", grupo_muscular: "gluteo", series: [{ serie: 1, tipo: "valida", carga_kg: 115, reps: 12 }] }] } as unknown as SessaoCompleta;
    const p = evolucaoExercicio([app], "Cadeira abdutora", resumos);
    expect(p).toHaveLength(6);
    expect(p[0]).toMatchObject({ data: "2026-10-07", cargaMax: 80, tonelagem: 3070, e1rmMax: null, fonte: "resumo" });
    expect(p.at(-1)).toMatchObject({ data: "2026-10-19", cargaMax: 115, fonte: "app" });
    expect(evolucaoExercicio([], "Panturrilha no leg press horizontal (180°)", resumos).map((x) => x.data)).toEqual(["2026-10-08", "2026-10-16"]);
  });
});

describe("resumo como base de recordes", () => {
  const base = baseCargaDoResumo(linhasParaGravar(IMPORTACAO).map((l) => ({ ...l })));
  const sessao = (carga: number): SessaoConquista => ({ id: "n", iniciado_em: "2026-10-22T13:00:00Z", status: "concluida", series_planejadas: 4, series_concluidas: 4, exercicios: [{ exercicio_id: "x", nome: "Cadeira abdutora", series: [{ tipo: "valida", carga_kg: carga, reps: 12 }] }] });
  it("carga acima do máximo do app anterior é recorde; igual não é", () => {
    expect(recordesDaSessao(sessao(115), [], base)).toEqual([{ exercicio: "Cadeira abdutora", tipo: "carga", antes: 110, agora: 115 }]);
    expect(recordesDaSessao(sessao(110), [], base)).toEqual([]);
  });
  it("sem reps por série no resumo: nunca gera recorde de repetições contra ele", () => {
    expect(recordesDaSessao(sessao(80), [], base)).toEqual([]);
  });
});
