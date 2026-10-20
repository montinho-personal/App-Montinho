// ============================================================================
// Meu Chalalá de hoje — layout dos cards (PURO).
// Gera uma lista de operações de desenho a partir dos dados reais + escolhas
// do aluno. O mesmo layout alimenta a prévia e a exportação (a arte exportada
// é exatamente a prévia). Medição de texto é injetada → testável sem canvas.
// ============================================================================

import type { ItemRecorde } from "@/lib/conquistas/regras";

export type Formato = "stories" | "feed" | "quadrado";
export const FORMATOS: Record<Formato, { w: number; h: number; rotulo: string }> = {
  stories: { w: 1080, h: 1920, rotulo: "Stories 9:16" },
  feed: { w: 1080, h: 1350, rotulo: "Feed 4:5" },
  quadrado: { w: 1080, h: 1080, rotulo: "Quadrado 1:1" },
};

export type Fundo = "solido" | "gradiente" | "transparente" | "foto";
export type Variacao = "dourado" | "preto" | "claro";
export type ModeloId = "A" | "B" | "C" | "D" | "mensal" | "reconhecimento";

export const ROTULO_MODELO: Record<ModeloId, string> = {
  A: "Treino pago",
  B: "Missão cumprida",
  C: "Nova conquista",
  D: "Eu voltei",
  mensal: "30 dias",
  reconhecimento: "Reconhecimento",
};

/** Frases aprovadas (o aluno escolhe, não digita). */
export const FRASES: Record<ModeloId, string[]> = {
  A: ["Seu shape merece um chalalá.", "Mais um passo na sua evolução.", "Constância em construção.", "Feito é melhor que perfeito."],
  B: ["Constância em construção.", "Seu shape merece um chalalá.", "Uma semana de cada vez."],
  C: ["Seu esforço está aparecendo nos números.", "Seu shape merece um chalalá.", "Evolução registrada."],
  D: ["Recomeçar também é evoluir.", "Seu shape merece um chalalá.", "Um treino de cada vez."],
  mensal: ["Constância em construção.", "Seu shape merece um chalalá.", "Um mês de evolução."],
  reconhecimento: ["Seu shape merece um chalalá."],
};

export const ASSINATURA = { linha: "Montinho Personal Trainer · @montinho_personal", slogan: "Seu shape merece um chalalá." };

export type MetricaChave = "duracao" | "exercicios" | "series" | "treino" | "treinos" | "aderencia" | "tempoTotal" | "metas" | "evolucao" | "conquista";
export const ROTULO_METRICA: Record<MetricaChave, string> = {
  duracao: "Tempo de treino",
  exercicios: "Exercícios",
  series: "Séries",
  treino: "Nome do treino",
  treinos: "Treinos concluídos",
  aderencia: "Aderência",
  tempoTotal: "Tempo total",
  metas: "Metas semanais cumpridas",
  evolucao: "Evolução de desempenho",
  conquista: "Conquista",
};

export type DadosCard = {
  nomeTreino?: string | null;
  /** AAAA-MM-DD */
  data?: string | null;
  duracaoMin?: number | null;
  exercicios?: number | null;
  series?: number | null;
  meta?: number | null;
  feitosSemana?: number | null;
  metaCumprida?: boolean;
  recordes?: ItemRecorde[];
  /** Título de conquista para o modelo C quando não há recorde (ex.: “10 treinos concluídos”). */
  conquistaTitulo?: string | null;
  /** Medalha da vitrine: selo desenhado no card e frase curta (sem dados privados). */
  medalhaSelo?: string | null;
  conquistaFrase?: string | null;
  retomada?: boolean;
  mensal?: { rotuloPeriodo: string; treinos?: number | null; aderenciaPct?: number | null; tempoTotalMin?: number | null; metasCumpridas?: number | null; evolucao?: string | null; conquista?: string | null };
  reconhecimento?: { mensagem: string; autor: string; conquista?: string | null };
};

export type AjusteFoto = { x: number; y: number; zoom: number; escurecer: number };

export type ConfigCard = {
  modelo: ModeloId;
  formato: Formato;
  fundo: Fundo;
  variacao: Variacao;
  frase: string;
  nome: string;
  mostrarNome: boolean;
  mostrarData: boolean;
  metricas: Partial<Record<MetricaChave, boolean>>;
  foto: AjusteFoto;
};

