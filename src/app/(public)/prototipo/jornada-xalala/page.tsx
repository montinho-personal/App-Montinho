// Rota de pré-visualização do protótipo “A Jornada do Xalalá”.
// Só existe com NEXT_PUBLIC_JORNADA_XALALA_PROTOTIPO=true (desligado por
// padrão; ligado apenas no projeto de demonstração). Dados fictícios, sem
// banco e sem sessão de aluno. Não substitui /aluno/jornada.
import { notFound } from "next/navigation";
import { JornadaXalalaClient } from "@/components/jornada-xalala/JornadaXalalaClient";
import { FEATURES } from "@/lib/env";
import { dadosXalala } from "@/lib/jornada-xalala/demo";

export const metadata = { title: "A Jornada do Xalalá — protótipo", robots: { index: false, follow: false } };

export default function PrototipoJornadaXalalaPage() {
  if (!FEATURES.jornadaXalalaPrototipo) notFound();
  const dados = { completo: dadosXalala("completo"), retorno: dadosXalala("retorno") };
  return <JornadaXalalaClient dados={dados} />;
}
