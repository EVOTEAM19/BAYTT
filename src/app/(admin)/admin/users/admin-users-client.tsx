"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UsersTable } from "@/components/admin/users-table";
import { PageHeader } from "@/components/shared/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { toast } from "@/hooks/use-toast";
import type { Profile, Plan } from "@/types/database";

interface AdminUsersClientProps {
  users: Array<
    Profile & {
      plans?: Plan | null;
      movies_count?: number;
    }
  >;
  plans: Plan[];
  currentUserId: string;
}

export function AdminUsersClient({
  users,
  plans,
  currentUserId,
}: AdminUsersClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [changePlanDialog, setChangePlanDialog] = useState<{
    open: boolean;
    userId: string | null;
    currentPlanId: string | null;
  }>({ open: false, userId: null, currentPlanId: null });
  const [newPlanId, setNewPlanId] = useState<string>("");
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    userId: string | null;
    isActive: boolean;
  }>({ open: false, userId: null, isActive: true });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    userId: string | null;
  }>({ open: false, userId: null });

  const changePlanMutation = useMutation({
    mutationFn: async ({ userId, planId }: { userId: string; planId: string }) => {
      const response = await fetch(`${API_ENDPOINTS.admin.users}/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!response.ok) throw new Error("Failed to change plan");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Plan actualizado correctamente");
      setChangePlanDialog({ open: false, userId: null, currentPlanId: null });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => {
      toast.error("Error al actualizar el plan");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const response = await fetch(`${API_ENDPOINTS.admin.users}/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!response.ok) throw new Error("Failed to suspend user");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Estado del usuario actualizado");
      setSuspendDialog({ open: false, userId: null, isActive: true });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => {
      toast.error("Error al actualizar el estado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${API_ENDPOINTS.admin.users}/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Usuario eliminado correctamente");
      setDeleteDialog({ open: false, userId: null });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => {
      toast.error("Error al eliminar el usuario");
    },
  });

  const bulkSuspendMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      // TODO: Implementar bulk suspend en API
      toast.success(`${userIds.length} usuarios suspendidos`);
    },
  });

  const handleChangePlan = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setChangePlanDialog({
      open: true,
      userId,
      currentPlanId: user?.plan_id || null,
    });
    setNewPlanId(user?.plan_id || "");
  };

  const handleSuspend = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setSuspendDialog({
      open: true,
      userId,
      isActive: user?.is_active || false,
    });
  };

  const handleDelete = (userId: string) => {
    if (userId === currentUserId) {
      toast.error("No puedes eliminar tu propia cuenta");
      return;
    }
    setDeleteDialog({ open: true, userId });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Usuarios"
        subtitle="Administra todos los usuarios de la plataforma"
      />

      <UsersTable
        users={users}
        onUserClick={(userId) => router.push(`/admin/users/${userId}`)}
        onChangePlan={handleChangePlan}
        onSuspend={handleSuspend}
        onDelete={handleDelete}
        onBulkSuspend={(userIds) => bulkSuspendMutation.mutate(userIds)}
      />

      {/* Change Plan Dialog */}
      <Dialog
        open={changePlanDialog.open}
        onOpenChange={(open) =>
          setChangePlanDialog({ open, userId: null, currentPlanId: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Plan</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo plan para este usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan">Plan</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin plan</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price}€/mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() =>
                  setChangePlanDialog({ open: false, userId: null, currentPlanId: null })
                }
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  if (changePlanDialog.userId) {
                    changePlanMutation.mutate({
                      userId: changePlanDialog.userId,
                      planId: newPlanId,
                    });
                  }
                }}
                disabled={changePlanMutation.isPending}
                className="flex-1"
              >
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog
        open={suspendDialog.open}
        onOpenChange={(open) =>
          setSuspendDialog({ open, userId: null, isActive: true })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendDialog.isActive ? "Suspender Usuario" : "Activar Usuario"}
            </DialogTitle>
            <DialogDescription>
              {suspendDialog.isActive
                ? "¿Estás seguro de que deseas suspender este usuario?"
                : "¿Estás seguro de que deseas activar este usuario?"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() =>
                setSuspendDialog({ open: false, userId: null, isActive: true })
              }
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant={suspendDialog.isActive ? "danger" : "default"}
              onClick={() => {
                if (suspendDialog.userId) {
                  suspendMutation.mutate({
                    userId: suspendDialog.userId,
                    isActive: suspendDialog.isActive,
                  });
                }
              }}
              disabled={suspendMutation.isPending}
              className="flex-1"
            >
              {suspendDialog.isActive ? "Suspender" : "Activar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, userId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este usuario? Esta acción no
              se puede deshacer y eliminará todos sus datos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialog({ open: false, userId: null })}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteDialog.userId) {
                  deleteMutation.mutate(deleteDialog.userId);
                }
              }}
              disabled={deleteMutation.isPending}
              className="flex-1"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

