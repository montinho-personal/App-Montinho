// Rota de pré-visualização do protótipo “A Jornada do Chalalá”.
// Só existe com NEXT_PUBLIC_JORNADA_CHALALA_PROTOTIPO=true (desligado por
// padrão; ligado apenas no projeto de demonstração). Dados fictícios, sem
// banco e sem sessão de aluno. Não substitui /aluno/jornada.
import { notFound } from "next/navigation";
import { JornadaChalalaClient } from "@/components/jornada-chalala/JornadaChalalaClient";
import { FEATURES } from "@/lib/env";
import { dadosChalala } from "@/lib/jornada-chalala/demo";

export const metadata = { title: "A Jornada do Chalalá — protótipo", robots: { index: false, follow: false } };

export default function PrototipoJornadaChalalaPage() {
  if (!FEATURES.jornadaChalalaPrototipo) notFound();
  const dados = { completo: dadosChalala("completo"), retorno: dadosChalala("retorno") };
  return <JornadaChalalaClient dados={dados} />;
}
