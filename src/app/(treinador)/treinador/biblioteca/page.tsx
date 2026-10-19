import { Badge } from "@/components/ui/Badge";
import { listBiblioteca } from "@/lib/db";
import { BibliotecaClient } from "./BibliotecaClient";

export default async function BibliotecaPage() {
  const itens = await listBiblioteca();
  return (
    <div className="space-y-6">
      <header>
        <Badge tone="accent">Biblioteca</Badge>
        <h1 className="text-3xl font-bold mt-3">Exercícios</h1>
        <p className="text-fg-muted text-sm mt-1">
          Catálogo reutilizável. Adicione exercícios com vídeo do YouTube ou Cloudflare Stream e use em vários treinos.
        </p>
      </header>
      <BibliotecaClient inicial={itens} />
    </div>
  );
}
