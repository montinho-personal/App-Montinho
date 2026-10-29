"use client";

// “📲 Enviar para um aluno no WhatsApp”: o personal escolhe o protocolo e a
// pessoa; abre o WhatsApp dela com a mensagem pronta (link do app + vídeo).
import { useMemo, useState } from "react";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { PROTOCOLOS, SLUGS_MOBILIDADE, type SlugMobilidade } from "@/lib/mobilidade/protocolos";
import { mensagemMobilidade } from "@/lib/mobilidade/enviar";
import { palavras } from "@/lib/busca/alunos";

/** Cada palavra digitada casa com o começo de uma palavra do nome (sem acento). */
const combinaNome = (nome: string, busca: string) => { const n = palavras(nome); return palavras(busca).every((t) => n.some((w) => w.startsWith(t))); };

export type PessoaEnviar = { id: string; nome: string; telefone: string | null; visitante: boolean };

export function EnviarMobilidade({ pessoas, inicial, aberto: abertoInicial = false }: { pessoas: PessoaEnviar[]; inicial?: SlugMobilidade; aberto?: boolean }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [slug, setSlug] = useState<SlugMobilidade>(inicial ?? "superiores");
  const [busca, setBusca] = useState("");
  const [enviado, setEnviado] = useState<string | null>(null);
  const lista = useMemo(() => pessoas.filter((p) => !busca.trim() || combinaNome(p.nome, busca)), [pessoas, busca]);

  function enviar(p: PessoaEnviar) {
    const texto = mensagemMobilidade(p.nome, slug, window.location.origin);
    window.open(linkWhatsApp(p.telefone, texto), "_blank", "noopener,noreferrer");
    setEnviado(p.nome);
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="touch flex w-full items-center justify-center gap-2 rounded-xl border border-accent/60 bg-grain-strong px-4 py-3 font-bold">
        📲 Enviar para um aluno no WhatsApp
      </button>
    );
  }
  return (
    <section className="space-y-3 rounded-2xl border border-accent/50 bg-grain-strong p-4" aria-label="Enviar mobilidade pelo WhatsApp">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-black">📲 Enviar para um aluno</h2>
          <p className="text-xs text-fg-muted">Abre o WhatsApp da pessoa com o link do app e o vídeo.</p>
        </div>
        <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="alvo grid h-9 w-9 place-items-center rounded-full border border-border">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Qual mobilidade">
        {SLUGS_MOBILIDADE.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={slug === s} onClick={() => setSlug(s)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${slug === s ? "border-accent bg-accent text-bg" : "border-border bg-bg"}`}>
            {PROTOCOLOS[s].emoji} {PROTOCOLOS[s].nome.replace("Mobilidade de ", "")}
          </button>
        ))}
      </div>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno pelo nome" aria-label="Buscar aluno" className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base" />
      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-bg">
        {lista.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => enviar(p)} className="flex min-h-12 w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{p.nome}</span>
                <span className="block text-[11px] text-fg-subtle">{p.visitante ? "visitante · " : ""}{p.telefone ? "WhatsApp cadastrado" : "sem WhatsApp: você escolhe o contato"}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-accent">Enviar →</span>
            </button>
          </li>
        ))}
        {lista.length === 0 ? <li className="px-3 py-3 text-center text-sm text-fg-muted">Ninguém com esse nome.</li> : null}
      </ul>
      {enviado ? <p className="text-sm font-semibold text-success" role="status">WhatsApp aberto para {enviado}. É só tocar em enviar lá.</p> : null}
    </section>
  );
}
