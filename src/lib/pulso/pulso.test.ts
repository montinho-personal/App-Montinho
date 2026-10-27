import { describe, expect, it } from "vitest";
import { DIMENSOES, PERGUNTAS, dimensaoDaPergunta, diaSP, valida } from "./perguntas";
import { checkinPreDoPulso, doDiarioAntigo, doExtra, doFimTreino, doOnboarding, doPreTreino, type RespostaPulso } from "./equivalencias";
import { cansacoFrequente, escolherPerguntas, validasHoje, type ContextoEscolha } from "./escolher";
import { classificarPulso, dificuldadesFrequentes, tendenciaSemanal } from "./classificar";
import { chaveAlertaPulso, ordenarFila, situacaoAlerta } from "./alertas";

// 12h de Brasília = 15h UTC.
const em = (dia: string, hora = "15:00") => `${dia}T${hora}:00.000Z`;
const resp = (dimensao: RespostaPulso["dimensao"], valor: string, dia: string): RespostaPulso => ({ dimensao, valor, em: em(dia), origem: "pulso" });

describe("cardápio e deduplicação de sentido", () => {
  it("cada pergunta do cardápio tem sentido único e casa com a própria dimensão", () => {
    const vistos = DIMENSOES.map((d) => dimensaoDaPergunta(PERGUNTAS[d].pergunta));
    expect(vistos).toEqual(DIMENSOES);
    expect(new Set(vistos).size).toBe(DIMENSOES.length);
  });
  it("perguntas escritas de outro jeito caem na mesma dimensão", () => {
    expect(dimensaoDaPergunta("Como está sua disposição hoje?")).toBe("energia");
    expect(dimensaoDaPergunta("Qual seu nível de energia hoje?")).toBe("energia");
    expect(dimensaoDaPergunta("Como você está hoje?")).toBe("energia");
    expect(dimensaoDaPergunta("Está com alguma dor?")).toBe("recuperacao");
    expect(dimensaoDaPergunta("Como está seu corpo?")).toBe("recuperacao");
    expect(dimensaoDaPergunta("Qual sua motivação para treinar?")).toBe("motivacao");
    expect(dimensaoDaPergunta("O que atrapalhou seus treinos?")).toBe("dificuldade");
    expect(dimensaoDaPergunta("Dormiu bem?")).toBe("sono");
    expect(dimensaoDaPergunta("Qual sua cor favorita?")).toBeNull();
  });
  it("recuperação e sono são dado de saúde; energia, vontade e dificuldade não", () => {
    expect(DIMENSOES.filter((d) => PERGUNTAS[d].saude)).toEqual(["recuperacao", "sono"]);
  });
});

describe("validade das respostas (horário de Brasília)", () => {
  it("energia vale só no dia; vira à meia-noite de Brasília, não de Londres", () => {
    // 26/10 às 22h de Brasília = 27/10 01h UTC.
    const noite = "2026-10-27T01:00:00.000Z";
    expect(diaSP(noite)).toBe("2026-10-26");
    expect(valida("energia", noite, "2026-10-26")).toBe(true);
    expect(valida("energia", noite, "2026-10-27")).toBe(false);
  });
  it("vontade de treinar vale 3 dias e dificuldade 7", () => {
    expect(valida("motivacao", em("2026-10-24"), "2026-10-26")).toBe(true);
    expect(valida("motivacao", em("2026-10-23"), "2026-10-26")).toBe(false);
    expect(valida("dificuldade", em("2026-10-20"), "2026-10-26")).toBe(true);
    expect(valida("dificuldade", em("2026-10-19"), "2026-10-26")).toBe(false);
  });
  it("resposta do futuro não vale", () => {
    expect(valida("energia", em("2026-10-27"), "2026-10-26")).toBe(false);
  });
});

