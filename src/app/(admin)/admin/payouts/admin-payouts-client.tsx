"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { TextareaWrapper } from "@/components/ui/textarea-wrapper";
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice, formatDate } from "@/lib/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  DollarSign,
  User,
  Calendar,
} from "lucide-react";
import type { Payout } from "@/types/database";

interface AdminPayoutsClientProps {
  payouts: (Payout & {
    profiles?: {
      id: string;
      full_name: string | null;
      email: string;
    };
  })[];
  totalPending: number;
  totalCompleted: number;
}

export function AdminPayoutsClient({
  payouts,
  totalPending,
  totalCompleted,
}: AdminPayoutsClientProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const processingPayouts = payouts.filter((p) => p.status === "processing");
  const completedPayouts = payouts.filter((p) => p.status === "completed");
  const failedPayouts = payouts.filter(
    (p) => p.status === "failed" || p.status === "cancelled"
  );

  const processMutation = useMutation({
    mutationFn: async ({
      payoutId,
      status,
      transactionRef,
      notes,
    }: {
      payoutId: string;
      status: string;
      transactionRef: string;
      notes: string;
    }) => {
      const response = await fetch(API_ENDPOINTS.payouts.list, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process",
          payout_id: payoutId,
          status,
          transaction_reference: transactionRef,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al procesar liquidación");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Liquidación procesada correctamente");
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      setSelectedPayout(null);
      setTransactionRef("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleProcess = (payout: Payout, status: "completed" | "failed") => {
    setSelectedPayout(payout);
    setIsProcessing(true);
  };

  const confirmProcess = () => {
    if (!selectedPayout) return;

    processMutation.mutate({
      payoutId: selectedPayout.id,
      status: "completed",
      transactionRef,
      notes,
    });
    setIsProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Procesando
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completada
          </Badge>
        );
      case "failed":
      case "cancelled":
        return (
          <Badge variant="error" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {status === "failed" ? "Fallida" : "Cancelada"}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Liquidaciones"
        subtitle="Gestiona las solicitudes de liquidación de los usuarios"
      />

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayouts.length}</div>
            <p className="text-xs text-foreground-muted mt-1">
              {formatPrice(totalPending)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Completadas (30d)
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPayouts.length}</div>
            <p className="text-xs text-foreground-muted mt-1">
              {formatPrice(totalCompleted)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Total Liquidado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(
                payouts
                  .filter((p) => p.status === "completed")
                  .reduce((sum, p) => sum + (p.amount || 0), 0)
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Desde el inicio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes ({pendingPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Procesando ({processingPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completadas ({completedPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Fallidas ({failedPayouts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-4">
            {pendingPayouts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-foreground-muted">
                  No hay liquidaciones pendientes
                </CardContent>
              </Card>
            ) : (
              pendingPayouts.map((payout) => (
                <Card key={payout.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(payout.status)}
                          <span className="text-lg font-bold text-primary">
                            {formatPrice(payout.amount)}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-foreground-muted">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>
                              {payout.profiles?.full_name || payout.profiles?.email || "Usuario"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Solicitada: {formatDate(payout.created_at)}</span>
                          </div>
                          <div>
                            <span className="font-medium">Cuenta:</span>{" "}
                            {payout.bank_account_number}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleProcess(payout, "completed")}
                        >
                          Marcar como Completada
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleProcess(payout, "failed")}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="processing" className="mt-6">
          <div className="space-y-4">
            {processingPayouts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-foreground-muted">
                  No hay liquidaciones en proceso
                </CardContent>
              </Card>
            ) : (
              processingPayouts.map((payout) => (
                <Card key={payout.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        {getStatusBadge(payout.status)}
                        <div className="mt-2">
                          <span className="text-lg font-bold">
                            {formatPrice(payout.amount)}
                          </span>
                        </div>
                        <div className="text-sm text-foreground-muted mt-1">
                          {payout.profiles?.full_name || payout.profiles?.email}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="space-y-4">
            {completedPayouts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-foreground-muted">
                  No hay liquidaciones completadas
                </CardContent>
              </Card>
            ) : (
              completedPayouts.map((payout) => (
                <Card key={payout.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        {getStatusBadge(payout.status)}
                        <div className="mt-2">
                          <span className="text-lg font-bold">
                            {formatPrice(payout.amount)}
                          </span>
                        </div>
                        <div className="text-sm text-foreground-muted mt-1 space-y-1">
                          <div>
                            {payout.profiles?.full_name || payout.profiles?.email}
                          </div>
                          {payout.transaction_reference && (
                            <div>
                              <span className="font-medium">Referencia:</span>{" "}
                              {payout.transaction_reference}
                            </div>
                          )}
                          {payout.processed_at && (
                            <div>
                              Procesada: {formatDate(payout.processed_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="failed" className="mt-6">
          <div className="space-y-4">
            {failedPayouts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-foreground-muted">
                  No hay liquidaciones fallidas
                </CardContent>
              </Card>
            ) : (
              failedPayouts.map((payout) => (
                <Card key={payout.id}>
                  <CardContent className="p-4">
                    <div>
                      {getStatusBadge(payout.status)}
                      <div className="mt-2">
                        <span className="text-lg font-bold">
                          {formatPrice(payout.amount)}
                        </span>
                      </div>
                      <div className="text-sm text-foreground-muted mt-1">
                        {payout.profiles?.full_name || payout.profiles?.email}
                      </div>
                      {payout.notes && (
                        <div className="text-sm text-foreground-muted mt-2">
                          <span className="font-medium">Notas:</span> {payout.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para procesar liquidación */}
      <Dialog open={isProcessing} onOpenChange={setIsProcessing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procesar Liquidación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayout && (
              <>
                <div>
                  <p className="text-sm text-foreground-muted">Usuario:</p>
                  <p className="font-medium">
                    {selectedPayout.profiles?.full_name || selectedPayout.profiles?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Monto:</p>
                  <p className="font-bold text-lg text-primary">
                    {formatPrice(selectedPayout.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Cuenta:</p>
                  <p className="font-mono">{selectedPayout.bank_account_number}</p>
                </div>
                <InputWrapper
                  label="Referencia de Transacción"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Ej: TRF-2024-001234"
                />
                <TextareaWrapper
                  label="Notas (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notas adicionales sobre la liquidación..."
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setIsProcessing(false);
                setTransactionRef("");
                setNotes("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmProcess} disabled={processMutation.isPending}>
              {processMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Confirmar Liquidación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

