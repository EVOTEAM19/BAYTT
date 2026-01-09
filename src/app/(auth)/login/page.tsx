"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, type LoginInput } from "@/lib/utils/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/shared/logo";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const redirect = searchParams.get("redirect") || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirect);
    }
  }, [isAuthenticated, router, redirect]);

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        toast({
          variant: "error",
          title: "Error al iniciar sesión",
          description:
            error.message || "Credenciales incorrectas. Intenta nuevamente.",
        });
        return;
      }

      toast({
        variant: "success",
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente.",
      });

      router.push(redirect);
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Error",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <Logo href="/" width={150} height={50} />
      </div>

      {/* Título */}
      <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
        Iniciar Sesión
      </h1>
      <p className="text-foreground-muted text-center mb-6">
        Ingresa a tu cuenta para continuar
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <Input
            type="email"
            placeholder="Email"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        {/* Password */}
        <div>
          <Input
            type="password"
            placeholder="Contraseña"
            leftIcon={<Lock className="h-4 w-4" />}
            showPasswordToggle
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Iniciar Sesión
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-foreground-muted">o</span>
        </div>
      </div>

      {/* Register Link */}
      <p className="text-center text-sm text-foreground-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </motion.div>
  );
}
