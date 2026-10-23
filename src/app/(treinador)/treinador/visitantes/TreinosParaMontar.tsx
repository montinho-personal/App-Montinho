"use client";

// Treinos que visitantes enviaram por foto/print/PDF e a IA não conseguiu ler
// (ou a leitura estava desligada): o personal abre, monta na ficha e marca.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TreinoEnviadoComNome } from "@/lib/data/treinos-enviados";

const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function TreinosParaMontar({ itens }: { itens: TreinoEnviadoComNome[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  async function resolver(id: string, status: "montado" | "descartado") {
    if (status === "descartado" && !window.confirm("Descartar este envio? O visitante não recebe aviso.")) return;
    setOcupado(id);
    await fetch(`/api/treinos-enviados/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).catch(() => null);
    setOcupado(null);
    router.refresh();
  }
  if (!itens.length) return <p className="text-sm text-fg-muted">Nenhum treino esperando. Quando um visitante enviar a foto ou o PDF do treino e a leitura automática não conseguir, ele aparece aqui.</p>;
  const botao = "alvo inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm hover:border-accent/60 disabled:opacity-50";
  return (
    <ul className="divide-y divide-border">
      {itens.map((t) => (
        <li key={t.id} className="space-y-2 py-3">
          <p className="text-sm"><span className="font-semibold">{t.nome}</span> <span className="text-xs text-fg-subtle">· {fmt.format(new Date(t.created_at))} · {t.tipo_mime === "application/pdf" ? "PDF" : "imagem"}</span></p>
          {t.observacao ? <p className="text-xs text-fg-muted">{t.observacao}</p> : null}
          <div className="flex flex-wrap gap-2">
            <a className={botao} href={`/api/treinos-enviados/${t.id}`} target="_blank" rel="noopener noreferrer">Abrir arquivo</a>
            <Link className={botao} href={`/treinador/alunos/${t.aluno_id}/treinos`}>Montar na ficha</Link>
            <button type="button" className={`${botao} border-accent/60 font-semibold text-accent`} disabled={ocupado === t.id} onClick={() => void resolver(t.id, "montado")}>Marcar como montado</button>
            <button type="button" className={botao} disabled={ocupado === t.id} onClick={() => void resolver(t.id, "descartado")}>Descartar</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
