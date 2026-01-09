"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  Plus,
  ShoppingBag,
  Users,
  CreditCard,
  Settings,
  Shield,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

interface SidebarProps {
  user?: {
    role?: "user" | "admin" | "superadmin";
    plan?: {
      name: string;
    };
  };
}

export function Sidebar({ user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const links = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      href: "/my-movies",
      label: "Mis Películas",
      icon: Film,
      show: true,
    },
    {
      href: "/create-movie",
      label: "Crear",
      icon: Plus,
      show: true,
    },
    {
      href: "/rented",
      label: "Alquiladas",
      icon: ShoppingBag,
      show: true,
    },
    {
      href: "/my-characters",
      label: "Mis Personajes",
      icon: Users,
      show: true,
    },
    {
      href: "/subscription",
      label: "Mi Plan",
      icon: CreditCard,
      show: true,
    },
    {
      href: "/wallet",
      label: "Monedero",
      icon: Wallet,
      show: true,
    },
    {
      href: "/settings",
      label: "Configuración",
      icon: Settings,
      show: true,
    },
    {
      href: "/admin",
      label: "Admin",
      icon: Shield,
      show: isAdmin,
    },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-background border-b border-border p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-screen border-r border-border bg-background-secondary transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          "hidden lg:block"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            {!isCollapsed && <Logo href="/" width={90} height={28} />}
            <Button
              variant="ghost"
              size="icon"
              className="lg:flex hidden"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <Menu className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 p-4">
            {links
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

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
                    title={isCollapsed ? link.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
          </nav>

          {/* Plan Info */}
          {!isCollapsed && user?.plan && (
            <div className="border-t border-border p-4">
              <div className="rounded-md bg-card p-3">
                <p className="text-xs text-foreground-muted mb-1">Plan Actual</p>
                <p className="text-sm font-semibold text-foreground">
                  {user.plan.name}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/50"
          onClick={() => setIsCollapsed(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 border-r border-border bg-background-secondary transition-transform duration-300",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="flex h-full flex-col p-4">
          <nav className="flex-1 space-y-1">
            {links
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsCollapsed(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-foreground-muted hover:bg-card hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
          </nav>

          {user?.plan && (
            <div className="border-t border-border pt-4">
              <div className="rounded-md bg-card p-3">
                <p className="text-xs text-foreground-muted mb-1">Plan Actual</p>
                <p className="text-sm font-semibold text-foreground">
                  {user.plan.name}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
