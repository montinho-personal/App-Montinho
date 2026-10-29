import { describe, expect, it } from "vitest";
import { parceiroParaBiset, sugestaoDeBiset, codigoBloco, juntarBlocosAdjacentes, proximoDaRodada, configDasRespostas, juntaExercicios, perguntasDaTecnica, respostasDaConfig, respostasPadrao, resumoEscolha, seriesComTecnica, TECNICAS_ALUNO } from "./tecnica-aluno";
import { blocosPlanejados, configEfetiva } from "./tecnica-config";

describe("técnicas escolhidas na hora", () => {
  it("rest-pause: pergunta onde e quantos blocos; 3 blocos viram ativação + 2 minis", () => {
    expect(perguntasDaTecnica("rest_pause")).toMatchObject({ onde: true, repsAlvo: true });
    const c = configDasRespostas("rest_pause", { ...respostasPadrao("rest_pause"), blocos: 3 })!;
    expect(c).toMatchObject({ aplicar: "finalizacao", series: 1, blocos: 2 });
    expect(blocosPlanejados("rest_pause", c)).toHaveLength(3);
    expect(respostasDaConfig("rest_pause", c).blocos).toBe(3);
    expect(resumoEscolha("rest_pause", c)).toBe("Rest-pause · 1 série de finalização · 3 blocos");
  });
  it("drop-set em 2 séries com 3 drops", () => {
    const c = configDasRespostas("dropset", { onde: "series", series: 2, blocos: 3, repsAlvo: null, pausaSeg: null })!;
    expect(configEfetiva("dropset", c)).toMatchObject({ aplicar: "principais", series: 2, blocos: 3 });
    expect(seriesComTecnica("dropset", c)).toBe(2);
    expect(resumoEscolha("dropset", c)).toBe("Drop-set · em 2 séries · 3 drops");
  });
  it("cluster e 3/7 não têm finalização; bi-set junta exercícios", () => {
    expect(respostasPadrao("cluster").onde).toBe("series");
    expect(perguntasDaTecnica("tres_sete")?.blocos).toBeNull();
    expect(juntaExercicios("biset")).toBe(true);
    expect(juntaExercicios("dropset")).toBe(false);
    expect(perguntasDaTecnica("biset")).toBeNull();
    expect(TECNICAS_ALUNO.every((t) => t.oQueE.endsWith(".") && t.exemplo.length > 5)).toBe(true);
  });
});

describe("bi-set do aluno", () => {
  it("deixa o par junto na tela e passa de um para o outro sem descanso", () => {
    const l = [{ id: "a", bloco: "J1" }, { id: "b", bloco: null }, { id: "c", bloco: "J1" }];
    expect(juntarBlocosAdjacentes(l).map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(proximoDaRodada(["a", "c"], "a")).toEqual({ proximo: "c", descansa: false });
    expect(proximoDaRodada(["a", "c"], "c")).toEqual({ proximo: "a", descansa: true });
    expect(proximoDaRodada(["a"], "a")).toBeNull();
    expect(codigoBloco(["J1", null])).toBe("J2");
  });
});

describe("bi-set no treino do personal", () => {
  it("junta com o próximo livre e sugere músculos diferentes", () => {
    const it = [{ id: "a", livre: false, grupo: "peito" }, { id: "b", livre: true, grupo: "peito" }, { id: "c", livre: true, grupo: "peito" }, { id: "d", livre: true, grupo: "costas" }];
    expect(parceiroParaBiset(it, "b")).toBe("c");
    expect(parceiroParaBiset(it, "d")).toBe("c");
    expect(parceiroParaBiset(it, "a")).toBeNull();
    expect(sugestaoDeBiset(it)).toEqual(["c", "d"]);
    expect(sugestaoDeBiset([it[1]])).toBeNull();
  });
});
