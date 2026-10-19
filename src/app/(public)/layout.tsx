import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-grain">
      <header className="px-5 py-5 flex items-center justify-between max-w-5xl w-full mx-auto">
        <Logo variant="full" height={44} priority />
      </header>
      <main id="conteudo" className="flex-1 flex items-center justify-center px-4 py-6">{children}</main>
      <footer className="px-5 py-6 text-center text-xs text-fg-subtle space-y-1">
        <p className="text-fg-muted italic">“{BRAND.tagline}”</p>
        <p>
          © {new Date().getFullYear()} {BRAND.fullName}
          {BRAND.contact.instagram ? (
            <>
              {" · "}
              <a className="hover:text-fg underline-offset-2 hover:underline" href={`https://instagram.com/${BRAND.contact.instagram}`} target="_blank" rel="noreferrer">
                @{BRAND.contact.instagram}
              </a>
            </>
          ) : null}
        </p>
      </footer>
    </div>
  );
}
