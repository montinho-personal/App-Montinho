import { describe, expect, it } from "vitest";
import { calcularAderencia, somarDias, type PausaAluno } from "@/lib/aderencia/calcular";
import type { SessaoConquista } from "./regras";
import { detectarConquistas } from "./regras";
import { proximaMedalha, vitrineDeMedalhas } from "./vitrine";
import { CAPITULO_DA_MEDALHA, caminhoDaJornada, ciclos, linhaDoTempo, montarJornada, rotuloCiclo } from "./jornada";

let n = 0;
const s = (dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista => ({ id: `j${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, exercicios: [], ...o });
const metas = [{ desde: "2026-01-01", meta: 2, origem: "personal" as const }];

/** Pipeline real: motor oficial → conquistas → vitrine → jornada. */
function jornadaDe(sessoes: SessaoConquista[], hoje: string, inicio = "2026-08-03", pausas: PausaAluno[] = []) {
  const aderencia = calcularAderencia({ inicio, hoje, metas, sessoes, pausas });
  const conquistas = detectarConquistas({ sessoes, aderencia, hoje }).map((c, i) => ({ id: `k${i}`, codigo: c.codigo, titulo: c.titulo, descricao: c.descricao, conquistado_em: c.data, dados: c.dados }));
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje });
  const j = montarJornada({ medalhas, proxima: proximaMedalha(medalhas), conquistas, semanas: aderencia.semanas });
  return { j, conquistas, aderencia };
}
const semanaCumprida = (seg: string) => [s(seg), s(somarDias(seg, 1))];

describe("Minha Jornada — mapa", () => {
  it("todas as 36 medalhas aparecem uma vez, em 4 capítulos + continuação", () => {
    expect(Object.keys(CAPITULO_DA_MEDALHA)).toHaveLength(36);
    const { j } = jornadaDe([], "2026-08-05");
    expect(j.nos.filter((x) => x.tipo === "medalha")).toHaveLength(36);
    expect(j.capitulos.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(j.nos.filter((x) => x.tipo === "recorrente").map((x) => x.id)).toEqual(["recorde", "eu_voltei"]);
  });
  it("aluno sem treinos: “você está aqui” no começo da trilha, próxima = primeiro passo", () => {
    const { j } = jornadaDe([], "2026-08-05");
    expect(j.posicao).toBe(0);
    expect(j.proxima?.codigo).toBe("primeiro_treino");
    expect(j.nos.some((x) => x.alcancado)).toBe(false);
  });
  it("iniciante: depois do primeiro passo e de Criando raízes", () => {
    const { j } = jornadaDe([s("2026-08-04"), s("2026-08-12")], "2026-08-13");
    const ids = j.nos.map((x) => x.id);
    expect(j.posicao).toBe(ids.indexOf("criando_raizes") + 1);
  });
  it("posição considera o tipo de medalha (constância, prática…), e recorde só acende sem empurrar o marcador", () => {
    const { j } = jornadaDe([s("2026-08-04")], "2026-08-05");
    const base = j.posicao;
    const medalhas = j.nos.filter((x) => x.tipo === "medalha").map((x) => (x as Extract<typeof x, { tipo: "medalha" }>).medalha);
    const comRecorde = montarJornada({ medalhas, proxima: null, conquistas: [{ codigo: "recorde", conquistado_em: "2026-08-05T13:00:00Z" }], semanas: [] });
    expect(comRecorde.posicao).toBe(base);
    expect(comRecorde.nos.find((x) => x.id === "recorde")?.alcancado).toBe(true);
    const comAcomp = montarJornada({ medalhas: medalhas.map((m) => (m.codigo === "acompanhamento_12_semanas" ? { ...m, conquistada: true } : m)), proxima: null, conquistas: [], semanas: [] });
    expect(comAcomp.nos[comAcomp.posicao - 1].id).toBe("acompanhamento_12_semanas");
  });
  it("medalhas independentes da ordem visual: conquista do capítulo 2 sem a meta do capítulo 1", () => {
    // 10 treinos espaçados (meta 2 nunca cumprida): sai “10 treinos” sem “Primeira meta”.
    const xs = Array.from({ length: 10 }, (_, i) => s(somarDias("2026-08-04", i * 7)));
    const { j } = jornadaDe(xs, "2026-10-20");
    const no = (id: string) => j.nos.find((x) => x.id === id)!;
    expect(no("treinos_10").alcancado).toBe(true);
    expect(no("primeira_meta_semanal").alcancado).toBe(false);
  });
  it("pausa combinada não conta como semana de acompanhamento nos ciclos", () => {
    const semanas = Array.from({ length: 30 }, (_, i) => ({ inicio: somarDias("2026-01-05", i * 7), pausada: i < 5 }));
    expect(ciclos(semanas)).toEqual([{ semanas: 26, data: null, alcancado: false }]);
    const c = ciclos(semanas.map((w) => ({ ...w, pausada: false })));
    expect(c[0]).toMatchObject({ semanas: 26, alcancado: true });
    expect(c[1]).toMatchObject({ semanas: 52, alcancado: false });
    expect(rotuloCiclo(26)).toBe("6 meses de acompanhamento");
    expect(rotuloCiclo(78)).toBe("1 ano e meio de acompanhamento");
  });
  it("histórico importado sem autorização não acende marcos", () => {
    const { j } = jornadaDe([s("2026-08-04", { conta_aderencia: false }), s("2026-08-12", { conta_aderencia: false })], "2026-08-13");
    expect(j.posicao).toBe(0);
  });
  it("veterano: muitas medalhas, trilha continua em ciclos depois do capítulo 4", () => {
    const segs = Array.from({ length: 30 }, (_, i) => somarDias("2026-01-05", i * 7));
    const { j } = jornadaDe(segs.flatMap(semanaCumprida), "2026-08-02", "2026-01-05");
    expect(j.nos.find((x) => x.id === "treinos_50")?.alcancado).toBe(true);
    expect(j.nos.find((x) => x.id === "ciclo-26")?.alcancado).toBe(true);
    expect(j.nos.find((x) => x.id === "ciclo-52")?.alcancado).toBe(false);
    // Ainda há medalhas possíveis: o marcador fica nelas, não no ciclo de tempo.
    expect(j.nos[j.posicao - 1].tipo).toBe("medalha");
    // Com todas as medalhas possíveis conquistadas, a trilha segue pelos ciclos.
    const todas = montarJornada({ medalhas: j.nos.filter((x) => x.tipo === "medalha").map((x) => ({ ...(x as Extract<typeof x, { tipo: "medalha" }>).medalha, conquistada: true })), proxima: null, conquistas: [], semanas: Array.from({ length: 30 }, (_, i) => ({ inicio: somarDias("2026-01-05", i * 7), pausada: false })) });
    expect(todas.nos[todas.posicao - 1].id).toBe("ciclo-26");
  });
});

describe("Minha Jornada — linha do tempo", () => {
  it("eventos reais, sem duplicar, do mais recente para o mais antigo; mensagem do personal identificada", () => {
    const { conquistas, aderencia } = jornadaDe([...semanaCumprida("2026-08-03"), ...semanaCumprida("2026-08-10")], "2026-08-20");
    const ev = linhaDoTempo({ conquistas: [...conquistas, ...conquistas], semanas: aderencia.semanas, hoje: "2026-08-20", reconhecimentos: [{ id: "r1", mensagem: "Parabéns!", created_at: "2026-08-15T12:00:00Z" }] });
    expect(new Set(ev.map((e) => e.chave)).size).toBe(ev.length);
    expect(ev.filter((e) => e.tipo === "meta")).toHaveLength(2);
    expect(ev.find((e) => e.tipo === "reconhecimento")).toMatchObject({ autor: "personal", detalhe: "Parabéns!" });
    expect(ev.find((e) => e.codigo === "primeiro_treino")?.titulo).toBe("Primeiro passo");
    const datas = ev.map((e) => e.data);
    expect([...datas].sort().reverse()).toEqual(datas);
  });
  it("semana atual cumprida não ganha data no futuro", () => {
    const { aderencia } = jornadaDe(semanaCumprida("2026-08-17"), "2026-08-19");
    const ev = linhaDoTempo({ conquistas: [], semanas: aderencia.semanas, hoje: "2026-08-19", reconhecimentos: [] });
    expect(ev[0].data.slice(0, 10)).toBe("2026-08-19");
  });
});

describe("caminho semana a semana", () => {
  it("cor da fase, começo de fase e retorno depois de parar", () => {
    const semanas = ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"].map((inicio, i) => ({ inicio, status: (i === 2 || i === 3 ? "sem_treino" : "cumprida") as "cumprida" | "sem_treino", concluidas: 0, parciais: 0, extras: 0 }));
    const sessoes = [
      { iniciado_em: "2026-09-08T13:00:00Z", status: "concluida", fase: "adaptacao" },
      { iniciado_em: "2026-09-15T13:00:00Z", status: "concluida", fase: "adaptacao" },
      { iniciado_em: "2026-10-06T13:00:00Z", status: "concluida", fase: "intensificacao" },
    ];
    const c = caminhoDaJornada({ semanas, sessoes, conquistas: [{ codigo: "eu_voltei", conquistado_em: "2026-10-06T13:00:00Z", dados: { diasAfastado: 21 } }] });
    expect(c.semanas.map((w) => w.fase)).toEqual(["adaptacao", "adaptacao", null, null, "intensificacao"]);
    expect(c.semanas.map((w) => w.novaFase)).toEqual(["adaptacao", null, null, null, "intensificacao"]);
    expect(c.semanas[4]).toMatchObject({ retorno: true, diasParado: 21, treinos: 1 });
    expect(c.faseAtual).toBe("intensificacao");
    expect(c.retornos).toBe(1);
  });
});
