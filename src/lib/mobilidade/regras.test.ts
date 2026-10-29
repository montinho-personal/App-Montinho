import { describe, expect, it } from "vitest";
import { faltaParaConcluir, melhoraDaNota, sequenciaAtual, trofeusDaMobilidade, valeMobilidade, type SessaoMobilidade } from "./regras";
import { PROTOCOLOS, textoDose, todosExercicios } from "./protocolos";

let n = 0;
const s = (protocolo: SessaoMobilidade["protocolo"], dia: string, minutos = 22, p: Partial<SessaoMobilidade> = {}): SessaoMobilidade => {
  const ini = `${dia}T07:00:00-03:00`;
  return { id: `m${n++}`, protocolo, status: "concluida", iniciado_em: new Date(ini).toISOString(), concluido_em: new Date(Date.parse(ini) + minutos * 60_000).toISOString(), nota_antes: 7, nota_depois: 3, ...p };
};
const dia = (k: number) => `2026-11-${String(k).padStart(2, "0")}`;

describe("mobilidade: só vale começado no app", () => {
  it("precisa de 10+ min entre começar e concluir; cancelada e em andamento não valem", () => {
    expect(valeMobilidade(s("superiores", dia(1), 22))).toBe(true);
    expect(valeMobilidade(s("superiores", dia(1), 3))).toBe(false);
    expect(valeMobilidade(s("superiores", dia(1), 22, { status: "cancelada" }))).toBe(false);
    expect(valeMobilidade(s("superiores", dia(1), 22, { status: "em_andamento", concluido_em: null }))).toBe(false);
    expect(faltaParaConcluir("2026-11-01T10:00:00Z", Date.parse("2026-11-01T10:04:30Z"))).toBe(6);
  });
});

describe("troféus", () => {
  it("1 por protocolo, um por fazer os dois", () => {
    const t = trofeusDaMobilidade([s("superiores", dia(1)), s("superiores", dia(2), 4), s("inferiores", dia(3))]);
    expect(t.map((x) => x.codigo)).toEqual(["mobilidade_superiores", "mobilidade_inferiores", "mobilidade_completa"]);
  });

  it("desafio 7 dias: 7 dias seguidos do mesmo protocolo; um dia sem quebra", () => {
    const seis = [1, 2, 3, 4, 5, 6].map((k) => s("inferiores", dia(k)));
    expect(trofeusDaMobilidade(seis).some((x) => x.codigo === "mobilidade_7_inferiores")).toBe(false);
    expect(trofeusDaMobilidade([...seis, s("inferiores", dia(7))]).find((x) => x.codigo === "mobilidade_7_inferiores")?.evidencia).toEqual({ ate: dia(7) });
    const quebrou = [1, 2, 3, 5, 6, 7, 8].map((k) => s("superiores", dia(k)));
    expect(trofeusDaMobilidade(quebrou).some((x) => x.codigo === "mobilidade_7_superiores")).toBe(false);
    // dois no mesmo dia contam 1 dia
    expect(sequenciaAtual([s("superiores", dia(9)), s("superiores", dia(10)), s("superiores", dia(10))], "superiores", dia(10))).toBe(2);
    // hoje ainda não fez: a sequência de ontem continua valendo
    expect(sequenciaAtual([s("superiores", dia(9)), s("superiores", dia(10))], "superiores", dia(11))).toBe(2);
  });

  it("nota de desconforto: antes → depois", () => {
    expect(melhoraDaNota({ nota_antes: 7, nota_depois: 3 })).toEqual({ antes: 7, depois: 3, diferenca: 4 });
    expect(melhoraDaNota({ nota_antes: null, nota_depois: 3 })).toBeNull();
  });

  it("doses no formato do roteiro", () => {
    const doses = (slug: "superiores" | "inferiores") => Object.fromEntries(todosExercicios(PROTOCOLOS[slug]).map((e) => [e.nome, textoDose(e.dose)]));
    expect(doses("superiores")).toMatchObject({ "Rolo na torácica": "40 s", "Extensão da torácica no rolo": "2 × 8", "Rolo na lateral do tronco": "40 s cada lado", "Rotação de ombro com bastão nas costas": "2 × 10 cada lado" });
    expect(doses("inferiores")).toMatchObject({ "Prancha isométrica": "2 × 1 min", "90/90 com troca": "2 × 10 trocas", "Posterior sentado": "2 × 30 s cada perna", "Cócoras": "3 × 30 s" });
    expect(todosExercicios(PROTOCOLOS.superiores)).toHaveLength(13);
    expect(todosExercicios(PROTOCOLOS.inferiores)).toHaveLength(12);
  });
});
