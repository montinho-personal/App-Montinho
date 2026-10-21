// Recados recebidos no celular — texto completo (a prévia do sistema pode cortar).
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { listarHistorico, marcarAberta } from "@/lib/data/notificacoes";

export const metadata = { title: "Recados do Chalalá" };

const ROTULO: Record<string, string> = { bom_dia: "Bom Dia com Chalalá", pos_treino: "Depois do treino", teste: "Teste" };
const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const sessao = await requireAlunoPage();
  const { n } = await searchParams;
  // Abriu pela notificação: registra a abertura (se o aparelho não conseguiu).
  if (n && /^[0-9a-f-]{36}$/i.test(n)) await marcarAberta(n).catch(() => undefined);
  const itens = await listarHistorico(sessao.userId).catch(() => []);
  return (
    <div className="space-y-4">
      <Link href="/aluno/perfil" className="alvo text-sm text-fg-muted hover:text-fg">
        ← Perfil
      </Link>
      <h1 className="text-xl font-bold">Recados do Chalalá</h1>
      {itens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-fg-muted">Nenhum recado por aqui ainda. Ative o Chalalá no celular no seu Perfil.</p>
      ) : (
        <ul className="space-y-3">
          {itens.map((i) => (
            <li key={i.id} id={i.id} className={`rounded-xl border p-4 ${i.id === n ? "border-accent bg-accent/5" : "border-border bg-card"}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                {ROTULO[i.categoria] ?? "Montinho"} · {quando(i.enviada_em)}
              </p>
              <p className="mt-1 font-bold">{i.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{i.corpo}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
