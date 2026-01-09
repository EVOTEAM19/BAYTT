"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { registerSchema, type RegisterInput } from "@/lib/utils/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/shared/logo";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  async function onSubmit(data: RegisterInput) {
    if (!acceptTerms) {
      toast({
        variant: "error",
        title: "Términos no aceptados",
        description: "Debes aceptar los términos y condiciones para continuar.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(
        data.email,
        data.password,
        data.full_name
      );

      if (error) {
        toast({
          variant: "error",
          title: "Error al crear cuenta",
          description:
            error.message ||
            "No se pudo crear la cuenta. Intenta nuevamente.",
        });
        return;
      }

      toast({
        variant: "success",
        title: "¡Cuenta creada!",
        description:
          "Revisa tu email para verificar tu cuenta antes de iniciar sesión.",
      });

      // Redirigir a login después de un momento
      setTimeout(() => {
        router.push("/login");
      }, 2000);
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
        Crear Cuenta
      </h1>
      <p className="text-foreground-muted text-center mb-6">
        Únete a BAYTT y comienza a crear películas con IA
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nombre */}
        <div>
          <Input
            type="text"
            placeholder="Nombre completo"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.full_name?.message}
            {...register("full_name")}
          />
        </div>

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

        {/* Confirm Password */}
        <div>
          <Input
            type="password"
            placeholder="Confirmar contraseña"
            leftIcon={<Lock className="h-4 w-4" />}
            showPasswordToggle
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-center space-x-2">
          <Switch
            id="terms"
            checked={acceptTerms}
            onCheckedChange={setAcceptTerms}
          />
          <label
            htmlFor="terms"
            className="text-sm text-foreground-muted cursor-pointer"
          >
            Acepto los{" "}
            <Link href="/terms" className="text-primary hover:underline">
              términos y condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              política de privacidad
            </Link>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading || !acceptTerms}
        >
          Crear Cuenta
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

      {/* Login Link */}
      <p className="text-center text-sm text-foreground-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </motion.div>
  );
}
