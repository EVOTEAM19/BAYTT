"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  X,
  User,
  Film,
  Plus,
  ShoppingBag,
  CreditCard,
  Settings,
  Shield,
  LogOut,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";

export function Navbar() {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // Mock user data - reemplazar con datos reales
  const user = {
    name: "Usuario",
    email: "usuario@example.com",
    avatar: null,
    role: "user" as "user" | "admin" | "superadmin",
  };

  const isLoggedIn = !!user;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Inicio", show: true },
    { href: "/browse", label: "Películas", show: true },
    { href: "/my-movies", label: "Mis Películas", show: isLoggedIn },
    { href: "/create-movie", label: "Crear", show: isLoggedIn },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background border-b border-border shadow-card"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo href="/" width={100} height={32} />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(
              (link) =>
                link.show && (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      pathname === link.href
                        ? "text-primary"
                        : "text-foreground-muted"
                    )}
                  >
                    {link.label}
                  </Link>
                )
            )}
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/search">
                    <Search className="h-5 w-5" />
                  </Link>
                </Button>

                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge
                    variant="error"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    3
                  </Badge>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback name={user.name} />
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-foreground-muted">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/my-movies"
                        className="flex items-center"
                      >
                        <Film className="mr-2 h-4 w-4" />
                        Mis Películas
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/rented" className="flex items-center">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Alquiladas
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/subscription"
                        className="flex items-center"
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Mi Plan
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Configuración
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-error">
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Iniciar Sesión</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Registrarse</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map(
              (link) =>
                link.show && (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "block px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      pathname === link.href
                        ? "bg-card text-primary"
                        : "text-foreground-muted hover:bg-card hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                )
            )}
            {!isLoggedIn && (
              <div className="pt-4 space-y-2">
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/login">Iniciar Sesión</Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/register">Registrarse</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
