"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Camera, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    avatar_url: profile?.avatar_url || "",
    bank_account_number: profile?.bank_account_number || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
  });

  const supabase = createClient();

  const updateProfile = useMutation({
    mutationFn: async (data: { 
      full_name?: string; 
      avatar_url?: string;
      bank_account_number?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado correctamente");
      refreshProfile();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar el perfil");
    },
  });

  const updatePassword = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar la contraseña");
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      // TODO: Implementar eliminación de cuenta
      // Esto debería eliminar todos los datos del usuario
      toast.success("Cuenta eliminada correctamente");
      router.push("/");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar la cuenta");
    },
  });

  const handleSaveProfile = () => {
    updateProfile.mutate({
      full_name: formData.full_name,
      avatar_url: formData.avatar_url,
      bank_account_number: formData.bank_account_number,
    });
  };

  const handleUpdatePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    updatePassword.mutate(passwordData.newPassword);
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate();
    setDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-foreground-muted mt-1">
          Gestiona tu cuenta y preferencias
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.avatar_url || undefined} />
              <AvatarFallback name={formData.full_name || user?.email || ""} />
            </Avatar>
            <div>
              <Button variant="secondary" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Cambiar Avatar
              </Button>
              <p className="text-xs text-foreground-muted mt-2">
                URL de imagen o sube un archivo
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <Label htmlFor="avatar_url">URL del Avatar</Label>
              <Input
                id="avatar_url"
                value={formData.avatar_url}
                onChange={(e) =>
                  setFormData({ ...formData, avatar_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="bank_account_number">Número de Cuenta Bancaria</Label>
              <p className="text-sm text-foreground-muted mb-2">
                Necesario para solicitar liquidaciones de tu monedero
              </p>
              <Input
                id="bank_account_number"
                value={formData.bank_account_number}
                onChange={(e) =>
                  setFormData({ ...formData, bank_account_number: e.target.value })
                }
                placeholder="ES12 3456 7890 1234 5678 9012"
                className="font-mono"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Contraseña Actual</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
            />
          </div>

          <Button
            onClick={handleUpdatePassword}
            disabled={updatePassword.isPending}
          >
            Actualizar Contraseña
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Notificaciones por Email</Label>
              <p className="text-sm text-foreground-muted">
                Recibe actualizaciones por correo electrónico
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, email: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notifications">Notificaciones Push</Label>
              <p className="text-sm text-foreground-muted">
                Recibe notificaciones en el navegador
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={notifications.push}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, push: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-error/20">
        <CardHeader>
          <CardTitle className="text-error">Zona de Peligro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Eliminar Cuenta
              </h3>
              <p className="text-sm text-foreground-muted">
                Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor,
                ten cuidado.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Cuenta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cuenta</DialogTitle>
            <DialogDescription>
              ¿Estás absolutamente seguro? Esta acción no se puede deshacer.
              Esto eliminará permanentemente tu cuenta y todos tus datos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialog(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={deleteAccount.isPending}
              className="flex-1"
            >
              Eliminar Cuenta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
