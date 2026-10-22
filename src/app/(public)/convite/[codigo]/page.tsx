export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FEATURES } from "@/lib/env";
import { getSessao } from "@/lib/auth/session";
import { convitePublico } from "@/lib/data/visitantes";
import { codigoValido, descreverPrazo, MENSAGEM_CONVITE, normalizarCodigo } from "@/lib/visitante/acesso";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { BRAND } from "@/config/brand";
import { CadastroVisitanteClient } from "./CadastroVisitanteClient";

export const metadata = { title: "Convite", robots: { index: false, follow: false } };

export default async function ConvitePage({ params }: { params: Promise<{ codigo: string }> }) {
  if (!FEATURES.modoVisitante) notFound();
  const { codigo: bruto } = await params;
  const codigo = normalizarCodigo(decodeURIComponent(bruto));
  const s = await getSessao();
  if (s) redirect(s.role === "treinador" ? "/treinador/visitantes" : "/aluno");

  const convite = codigoValido(codigo) ? await convitePublico(codigo) : null;
  const motivo = !convite ? "inexistente" : convite.situacao === "ok" ? null : convite.situacao;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Convite {codigo}</p>
        <CardTitle>{convite?.campanha ?? `Treine com o app do ${BRAND.name}`}</CardTitle>
        {convite && !motivo ? (
          <p className="text-sm text-fg-muted mt-1">
            {descreverPrazo(convite)} · registre seus treinos, acompanhe sua evolução e ganhe medalhas na Jornada do Chalalá.
          </p>
        ) : null}
      </CardHeader>
      <CardBody>
        {motivo ? (
          <div className="space-y-4 text-center py-4" role="alert">
            <p className="font-semibold">{MENSAGEM_CONVITE[motivo]}</p>
            {BRAND.contact.whatsapp ? (
              <a className="alvo inline-block text-accent underline-offset-2 hover:underline" href={`https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(`Oi, Montinho! Tentei entrar com o convite ${codigo} e não consegui.`)}`} target="_blank" rel="noopener noreferrer">
                Falar com o Montinho no WhatsApp
              </a>
            ) : null}
            <p className="text-sm text-fg-muted">
              Já tem conta? <Link href="/login" className="alvo text-accent underline-offset-2 hover:underline">Entrar</Link>
            </p>
          </div>
        ) : (
          <CadastroVisitanteClient codigo={codigo} />
        )}
      </CardBody>
    </Card>
  );
}
