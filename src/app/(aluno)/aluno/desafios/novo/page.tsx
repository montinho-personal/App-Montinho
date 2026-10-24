// Criar um desafio entre amigos (0094).
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { pessoasParaDesafio } from "@/lib/data/desafios";
import { diaBrasilia } from "@/lib/desafios/regras";
import { NovoDesafioClient } from "./NovoDesafioClient";

export const metadata = { title: "Criar desafio" };
export const dynamic = "force-dynamic";

export default async function NovoDesafioPage() {
  const sessao = await requireAlunoPage();
  const pessoas = await pessoasParaDesafio(sessao.alunoId).catch(() => []);
  const agora = new Date();
  const hoje = diaBrasilia(agora);
  const maximo = diaBrasilia(new Date(agora.getTime() + 14 * 86_400_000));
  return (
    <div className="space-y-5">
      <Link href="/aluno/desafios" className="alvo inline-block text-sm text-fg-muted hover:text-fg">← Desafios</Link>
      <header>
        <h1 className="text-2xl font-black">⚔️ Criar desafio</h1>
        <p className="mt-1 text-sm text-fg-muted">Conta só treino concluído, com séries anotadas, 1 por dia. Ninguém precisa provar nada: o app confere sozinho.</p>
      </header>
      <NovoDesafioClient hoje={hoje} maximo={maximo} primeiroNome={(sessao.nome ?? "").split(" ")[0] || "time"} pessoas={pessoas} />
    </div>
  );
}
