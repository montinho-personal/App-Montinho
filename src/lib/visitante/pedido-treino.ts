// “Monte com IA” — entende o pedido do visitante (“sou iniciante, 3 dias,
// 45 minutos, foco em glúteo”) sem precisar de IA. PURO e testado. Com a IA
// ligada, ela preenche o que este leitor não entendeu; o resultado passa
// sempre por normalizarParametros (limites do gerador).
// Segurança: pedido que fala de dor, lesão, cirurgia ou gestação NÃO vira
// treino — a pessoa é convidada a conversar com o Montinho.

import { normalizarNome } from "@/lib/grupos";
import type { Foco, Local, Nivel, ParametrosPlano } from "./gerar-treino";

export type PedidoLido = { parametros: Partial<ParametrosPlano>; bloqueio: "saude" | null; entendeu: Array<keyof ParametrosPlano> };

export const MENSAGEM_SAUDE =
  "Você comentou sobre dor, lesão ou uma condição de saúde. Nesses casos, o treino precisa ser pensado por um profissional que conheça você. Fale com o Montinho: ele monta com segurança para o seu caso.";

const NUM: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7 };
const num = (t: string) => (/^\d+$/.test(t) ? Number(t) : NUM[t] ?? NaN);

const SAUDE = /\b(dor|dores|doi|doendo|lesao|lesionad\w*|machuc\w*|hernia|cirurgia|operad[oa]|tendinite|bursite|condromalacia|gravida|gestante|gestacao|hipertens\w*|cardiac\w*|fisioterap\w*|artrose|escoliose)\b/;

const FOCOS: Array<[Foco, RegExp]> = [
  ["gluteo", /\b(glute\w*|bumbum|bunda|popozao|empinad\w*)\b/],
  ["pernas", /\b(perna|pernas|coxa|coxas|quadricep\w*|inferiores)\b/],
  ["bracos", /\b(braco|bracos|bicep\w*|tricep\w*)\b/],
  ["costas", /\b(costas|dorsal|dorsais)\b/],
  ["peito", /\b(peito|peitoral)\b/],
  ["ombros", /\b(ombro|ombros|deltoide\w*)\b/],
  ["abdomen", /\b(abdomen|abdominal|barriga|tanquinho|core)\b/],
  ["superiores", /\b(superiores|parte de cima|tronco)\b/],
];

export function lerPedido(texto: string, padrao: Partial<ParametrosPlano> = {}): PedidoLido {
  const t = normalizarNome(texto).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
  if (SAUDE.test(t)) return { parametros: {}, bloqueio: "saude", entendeu: [] };
  const p: Partial<ParametrosPlano> = {};
  const entendeu: Array<keyof ParametrosPlano> = [];

  // Nível
  let nivel: Nivel | undefined;
  if (/\b(iniciante|comecando|nunca treinei|primeira vez|sedentari\w*|voltando|faz tempo)\b/.test(t)) nivel = "iniciante";
  else if (/\b(avancad\w*|experiente|treino ha anos|anos de treino)\b/.test(t)) nivel = "avancado";
  else if (/\b(intermediari\w*|ja treino|treino ha)\b/.test(t)) nivel = "intermediario";
  if (nivel) (p.nivel = nivel), entendeu.push("nivel");

  // Dias por semana: “3 dias”, “três vezes”, “3x na semana”
  const d = t.match(/\b(\d|um|uma|dois|duas|tres|quatro|cinco|seis|sete)\s*(?:x|vezes|dias?)\b/);
  if (d && Number.isFinite(num(d[1]))) (p.dias = num(d[1])), entendeu.push("dias");

  // Tempo: “45 minutos”, “1 hora”, “uma hora e meia”, “meia hora”, “pouco tempo”
  let minutos: number | undefined;
  const m = t.match(/\b(\d{2,3})\s*(?:min|mins|minutos?)\b/);
  if (m) minutos = Number(m[1]);
  else if (/\bmeia hora\b/.test(t)) minutos = 30;
  else if (/\b(1|uma) hora e meia\b/.test(t)) minutos = 90;
  else if (/\b(1|uma) hora\b/.test(t)) minutos = 60;
  else if (/\b(pouco tempo|rapido|corrido|sem tempo)\b/.test(t)) minutos = 30;
  if (minutos) (p.minutos = minutos), entendeu.push("minutos");

  // Foco (o primeiro citado)
  const achados = FOCOS.map(([f, re]) => ({ f, i: t.search(re) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  if (achados.length) (p.foco = achados.length >= 3 ? "geral" : achados[0].f), entendeu.push("foco");
  else if (/\b(corpo todo|full body|geral|completo)\b/.test(t)) (p.foco = "geral"), entendeu.push("foco");

  // Local
  let local: Local | undefined;
  if (/\b(em casa|de casa|casa|sem academia|sem equipamento)\b/.test(t)) local = "casa";
  else if (/\b(academia|condominio)\b/.test(t)) local = "academia";
  if (local) (p.local = local), entendeu.push("local");

  return { parametros: { ...padrao, ...p }, bloqueio: null, entendeu };
}

/** Frase curta com o que foi entendido (para a pessoa conferir antes das opções). */
export function resumoDoPedido(p: ParametrosPlano): string {
  const nivel = { iniciante: "iniciante", intermediario: "intermediário", avancado: "avançado" }[p.nivel];
  const foco = p.foco === "geral" ? "corpo todo" : `foco em ${{ gluteo: "glúteo", pernas: "pernas", peito: "peito", costas: "costas", bracos: "braços", ombros: "ombros", abdomen: "abdômen", superiores: "parte de cima" }[p.foco]}`;
  return `${nivel[0].toUpperCase()}${nivel.slice(1)} · ${p.dias} dias por semana · até ${p.minutos} min · ${foco} · ${p.local === "casa" ? "em casa" : "na academia"}`;
}
