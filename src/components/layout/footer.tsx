import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/shared/logo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { href: "/browse", label: "Explorar" },
    { href: "/pricing", label: "Precios" },
    { href: "/features", label: "Características" },
  ];

  const companyLinks = [
    { href: "/about", label: "Sobre Nosotros" },
    { href: "/blog", label: "Blog" },
    { href: "/careers", label: "Carreras" },
  ];

  const legalLinks = [
    { href: "/privacy", label: "Privacidad" },
    { href: "/terms", label: "Términos" },
    { href: "/cookies", label: "Cookies" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo y Descripción */}
          <div className="space-y-4">
            <Logo href="/" width={120} height={40} />
            <p className="text-sm text-foreground-muted">
              Plataforma de cine con inteligencia artificial. Crea y disfruta
              películas generadas con IA.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Producto
            </h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-muted hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Empresa
            </h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-muted hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-muted hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Redes Sociales y Copyright */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <Link
                  key={social.label}
                  href={social.href}
                  className="text-foreground-muted hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </div>
          <p className="text-sm text-foreground-muted">
            © {currentYear} BAYTT. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
