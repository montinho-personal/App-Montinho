// Mensagem de acesso para o aluno (WhatsApp/copiar). PURO, testado.
// Leva só o endereço e o e-mail cadastrado — nada de senha ou link secreto.
// Mesmo caminho para Android e iPhone: o aluno cria a PRÓPRIA senha no
// navegador (“Primeiro acesso? Criar minha senha”), instala o app e entra pelo
// ícone com e-mail e senha (no iPhone o app da Tela de Início não recebe o
// link do e-mail, por isso a senha).

export function mensagemAcesso(e: { nome: string; email: string; urlApp: string }): string {
  const primeiro = e.nome.trim().split(/\s+/)[0] || "";
  const login = `${e.urlApp.replace(/\/+$/, "")}/login`;
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Seu acesso ao app do Montinho Personal Trainer está pronto 💪`,
    `Seu e-mail de acesso: ${e.email}`,
    "",
    "🔑 *Primeiro acesso (só uma vez)*",
    `1. Abra ${login} (Android: pelo Chrome · iPhone: pelo Safari)`,
    "2. Digite o seu e-mail e toque em “Primeiro acesso? Criar minha senha”",
    "3. Abra o e-mail que chegar, no MESMO celular (confira o spam), e crie a sua senha",
    "",
    "📲 *Instale o app no celular*",
    "🤖 Android (Chrome): toque nos 3 pontinhos (⋮) → “Instalar app” ou “Adicionar à tela inicial”",
    "🍎 iPhone (Safari): toque em Compartilhar (quadrado com a setinha) → “Adicionar à Tela de Início” → “Adicionar”",
    "",
    "Depois é só abrir o ícone do Montinho e entrar com o seu e-mail e a sua senha. No Perfil dá para ativar as notificações.",
    "",
    "É impossível dar errado!",
  ].join("\n");
}

/**
 * Mensagem com o LINK de criar a senha, gerado pelo personal no painel (não
 * passa pelo e-mail, então não esbarra no limite de envios do Supabase).
 * O link é pessoal: vale 1 hora e uma vez só, por isso a mensagem avisa.
 */
export function mensagemLinkSenha(e: { nome: string; email: string; link: string; urlApp: string }): string {
  const primeiro = e.nome.trim().split(/\s+/)[0] || "";
  const login = `${e.urlApp.replace(/\/+$/, "")}/login`;
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Aqui está o seu link para criar a senha do app do Montinho Personal Trainer 💪`,
    "",
    `🔑 Toque no link e crie a sua senha: ${e.link}`,
    "",
    "⏱ O link vale por 1 hora e funciona uma vez só. Se passar do prazo, me avise que eu mando outro.",
    "",
    `Depois, para entrar, abra ${login} e use o seu e-mail (${e.email}) e a senha que você criou.`,
    "",
    "📲 *Instale o app no celular*",
    "🤖 Android (Chrome): toque nos 3 pontinhos (⋮) → “Instalar app” ou “Adicionar à tela inicial”",
    "🍎 iPhone (Safari): toque em Compartilhar (quadrado com a setinha) → “Adicionar à Tela de Início” → “Adicionar”",
    "",
    "É impossível dar errado!",
  ].join("\n");
}

/** wa.me com o número do aluno (Brasil: acrescenta 55 quando falta). Sem número: o WhatsApp pede o contato. */
export function linkWhatsApp(telefone: string | null | undefined, texto: string): string {
  let d = (telefone ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  const alvo = d.length >= 12 && d.length <= 13 ? d : "";
  return `https://wa.me/${alvo}?text=${encodeURIComponent(texto)}`;
}
