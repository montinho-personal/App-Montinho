// Mensagem de acesso para o aluno (WhatsApp/copiar). PURO, testado.
// O aluno pede o link de entrada no PRÓPRIO celular (funciona no mesmo
// navegador), então a mensagem leva só o endereço e o e-mail cadastrado —
// nada de senha ou link secreto.

export function mensagemAcesso(e: { nome: string; email: string; urlApp: string }): string {
  const primeiro = e.nome.trim().split(/\s+/)[0] || "";
  const login = `${e.urlApp.replace(/\/+$/, "")}/login`;
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Seu acesso ao app do Montinho Personal Trainer está pronto 💪`,
    "",
    `1. Abra: ${login}`,
    `2. Digite o seu e-mail: ${e.email}`,
    "3. Toque em “receber link no e-mail” (ou entre com a sua senha, se já criou uma)",
    "4. Abra o link que chegar no seu e-mail, no MESMO celular (confira o spam)",
    "",
    "Dica: no celular, adicione o app à Tela de Início para usar como aplicativo.",
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
