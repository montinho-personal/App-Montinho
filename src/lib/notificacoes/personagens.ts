// ============================================================================
// Recados dos personagens no 🔔 (aprovado pelo Montinho em 30/10/2026). Regra
// PURA: no máximo 1 recado por dia, só quando há algo de verdade para dizer,
// sempre com um botão e duas respostas rápidas (o personagem responde de
// volta). Nunca com dor ou desconforto recente; a Fênix nunca dá bronca.
//  • Montinho (portões): chegou num capítulo novo da Jornada nos últimos 7 dias.
//  • Fênix (recomeço): 5+ dias sem treinar, depois de já ter treinado.
//  • Colombo (explorador): troféu perto (o mais perto da lista “ao alcance”).
//  • Mestre Oogway (constância): semana passada cumprida — 1 vez por semana.
// Só aparece no sino do app (sem aviso no celular). Nada é gravado no banco.
// ============================================================================
import type { PersonagemChalala } from "@/lib/jornada-chalala/universo";

export type RespostaRapida = { rotulo: string; resposta: string };

export type RecadoPersonagem = {
  /** Muda quando o motivo muda (por dia, semana ou portão): o “lido” é por id. */
  id: string;
  personagem: PersonagemChalala["id"];
  titulo: string;
  fala: string;
  botao: { rotulo: string; href: string };
  respostas: [RespostaRapida, RespostaRapida];
};

/** Portões da Jornada por treinos (os de tempo já celebram no próprio capítulo). */
export const PORTOES_TREINOS: Array<{ treinos: number; lugar: string; frase: string }> = [
  { treinos: 10, lugar: "a Ponte", frase: "Dez treinos! Você atravessou a Ponte. Daqui pra frente a estrada fica mais bonita." },
  { treinos: 25, lugar: "o Mirante", frase: "Bem-vindo ao Mirante! Daqui a vista é outra: olha quanto chão você já fez." },
  { treinos: 50, lugar: "as Montanhas", frase: "Cinquenta treinos. Você chegou às Montanhas, lugar de quem não desiste. Chalalá!" },
];

export const LIMITES_PERSONAGENS = { diasFenix: 5, diasPortao: 7 } as const;

const FRASES_OOGWAY = [
  "A água mole fura a pedra não pela força, mas pela constância.",
  "Ontem é história, amanhã é mistério. A semana que você cumpriu é um presente.",
  "Quem anda devagar, mas não para, chega mais longe do que quem corre e desiste.",
  "Não existe treino perfeito. Existe o treino que acontece toda semana.",
];

export type EntradaPersonagens = {
  /** Dia de Brasília (AAAA-MM-DD). */
  hoje: string;
  /** Segunda-feira da semana atual. */
  inicioSemana: string;
  /** Dias (de Brasília) dos treinos válidos, em ordem crescente (regra do carimbo). */
  diasTreinos: string[];
  /** Dor no fim do treino ou desconforto no check-in nos últimos 2 dias. */
  dorRecente: boolean;
  /** Semana passada (fechada) cumprida? E quantas seguidas até ela. */
  semanaPassadaCumprida: boolean;
  semanasSeguidas: number;
  /** O troféu mais perto (lembreteDoAlcance): nome, o que fazer e para onde ir. */
  alcance: { titulo: string; corpo: string; url: string } | null;
};

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** O recado do dia (ou null quando não há nada de verdade para dizer). */
export function recadoDoPersonagem(e: EntradaPersonagens): RecadoPersonagem | null {
  if (e.dorRecente) return null;

  // Montinho: portão alcançado há pouco (o N-ésimo treino caiu nos últimos 7 dias).
  for (const p of [...PORTOES_TREINOS].reverse()) {
    const dia = e.diasTreinos[p.treinos - 1];
    if (dia && diasEntre(dia, e.hoje) >= 0 && diasEntre(dia, e.hoje) < LIMITES_PERSONAGENS.diasPortao) {
      return {
        id: `personagem:montinho:portao-${p.treinos}`,
        personagem: "montinho",
        titulo: `Você chegou a ${p.lugar}!`,
        fala: p.frase,
        botao: { rotulo: "Ver o novo capítulo", href: "/aluno/jornada" },
        respostas: [
          { rotulo: "Chalalá! 🙌", resposta: "Isso é seu, ninguém tira. Bora para o próximo portão!" },
          { rotulo: "Nem acredito 😅", resposta: "Pode acreditar: foram " + p.treinos + " treinos de verdade. É impossível dar errado!" },
        ],
      };
    }
  }

  // Fênix: voltou a ficar parado (sem culpa, convite para um treino curto).
  const ultimo = e.diasTreinos.at(-1);
  if (ultimo && diasEntre(ultimo, e.hoje) >= LIMITES_PERSONAGENS.diasFenix) {
    const d = diasEntre(ultimo, e.hoje);
    return {
      id: `personagem:fenix:${e.hoje}`,
      personagem: "fenix",
      titulo: "A Fênix tem um recado pra você",
      fala: `Faz ${d} dias que a gente não se vê. Toda fênix descansa, o importante é voltar. Que tal um treino curto hoje?`,
      botao: { rotulo: "Voltar hoje 🔥", href: "/aluno/treinar" },
      respostas: [
        { rotulo: "Bora! 💪", resposta: "É assim que se renasce: um treino de cada vez. Te espero lá!" },
        { rotulo: "Hoje não dá", resposta: "Tudo bem, a vida acontece. Amanhã a chama continua acesa te esperando." },
      ],
    };
  }

  // Colombo: tem troféu logo ali.
  if (e.alcance) {
    return {
      id: `personagem:colombo:${e.hoje}`,
      personagem: "colombo",
      titulo: "O Colombo achou um troféu perto!",
      fala: `Olha só o que eu encontrei no mapa: o troféu “${e.alcance.titulo}” está pertinho! ${e.alcance.corpo}`,
      botao: { rotulo: "Me mostra o caminho 🧭", href: e.alcance.url || "/aluno/jornada" },
      respostas: [
        { rotulo: "Partiu! 🚀", resposta: "Esse é o espírito de explorador! Já marquei no mapa pra você." },
        { rotulo: "Depois eu vejo", resposta: "Sem pressa: o troféu não foge. Ele fica marcado no mapa." },
      ],
    };
  }

  // Oogway: semana passada cumprida (1 recado por semana).
  if (e.semanaPassadaCumprida) {
    const n = Math.max(1, e.semanasSeguidas);
    const frase = FRASES_OOGWAY[Math.abs(diasEntre("2026-01-05", e.inicioSemana) / 7) % FRASES_OOGWAY.length];
    return {
      id: `personagem:oogway:${e.inicioSemana}`,
      personagem: "oogway",
      titulo: n > 1 ? `${n} semanas seguidas cumprindo a meta` : "Semana passada cumprida",
      fala: `${frase} ${n > 1 ? `Já são ${n} semanas seguidas.` : "Mais uma semana na conta."}`,
      botao: { rotulo: "Ver minha semana", href: "/aluno/evolucao" },
      respostas: [
        { rotulo: "🙏 Sábio", resposta: "A sabedoria você já tem. Agora é só repetir esta semana." },
        { rotulo: "Vou manter! 💪", resposta: "Manter é o mais difícil, e você está fazendo. Sigo de olho daqui." },
      ],
    };
  }
  return null;
}
