"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";

type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

type SidebarProps = {
  items: NavItem[];
  footer?: React.ReactNode;
};

export function Sidebar({ items, footer }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("squad-sidebar") === "collapsed";
  });

  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem("squad-sidebar", next ? "collapsed" : "open");
      return next;
    });
  }

  return (
    <aside
      className={`${collapsed ? "w-[68px]" : "w-64"} shrink-0 bg-surface border-r border-border flex flex-col h-screen sticky top-0 transition-[width] duration-200`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-5">
        {collapsed ? (
          <Logo variant="mark" color="white" height={28} priority />
        ) : (
          <Logo variant="full" color="white" height={32} priority />
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Abrir menu" : "Fechar menu"}
          aria-label={collapsed ? "Abrir menu" : "Fechar menu"}
          className="grid h-8 w-8 place-items-center rounded-md border border-border text-xs text-fg-muted hover:text-fg shrink-0"
        >
          <span aria-hidden>{collapsed ? "›" : "‹"}</span>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-fg-muted hover:bg-card hover:text-fg"
              }`}
            >
              {item.icon ? <span className="opacity-80">{item.icon}</span> : null}
              {collapsed ? null : item.label}
            </Link>
          );
        })}
      </nav>
      {!collapsed && footer ? <div className="border-t border-border p-3">{footer}</div> : null}
    </aside>
  );
}
