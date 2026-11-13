// ============================================================================
// Aluno da consultoria com o acesso vencido (pedido do Montinho, 13/11/2026):
// continua entrando no app (Início, Jornada, Conquistas, Ranking, Perfil), mas
// o TREINO e os RELATÓRIOS ficam travados até renovar; no Início aparece a
// mensagem de renovação com o botão do WhatsApp. O personal (“Meu treino”)
// nunca trava. O banco também trava os registros (pode_registrar, 0157).
// O dia do vencimento ainda vale; trava a partir do dia seguinte (Brasília).
// ============================================================================

/** Venceu? `acessoAte` = data (aaaa-mm-dd) da ficha; `hoje` = dia de Brasília. Sem data = nunca vence. */
export function acessoVencido(acessoAte: string | null | undefined, hoje: string): boolean {
  if (!acessoAte) return false;
  return acessoAte.slice(0, 10) < hoje;
}

/** Telas travadas para quem venceu: treino (todas as portas) e relatórios. */
export const ROTAS_TRAVADAS = [
  "/aluno/treinar",
  "/aluno/treino",
  "/aluno/livre",
  "/aluno/extra",
  "/aluno/wod",
  "/aluno/escolher-treino",
  "/aluno/treinos-do-montinho",
  "/aluno/treinos-prontos",
  "/aluno/meus-treinos",
  "/aluno/monte-com-ia",
  "/aluno/protocolo-livre",
  "/aluno/cardio",
  "/aluno/mobilidade",
  "/aluno/evolucao",
  "/aluno/recordes",
  "/aluno/medidas",
  "/aluno/vitorias",
  "/aluno/estrategia",
  "/relatorio",
  "/avaliacao",
] as const;

export function rotaTravada(caminho: string): boolean {
  return ROTAS_TRAVADAS.some((r) => caminho === r || caminho.startsWith(`${r}/`));
}

export type ResumoRenovacao = { treinos: number; trofeus: number; semanas: number };

export type MensagemRenovacao = { etiqueta: string; titulo: string; texto: string; beneficios: string[]; botao: string; href: string; rodape: string };

const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

/** Texto de venda (padrão ouro: primeiro nome, os números verdadeiros da pessoa, benefícios, 1 botão; sem culpa). */
export function mensagemRenovacao(p: { nome: string | null | undefined; acessoAte: string; resumo: ResumoRenovacao | null; whatsapp: string }): MensagemRenovacao {
  const primeiro = (p.nome ?? "").trim().split(/\s+/)[0] || "";
  const r = p.resumo;
  const feitos: string[] = [];
  if (r?.treinos) feitos.push(plural(r.treinos, "treino", "treinos"));
  if (r?.trofeus) feitos.push(plural(r.trofeus, "troféu", "troféus"));
  if (r?.semanas && r.semanas >= 2) feitos.push(`${r.semanas} semanas com a meta batida`);
  const conquistas = feitos.length ? ` Até aqui foram ${feitos.length > 1 ? `${feitos.slice(0, -1).join(", ")} e ${feitos.at(-1)}` : feitos[0]} — e tudo continua guardado, esperando você voltar.` : " Seu histórico, suas conquistas e a sua Jornada continuam guardados, esperando você voltar.";
  const msgWhats = `Oi, Montinho! Quero renovar meu acompanhamento e continuar evoluindo 💪 (APP-RENOVAR)`;
  return {
    etiqueta: `Seu acompanhamento terminou em ${dataBR(p.acessoAte)}`,
    titulo: `${primeiro ? `${primeiro}, sua` : "Sua"} evolução não pode parar agora 🔥`,
    texto: `Você construiu uma base forte.${conquistas} Os resultados de verdade aparecem para quem continua.`,
    beneficios: ["Treino feito para você e ajustado a cada fase", "Treinos, cardio e relatórios liberados na hora", "Sua sequência, troféus e ranking seguem de onde pararam", "O Montinho de perto, pelo WhatsApp"],
    botao: "Quero renovar com o Montinho",
    href: `https://wa.me/${p.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msgWhats)}`,
    rodape: "É impossível dar errado!",
  };
}
