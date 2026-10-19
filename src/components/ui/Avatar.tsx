import { iniciais } from "@/lib/format";

type AvatarProps = {
  nome: string;
  url?: string | null;
  size?: number;
  className?: string;
};

export function Avatar({ nome, url, size = 40, className = "" }: AvatarProps) {
  const fontSize = Math.max(11, Math.round(size * 0.36));
  return (
    <div
      className={`shrink-0 rounded-full bg-card border border-border flex items-center justify-center font-bold text-accent overflow-hidden ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={nome} className="w-full h-full object-cover" />
      ) : (
        <span>{iniciais(nome)}</span>
      )}
    </div>
  );
}
