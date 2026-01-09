"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, CheckCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/utils/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/shared/logo";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(data.email);

      if (error) {
        toast({
          variant: "error",
          title: "Error",
          description:
            error.message ||
            "No se pudo enviar el email. Intenta nuevamente.",
        });
        return;
      }

      setIsSuccess(true);
      toast({
        variant: "success",
        title: "Email enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
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

  if (isSuccess) {
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

        {/* Success State */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-success/20 p-4">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Revisa tu email
          </h1>
          <p className="text-foreground-muted">
            Hemos enviado las instrucciones para restablecer tu contraseña a{" "}
            <span className="font-medium text-foreground">
              {getValues("email")}
            </span>
          </p>
          <p className="text-sm text-foreground-muted">
            Si no recibes el email en unos minutos, revisa tu carpeta de spam.
          </p>

          {/* Back to Login */}
          <div className="pt-4">
            <Button variant="secondary" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a iniciar sesión
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    );
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
        Recuperar Contraseña
      </h1>
      <p className="text-foreground-muted text-center mb-6">
        Ingresa tu email y te enviaremos las instrucciones para restablecer tu
        contraseña
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

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Enviar instrucciones
        </Button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a iniciar sesión
        </Link>
      </div>
    </motion.div>
  );
}
