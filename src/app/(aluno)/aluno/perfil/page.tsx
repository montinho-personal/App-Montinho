import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AlunoStatusPill } from "@/components/ui/StatusPill";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno, listDieta } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listAdaptacoes, listIntervencoes } from "@/lib/data/acompanhamento";
import { dataBR } from "@/lib/format";
import { BRAND } from "@/config/brand";
import { SairButton } from "./SairButton";

export const metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const sessao = await requireAlunoPage();
  const [aluno, plano, adaptacoes, intervencoes, dieta] = await Promise.all([
    getAluno(sessao.alunoId),
    getPlanoAtivo(sessao.alunoId),
    listAdaptacoes(sessao.alunoId),
    listIntervencoes(sessao.alunoId, 10),
    listDieta(sessao.alunoId),
  ]);
  if (!aluno) return null;
  const visiveis = intervencoes.filter((i) => i.visivel_aluno);

  return (
    <div className="space-y-5">
      <header className="text-center">
        <Avatar nome={aluno.profile?.nome ?? sessao.nome} size={80} className="mx-auto" />
        <h1 className="text-xl font-bold mt-3">{aluno.profile?.nome ?? sessao.nome}</h1>
        <p className="text-sm text-fg-subtle">{aluno.profile?.email}</p>
        <div className="mt-2">
          <AlunoStatusPill status={aluno.status} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seu programa</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          {plano.programa ? (
            <>
              <Row label="Nome" value={plano.programa.nome} />
              <Row label="Objetivo" value={plano.programa.objetivo ?? "—"} />
              <Row label="Treinos" value={plano.treinos.filter((t) => t.ativo).map((t) => t.letra).join(" · ") || "—"} />
              <Row label="Sessões por semana" value={String(Math.round(Object.values(plano.programa.frequencia).reduce((a, b) => a + (Number(b) || 0), 0)) || "—")} />
              <Row label="Versão atual" value={`v${plano.programa.versao}`} />
            </>
          ) : (
            <p className="text-fg-muted">Nenhum programa publicado ainda.</p>
          )}
          {aluno.objetivo ? <p className="text-fg-muted pt-2 border-t border-border">{aluno.objetivo}</p> : null}
        </CardBody>
      </Card>

      {dieta.length ? (
        <Link href="/aluno/dieta" className="block">
          <Card className="hover:border-accent/40">
            <CardBody className="py-3 text-sm font-semibold">Plano alimentar →</CardBody>
          </Card>
        </Link>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos de adaptação</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {adaptacoes.length === 0 ? (
            <p className="px-5 py-5 text-sm text-fg-muted">Nenhum pedido. Durante o treino, toque em “Não consegui este exercício” para pedir uma alternativa.</p>
          ) : (
            <ul className="divide-y divide-border">
              {adaptacoes.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{a.exercicio_nome ?? "Exercício"}</p>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${a.status === "aberta" ? "text-warning" : "text-success"}`}>{a.status === "aberta" ? "aguardando" : a.status}</span>
                  </div>
                  <p className="text-xs text-fg-subtle">
                    {dataBR(a.created_at)} · {a.motivo.replace("_", " ")}
                    {a.descricao ? ` · ${a.descricao}` : ""}
                  </p>
                  {a.resposta ? <p className="text-sm mt-1 border-l-2 border-accent pl-2">{a.resposta}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {visiveis.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico do acompanhamento</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {visiveis.map((i) => (
                <li key={i.id} className="px-5 py-3">
                  <p className="text-sm">{i.descricao}</p>
                  <p className="text-[11px] text-fg-subtle mt-1">
                    {i.autor?.nome ?? BRAND.name} · {dataBR(i.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meus dados</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <Row label="Telefone" value={aluno.telefone ?? "—"} />
          <Row label="Nascimento" value={dataBR(aluno.data_nascimento)} />
          <Row label="Altura" value={aluno.altura_cm ? `${aluno.altura_cm} cm` : "—"} />
          <Row label="Início" value={dataBR(aluno.data_inicio)} />
          <Row label="Acesso até" value={dataBR(aluno.acesso_ate)} />
          <p className="text-xs text-fg-subtle pt-2 border-t border-border">Seus dados de saúde e fotos são privados: só você e o {BRAND.name} têm acesso. Para corrigir ou excluir dados, fale com o {BRAND.name}.</p>
        </CardBody>
      </Card>

      {BRAND.contact.whatsapp ? (
        <a href={`https://wa.me/${BRAND.contact.whatsapp}`} target="_blank" rel="noreferrer" className="touch inline-flex w-full items-center justify-center rounded-lg border border-border px-5 py-3 text-sm font-semibold hover:border-accent/40">
          Falar com o {BRAND.name} no WhatsApp
        </a>
      ) : null}

      <SairButton />

      <p className="text-center text-[10px] text-fg-subtle">{BRAND.fullName}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-subtle">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
