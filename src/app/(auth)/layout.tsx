import { cn } from "@/lib/utils/cn";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#39FF14_1px,transparent_1px),linear-gradient(to_bottom,#39FF14_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      {/* Contenido centrado */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-card border border-border rounded-lg shadow-card-hover p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
