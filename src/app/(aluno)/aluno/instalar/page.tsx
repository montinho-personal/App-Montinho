import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { Voltar } from "@/components/ui/Voltar";
import { ComoInstalar } from "@/components/instalar/ComoInstalar";

export const metadata = { title: "Instalar o app" };

export default async function InstalarAlunoPage() {
  await requireAlunoPage();
  return (
    <div className="space-y-4">
      <Voltar href="/aluno/perfil" />
      <header>
        <h1 className="text-2xl font-black">📲 Instalar o app no celular</h1>
        <p className="mt-1 text-sm text-fg-muted">Escolha o seu celular e siga os 4 passos. Leva 1 minuto.</p>
      </header>
      <ComoInstalar />
      <Link href="/aluno/treinar" className="alvo flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg">
        💪 Ir treinar
      </Link>
    </div>
  );
}
