"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, Film, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Inicio",
      icon: Home,
    },
    {
      href: "/search",
      label: "Buscar",
      icon: Search,
    },
    {
      href: "/create-movie",
      label: "Crear",
      icon: Plus,
    },
    {
      href: "/my-movies",
      label: "Mis Películas",
      icon: Film,
    },
    {
      href: "/dashboard",
      label: "Perfil",
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background-secondary md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-foreground-muted"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-glow")} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
