// Página pública do link dos cards (“Seu shape merece um chalalá.”).
// Sem nenhum dado de aluno: registra só a visita e a origem (ex.: card_A).
import { BRAND } from "@/config/brand";
import { registrarEvento } from "@/lib/data/conquistas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu shape merece um chalalá", description: BRAND.description };

export default async function ChalalaPublicaPage({ searchParams }: { searchParams: Promise<{ origem?: string }> }) {
  const { origem } = await searchParams;
  const origemSegura = origem && /^[a-z0-9_]{1,40}$/i.test(origem) ? origem.toLowerCase() : "direto";
  await registrarEvento(null, { tipo: "visita_link", origem: origemSegura }).catch(() => undefined);
  return (
    <div className="w-full max-w-md space-y-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Chalalá!</p>
      <h1 className="text-3xl font-extrabold leading-tight">Seu shape merece um chalalá.</h1>
      <p className="text-fg-muted">
        Treino prescrito, registrado e acompanhado de perto pelo {BRAND.name}. Constância se constrói com um treino de cada vez — e com alguém conduzindo o processo.
      </p>
      <div className="flex flex-col gap-2">
        {BRAND.contact.instagram ? (
          <a href={`https://instagram.com/${BRAND.contact.instagram}`} target="_blank" rel="noreferrer" className="touch inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 font-bold text-bg">
            Seguir @{BRAND.contact.instagram}
          </a>
        ) : null}
        {BRAND.contact.site ? (
          <a href={BRAND.contact.site} target="_blank" rel="noreferrer" className="touch inline-flex items-center justify-center rounded-lg border border-border px-5 py-3 font-semibold text-fg-muted hover:text-fg">
            Conhecer o {BRAND.fullName}
          </a>
        ) : null}
      </div>
    </div>
  );
}
