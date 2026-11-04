import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { Voltar } from "@/components/ui/Voltar";
import { BRAND } from "@/config/brand";
import { DICAS_FILMAR, O_QUE_O_MONTINHO_OLHA, REGRAS_FILMAR, VIDEO_COMO_FILMAR_EMBED } from "@/lib/montinho/como-filmar";

export const metadata = { title: "Como filmar o seu exercício" };

const MENSAGEM = "Olá, Montinho! Segue o vídeo de um exercício para você avaliar a minha execução.";

export default async function ComoFilmarPage() {
  await requireAlunoPage();
  return (
    <div className="space-y-4">
      <Voltar href="/aluno/perfil" />
      <header>
        <h1 className="text-2xl font-black">🎥 Como filmar o seu exercício</h1>
        <p className="mt-1 text-sm text-fg-muted">Para o {BRAND.name} corrigir a sua execução. Não depende de câmera boa: depende de onde o celular fica.</p>
      </header>

      <div className="mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-black">
        <iframe src={VIDEO_COMO_FILMAR_EMBED} title="Como filmar o seu exercício" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-bold">As 4 regras</h2>
        <ol className="space-y-2">
          {REGRAS_FILMAR.map((r, i) => (
            <li key={r.titulo} className="rounded-xl border border-border bg-bg-elevated p-3">
              <p className="font-semibold">
                {r.emoji} {i + 1}. {r.titulo}
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">{r.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-1.5 rounded-xl border border-border p-3">
        <h2 className="text-base font-bold">💡 Dicas</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          {DICAS_FILMAR.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
        <p className="font-semibold">👀 No vídeo, o {BRAND.name} olha:</p>
        <p className="mt-1 text-fg-muted">{O_QUE_O_MONTINHO_OLHA.join(" · ")}</p>
        <p className="mt-2 font-semibold">Não precisa estar perfeito. Gravou, manda!</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold">Como mandar</h2>
        <p className="text-sm text-fg-muted">
          No treino, abra o exercício, toque em <b>⋯ Mais</b> e depois em <b>🎥 Enviar minha execução ao {BRAND.name}</b>. O WhatsApp abre com o exercício e as séries de hoje; é só anexar o vídeo.
        </p>
        <a href={`https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(MENSAGEM)}`} target="_blank" rel="noopener noreferrer" className="touch flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-black">
          💬 Já tenho o vídeo: mandar pelo WhatsApp
        </a>
        <Link href="/aluno/treinar" className="alvo flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-bold">
          💪 Ir treinar
        </Link>
      </section>
    </div>
  );
}
