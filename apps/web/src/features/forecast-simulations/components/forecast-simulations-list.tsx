import type {
  CreateForecastSimulationInput,
  ForecastSimulationOutput,
  UpdateForecastSimulationInput,
} from "@openmonetis/validators/forecast-simulations";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardActionsMenu } from "@/components/card-actions-menu";
import { MoneyValue } from "@/components/money-value";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  useCreateForecastSimulationMutation,
  useDeleteForecastSimulationMutation,
  useUpdateForecastSimulationMutation,
} from "../forecast-simulations.mutations";
import { formatForecastSimulationSchedule } from "../forecast-simulations.presentation";
import { forecastSimulationsQueryOptions } from "../forecast-simulations.queries";
import { ForecastSimulationDialog } from "./forecast-simulation-dialog";

type DialogState = { open: false } | { open: true; simulation: ForecastSimulationOutput | null };

/**
 * Saved "what if I buy this?" drafts. Each one can be switched on or off to compare the forecast
 * with and without it, without deleting the draft.
 */
export function ForecastSimulationsList({ defaultPeriod }: { defaultPeriod: string }) {
  const query = useQuery(forecastSimulationsQueryOptions());
  const createMutation = useCreateForecastSimulationMutation();
  const updateMutation = useUpdateForecastSimulationMutation();
  const deleteMutation = useDeleteForecastSimulationMutation();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const editing = dialog.open ? dialog.simulation : null;

  const toggle = async (simulation: ForecastSimulationOutput, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id: simulation.id, input: { isActive } });
    } catch {
      toast.error("Não foi possível atualizar a simulação.");
    }
  };

  const remove = async (simulation: ForecastSimulationOutput) => {
    try {
      await deleteMutation.mutateAsync(simulation.id);
      toast.success("Simulação removida");
    } catch {
      toast.error("Não foi possível remover a simulação.");
    }
  };

  return (
    <Card className="gap-4 border shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle className="flex items-center gap-2">
            <FlaskConical aria-hidden="true" className="size-4 text-muted-foreground" />
            Simulações de compra
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Veja como uma compra por impulso afeta o saldo dos próximos meses.
          </p>
        </div>
        <Button onClick={() => setDialog({ open: true, simulation: null })} size="sm" type="button">
          <Plus aria-hidden="true" /> Simular compra
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div aria-label="Carregando simulações" className="grid gap-2" role="status">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}
        {query.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>Não foi possível carregar as simulações.</p>
            <Button onClick={() => void query.refetch()} size="sm" type="button" variant="outline">
              <RefreshCw aria-hidden="true" /> Tentar novamente
            </Button>
          </div>
        ) : null}
        {query.data && query.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma simulação salva. Simule uma compra para ver o impacto antes de decidir.
          </p>
        ) : null}
        {query.data && query.data.length > 0 ? (
          <ul className="divide-y">
            {query.data.map((simulation) => (
              <li className="flex items-center gap-3 py-3" key={simulation.id}>
                <Switch
                  aria-label={`Incluir "${simulation.description}" na projeção`}
                  checked={simulation.isActive}
                  disabled={updateMutation.isPending}
                  onCheckedChange={(checked) => void toggle(simulation, checked)}
                />
                <div
                  className={cn(
                    "grid min-w-0 flex-1 gap-0.5",
                    !simulation.isActive && "opacity-60",
                  )}
                >
                  <p className="truncate font-medium text-sm">{simulation.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatForecastSimulationSchedule(simulation)}
                    {simulation.installmentCount > 1 ? (
                      <>
                        {" · "}
                        <MoneyValue amount={simulation.installmentAmount} className="text-xs" />
                        /mês
                      </>
                    ) : null}
                  </p>
                </div>
                <MoneyValue
                  amount={simulation.amount}
                  className={cn("font-medium text-sm", !simulation.isActive && "opacity-60")}
                />
                <CardActionsMenu
                  disabled={deleteMutation.isPending}
                  label={`Mais ações para ${simulation.description}`}
                >
                  <DropdownMenuItem onClick={() => setDialog({ open: true, simulation })}>
                    <Pencil aria-hidden="true" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void remove(simulation)} variant="destructive">
                    <Trash2 aria-hidden="true" /> Remover
                  </DropdownMenuItem>
                </CardActionsMenu>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>

      <ForecastSimulationDialog
        defaultPeriod={defaultPeriod}
        key={`${editing?.id ?? "new"}-${dialog.open ? "open" : "closed"}`}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false });
        }}
        onSubmit={async (input) => {
          if (editing) {
            await updateMutation.mutateAsync({
              id: editing.id,
              input: input as UpdateForecastSimulationInput,
            });
            toast.success("Simulação atualizada");
          } else {
            await createMutation.mutateAsync(input as CreateForecastSimulationInput);
            toast.success("Simulação salva");
          }
        }}
        open={dialog.open}
        simulation={editing}
      />
    </Card>
  );
}
