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
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice, formatDate } from "@/lib/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import {
  Wallet,
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  History,
  TrendingUp,
} from "lucide-react";
import type { Payout } from "@/types/database";

interface WalletClientProps {
  walletBalance: number;
  bankAccountNumber: string;
  payouts: Payout[];
  earningsHistory: Array<{
    id: string;
    creator_earning: number;
    price_paid: number;
    created_at: string;
    movies: {
      id: string;
      title: string;
      thumbnail_url: string | null;
    } | null;
  }>;
}

export function WalletClient({
  walletBalance,
  bankAccountNumber,
  payouts,
  earningsHistory,
}: WalletClientProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRequesting, setIsRequesting] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const completedPayouts = payouts.filter((p) => p.status === "completed");
  const failedPayouts = payouts.filter(
    (p) => p.status === "failed" || p.status === "cancelled"
  );

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await fetch(API_ENDPOINTS.payouts.request, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al solicitar liquidación");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Solicitud de liquidación creada correctamente");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setIsRequesting(false);
      setPayoutAmount("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleRequestPayout = () => {
    if (!bankAccountNumber) {
      toast.error("Debes configurar tu número de cuenta primero");
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (amount > walletBalance) {
      toast.error("Saldo insuficiente");
      return;
    }

    requestPayoutMutation.mutate(amount);
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
        title="Mi Monedero"
        subtitle="Gestiona tus ingresos y solicita liquidaciones"
      />

      {/* Balance Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-background-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Saldo Disponible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">
              {formatPrice(walletBalance)}
            </span>
          </div>
          <p className="text-sm text-foreground-muted mt-2">
            Ingresos acumulados por alquileres de tus películas
          </p>
          {!bankAccountNumber && (
            <div className="mt-4 p-3 bg-warning/20 border border-warning rounded-lg">
              <p className="text-sm text-warning">
                ⚠️ Configura tu número de cuenta en Configuración para poder
                solicitar liquidaciones
              </p>
            </div>
          )}
          {bankAccountNumber && walletBalance > 0 && (
            <Button
              className="mt-4"
              onClick={() => setIsRequesting(true)}
              disabled={walletBalance <= 0}
            >
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Solicitar Liquidación
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(
                earningsHistory.reduce(
                  (sum, e) => sum + (e.creator_earning || 0),
                  0
                )
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Desde el inicio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Liquidado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(
                completedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0)
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              {completedPayouts.length} liquidaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(
                pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0)
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              {pendingPayouts.length} solicitudes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">
            Ingresos ({earningsHistory.length})
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Liquidaciones ({payouts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="mt-6">
          <div className="space-y-4">
            {earningsHistory.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-foreground-muted">
                  No hay ingresos registrados aún
                </CardContent>
              </Card>
            ) : (
              earningsHistory.map((earning) => (
                <Card key={earning.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {earning.movies?.thumbnail_url && (
                          <img
                            src={earning.movies.thumbnail_url}
                            alt={earning.movies.title}
                            className="w-16 h-24 object-cover rounded"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold">
                            {earning.movies?.title || "Película eliminada"}
                          </h3>
                          <p className="text-sm text-foreground-muted">
                            {formatDate(earning.created_at)}
                          </p>
                          <p className="text-xs text-foreground-subtle mt-1">
                            Precio alquiler: {formatPrice(earning.price_paid)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-success">
                          +{formatPrice(earning.creator_earning)}
                        </div>
                        <p className="text-xs text-foreground-muted">
                          Añadido al monedero
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="mt-6">
          <div className="space-y-4">
            {payouts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-foreground-muted">
                  No hay liquidaciones registradas
                </CardContent>
              </Card>
            ) : (
              payouts.map((payout) => (
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
                            Solicitada: {formatDate(payout.created_at)}
                          </div>
                          {payout.processed_at && (
                            <div>
                              Procesada: {formatDate(payout.processed_at)}
                            </div>
                          )}
                          {payout.transaction_reference && (
                            <div>
                              <span className="font-medium">Referencia:</span>{" "}
                              {payout.transaction_reference}
                            </div>
                          )}
                          {payout.notes && (
                            <div>
                              <span className="font-medium">Notas:</span>{" "}
                              {payout.notes}
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
      </Tabs>

      {/* Dialog para solicitar liquidación */}
      <Dialog open={isRequesting} onOpenChange={setIsRequesting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Liquidación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-foreground-muted mb-2">
                Saldo disponible: <strong>{formatPrice(walletBalance)}</strong>
              </p>
              <p className="text-sm text-foreground-muted mb-2">
                Cuenta: <strong className="font-mono">{bankAccountNumber}</strong>
              </p>
            </div>
            <InputWrapper
              label="Monto a Liquidar (€)"
              type="number"
              min="0"
              step="0.01"
              max={walletBalance}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-foreground-muted">
              El monto será descontado de tu monedero y procesado por un
              administrador. La transferencia se realizará a tu cuenta bancaria
              configurada.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setIsRequesting(false);
                setPayoutAmount("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={
                requestPayoutMutation.isPending ||
                !payoutAmount ||
                parseFloat(payoutAmount) <= 0 ||
                parseFloat(payoutAmount) > walletBalance
              }
            >
              {requestPayoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Solicitar Liquidación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