describe("equivalências: reaproveitar o que o app já sabe", () => {
  const t = em("2026-10-26");
  it("pergunta antiga antes do treino", () => {
    expect(doPreTreino("muito_bem", t).respostas.map((x) => `${x.dimensao}:${x.valor}`)).toEqual(["energia:alta", "recuperacao:bem"]);
    expect(doPreTreino("cansado", t).respostas[0]).toMatchObject({ dimensao: "recuperacao", valor: "um_pouco_cansado" });
    expect(doPreTreino("desconforto", t).respostas[0]).toMatchObject({ dimensao: "recuperacao", valor: "desconforto" });
    expect(doPreTreino("prefiro_nao", t)).toEqual({ respostas: [], pulou: true });
    expect(doPreTreino(null, t)).toEqual({ respostas: [], pulou: false });
  });
  it("corpo antes do extra: qualquer dor vira desconforto", () => {
    for (const v of ["dor_leve", "dor_moderada", "dor"]) expect(doExtra(v, t).respostas[0].valor).toBe("desconforto");
    expect(doExtra("prefiro_nao", t).pulou).toBe(true);
  });
  it("fim do treino: só “dor” entra (as outras opções são esforço)", () => {
    expect(doFimTreino("dor", t).respostas).toHaveLength(1);
    expect(doFimTreino("pesado", t).respostas).toHaveLength(0);
  });
  it("check-in diário antigo de 1 a 10", () => {
    const l = doDiarioAntigo({ energia: 3, motivacao: 9, sono: 6, dor: 1, created_at: t }).respostas;
    expect(l.map((x) => `${x.dimensao}:${x.valor}`)).toEqual(["energia:baixa", "motivacao:muita", "sono:razoavel"]);
    expect(doDiarioAntigo({ dor: 6, created_at: t }).respostas[0]).toMatchObject({ dimensao: "recuperacao", valor: "desconforto" });
    expect(doDiarioAntigo({ dor: 5, created_at: t }).respostas).toEqual([]);
    expect(doDiarioAntigo({ energia: 10, created_at: t }).respostas[0].valor).toBe("muito_alta");
  });
  it("dificuldades do onboarding do visitante, sem repetir", () => {
    const l = doOnboarding(["tempo", "nao_sei_montar", "nao_sei_executar", "sem_resultado"], t).respostas;
    expect(l.map((x) => x.valor)).toEqual(["falta_tempo", "exercicios"]);
    expect(l.every((x) => x.origem === "onboarding")).toBe(true);
    expect(doOnboarding(["tempo"], null).respostas).toEqual([]);
  });
  it("caminho de volta para o checkin_pre (o treino continua cuidando de quem está com dor)", () => {
    expect(checkinPreDoPulso({ recuperacao: "desconforto", energia: "muito_alta" })).toBe("desconforto");
    expect(checkinPreDoPulso({ recuperacao: "muito_cansado" })).toBe("cansado");
    expect(checkinPreDoPulso({ energia: "baixa", recuperacao: "bem" })).toBe("cansado");
    expect(checkinPreDoPulso({ energia: "alta", recuperacao: "bem" })).toBe("muito_bem");
    expect(checkinPreDoPulso({ energia: "alta" })).toBe("muito_bem");
    expect(checkinPreDoPulso({ energia: "normal" })).toBe("normal");
    expect(checkinPreDoPulso({ dificuldade: ["falta_tempo"] })).toBeNull();
    expect(checkinPreDoPulso({}, true)).toBe("prefiro_nao");
  });
});

