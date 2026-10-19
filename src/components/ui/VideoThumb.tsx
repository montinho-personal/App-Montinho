import { thumbnailUrl, type VideoSource } from "@/lib/video";

type VideoThumbProps = {
  source: VideoSource | null;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

export function VideoThumb({ source, className = "", size = "md" }: VideoThumbProps) {
  if (!source) {
    return (
      <div
        className={`${SIZE[size]} rounded-lg bg-card border border-border flex items-center justify-center text-fg-subtle text-xs ${className}`}
      >
        sem
      </div>
    );
  }
  const thumb = thumbnailUrl(source);
  return (
    <div
      className={`relative ${SIZE[size]} rounded-lg overflow-hidden bg-black border border-border shrink-0 ${className}`}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-fg ml-0.5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
