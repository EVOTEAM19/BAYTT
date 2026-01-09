"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatPrice, formatDate } from "@/lib/utils/formatters";
import { getInitials } from "@/lib/utils/formatters";
import { ArrowLeft, Edit, Save, CreditCard, Gift } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { toast } from "@/hooks/use-toast";
import type { Profile, Plan, Movie, Rental } from "@/types/database";
import Link from "next/link";

interface AdminUserDetailClientProps {
  user: Profile;
  plan: Plan | null;
  movies: Movie[];
  transactions: Array<Rental & { movies: Movie | null }>;
  rentals: Array<Rental & { movies: Movie | null }>;
  plans: Plan[];
  isSuperAdmin: boolean;
}

export function AdminUserDetailClient({
  user,
  plan,
  movies,
  transactions,
  rentals,
  plans,
  isSuperAdmin,
}: AdminUserDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: user.full_name || "",
    email: user.email,
  });
  const [changePlanDialog, setChangePlanDialog] = useState(false);
  const [newPlanId, setNewPlanId] = useState(user.plan_id || "");
  const [newRole, setNewRole] = useState(user.role);
  const [creditsDialog, setCreditsDialog] = useState(false);

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const response = await fetch(`${API_ENDPOINTS.admin.users}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Usuario actualizado correctamente");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => {
      toast.error("Error al actualizar el usuario");
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`${API_ENDPOINTS.admin.users}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId || null }),
      });
      if (!response.ok) throw new Error("Failed to change plan");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Plan actualizado correctamente");
      setChangePlanDialog(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => {
      toast.error("Error al actualizar el plan");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await fetch(`${API_ENDPOINTS.admin.users}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error("Failed to change role");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Rol actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => {
      toast.error("Error al actualizar el rol");
    },
  });

  const handleSave = () => {
    updateUserMutation.mutate(editData);
  };

  const totalEarnings = transactions.reduce(
    (sum, t) => sum + (t.creator_earning || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/users")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Detalle de Usuario
          </h1>
          <p className="text-foreground-muted mt-1">
            Información completa y gestión del usuario
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Información Básica</CardTitle>
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={updateUserMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback name={user.full_name || user.email} />
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {user.full_name || "Sin nombre"}
                  </h2>
                  <p className="text-foreground-muted">{user.email}</p>
                </div>
              </div>

              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      value={editData.full_name}
                      onChange={(e) =>
                        setEditData({ ...editData, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground-muted">Estado</Label>
                    <div>
                      <Badge variant={user.is_active ? "success" : "error"}>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground-muted">Rol</Label>
                    <div>
                      <Badge
                        variant={
                          user.role === "superadmin"
                            ? "default"
                            : user.role === "admin"
                            ? "info"
                            : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground-muted">
                      Fecha de Registro
                    </Label>
                    <p className="text-foreground">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Movies History */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Películas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {movies.length === 0 ? (
                  <p className="text-foreground-muted text-center py-4">
                    No hay películas
                  </p>
                ) : (
                  movies.map((movie) => (
                    <div
                      key={movie.id}
                      className="flex items-center justify-between p-3 rounded hover:bg-card-hover transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {movie.title}
                        </p>
                        <p className="text-sm text-foreground-muted">
                          {formatDate(movie.created_at)} - {movie.status}
                        </p>
                      </div>
                      <Link href={`/admin/movies/${movie.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Transacciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.length === 0 ? (
                  <p className="text-foreground-muted text-center py-4">
                    No hay transacciones
                  </p>
                ) : (
                  transactions.map((transaction) => {
                    const movie = Array.isArray(transaction.movies)
                      ? transaction.movies[0]
                      : transaction.movies;
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded hover:bg-card-hover transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {movie?.title || "Película eliminada"}
                          </p>
                          <p className="text-sm text-foreground-muted">
                            {formatDate(transaction.created_at)} - Ganancia:{" "}
                            {formatPrice(transaction.creator_earning || 0)}
                          </p>
                        </div>
                        <Badge variant="success">
                          {formatPrice(transaction.price_paid)}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge variant="default" className="text-lg">
                  {plan?.name || "Sin plan"}
                </Badge>
              </div>
              {plan && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Precio:</span>
                    <span className="text-foreground">
                      {formatPrice(plan.price)}/mes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">
                      Películas/mes:
                    </span>
                    <span className="text-foreground">
                      {user.movies_created_this_month} / {plan.movies_per_month}
                    </span>
                  </div>
                </div>
              )}
              <Button
                variant="default"
                className="w-full"
                onClick={() => setChangePlanDialog(true)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Cambiar Plan
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Películas creadas:</span>
                <span className="font-semibold text-foreground">
                  {movies.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Ingresos totales:</span>
                <span className="font-semibold text-foreground">
                  {formatPrice(totalEarnings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Alquileres:</span>
                <span className="font-semibold text-foreground">
                  {rentals.length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Role (Superadmin only) */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Rol</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={newRole}
                  onValueChange={(value) => {
                    setNewRole(value as "user" | "admin" | "superadmin");
                    changeRoleMutation.mutate(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Credits */}
          <Card>
            <CardHeader>
              <CardTitle>Beneficios</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setCreditsDialog(true)}
              >
                <Gift className="h-4 w-4 mr-2" />
                Dar Créditos/Beneficios
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanDialog} onOpenChange={setChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Plan</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo plan para este usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan-select">Plan</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger id="plan-select">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin plan</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {formatPrice(p.price)}/mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() => setChangePlanDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => changePlanMutation.mutate(newPlanId)}
                disabled={changePlanMutation.isPending}
                className="flex-1"
              >
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credits Dialog */}
      <Dialog open={creditsDialog} onOpenChange={setCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar Créditos/Beneficios</DialogTitle>
            <DialogDescription>
              Añade créditos o beneficios especiales a este usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="credits">Créditos adicionales</Label>
              <Input
                id="credits"
                type="number"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="movies-bonus">Películas bonus</Label>
              <Input
                id="movies-bonus"
                type="number"
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() => setCreditsDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  // TODO: Implementar dar créditos
                  toast.success("Créditos añadidos correctamente");
                  setCreditsDialog(false);
                }}
                className="flex-1"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