describe("escolha adaptativa das perguntas", () => {
  const base: ContextoEscolha = { hoje: "2026-10-26", respostas: [], pulouHoje: false, diasSemTreino: 2, consentimentoSaude: true, constanciaBoa: false, momento: "pre_treino" };

  it("padrão antes do treino: corpo + energia (no máximo 2)", () => {
    expect(escolherPerguntas(base).perguntas).toEqual(["recuperacao", "energia"]);
  });
  it("não pergunta de novo o que já foi respondido hoje em outra tela", () => {
    const respostas = doExtra("bem", em("2026-10-26", "11:00")).respostas;
    expect(validasHoje(respostas, "2026-10-26").has("recuperacao")).toBe(true);
    expect(escolherPerguntas({ ...base, respostas }).perguntas).toEqual(["energia"]);
  });
  it("resposta de ontem não vale hoje", () => {
    const respostas = [resp("recuperacao", "bem", "2026-10-25"), resp("energia", "alta", "2026-10-25")];
    expect(escolherPerguntas({ ...base, respostas }).perguntas).toEqual(["recuperacao", "energia"]);
  });
  it("pulou hoje → não pergunta mais nada hoje", () => {
    expect(escolherPerguntas({ ...base, pulouHoje: true }).perguntas).toEqual([]);
  });
  it("sem consentimento de saúde: não pergunta corpo nem sono", () => {
    const e = escolherPerguntas({ ...base, consentimentoSaude: false, respostas: [resp("recuperacao", "muito_cansado", "2026-10-24"), resp("recuperacao", "muito_cansado", "2026-10-23")] });
    expect(e.perguntas).not.toContain("recuperacao");
    expect(e.perguntas).not.toContain("sono");
    expect(e.perguntas[0]).toBe("energia");
  });
  it("voltando depois de 7+ dias: primeiro o que está dificultando", () => {
    expect(escolherPerguntas({ ...base, diasSemTreino: 9 }).perguntas).toEqual(["dificuldade", "recuperacao"]);
  });
  it("dificuldade respondida há 3 dias não se repete", () => {
    const e = escolherPerguntas({ ...base, diasSemTreino: 9, respostas: [resp("dificuldade", "falta_tempo", "2026-10-23")] });
    expect(e.perguntas).not.toContain("dificuldade");
  });
  it("cansaço frequente → pergunta o sono", () => {
    const respostas = [resp("recuperacao", "muito_cansado", "2026-10-25"), resp("energia", "baixa", "2026-10-24"), resp("energia", "normal", "2026-10-22")];
    expect(cansacoFrequente(respostas)).toBe(true);
    expect(escolherPerguntas({ ...base, respostas }).perguntas).toEqual(["recuperacao", "sono"]);
  });
  it("constância boa e respostas boas: 1 pergunta só", () => {
    const respostas = [resp("energia", "alta", "2026-10-24"), resp("recuperacao", "bem", "2026-10-24"), resp("energia", "normal", "2026-10-22")];
    expect(escolherPerguntas({ ...base, constanciaBoa: true, respostas }).perguntas).toEqual(["recuperacao"]);
  });
  it("no Início, só aparece para quem está voltando", () => {
    expect(escolherPerguntas({ ...base, momento: "inicio" }).perguntas).toEqual([]);
    expect(escolherPerguntas({ ...base, momento: "inicio", diasSemTreino: 12 }).perguntas).toEqual(["dificuldade", "motivacao"]);
    expect(escolherPerguntas({ ...base, momento: "inicio", diasSemTreino: null }).perguntas).toEqual([]);
  });
  it("tudo já respondido hoje → nada a perguntar", () => {
    const respostas = [resp("recuperacao", "bem", "2026-10-26"), resp("energia", "alta", "2026-10-26")];
    expect(escolherPerguntas({ ...base, respostas }).perguntas).toEqual([]);
  });
});

