import Link from "next/link";
import { ComoInstalar } from "@/components/instalar/ComoInstalar";

export const metadata = { title: "Como instalar o app" };

// Página aberta (sem login) para mandar no WhatsApp: passo a passo do iPhone e do Android.
export default function InstalarPublicoPage() {
  return (
    <div className="w-full max-w-md space-y-4">
      <header>
        <h1 className="text-2xl font-black">📲 Como colocar o app no celular</h1>
        <p className="mt-1 text-sm text-fg-muted">Escolha o seu celular e siga os 4 passos. Leva 1 minuto.</p>
      </header>
      <ComoInstalar />
      <Link href="/login" className="alvo flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg">
        Já instalei: entrar no app
      </Link>
    </div>
  );
}
