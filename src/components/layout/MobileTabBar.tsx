"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabItem = { label: string; href: string; icon: string };

type MobileTabBarProps = {
  items: TabItem[];
};

export function MobileTabBar({ items }: MobileTabBarProps) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-border z-50">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {items.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-semibold transition-colors ${
                active ? "text-accent" : "text-fg-subtle hover:text-fg-muted"
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