describe("categorias para o personal", () => {
  const hoje = "2026-10-26";
  it("sem respostas: Tudo bem + informação neutra (não responder não é desmotivação)", () => {
    const r = classificarPulso("Maria Silva", [], hoje);
    expect(r.categoria).toBe("tudo_bem");
    expect(r.semRespostas).toBe(true);
    expect(r.sugestao).toBeNull();
  });
  it("desconforto → Precisa de atenção, revisão humana e rascunho SEM saúde", () => {
    const r = classificarPulso("Maria Silva", [resp("recuperacao", "desconforto", "2026-10-25")], hoje);
    expect(r.categoria).toBe("atencao");
    expect(r.revisaoHumana).toBe(true);
    expect(r.motivos[0].texto).toContain("25/10");
    expect(r.sugestao?.acao).toBe("revisao_humana");
    expect(r.sugestao?.rascunho).not.toMatch(/dor|desconfort|les[aã]o|sintoma|cansa/i);
  });
  it("desconforto antigo (mais de 7 dias) não alerta", () => {
    expect(classificarPulso("Maria", [resp("recuperacao", "desconforto", "2026-10-15")], hoje).categoria).toBe("tudo_bem");
  });
  it("pouca vontade em 2 check-ins → Acompanhar com a sugestão de conversar", () => {
    const r = classificarPulso("Maria", [resp("motivacao", "pouca", "2026-10-25"), resp("motivacao", "nenhuma", "2026-10-21")], hoje);
    expect(r.categoria).toBe("acompanhar");
    expect(r.sugestao?.titulo).toBe("Maria relatou pouca vontade de treinar em check-ins recentes. Deseja conversar?");
  });
  it("uma resposta negativa isolada não alerta", () => {
    expect(classificarPulso("Maria", [resp("energia", "baixa", "2026-10-25")], hoje).categoria).toBe("tudo_bem");
  });
  it("duas respostas no mesmo dia contam como uma", () => {
    const r = classificarPulso("Maria", [resp("energia", "baixa", "2026-10-25"), { ...resp("energia", "muito_baixa", "2026-10-25"), em: em("2026-10-25", "18:00") }], hoje);
    expect(r.categoria).toBe("tudo_bem");
  });
  it("falta de tempo → sugere revisar a programação", () => {
    const r = classificarPulso("João Souza", [resp("dificuldade", "falta_tempo", "2026-10-24")], hoje);
    expect(r.categoria).toBe("acompanhar");
    expect(r.sugestao?.acao).toBe("revisar_treino");
    expect(r.sugestao?.titulo).toContain("João informou que está com dificuldade para encaixar os treinos na rotina");
  });
  it("dificuldade resolvida (respondeu “nada” depois) não alerta mais", () => {
    expect(classificarPulso("João", [resp("dificuldade", "falta_tempo", "2026-10-20"), resp("dificuldade", "nada", "2026-10-25")], hoje).categoria).toBe("tudo_bem");
  });
  it("onboarding do visitante é só contexto, não alerta", () => {
    expect(classificarPulso("Bia", doOnboarding(["tempo"], em("2026-10-24")).respostas, hoje).categoria).toBe("tudo_bem");
  });
  it("sinal que se repete há 2 semanas → Precisa de atenção", () => {
    const r = classificarPulso("Maria", [resp("energia", "baixa", "2026-10-25"), resp("energia", "baixa", "2026-10-23"), resp("energia", "baixa", "2026-10-16")], hoje);
    expect(r.categoria).toBe("atencao");
    expect(r.motivos.some((m) => m.texto.includes("2 semanas"))).toBe(true);
  });
  it("sinal + queda de frequência → Precisa de atenção, sem afirmar causa", () => {
    const r = classificarPulso("Maria", [resp("energia", "baixa", "2026-10-25"), resp("energia", "baixa", "2026-10-23")], hoje, { quedaFrequencia: true });
    expect(r.categoria).toBe("atencao");
    expect(r.motivos.at(-1)?.texto).toContain("não quer dizer que um causou o outro");
  });
  it("melhora de disposição com frequência mantida → sugere reconhecer", () => {
    const respostas = [resp("energia", "alta", "2026-10-25"), resp("motivacao", "muita", "2026-10-20"), resp("energia", "baixa", "2026-10-08"), resp("energia", "normal", "2026-10-05")];
    const r = classificarPulso("Ana Lima", respostas, hoje, { frequenciaMantida: true });
    expect(r.categoria).toBe("tudo_bem");
    expect(r.sugestao?.acao).toBe("reconhecer");
    expect(r.sugestao?.titulo).toContain("Ana apresentou melhora na disposição");
    expect(classificarPulso("Ana", respostas, hoje, { frequenciaMantida: false }).sugestao).toBeNull();
  });
  it("nenhum rascunho cita saúde nem usa pronome de gênero", () => {
    const casos: RespostaPulso[][] = [
      [resp("recuperacao", "desconforto", "2026-10-25")],
      [resp("recuperacao", "muito_cansado", "2026-10-25"), resp("recuperacao", "muito_cansado", "2026-10-24")],
      [resp("sono", "mal", "2026-10-25"), resp("sono", "muito_mal", "2026-10-24")],
      [resp("motivacao", "pouca", "2026-10-25"), resp("motivacao", "pouca", "2026-10-24")],
      [resp("dificuldade", "exercicios", "2026-10-25")],
    ];
    for (const c of casos) {
      const s = classificarPulso("Maria", c, hoje).sugestao;
      expect(s).not.toBeNull();
      expect(s!.rascunho).not.toMatch(/dor|desconfort|sono|dormi|les[aã]o|sintoma/i);
      expect(s!.titulo).not.toMatch(/\b(com ela|com ele)\b/);
    }
  });
});

