import { describe, expect, it } from "vitest";
import { relatorioDaConclusao, type SessaoRelatorio } from "./conclusao";

const serie = (carga: number, reps: number) => ({ tipo: "valida", carga_kg: carga, reps });
const sessao = (id: string, dia: string, ex: Array<[string, Array<[number, number]>]>, extra: Partial<SessaoRelatorio> = {}): SessaoRelatorio => ({
  id,
  treino_id: "tA",
  letra: "A",
  status: "concluida",
  iniciado_em: `${dia}T10:00:00Z`,
  finalizado_em: `${dia}T11:00:00Z`,
  duracao_seg: 3000,
  series_concluidas: 6,
  series_planejadas: 6,
  exercicios: ex.map(([nome, ss]) => ({ biblioteca_id: null, nome, series: ss.map(([c, r]) => serie(c, r)) })),
  ...extra,
});

const s1 = sessao("s1", "2026-10-01", [["Supino", [[40, 10], [40, 10], [40, 8]]], ["Crucifixo", [[20, 12], [20, 12], [20, 12]]]]);
const s2 = sessao("s2", "2026-10-08", [["Supino", [[42, 10], [42, 9], [40, 8]]], ["Crucifixo", [[20, 12], [20, 12], [20, 10]]]]);

describe("relatório da conclusão", () => {
  it("completo, volume vs anterior e média, melhorou/igual/abaixo e recorde da vida", () => {
    const hoje = sessao("s3", "2026-10-15", [["Supino", [[45, 10], [45, 9], [42, 8]]], ["Crucifixo", [[18, 12], [18, 10], [18, 10]]]], { duracao_seg: 2820 });
    const r = relatorioDaConclusao(hoje, [s1, s2]);
    expect(r.completo).toBe(true);
    expect(r.volumeKg).toBe(45 * 10 + 45 * 9 + 42 * 8 + 18 * 32);
    expect(r.anterior?.volumePct).toBe(-2); // supino subiu, crucifixo caiu
    expect(r.anterior?.duracaoDifMin).toBe(-3);
    expect(r.media?.treinos).toBe(2);
    expect(r.exercicios).toEqual({ melhorou: 1, igual: 0, abaixo: 1, comparaveis: 2 });
    expect(r.recordesVida).toEqual([{ exercicio: "Supino", carga: 45, antes: 42 }]);
    expect(r.maiorPeso).toEqual({ exercicio: "Supino", carga: 45, recordeVida: true });
  });

  it("primeiro treino: sem comparação, sem recorde inventado", () => {
    const r = relatorioDaConclusao(s1, []);
    expect(r.anterior).toBeNull();
    expect(r.media).toBeNull();
    expect(r.recordesVida).toEqual([]);
    expect(r.maiorPeso?.recordeVida).toBe(false);
  });

  it("recorde considera as cargas do histórico importado (planilha)", () => {
    const hoje = sessao("h", "2026-10-15", [["Supino", [[45, 10]]]]);
    expect(relatorioDaConclusao(hoje, [], [{ nome: "supino", bibliotecaId: null, carga: 50, data: "2026-10-10" }]).maiorPeso?.recordeVida).toBe(false);
    // Um registro anterior só ainda não vale recorde (mesmo critério das medalhas: 2+).
    expect(relatorioDaConclusao(hoje, [], [{ nome: "Supino", bibliotecaId: null, carga: 40, data: "2026-10-10" }]).recordesVida).toEqual([]);
    expect(relatorioDaConclusao(hoje, [], [{ nome: "Supino", bibliotecaId: null, carga: 40, data: "2026-10-10" }, { nome: "Supino", bibliotecaId: null, carga: 37.5, data: "2026-10-03" }]).recordesVida).toEqual([{ exercicio: "Supino", carga: 45, antes: 40 }]);
  });

  it("treino parcial mostra a porcentagem feita", () => {
    const r = relatorioDaConclusao({ ...s2, id: "p", status: "concluida", series_concluidas: 3, series_planejadas: 6 }, [s1]);
    expect(r.completo).toBe(false);
    expect(r.pct).toBe(50);
    expect(r.anterior?.volumePct).toBeNull(); // metade do treino não se compara em volume
    expect(r.media).toBeNull();
  });
});
