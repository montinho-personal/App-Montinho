import { describe, expect, it } from "vitest";
import { calcularAderencia } from "@/lib/aderencia/calcular";
import { medalhasEmDestaque, proximaMedalha, proximasMedalhas, vitrineDeMedalhas } from "./vitrine";
import type { SessaoConquista } from "./regras";

let n = 0;
const s = (dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista => ({ id: `v${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, ...o });
const metas = [{ desde: "2026-01-01", meta: 3, origem: "personal" as const }];
const vitrine = (sessoes: SessaoConquista[], conquistas: Array<{ codigo: string; conquistado_em: string }>, hoje: string, inicio = "2026-09-28") =>
  vitrineDeMedalhas({ conquistas, sessoes, aderencia: calcularAderencia({ inicio, hoje, metas, sessoes }), hoje });

describe("vitrine de medalhas (20 únicas)", () => {
  it("ordem da jornada; conquistadas com data, abertas com progresso real", () => {
    const sessoes = Array.from({ length: 7 }, (_, i) => s(`2026-10-${String(i + 1).padStart(2, "0")}`));
    const ms = vitrine(sessoes, [{ codigo: "primeiro_treino", conquistado_em: "2026-10-01T13:00:00Z" }, { codigo: "recorde", conquistado_em: "2026-10-05T13:00:00Z" }], "2026-10-20");
    expect(ms).toHaveLength(44);
    expect(ms.map((m) => m.codigo)).not.toContain("recorde");
    expect(ms[0]).toMatchObject({ codigo: "primeiro_treino", titulo: "Primeiro passo", conquistada: true, falta: null });
    expect(ms.find((m) => m.codigo === "treinos_10")).toMatchObject({ conquistada: false, atual: 7, alvo: 10 });
    expect(ms.find((m) => m.codigo === "treinos_10")?.falta).toMatch(/Faltam 3 treinos concluídos/);
  });
  it("medalhas de técnica mostram quais técnicas contaram (e as já feitas nas que faltam)", () => {
    const treino = s("2026-10-21", { exercicios: [
      { exercicio_id: "a", nome: "Puxada frontal supinada", tecnica: "piramide", series: [{ tipo: "valida", carga_kg: 50, reps: 20 }] },
      { exercicio_id: "b", nome: "Rosca direta", tecnica: "biset", series: [{ tipo: "valida", carga_kg: 10, reps: 15 }] },
    ] });
    const ms = vitrine([treino], [{ codigo: "primeira_tecnica", conquistado_em: "2026-10-21T13:00:00Z" }, { codigo: "tecnicas_2", conquistado_em: "2026-10-21T13:00:00Z" }], "2026-10-22");
    expect(ms.find((m) => m.codigo === "primeira_tecnica")?.detalhe).toBe("Técnica: Pirâmide.");
    expect(ms.find((m) => m.codigo === "tecnicas_2")?.detalhe).toBe("Técnicas: Pirâmide, Bi-set.");
    expect(ms.find((m) => m.codigo === "tecnicas_3")?.detalhe).toBe("Você já fez: Pirâmide, Bi-set.");
    expect(ms.find((m) => m.codigo === "primeiro_treino")?.detalhe).toBeNull();
  });
  it("extras, parciais e histórico sem autorização não contam como treino concluído", () => {
    const sessoes = [s("2026-10-01"), s("2026-10-02", { modo: "extra" }), s("2026-10-03", { series_concluidas: 2 }), s("2026-10-04", { conta_aderencia: false })];
    expect(vitrine(sessoes, [], "2026-10-05").find((m) => m.codigo === "treinos_10")?.atual).toBe(1);
  });
  it("medalha antiga continua conquistada mesmo se o critério novo não fecharia (regressão)", () => {
    const ms = vitrine([s("2026-10-01")], [{ codigo: "primeiro_mes", conquistado_em: "2026-10-02T13:00:00Z" }], "2026-10-20");
    expect(ms.find((m) => m.codigo === "primeiro_mes")).toMatchObject({ conquistada: true, disponivel: true });
  });
  it("janela que já passou e recomeço sem pausa não viram ‘próxima’", () => {
    const ms = vitrine([s("2026-10-01")], [], "2026-12-20");
    expect(ms.find((m) => m.codigo === "criando_raizes")?.disponivel).toBe(false);
    expect(ms.find((m) => m.codigo === "recomeco_consistente")?.disponivel).toBe(false);
    expect(proximasMedalhas(ms, 14).map((m) => m.codigo)).not.toContain("criando_raizes");
  });
  it("próxima inteligente: no começo, sugere voltar na próxima semana (Criando raízes)", () => {
    const ms = vitrine([s("2026-09-29")], [{ codigo: "primeiro_treino", conquistado_em: "2026-09-29T13:00:00Z" }], "2026-10-01");
    const p = proximaMedalha(ms)!;
    expect(p.codigo).toBe("criando_raizes");
    expect(p.falta).toMatch(/Volte a treinar na próxima semana/);
    expect(ms[0].nova).toBe(true);
  });
  it("destaque: no máximo 10, na ordem da jornada", () => {
    const ms = vitrine([s("2026-10-01")], [{ codigo: "primeiro_treino", conquistado_em: "2026-10-01T13:00:00Z" }], "2026-10-05");
    const d = medalhasEmDestaque(ms, "2026-10-05");
    expect(d).toHaveLength(10);
    expect(d[0].codigo).toBe("primeiro_treino");
  });
});
