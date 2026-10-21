// Mensagem de acesso para o aluno (WhatsApp/copiar). PURO, testado.
// Leva só o endereço e o e-mail cadastrado — nada de senha ou link secreto.
// Por aparelho:
//  • Android: o app instalado e o Chrome compartilham o login → link no e-mail.
//  • iPhone: o app da Tela de Início NÃO compartilha o login com o Safari e o
//    link do e-mail abre no Safari → cria a senha pelo Safari e entra no ícone
//    com e-mail e senha.

export function mensagemAcesso(e: { nome: string; email: string; urlApp: string }): string {
  const primeiro = e.nome.trim().split(/\s+/)[0] || "";
  const login = `${e.urlApp.replace(/\/+$/, "")}/login`;
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Seu acesso ao app do Montinho Personal Trainer está pronto 💪`,
    `Seu e-mail de acesso: ${e.email}`,
    "",
    "🤖 *Android (Chrome)*",
    `1. Abra ${login} no Chrome`,
    "2. Toque nos 3 pontinhos (⋮), no canto de cima, e em “Instalar app” ou “Adicionar à tela inicial”",
    "3. Abra o Montinho pelo ícone novo, digite o seu e-mail e toque em “receber link no e-mail”",
    "4. Abra o link que chegar no seu e-mail (confira o spam) — pronto, você entra",
    "",
    "🍎 *iPhone (Safari)*",
    `1. Abra ${login} no Safari (precisa ser o Safari)`,
    "2. Digite o seu e-mail, toque em “esqueci a senha”, abra o link que chegar no e-mail e crie a sua senha",
    "3. No Safari, toque em Compartilhar (quadrado com a setinha para cima) → “Adicionar à Tela de Início” → “Adicionar”",
    "4. Abra o Montinho pelo ícone novo e entre com o seu e-mail e a senha que você criou",
    "",
    "Depois, use sempre pelo ícone. No Perfil dá para ativar as notificações do Montinho.",
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
