"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils/formatters";
import type { Plan } from "@/types/database";

export function AdminPlansClient() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    price: 0,
    movies_per_month: 0,
    max_duration_minutes: 10,
    rentals_per_month: 0,
    video_quality: "1080p" as "720p" | "1080p" | "4k",
    has_ads: false,
    custom_characters: false,
    can_publish_marketplace: false,
    marketplace_commission: 0,
    stripe_price_id: "",
    is_active: true,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.admin.plans);
      if (!response.ok) throw new Error("Failed to fetch plans");
      const data = await response.json();
      return data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(API_ENDPOINTS.admin.plans, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create plan");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Plan creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`${API_ENDPOINTS.admin.plans}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update plan");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Plan actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.admin.plans}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete plan");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Plan eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      price: 0,
      movies_per_month: 0,
      max_duration_minutes: 10,
      rentals_per_month: 0,
      video_quality: "1080p",
      has_ads: false,
      custom_characters: false,
      can_publish_marketplace: false,
      marketplace_commission: 0,
      stripe_price_id: "",
      is_active: true,
    });
    setEditingPlan(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      movies_per_month: plan.movies_per_month,
      max_duration_minutes: plan.max_duration_minutes,
      rentals_per_month: plan.rentals_per_month,
      video_quality: plan.video_quality,
      has_ads: plan.has_ads,
      custom_characters: plan.custom_characters,
      can_publish_marketplace: plan.can_publish_marketplace,
      marketplace_commission: plan.marketplace_commission || 0,
      stripe_price_id: plan.stripe_price_id || "",
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Cargando planes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Planes de Suscripción</h2>
          <p className="text-foreground-muted">Gestiona los planes disponibles para los usuarios</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan: Plan) => (
          <Card key={plan.id} className={plan.is_active ? "" : "opacity-60"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {formatPrice(plan.price)}
                  <span className="text-sm font-normal text-foreground-muted">/mes</span>
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {plan.movies_per_month > 0 ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-foreground-muted" />
                  )}
                  <span>{plan.movies_per_month} películas/mes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Máx. {plan.max_duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{plan.rentals_per_month} alquileres/mes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Calidad {plan.video_quality.toUpperCase()}</span>
                </div>
                {plan.can_publish_marketplace && (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Publicar en marketplace</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(plan)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm("¿Estás seguro de eliminar este plan?")) {
                      deleteMutation.mutate(plan.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plan" : "Nuevo Plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="price">Precio (€/mes)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="movies_per_month">Películas/mes</Label>
                <Input
                  id="movies_per_month"
                  type="number"
                  min="0"
                  value={formData.movies_per_month}
                  onChange={(e) => setFormData({ ...formData, movies_per_month: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="max_duration_minutes">Duración máx. (min)</Label>
                <Input
                  id="max_duration_minutes"
                  type="number"
                  min="1"
                  value={formData.max_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, max_duration_minutes: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div>
                <Label htmlFor="rentals_per_month">Alquileres/mes</Label>
                <Input
                  id="rentals_per_month"
                  type="number"
                  min="0"
                  value={formData.rentals_per_month}
                  onChange={(e) => setFormData({ ...formData, rentals_per_month: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="video_quality">Calidad de Video</Label>
              <Select
                value={formData.video_quality}
                onValueChange={(value: "720p" | "1080p" | "4k") =>
                  setFormData({ ...formData, video_quality: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="4k">4k</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="has_ads">Tiene Anuncios</Label>
                <Switch
                  id="has_ads"
                  checked={formData.has_ads}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_ads: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="custom_characters">Personajes Personalizados</Label>
                <Switch
                  id="custom_characters"
                  checked={formData.custom_characters}
                  onCheckedChange={(checked) => setFormData({ ...formData, custom_characters: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="can_publish_marketplace">Puede Publicar en Marketplace</Label>
                <Switch
                  id="can_publish_marketplace"
                  checked={formData.can_publish_marketplace}
                  onCheckedChange={(checked) => setFormData({ ...formData, can_publish_marketplace: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Activo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            {formData.can_publish_marketplace && (
              <div>
                <Label htmlFor="marketplace_commission">Comisión Marketplace (%)</Label>
                <Input
                  id="marketplace_commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.marketplace_commission}
                  onChange={(e) => setFormData({ ...formData, marketplace_commission: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="stripe_price_id">Stripe Price ID (opcional)</Label>
              <Input
                id="stripe_price_id"
                value={formData.stripe_price_id}
                onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                placeholder="price_..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="secondary"
                onClick={resetForm}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {editingPlan ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