describe("histórico", () => {
  it("médias semanais e dificuldades mais citadas", () => {
    const respostas = [resp("energia", "alta", "2026-10-26"), resp("energia", "baixa", "2026-10-27"), resp("dificuldade", "falta_tempo", "2026-10-20"), resp("dificuldade", "falta_tempo", "2026-10-13"), resp("dificuldade", "nada", "2026-10-26")];
    const t = tendenciaSemanal(respostas, "2026-10-28", 3);
    expect(t.map((s) => s.inicio)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(t[2].energia).toBe(0);
    expect(t[0].energia).toBeNull();
    expect(dificuldadesFrequentes(respostas, "2026-10-28")).toEqual([{ valor: "falta_tempo", vezes: 2, rotulo: "Falta de tempo" }]);
  });
});

describe("fila de ações do personal", () => {
  const hoje = "2026-10-26";
  it("chave muda com resposta nova (o mesmo alerta não volta depois de resolvido)", () => {
    const a = classificarPulso("Maria", [resp("recuperacao", "desconforto", "2026-10-24")], hoje);
    const b = classificarPulso("Maria", [resp("recuperacao", "desconforto", "2026-10-24"), resp("recuperacao", "desconforto", "2026-10-26")], hoje);
    expect(chaveAlertaPulso(a)).toBe("pulso:atencao:2026-10-24");
    expect(chaveAlertaPulso(b)).toBe("pulso:atencao:2026-10-26");
  });
  it("tudo bem sem reconhecimento não entra na fila", () => {
    expect(chaveAlertaPulso(classificarPulso("Maria", [resp("energia", "alta", "2026-10-25")], hoje))).toBeNull();
    expect(chaveAlertaPulso(classificarPulso("Maria", [], hoje))).toBeNull();
  });
  it("situação: sem estado = aberto; adiado volta na data; acompanhado/dispensado = resolvido", () => {
    expect(situacaoAlerta(undefined, hoje)).toBe("aberto");
    expect(situacaoAlerta({ estado: "adiado", adiado_ate: "2026-10-28" }, hoje)).toBe("adiado");
    expect(situacaoAlerta({ estado: "adiado", adiado_ate: "2026-10-26" }, hoje)).toBe("aberto");
    expect(situacaoAlerta({ estado: "dispensado", adiado_ate: null }, hoje)).toBe("resolvido");
    expect(situacaoAlerta({ estado: "acompanhado", adiado_ate: null }, hoje)).toBe("resolvido");
  });
  it("ordem: atenção → acompanhar → reconhecer", () => {
    const item = (nome: string, rs: RespostaPulso[], ctx = {}) => { const resultado = classificarPulso(nome, rs, hoje, ctx); return { nome, resultado, chave: chaveAlertaPulso(resultado) }; };
    const fila = ordenarFila([
      item("Ana", [resp("energia", "alta", "2026-10-25"), resp("motivacao", "muita", "2026-10-20"), resp("energia", "baixa", "2026-10-08"), resp("energia", "normal", "2026-10-05")], { frequenciaMantida: true }),
      item("João", [resp("dificuldade", "falta_tempo", "2026-10-24")]),
      item("Maria", [resp("recuperacao", "desconforto", "2026-10-25")]),
    ]);
    expect(fila.map((x) => x.nome)).toEqual(["Maria", "João", "Ana"]);
  });
});
