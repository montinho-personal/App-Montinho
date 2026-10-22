import { BRAND } from "@/config/brand";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

export const metadata = { title: "Política de privacidade" };

const RESPONSAVEL = { nome: "Renato Nascimento", email: "blink.renato@gmail.com" };
const ATUALIZADA_EM = "22/10/2026";

export default function PrivacidadePage() {
  const mail = `mailto:${RESPONSAVEL.email}?subject=${encodeURIComponent(`Privacidade — app ${BRAND.name}`)}`;
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Política de privacidade</CardTitle>
        <p className="text-sm text-fg-muted mt-1">App {BRAND.fullName} · atualizada em {ATUALIZADA_EM}</p>
      </CardHeader>
      <CardBody>
        <div className="space-y-5 text-sm leading-relaxed text-fg-muted [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-fg [&_h2]:mb-1">
          <section>
            <h2>Quem cuida dos seus dados</h2>
            <p>
              O responsável pelo tratamento dos dados pessoais deste app é {RESPONSAVEL.nome}. Para qualquer pedido sobre os seus dados, escreva para{" "}
              <a href={mail} className="alvo text-accent underline-offset-2 hover:underline">{RESPONSAVEL.email}</a>.
            </p>
          </section>
          <section>
            <h2>O que guardamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome, e-mail e senha de acesso (a senha fica criptografada; ninguém consegue lê-la).</li>
              <li>As respostas do questionário inicial: objetivo, experiência, frequência, local e tempo de treino.</li>
              <li>Os treinos que você registra: exercícios, cargas, repetições, datas e comentários.</li>
              <li>Medalhas, marcos da Jornada e preferências do app (por exemplo, notificações).</li>
            </ul>
            <p className="mt-2">Não pedimos documentos, endereço nem dados de pagamento no cadastro por convite.</p>
          </section>
          <section>
            <h2>Para que usamos</h2>
            <p>Para você entrar no app, registrar e acompanhar seus treinos, mostrar sua evolução e suas medalhas, e para o {BRAND.name} acompanhar o seu progresso e falar com você quando você pedir.</p>
          </section>
          <section>
            <h2>Com quem compartilhamos</h2>
            <p>
              Não vendemos nem cedemos seus dados. Eles ficam guardados em serviços de infraestrutura contratados para o app funcionar (banco de dados e hospedagem). Se você entrou por convite, seu nome, e-mail e o andamento no app (convite, desafio, objetivo, treinos feitos) podem ir para a ferramenta de gestão de contatos (CRM) do {BRAND.name}, só para ele poder falar com você. Estatísticas de uso, como as do Google Analytics, só são ativadas se você aceitar, e nunca recebem seu nome, e-mail, telefone ou dados de saúde.
            </p>
          </section>
          <section>
            <h2>Seus direitos</h2>
            <p>
              Você pode pedir a qualquer momento uma cópia dos seus dados, a correção de algo errado ou a exclusão da sua conta e de tudo o que foi registrado. Basta escrever para{" "}
              <a href={mail} className="alvo text-accent underline-offset-2 hover:underline">{RESPONSAVEL.email}</a>. Respondemos em até 15 dias.
            </p>
          </section>
          <section>
            <h2>Por quanto tempo guardamos</h2>
            <p>Enquanto a sua conta existir. Quando o seu acesso termina, o histórico continua disponível para você consultar; se pedir a exclusão, apagamos tudo, exceto o que a lei obrigar a manter.</p>
          </section>
        </div>
      </CardBody>
    </Card>
  );
}
