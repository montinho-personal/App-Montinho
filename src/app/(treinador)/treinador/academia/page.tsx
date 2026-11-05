// Academia da Tribo — painel do personal: preparar (rascunho com 0 t), simular a
// duração com o ritmo real, ativar (só aqui, com confirmação), acompanhar,
// conferir séries fora do limite, corrigir com motivo e preparar a próxima.
import { requireTreinadorPage } from "@/lib/auth/session";
import { dataLocal, inicioDaSemana } from "@/lib/aderencia/calcular";
import { ritmoRecente } from "@/lib/academia/regras";
import { ajustesDaObra, dadosDaObra, listarObras, paraConferir, participantesDaObra, ritmoSemanal } from "@/lib/data/academia";
import { TelaObra } from "@/components/academia/TelaObra";
import { AcademiaAdmin } from "./AcademiaAdmin";

export const metadata = { title: "Academia da Tribo" };
export const dynamic = "force-dynamic";

export default async function AcademiaTreinadorPage() {
  await requireTreinadorPage();
  const [obras, ritmo] = await Promise.all([listarObras(), ritmoSemanal(8)]);
  const ativa = obras.find((o) => o.estado === "ativa") ?? null;
  const rascunho = obras.find((o) => o.estado === "rascunho") ?? null;
  const dados = ativa ? await dadosDaObra(ativa.id) : null;
  const [participantes, conferir, ajustes] = ativa ? await Promise.all([participantesDaObra(ativa.id), paraConferir(ativa.id), ajustesDaObra(ativa.id)]) : [[], [], []];
  // Ritmo de agora = a última semana fechada (a tribo está crescendo; semanas antigas puxariam para baixo).
  const ritmoAtual = ritmoRecente(ritmo.map((r) => ({ semana: r.semana, kg: r.kg })), inicioDaSemana(dataLocal(new Date())), 1);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black">🏗️ Academia da Tribo</h1>
        <p className="text-sm text-fg-muted">A tribo constrói academias com as toneladas reais da musculação. Começa do zero e só conta treino feito depois que você ativar.</p>
      </header>
      <AcademiaAdmin obras={obras} ativa={dados} rascunho={rascunho} ritmo={ritmo} ritmoAtualKg={ritmoAtual} conferir={conferir} ajustes={ajustes} />
      {dados ? <TelaObra d={dados} participantes={participantes} personal /> : null}
    </div>
  );
}
