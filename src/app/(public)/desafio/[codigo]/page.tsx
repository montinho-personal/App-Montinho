// Link do desafio (0094): prévia sem login. Aluno logado entra; quem não tem
// conta cria pelo convite DESAFIO (30 dias de app) e volta para cá.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSessao } from "@/lib/auth/session";
import { desafioPublico } from "@/lib/data/desafios";
import { resumoDesafio, TIPOS_DESAFIO } from "@/lib/desafios/regras";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { BRAND } from "@/config/brand";
import { FEATURES } from "@/lib/env";
import { EntrarDesafio } from "./EntrarDesafio";

export const metadata = { title: "Desafio", robots: { index: false, follow: false } };

export default async function DesafioPublicoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: bruto } = await params;
  const codigo = decodeURIComponent(bruto).toUpperCase();
  const d = /^[A-Z0-9]{6}$/.test(codigo) ? await desafioPublico(codigo).catch(() => null) : null;
  const sessao = await getSessao();
  const aluno = sessao?.role === "aluno";
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">⚔️ Desafio entre amigos</p>
        <CardTitle>{d ? d.nome : "Desafio não encontrado"}</CardTitle>
        {d ? (
          <p className="mt-1 text-sm text-fg-muted">
            {d.criador ? `${d.criador} te chamou para um desafio no app do ${BRAND.name}. ` : ""}
            {TIPOS_DESAFIO[d.tipo].descricao}
          </p>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-4">
        {!d ? (
          <p className="text-sm text-fg-muted">Confira se o link veio completo. Se o desafio foi encerrado, peça um novo para quem te convidou.</p>
        ) : d.encerrado ? (
          <p className="text-sm text-fg-muted">Este desafio já terminou. Peça um novo para quem te convidou!</p>
        ) : (
          <>
            <ul className="space-y-1 rounded-xl border border-border bg-bg/40 p-3 text-sm">
              <li>{TIPOS_DESAFIO[d.tipo].emoji} {resumoDesafio(d)}</li>
              <li>👥 {d.participantes} {d.participantes === 1 ? "pessoa já topou" : "pessoas já toparam"}</li>
              <li>✅ Conta treino concluído no app, 1 por dia. Ninguém precisa provar nada.</li>
            </ul>
            {aluno ? (
              <EntrarDesafio codigo={codigo} />
            ) : sessao ? (
              <p className="text-sm text-fg-muted">Entre com uma conta de aluno para participar.</p>
            ) : (
              <div className="space-y-2">
                {FEATURES.modoVisitante ? (
                  <Link href={`/convite/DESAFIO?d=${codigo}`} className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg">
                    Criar minha conta grátis e entrar
                  </Link>
                ) : null}
                <p className="text-center text-xs text-fg-subtle">{FEATURES.modoVisitante ? "Você ganha 30 dias de app grátis: treinos com vídeo, evolução e troféus." : ""}</p>
                <Link href={`/login?next=${encodeURIComponent(`/desafio/${codigo}`)}`} className="alvo flex min-h-11 w-full items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">
                  Já tenho conta: entrar
                </Link>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
