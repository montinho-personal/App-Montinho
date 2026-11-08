import { VIDEO_PLANOS_EMBED } from "@/lib/montinho/apresentacao";

/** Vídeo vertical do Montinho no fim das páginas de planos (só carrega quando chega perto). */
export function VideoDosPlanos() {
  return (
    <section aria-label="Vídeo do Montinho" className="space-y-3">
      <h2 className="text-center text-xl font-extrabold leading-tight">🎥 Assista antes de decidir</h2>
      <div className="relative mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-black">
        <iframe
          src={VIDEO_PLANOS_EMBED}
          title="Vídeo do Montinho"
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}
