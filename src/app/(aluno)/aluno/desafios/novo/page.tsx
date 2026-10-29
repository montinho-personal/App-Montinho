// Criar um desafio entre amigos (0094). ?com=<nome do ranking> já deixa a pessoa marcada;
// ?revanche=<id> repete a regra e as pessoas de um desafio que terminou.
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { detalheDesafio, pessoasParaDesafio } from "@/lib/data/desafios";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { diaBrasilia } from "@/lib/desafios/regras";
import { NovoDesafioClient, type InicialDesafio } from "./NovoDesafioClient";

export const metadata = { title: "Criar desafio" };
export const dynamic = "force-dynamic";

const sem = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export default async function NovoDesafioPage({ searchParams }: { searchParams: Promise<{ com?: string; revanche?: string }> }) {
  const sessao = await requireAlunoPage();
  const { com, revanche } = await searchParams;
  const [pessoas, biblioteca] = await Promise.all([pessoasParaDesafio(sessao.alunoId).catch(() => []), listarBiblioteca().catch(() => [])]);
  const agora = new Date();
  const hoje = diaBrasilia(agora);
  const maximo = diaBrasilia(new Date(agora.getTime() + 14 * 86_400_000));

  const inicial: InicialDesafio = {};
  let desafiando: string | null = null;
  if (com) {
    // Mesmo primeiro nome e mesma inicial (quem tem um nome só pode vir sem inicial).
    const partes = (n: string) => {
      const [primeiro, ...resto] = sem(n).split(" ");
      return { primeiro, inicial: resto.at(-1)?.[0] ?? "" };
    };
    const alvo = partes(com.slice(0, 60));
    const achados = pessoas.filter((p) => {
      const x = partes(p.nome);
      return x.primeiro === alvo.primeiro && (x.inicial === alvo.inicial || !x.inicial || !alvo.inicial);
    });
    if (achados.length === 1) {
      inicial.convidar = [achados[0].alunoId];
      desafiando = achados[0].nome;
    } else inicial.busca = com.split(" ")[0];
  }
  if (revanche) {
    const d = await detalheDesafio(revanche, sessao.alunoId).catch(() => null);
    if (d) {
      const dias = Math.round((Date.parse(`${d.fim}T00:00:00Z`) - Date.parse(`${d.inicio}T00:00:00Z`)) / 86_400_000) + 1;
      inicial.revanche = { id: d.id, nome: d.nome, tipo: d.tipo, meta: d.meta, dias: [1, 3, 7, 14, 28, 30].includes(dias) ? dias : 7, foco: d.foco, exercicios: d.exercicios, atividades: d.atividades };
      inicial.convidar = d.placar.filter((l) => !l.eu).map((l) => l.alunoId);
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/aluno/desafios" className="alvo inline-block text-sm text-fg-muted hover:text-fg">← Desafios</Link>
      <header>
        <h1 className="text-2xl font-black">{inicial.revanche ? "🔁 Revanche!" : desafiando ? `⚔️ Desafiar ${desafiando}` : "⚔️ Criar desafio"}</h1>
        <p className="mt-1 text-sm text-fg-muted">{desafiando ? "Escolha um desafio pronto ou monte o seu. O convite aparece para a pessoa no app." : "Escolha um pronto ou monte o seu. O app confere tudo sozinho: conta treino concluído com séries anotadas."}</p>
      </header>
      <ChamadaTrofeu acao="desafio" />
      <NovoDesafioClient hoje={hoje} maximo={maximo} primeiroNome={(sessao.nome ?? "").split(" ")[0] || "time"} pessoas={pessoas} biblioteca={biblioteca.map((b) => ({ id: b.id, nome: b.nome }))} inicial={inicial} />
    </div>
  );
}
