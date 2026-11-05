import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { AbasConquistas } from "@/components/tribo/AbasConquistas";
import { TelaObra } from "@/components/academia/TelaObra";
import { AcademiaIlustracao } from "@/components/academia/AcademiaIlustracao";
import { dadosDaObra, listarObras, participantesDaObra } from "@/lib/data/academia";

export const metadata = { title: "Academia da Tribo" };

export default async function AcademiaPage() {
  await requireAlunoPage();
  const [d, obras] = await Promise.all([dadosDaObra(), listarObras()]);
  const concluidas = obras.filter((o) => o.estado === "concluida").length;
  const participantes = d ? await participantesDaObra(d.id) : [];
  return (
    <div className="space-y-4">
      <AbasConquistas ativa="academia" />
      {d ? (
        <TelaObra d={d} participantes={participantes} />
      ) : (
        <section className="space-y-3">
          <h1 className="text-2xl font-black">🏗️ Academia da Tribo</h1>
          <div className="overflow-hidden rounded-2xl border border-border">
            <AcademiaIlustracao etapa={0} className="block h-auto w-full" />
          </div>
          <p className="text-sm text-fg-muted">A força da nossa tribo vai construir algo extraordinário. Em breve, as toneladas que você levanta na musculação vão erguer uma academia, tijolo por tijolo. Fique de olho!</p>
        </section>
      )}
      <Link href="/aluno/academia/legado" className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm font-bold hover:border-accent/60">
        <span>🏛️ O Legado da Tribo{concluidas ? ` · ${concluidas} ${concluidas === 1 ? "academia construída" : "academias construídas"}` : ""}</span>
        <span aria-hidden className="text-accent">›</span>
      </Link>
    </div>
  );
}
