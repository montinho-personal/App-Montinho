import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-grain">
      <header className="px-6 py-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Logo variant="full" color="accent" height={36} priority />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-8">{children}</main>
      <footer className="px-6 py-6 text-center text-xs text-fg-subtle">
        © {new Date().getFullYear()} {BRAND.fullName} · Todos os direitos reservados
      </footer>
    </div>
  );
}
