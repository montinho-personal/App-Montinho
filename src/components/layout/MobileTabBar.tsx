"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";

type TabItem = { label: string; href: string; icon: IconName };

export function MobileTabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-border z-50 pb-safe">
      <div className="max-w-md mx-auto grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((tab) => {
          const active = tab.href === "/aluno" ? pathname === "/aluno" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-h-[56px] gap-1 text-[11px] font-semibold transition-colors ${active ? "text-accent" : "text-fg-subtle hover:text-fg-muted"}`}
            >
              <Icon name={tab.icon} size={22} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