export const AJUSTE_FOTO_PADRAO: AjusteFoto = { x: 0, y: 0, zoom: 1, escurecer: 0.45 };

/** Modelos que os dados SUSTENTAM (nada de “meta concluída” antes da hora). */
export function modelosDisponiveis(d: DadosCard): ModeloId[] {
  if (d.reconhecimento) return ["reconhecimento"];
  if (d.mensal) return ["mensal"];
  const out: ModeloId[] = ["A"];
  if (d.metaCumprida && d.meta && (d.feitosSemana ?? 0) >= d.meta) out.push("B");
  if (d.recordes?.length || d.conquistaTitulo) out.push("C");
  if (d.retomada) out.push("D");
  return out;
}

/** Métricas que existem nos dados (as ausentes nem aparecem como opção). */
export function metricasDisponiveis(modelo: ModeloId, d: DadosCard): MetricaChave[] {
  if (modelo === "mensal") {
    const m = d.mensal;
    if (!m) return [];
    const out: MetricaChave[] = [];
    if (m.treinos != null) out.push("treinos");
    if (m.aderenciaPct != null) out.push("aderencia");
    if (m.tempoTotalMin) out.push("tempoTotal");
    if (m.metasCumpridas != null) out.push("metas");
    if (m.evolucao) out.push("evolucao");
    if (m.conquista) out.push("conquista");
    return out;
  }
  if (modelo !== "A") return d.nomeTreino ? ["treino"] : [];
  const out: MetricaChave[] = [];
  if (d.duracaoMin) out.push("duracao");
  if (d.exercicios) out.push("exercicios");
  if (d.series) out.push("series");
  if (d.nomeTreino) out.push("treino");
  return out;
}

export function configPadrao(modelo: ModeloId, d: DadosCard, nome: string): ConfigCard {
  const metricas: ConfigCard["metricas"] = {};
  for (const k of metricasDisponiveis(modelo, d)) metricas[k] = true;
  return { modelo, formato: "stories", fundo: "gradiente", variacao: "dourado", frase: FRASES[modelo][0], nome, mostrarNome: false, mostrarData: true, metricas, foto: { ...AJUSTE_FOTO_PADRAO } };
}

// ---------------------------------------------------------------------------
// Operações de desenho
// ---------------------------------------------------------------------------
export type Peso = 400 | 600 | 700 | 800;
export type OpTexto = { t: "texto"; linhas: string[]; x: number; y: number; tamanho: number; peso: Peso; cor: string; alinhar: "center"; alturaLinha: number; sombra: boolean; maxLargura: number };
export type Op =
  | { t: "fundo"; tipo: Fundo; cor: string; gradiente: [string, string] | null; escurecer: number }
  | { t: "logo"; x: number; y: number; w: number; h: number; variante: "claro" | "escuro" }
  | { t: "linha"; x: number; y: number; w: number; cor: string }
  | { t: "barra"; x: number; y: number; w: number; h: number; progresso: number; cor: string; trilho: string }
  | { t: "medalha"; x: number; y: number; r: number; selo: string; cor: string; fundo: string; texto: string }
  | OpTexto;

export type Medir = (texto: string, tamanho: number, peso: Peso) => number;

type Paleta = { fundo: string; gradiente: [string, string]; texto: string; suave: string; destaque: string; trilho: string; logo: "claro" | "escuro" };
export const PALETAS: Record<Variacao, Paleta> = {
  dourado: { fundo: "#0a0a0a", gradiente: ["#2a2415", "#0a0a0a"], texto: "#fafafa", suave: "#c9c9c9", destaque: "#ba9e50", trilho: "#2b2b2b", logo: "claro" },
  preto: { fundo: "#000000", gradiente: ["#1c1c1c", "#000000"], texto: "#ffffff", suave: "#bdbdbd", destaque: "#cbb06a", trilho: "#333333", logo: "claro" },
  claro: { fundo: "#f6f2e7", gradiente: ["#fbf8f0", "#e9dfc4"], texto: "#111111", suave: "#4a4a4a", destaque: "#7a6528", trilho: "#ddd3b8", logo: "escuro" },
};
/** Sobre foto ou fundo transparente o texto é claro com sombra (legível sobre qualquer imagem). */
const PALETA_SOBREPOSTA: Paleta = { ...PALETAS.dourado, suave: "#f0f0f0", destaque: "#e0c677" };

