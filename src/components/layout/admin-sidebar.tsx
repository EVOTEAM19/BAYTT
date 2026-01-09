"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Film,
  UserCircle,
  CreditCard,
  Store,
  Settings,
  BarChart3,
  ArrowLeft,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";

interface AdminSidebarProps {
  mockModeActive?: boolean;
}

export function AdminSidebar({ mockModeActive = false }: AdminSidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/admin/users",
      label: "Usuarios",
      icon: Users,
    },
    {
      href: "/admin/movies",
      label: "Películas",
      icon: Film,
    },
    {
      href: "/admin/characters",
      label: "Personajes",
      icon: UserCircle,
    },
    {
      href: "/admin/plans",
      label: "Planes",
      icon: CreditCard,
    },
    {
      href: "/admin/providers",
      label: "APIs & Proveedores",
      icon: Store,
    },
    {
      href: "/admin/payouts",
      label: "Liquidaciones",
      icon: DollarSign,
    },
    {
      href: "/admin/settings",
      label: "Configuración",
      icon: Settings,
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
  ];

  return (
    <aside className="fixed top-0 left-0 z-30 h-screen w-64 border-r border-border bg-background-secondary">
      <div className="flex h-full flex-col">
        {/* Logo con Badge Admin */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Logo href="/admin" width={90} height={28} />
            <Badge variant="error" className="text-xs">
              ADMIN
            </Badge>
          </div>
        </div>

        {/* Link Volver a la app */}
        <div className="px-4 py-2 border-b border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a la app</span>
          </Link>
        </div>

        {/* Mock Mode Indicator */}
        {mockModeActive && (
          <div className="mx-4 mt-2 p-2 rounded-md bg-warning/10 border border-warning">
            <div className="flex items-center gap-2 text-warning text-xs">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Mock Mode Activo</span>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-foreground-muted hover:bg-card hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
