// Uma descoberta: quiz (opcional), feedback sem punição e três níveis de
// leitura. Toda descoberta publicada pode ser lida (biblioteca livre).
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { albumParaAluno, getConteudo } from "@/lib/data/desbloqueia";
import { proximaDescoberta } from "@/lib/desbloqueia/motor";
import { getAluno } from "@/lib/db";
import { FONTES, linkDaFonte } from "@/lib/desbloqueia/fontes";
import { DescobertaClient } from "./DescobertaClient";

export const metadata = { title: "Descoberta" };

const ORIGENS = ["conquista", "periodo", "personal", "contexto", "biblioteca"] as const;

export default async function DescobertaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ o?: string }> }) {
  const sessao = await requireAlunoPage();
  const { id } = await params;
  const { o } = await searchParams;
  const conteudo = await getConteudo(id);
  if (!conteudo || conteudo.status !== "publicado") notFound();
  const aluno = await getAluno(sessao.alunoId);
  const album = aluno ? await albumParaAluno(aluno) : null;
  const prog = album?.progresso.find((p) => p.conteudo_id === id) ?? null;
  const daBiblioteca = o === "biblioteca";
  const proxima = album ? proximaDescoberta(album.itens, id, daBiblioteca) : null;
  const fontes = conteudo.fontes.map((f) => FONTES[f]).filter(Boolean).map((f) => ({ id: f.id, citacao: f.citacao, link: linkDaFonte(f), nota: f.nota ?? null }));
  return (
    <div className="space-y-4">
      <Link href="/aluno/descobertas" className="alvo inline-block text-sm text-fg-muted hover:text-fg">← Álbum e biblioteca</Link>
      <DescobertaClient
        key={id}
        conteudo={conteudo}
        fontes={fontes}
        respostaAnterior={prog?.resposta ?? null}
        salvoInicial={!!prog?.salvo}
        proximaHref={proxima ? `/aluno/descobertas/${proxima}${daBiblioteca ? "?o=biblioteca" : ""}` : null}
        origem={(ORIGENS as readonly string[]).includes(o ?? "") ? (o as (typeof ORIGENS)[number]) : null}
      />
    </div>
  );
}
