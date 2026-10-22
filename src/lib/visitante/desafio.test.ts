import { describe, expect, it } from "vitest";
import { estadoDesafio } from "./desafio";
import { detectarConquistas } from "@/lib/conquistas/regras";

const d = { id: "c1", nome: "Desafio 7 Dias Chalalá", inicio: "2026-10-20", fim: "2026-10-26", metaTreinos: 3 };
const s = (id: string, iso: string) => ({ id, iniciado_em: iso });
const agora = new Date("2026-10-22T15:00:00Z");

describe("desafio do visitante", () => {
  it("conta só os treinos dentro do período (horário de Brasília)", () => {
    const r = estadoDesafio(d, [s("a", "2026-10-19T12:00:00Z"), s("b", "2026-10-20T02:00:00Z"), s("c", "2026-10-21T12:00:00Z")], agora);
    // "b" é 19/10 23h em Brasília: fora do período
    expect(r).toEqual({ estado: "andamento", feitos: 1, meta: 3, diasRestantes: 5 });
  });
  it("concluído quando bate a meta; encerrado quando o prazo passa sem bater", () => {
    const tres = [s("a", "2026-10-20T12:00:00Z"), s("b", "2026-10-21T12:00:00Z"), s("c", "2026-10-22T12:00:00Z")];
    expect(estadoDesafio(d, tres, agora)).toMatchObject({ estado: "concluido", feitos: 3, concluidoEm: "2026-10-22T12:00:00Z" });
    expect(estadoDesafio(d, tres.slice(0, 2), new Date("2026-10-28T15:00:00Z"))).toMatchObject({ estado: "encerrado", feitos: 2 });
    expect(estadoDesafio({ ...d, inicio: "2026-10-25" }, [], agora)).toMatchObject({ estado: "em_breve", diasParaComecar: 3 });
  });
  it("a medalha sai uma vez por desafio, na data do treino que bateu a meta", () => {
    const sessao = (id: string, iso: string) => ({ id, iniciado_em: iso, status: "concluida" as const, modo: "normal" as const, origem: "app", series_planejadas: 4, series_concluidas: 4, treino_id: "t", letra: "A", nome_treino: "A", duracao_seg: 2400, exercicios: [] });
    const aderencia = { semanas: [], sequencia: 0 } as unknown as Parameters<typeof detectarConquistas>[0]["aderencia"];
    const out = detectarConquistas({ sessoes: [sessao("a", "2026-10-20T12:00:00Z"), sessao("b", "2026-10-21T12:00:00Z"), sessao("c", "2026-10-22T12:00:00Z")] as never, aderencia, hoje: "2026-10-22", desafios: [d] }).filter((c) => c.codigo === "desafio_concluido");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ referencia: "c1", data: "2026-10-22T12:00:00Z", sessaoId: "c" });
  });
});
