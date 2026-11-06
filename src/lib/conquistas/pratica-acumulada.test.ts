import { describe, expect, it } from "vitest";
import type { SessaoConquista } from "./regras";
import { CATALOGO, detectarConquistas } from "./regras";
import { CONTEUDO } from "./conteudo";
import { CODIGOS_PRATICA, repsDaSerie, somaDaSessao, totaisDaPratica, trofeusDaPratica } from "./pratica-acumulada";

let n = 0;
function sessao(exs: NonNullable<SessaoConquista["exercicios"]>, extra: Partial<SessaoConquista> = {}): SessaoConquista {
  n++;
  return { id: `s${n}`, iniciado_em: `2026-10-${String(n).padStart(2, "0")}T10:00:00.000Z`, status: "concluida", modo: "normal", series_planejadas: 10, series_concluidas: 10, treino_id: "t", letra: "A", nome_treino: "A", duracao_seg: 3600, origem: "app", conta_aderencia: true, exercicios: exs, ...extra } as SessaoConquista;
}
const ex = (nome: string, series: Array<[number, number] | [number, number, string]>, mais: Record<string, unknown> = {}) => ({ exercicio_id: null, nome, series: series.map(([carga_kg, reps, tipo]) => ({ tipo: tipo ?? "valida", carga_kg, reps })), ...mais });

describe("prática acumulada", () => {
  it("soma reps e kg sem aquecimento, unilateral em dobro, blocos somados", () => {
    const s = sessao([
      ex("Supino reto", [[20, 15, "aquecimento"], [60, 10], [60, 8]]),
      ex("Remada serrote", [[20, 12]]),
      { exercicio_id: null, nome: "Leg press", series: [{ tipo: "rest_pause", carga_kg: 100, reps: 10, blocos: [{ carga: 100, reps: 10 }, { carga: 100, reps: 4 }] }] },
    ]);
    const t = somaDaSessao(s);
    expect(t.reps).toBe(10 + 8 + 24 + 14);
    expect(t.kg).toBe(600 + 480 + 480 + 1400);
    expect(t.exercicios).toHaveLength(3);
    expect(repsDaSerie({ tipo: "valida", carga_kg: 10, reps: null })).toBe(0);
  });

  it("ignora série fora do limite, importado e em andamento", () => {
    const ok = sessao([ex("Agachamento", [[900, 10], [80, 10]])]);
    const imp = sessao([ex("Agachamento", [[80, 1000]])], { origem: "importado" });
    const and = sessao([ex("Agachamento", [[80, 50]])], { status: "em_andamento" });
    expect(totaisDaPratica([ok, imp, and])).toEqual({ reps: 10, toneladas: 0.8, exercicios: 1 });
  });

  it("concede cada marco uma vez, na sessão que passou", () => {
    const ss = Array.from({ length: 8 }, () => sessao([ex("Supino", [[100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10]])]));
    // 140 reps e 14 t por sessão
    const t = trofeusDaPratica(ss);
    const reps = t.find((x) => x.codigo === "reps_1000")!;
    expect(reps.sessaoId).toBe(ss[7].id); // 8 × 140 = 1.120
    expect(t.find((x) => x.codigo === "toneladas_25")!.sessaoId).toBe(ss[1].id);
    expect(t.find((x) => x.codigo === "toneladas_100")!.sessaoId).toBe(ss[7].id);
    expect(t.filter((x) => x.codigo === "reps_1000")).toHaveLength(1);
  });

  it("explorador conta exercícios diferentes pela biblioteca ou pelo nome sem acento", () => {
    const ss = Array.from({ length: 15 }, (_, i) => sessao([ex(i === 14 ? "Elevação lateral" : `Exercício ${i}`, [[10, 10]]), ex("elevacao  LATERAL", [[10, 10]]), ex("Outro nome", [[10, 10]], { biblioteca_id: "b1" }), ex("Mesmo da biblioteca", [[10, 10]], { biblioteca_id: "b1" })]));
    const tot = totaisDaPratica(ss);
    expect(tot.exercicios).toBe(14 + 1 + 1); // 14 nomes + elevação lateral + b1
    expect(trofeusDaPratica(ss).some((x) => x.codigo === "explorador_15")).toBe(true);
  });

  it("todos os códigos têm catálogo e conteúdo na categoria prática", () => {
    for (const c of CODIGOS_PRATICA) {
      expect(CATALOGO[c].titulo).toBeTruthy();
      expect(CONTEUDO[c].categoria).toBe("pratica");
    }
  });

  it("entra no detectarConquistas", () => {
    const ss = Array.from({ length: 2 }, () => sessao([ex("Supino", Array.from({ length: 14 }, () => [100, 10] as [number, number]))]));
    const det = detectarConquistas({ sessoes: ss, aderencia: { sequencia: 0, semanaAtual: null, semanas: [] } as never, relatorioVistoEm: null, baseCarga: [], hoje: "2026-11-06" } as never);
    expect(det.some((d) => d.codigo === "toneladas_25")).toBe(true);
  });
});