const LOGO_RATIO = 469 / 321;

/** Quebra em linhas e reduz a fonte até caber; no mínimo, trunca com “…”. */
export function ajustarTexto(texto: string, max: number, min: number, largura: number, maxLinhas: number, peso: Peso, medir: Medir): { linhas: string[]; tamanho: number } {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  for (let tam = max; tam >= min; tam = Math.floor(tam * 0.92)) {
    const linhas: string[] = [];
    let atual = "";
    let quebrouPalavra = false;
    for (const p of palavras) {
      if (medir(p, tam, peso) > largura) quebrouPalavra = true;
      const tentativa = atual ? `${atual} ${p}` : p;
      if (medir(tentativa, tam, peso) <= largura) atual = tentativa;
      else {
        if (atual) linhas.push(atual);
        atual = p;
      }
    }
    if (atual) linhas.push(atual);
    if (!quebrouPalavra && linhas.length <= maxLinhas) return { linhas, tamanho: tam };
    if (tam === min) break;
    if (Math.floor(tam * 0.92) < min) tam = Math.ceil(min / 0.92);
  }
  // Último recurso: tamanho mínimo, corta e põe reticências.
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (medir(tentativa, min, peso) <= largura) atual = tentativa;
    else {
      if (atual) linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  const corte = linhas.slice(0, maxLinhas);
  let ultima = corte[corte.length - 1] ?? "";
  const precisaReticencias = linhas.length > maxLinhas || medir(ultima, min, peso) > largura;
  if (precisaReticencias) {
    while (ultima.length > 1 && medir(`${ultima}…`, min, peso) > largura) ultima = ultima.slice(0, -1);
    corte[corte.length - 1] = `${ultima.trimEnd()}…`;
  }
  return { linhas: corte, tamanho: min };
}

const fmtNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
export function formatarMin(min: number): string {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

export function destaqueRecorde(r: ItemRecorde): { grande: string; detalhe: string } {
  if (r.tipo === "reps") {
    const dif = r.agora - r.antes;
    return { grande: `+${dif} ${dif === 1 ? "repetição" : "repetições"}`, detalhe: `${r.exercicio} · ${fmtNum(r.carga ?? 0)} kg` };
  }
  return { grande: `+${fmtNum(r.agora - r.antes)} kg`, detalhe: `${r.exercicio} · ${fmtNum(r.agora)} kg` };
}

type Bloco =
  | { k: "texto"; texto: string; max: number; min: number; peso: Peso; cor: string; maxLinhas: number; depois: number; espaco?: number }
  | { k: "metricas"; itens: Array<{ valor: string; rotulo: string }>; cor: string; corRotulo: string; depois: number }
  | { k: "barra"; progresso: number; cor: string; trilho: string; depois: number }
  | { k: "linha"; cor: string; depois: number }
  | { k: "medalha"; selo: string; cor: string; fundo: string; texto: string; depois: number };

function blocosDoModelo(cfg: ConfigCard, d: DadosCard, p: Paleta): Bloco[] {
  const b: Bloco[] = [];
  const kicker = (texto: string) => b.push({ k: "texto", texto, max: 40, min: 26, peso: 700, cor: p.destaque, maxLinhas: 2, depois: 22 });
  const titulo = (texto: string, max = 150, linhas = 2) => b.push({ k: "texto", texto, max, min: 56, peso: 800, cor: p.texto, maxLinhas: linhas, depois: 26 });
  const sub = (texto: string, max = 44, linhas = 3, cor = p.suave) => b.push({ k: "texto", texto, max, min: 26, peso: 600, cor, maxLinhas: linhas, depois: 18 });
  const on = (k: MetricaChave) => !!cfg.metricas[k];

  switch (cfg.modelo) {
    case "A": {
      kicker("CHALALÁ!");
      titulo("TREINO PAGO!");
      const itens: Array<{ valor: string; rotulo: string }> = [];
      if (on("duracao") && d.duracaoMin) itens.push({ valor: formatarMin(d.duracaoMin), rotulo: "de treino" });
      if (on("exercicios") && d.exercicios) itens.push({ valor: String(d.exercicios), rotulo: d.exercicios === 1 ? "exercício" : "exercícios" });
      if (on("series") && d.series) itens.push({ valor: String(d.series), rotulo: d.series === 1 ? "série" : "séries" });
      if (itens.length) {
        b.push({ k: "linha", cor: p.destaque, depois: 34 });
        b.push({ k: "metricas", itens, cor: p.texto, corRotulo: p.suave, depois: 30 });
      }
      if (on("treino") && d.nomeTreino) sub(d.nomeTreino, 40, 2, p.texto);
      break;
    }
    case "B": {
      kicker("MISSÃO CUMPRIDA");
      const meta = d.meta ?? 0;
      const feitos = Math.min(meta, Math.floor(d.feitosSemana ?? 0));
      titulo(`${feitos}/${meta}`, 220, 1);
      b.push({ k: "texto", texto: meta === 1 ? "TREINO" : "TREINOS", max: 64, min: 36, peso: 800, cor: p.texto, maxLinhas: 1, depois: 30 });
      b.push({ k: "barra", progresso: meta ? feitos / meta : 0, cor: p.destaque, trilho: p.trilho, depois: 30 });
      sub("META SEMANAL CONCLUÍDA", 40, 2, p.destaque);
      if (on("treino") && d.nomeTreino) sub(d.nomeTreino, 36, 2);
      break;
    }
    case "C": {
      kicker("NOVA CONQUISTA");
      const r = d.recordes?.[0];
      if (r) {
        const x = destaqueRecorde(r);
        titulo(x.grande, 130, 2);
        sub(x.detalhe, 40, 2, p.texto);
        sub("Novo recorde pessoal", 36, 1, p.destaque);
      } else {
        if (d.medalhaSelo) b.push({ k: "medalha", selo: d.medalhaSelo, cor: p.destaque, fundo: p.trilho, texto: p.texto, depois: 30 });
        titulo((d.conquistaTitulo ?? "Mais consistência").toUpperCase(), 120, 3);
        if (d.conquistaFrase) sub(d.conquistaFrase, 40, 3, p.suave);
      }
      break;
    }
    case "D":
      titulo("EU VOLTEI.", 170, 2);
      break;
    case "mensal": {
      const m = d.mensal!;
      kicker("MINHA EVOLUÇÃO");
      titulo(m.rotuloPeriodo.toUpperCase(), 120, 2);
      const itens: Array<{ valor: string; rotulo: string }> = [];
      if (on("treinos") && m.treinos != null) itens.push({ valor: String(m.treinos), rotulo: m.treinos === 1 ? "treino" : "treinos" });
      if (on("aderencia") && m.aderenciaPct != null) itens.push({ valor: `${m.aderenciaPct}%`, rotulo: "aderência" });
      if (on("tempoTotal") && m.tempoTotalMin) itens.push({ valor: formatarMin(m.tempoTotalMin), rotulo: "treinando" });
      if (on("metas") && m.metasCumpridas != null) itens.push({ valor: String(m.metasCumpridas), rotulo: m.metasCumpridas === 1 ? "meta semanal" : "metas semanais" });
      if (itens.length) {
        b.push({ k: "linha", cor: p.destaque, depois: 34 });
        b.push({ k: "metricas", itens, cor: p.texto, corRotulo: p.suave, depois: 30 });
      }
      if (on("evolucao") && m.evolucao) sub(m.evolucao, 36, 3, p.texto);
      if (on("conquista") && m.conquista) sub(`Conquista: ${m.conquista}`, 36, 2, p.destaque);
      break;
    }
    case "reconhecimento": {
      const r = d.reconhecimento!;
      kicker("RECONHECIMENTO DO PERSONAL");
      if (r.conquista) sub(r.conquista, 44, 2, p.texto);
      b.push({ k: "texto", texto: `“${r.mensagem}”`, max: 54, min: 30, peso: 600, cor: p.texto, maxLinhas: 9, depois: 24 });
      sub(`— ${r.autor}`, 36, 1, p.destaque);
      sub("Mensagem escrita pelo seu personal", 26, 1);
      break;
    }
  }
  if (cfg.modelo !== "reconhecimento" && cfg.frase) sub(cfg.frase, 46, 2, cfg.modelo === "D" ? p.texto : p.suave);
  const rodape: string[] = [];
  if (cfg.mostrarNome && cfg.nome.trim()) rodape.push(cfg.nome.trim());
  if (cfg.mostrarData && d.data) rodape.push(dataCurta(d.data));
  if (rodape.length) sub(rodape.join(" · "), 32, 2);
  return b;
}

export type ResultadoLayout = { w: number; h: number; ops: Op[]; escala: number; textoAlternativo: string };

export function layoutCard(cfg: ConfigCard, d: DadosCard, medir: Medir): ResultadoLayout {
  const { w, h } = FORMATOS[cfg.formato];
  const sobreposta = cfg.fundo === "foto" || cfg.fundo === "transparente";
  const p = sobreposta ? PALETA_SOBREPOSTA : PALETAS[cfg.variacao];
  const m = Math.round(w * 0.085);
  const larg = w - 2 * m;
  // Stories: zonas seguras (topo/rodapé do Instagram) de ~11% da altura.
  const topo = cfg.formato === "stories" ? Math.round(h * 0.1) : m;
  const base = cfg.formato === "stories" ? h - Math.round(h * 0.1) : h - m;
  const ops: Op[] = [{ t: "fundo", tipo: cfg.fundo, cor: p.fundo, gradiente: cfg.fundo === "gradiente" ? p.gradiente : null, escurecer: cfg.fundo === "foto" ? Math.max(0, Math.min(0.85, cfg.foto.escurecer)) : 0 }];

  const escalaFormato = cfg.formato === "stories" ? 1 : cfg.formato === "feed" ? 0.86 : 0.74;
  const logoW = Math.round(w * (cfg.formato === "quadrado" ? 0.17 : 0.21));
  const logoH = Math.round(logoW / LOGO_RATIO);
  ops.push({ t: "logo", x: Math.round((w - logoW) / 2), y: topo, w: logoW, h: logoH, variante: sobreposta ? "claro" : p.logo });

  // Assinatura (discreta, nunca compete com a conquista).
  const tamAss = Math.round(26 * Math.max(0.85, escalaFormato));
  const ass1 = ajustarTexto(ASSINATURA.linha, tamAss, 18, larg, 1, 600, medir);
  const mostrarSlogan = cfg.frase !== ASSINATURA.slogan;
  const ass2 = mostrarSlogan ? ajustarTexto(ASSINATURA.slogan, tamAss, 18, larg, 1, 400, medir) : null;
  const altAss = ass1.tamanho * 1.3 + (ass2 ? ass2.tamanho * 1.3 : 0);
  const yAss = base - altAss;

  const regiaoTopo = topo + logoH + Math.round(h * 0.03);
  const regiaoBase = yAss - Math.round(h * 0.03);
  const blocos = blocosDoModelo(cfg, d, p);

  let escala = escalaFormato;
  let montado: { ops: Op[]; altura: number } = { ops: [], altura: 0 };
  for (let i = 0; i < 12; i++) {
    montado = montarBlocos(blocos, escala, w, m, larg, medir, sobreposta);
    if (montado.altura <= regiaoBase - regiaoTopo || escala <= 0.45) break;
    escala *= 0.9;
  }
  const y0 = Math.round(regiaoTopo + Math.max(0, (regiaoBase - regiaoTopo - montado.altura) / 2));
  for (const op of montado.ops) ops.push(deslocar(op, y0));

  let y = yAss;
  ops.push({ t: "texto", linhas: ass1.linhas, x: w / 2, y, tamanho: ass1.tamanho, peso: 600, cor: p.suave, alinhar: "center", alturaLinha: Math.round(ass1.tamanho * 1.3), sombra: sobreposta, maxLargura: larg });
  y += Math.round(ass1.tamanho * 1.3);
  if (ass2) ops.push({ t: "texto", linhas: ass2.linhas, x: w / 2, y, tamanho: ass2.tamanho, peso: 400, cor: p.destaque, alinhar: "center", alturaLinha: Math.round(ass2.tamanho * 1.3), sombra: sobreposta, maxLargura: larg });

  const textoAlternativo = ops
    .filter((o): o is OpTexto => o.t === "texto")
    .map((o) => o.linhas.join(" "))
    .join(". ");
  return { w, h, ops, escala, textoAlternativo: `Card ${ROTULO_MODELO[cfg.modelo]}: ${textoAlternativo}` };
}

function deslocar(op: Op, dy: number): Op {
  return "y" in op ? { ...op, y: op.y + dy } : op;
}

function montarBlocos(blocos: Bloco[], k: number, w: number, m: number, larg: number, medir: Medir, sombra: boolean): { ops: Op[]; altura: number } {
  const ops: Op[] = [];
  let y = 0;
  for (const b of blocos) {
    if (b.k === "texto") {
      const a = ajustarTexto(b.texto, Math.round(b.max * k), Math.max(16, Math.round(b.min * k)), larg, b.maxLinhas, b.peso, medir);
      const al = Math.round(a.tamanho * (b.peso >= 800 ? 1.02 : 1.25));
      ops.push({ t: "texto", linhas: a.linhas, x: w / 2, y, tamanho: a.tamanho, peso: b.peso, cor: b.cor, alinhar: "center", alturaLinha: al, sombra, maxLargura: larg });
      y += al * a.linhas.length + Math.round(b.depois * k);
    } else if (b.k === "linha") {
      const lw = Math.round(120 * k);
      ops.push({ t: "linha", x: Math.round((w - lw) / 2), y, w: lw, cor: b.cor });
      y += Math.round(b.depois * k);
    } else if (b.k === "medalha") {
      const r = Math.round(110 * k);
      ops.push({ t: "medalha", x: w / 2, y, r, selo: b.selo, cor: b.cor, fundo: b.fundo, texto: b.texto });
      y += r * 2 + Math.round(b.depois * k);
    } else if (b.k === "barra") {
      const bh = Math.max(10, Math.round(22 * k));
      ops.push({ t: "barra", x: m, y, w: larg, h: bh, progresso: Math.max(0, Math.min(1, b.progresso)), cor: b.cor, trilho: b.trilho });
      y += bh + Math.round(b.depois * k);
    } else {
      const porLinha = b.itens.length === 4 ? 2 : Math.min(3, b.itens.length);
      const col = larg / porLinha;
      for (let i = 0; i < b.itens.length; i += porLinha) {
        const linha = b.itens.slice(i, i + porLinha);
        let alturaLinha = 0;
        linha.forEach((it, j) => {
          const cx = m + col * j + col / 2 + (linha.length < porLinha ? ((porLinha - linha.length) * col) / 2 : 0);
          const v = ajustarTexto(it.valor, Math.round(84 * k), Math.max(20, Math.round(36 * k)), col - 16, 1, 800, medir);
          const r = ajustarTexto(it.rotulo, Math.round(28 * k), 16, col - 16, 2, 600, medir);
          ops.push({ t: "texto", linhas: v.linhas, x: cx, y, tamanho: v.tamanho, peso: 800, cor: b.cor, alinhar: "center", alturaLinha: Math.round(v.tamanho * 1.05), sombra, maxLargura: col - 16 });
          const yr = y + Math.round(v.tamanho * 1.12);
          ops.push({ t: "texto", linhas: r.linhas, x: cx, y: yr, tamanho: r.tamanho, peso: 600, cor: b.corRotulo, alinhar: "center", alturaLinha: Math.round(r.tamanho * 1.2), sombra, maxLargura: col - 16 });
          alturaLinha = Math.max(alturaLinha, Math.round(v.tamanho * 1.12) + Math.round(r.tamanho * 1.2) * r.linhas.length);
        });
        y += alturaLinha + Math.round(20 * k);
      }
      y += Math.round(b.depois * k);
    }
  }
  return { ops, altura: y };
}

/** Recorte “cover” da foto com zoom e deslocamento (−1…1 em cada eixo). */
export function enquadrarFoto(img: { w: number; h: number }, alvo: { w: number; h: number }, a: AjusteFoto): { sx: number; sy: number; sw: number; sh: number } {
  const zoom = Math.max(1, Math.min(4, a.zoom));
  const escala = Math.max(alvo.w / img.w, alvo.h / img.h) * zoom;
  const sw = alvo.w / escala;
  const sh = alvo.h / escala;
  const folgaX = img.w - sw;
  const folgaY = img.h - sh;
  const cx = Math.max(-1, Math.min(1, a.x));
  const cy = Math.max(-1, Math.min(1, a.y));
  return { sx: (folgaX / 2) * (1 + cx), sy: (folgaY / 2) * (1 + cy), sw, sh };
}

/** Nome de arquivo seguro (sem acentos/espaços). */
export function nomeArquivo(cfg: ConfigCard, d: DadosCard): string {
  const base = `chalala-${ROTULO_MODELO[cfg.modelo]}-${cfg.formato}${d.data ? `-${d.data}` : ""}`;
  return `${base.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}.png`;
}
