"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/Logo";
import { BrandLockup, FioMarca } from "@/components/brand/BrandLockup";
import { Icon, type IconName } from "@/components/ui/Icon";

type NavItem = { label: string; href: string; icon: IconName };

type SidebarProps = { items: NavItem[]; usuario?: { nome: string } };

function lerColapsado(): boolean {
  try {
    return window.localStorage.getItem("montinho-sidebar") === "collapsed";
  } catch {
    return false;
  }
}
function subscribeSidebar(cb: () => void) {
  window.addEventListener("montinho-sidebar", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("montinho-sidebar", cb);
    window.removeEventListener("storage", cb);
  };
}

export function Sidebar({ items, usuario }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Preferência persistida (localStorage é um sistema externo → useSyncExternalStore)
  const collapsed = useSyncExternalStore(subscribeSidebar, () => lerColapsado(), () => false);

  function toggle() {
    try {
      localStorage.setItem("montinho-sidebar", collapsed ? "open" : "collapsed");
    } catch {
      /* sem storage */
    }
    window.dispatchEvent(new Event("montinho-sidebar"));
  }

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/login";
  }

  const nav = (
    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1" aria-label="Menu do treinador">
      {items.map((item) => {
        const active = item.href === "/treinador" ? pathname === "/treinador" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${collapsed ? "justify-center" : ""} ${active ? "bg-accent/10 text-accent border border-accent/20" : "text-fg-muted hover:bg-card hover:text-fg"}`}
          >
            <Icon name={item.icon} size={18} />
            {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
          </Link>
        );
      })}
    </nav>
  );

  const rodape = (
    <div className="border-t border-border p-3 space-y-2">
      {!collapsed && usuario ? <p className="text-xs text-fg-subtle truncate px-1">Olá, <span className="text-fg">{usuario.nome.split(" ")[0]}</span></p> : null}
      <button type="button" onClick={sair} className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-card hover:text-fg min-h-[44px] ${collapsed ? "justify-center" : ""}`}>
        <Icon name="logout" size={16} />
        {collapsed ? <span className="sr-only">Sair</span> : "Sair"}
      </button>
    </div>
  );

  // O logo leva ao primeiro item do menu (Visão geral).
  const inicio = items[0]?.href ?? "/";

  return (
    <>
      {/* Mobile: barra superior + gaveta */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between bg-[linear-gradient(180deg,#161616_0%,rgba(10,10,10,0.94)_100%)] backdrop-blur px-4">
        <Link href={inicio} aria-label="Ir para a visão geral" className="rounded-md">
          <BrandLockup priority />
        </Link>
        <button type="button" onClick={() => setMobileOpen(true)} className="touch flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 text-sm font-semibold text-fg" aria-label="Abrir menu" aria-expanded={mobileOpen}>
          <Icon name="menu" size={18} />
          <span aria-hidden>Menu</span>
        </button>
        <FioMarca />
      </div>
      <div className="md:hidden h-16" aria-hidden />
      {mobileOpen ? (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-72 bg-surface border-r border-border flex flex-col" onClick={(e) => e.stopPropagation()} aria-label="Menu">
            <div className="relative flex items-center justify-between px-4 py-4">
              <Link href={inicio} onClick={() => setMobileOpen(false)} aria-label="Ir para a visão geral" className="rounded-md">
                <BrandLockup />
              </Link>
              <FioMarca />
              <button type="button" onClick={() => setMobileOpen(false)} className="touch text-fg-muted" aria-label="Fechar menu">
                <Icon name="x" />
              </button>
            </div>
            {nav}
            {rodape}
          </aside>
        </div>
      ) : null}

      {/* Desktop */}
      <aside className={`hidden md:flex ${collapsed ? "w-[72px]" : "w-64"} shrink-0 bg-surface border-r border-border flex-col h-screen sticky top-0 transition-[width] duration-200`}>
        <div className="relative flex items-center justify-between gap-2 px-3 py-5">
          <Link href={inicio} aria-label="Ir para a visão geral" className="rounded-md">
            {collapsed ? <Logo variant="mark" height={40} priority /> : <BrandLockup priority />}
          </Link>
          <FioMarca />
          <button type="button" onClick={toggle} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} className="grid h-8 w-8 place-items-center rounded-md border border-border text-xs text-fg-muted hover:text-fg shrink-0">
            <span aria-hidden>{collapsed ? "›" : "‹"}</span>
          </button>
        </div>
        {nav}
        {rodape}
      </aside>
    </>
  );
}
