import { maxForecastSimulationInstallments } from "@openmonetis/domain/forecast-simulations";
import {
  type CreateForecastSimulationInput,
  CreateForecastSimulationInputSchema,
  type ForecastSimulationOutput,
  type UpdateForecastSimulationInput,
  UpdateForecastSimulationInputSchema,
} from "@openmonetis/validators/forecast-simulations";
import { useForm } from "@tanstack/react-form";
import { useId, useState } from "react";
import { MobileFormContent as DialogContent } from "@/components/forms/mobile-form-content";
import { MobileFormDialog as Dialog } from "@/components/forms/mobile-form-dialog";
import { MobileFormState } from "@/components/forms/mobile-form-state";
import { PeriodPicker } from "@/components/period-picker";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showInvalidFormToast } from "@/lib/form-feedback";

type ForecastSimulationDialogProps = {
  simulation: ForecastSimulationOutput | null;
  defaultPeriod: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateForecastSimulationInput | UpdateForecastSimulationInput) => Promise<void>;
  open: boolean;
};

export function ForecastSimulationDialog({
  simulation,
  defaultPeriod,
  onOpenChange,
  onSubmit,
  open,
}: ForecastSimulationDialogProps) {
  const id = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const editing = Boolean(simulation);
  const form = useForm({
    defaultValues: {
      description: simulation?.description ?? "",
      amount: simulation ? String(simulation.amount) : "",
      installmentCount: String(simulation?.installmentCount ?? 1),
      firstPeriod: simulation?.firstPeriod ?? defaultPeriod,
    },
    onSubmitInvalid: showInvalidFormToast,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const input = {
        description: value.description,
        amount: Number(value.amount),
        installmentCount: Number(value.installmentCount),
        firstPeriod: value.firstPeriod,
      };
      const result = editing
        ? UpdateForecastSimulationInputSchema.safeParse(input)
        : CreateForecastSimulationInputSchema.safeParse(input);
      if (!result.success) {
        showInvalidFormToast();
        return;
      }
      try {
        await onSubmit(result.data);
        onOpenChange(false);
      } catch {
        setSubmitError("Não foi possível salvar a simulação. Tente novamente.");
      }
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent guarded>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar simulação" : "Simular uma compra"}</DialogTitle>
          <DialogDescription>
            A simulação só aparece na projeção de saldo. Nenhum lançamento é criado.
          </DialogDescription>
        </DialogHeader>

        <form
          data-mobile-page-form
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Subscribe
            selector={(state) => ({
              isDirty: !state.isDefaultValue,
              isSubmitting: state.isSubmitting,
            })}
          >
            {(state) => <MobileFormState {...state} />}
          </form.Subscribe>

          <form.Field
            name="description"
            validators={{
              onBlur: ({ value }) =>
                CreateForecastSimulationInputSchema.shape.description.safeParse(value).success
                  ? undefined
                  : "Descreva a compra.",
            }}
          >
            {(field) => (
              <div className="grid gap-1.5">
                <Label className="font-mono" htmlFor={`${id}-description`}>
                  O que pretende comprar
                </Label>
                <Input
                  aria-invalid={field.state.meta.errors.length > 0}
                  id={`${id}-description`}
                  maxLength={120}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Ex.: celular novo"
                  value={field.state.value}
                />
                {field.state.meta.errors[0] ? (
                  <p className="text-destructive text-xs" role="alert">
                    {field.state.meta.errors[0]}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field
            name="amount"
            validators={{
              onBlur: ({ value }) =>
                CreateForecastSimulationInputSchema.shape.amount.safeParse(Number(value)).success
                  ? undefined
                  : "Informe um valor maior que zero.",
            }}
          >
            {(field) => (
              <div className="grid gap-1.5">
                <Label className="font-mono" htmlFor={`${id}-amount`}>
                  Valor total
                </Label>
                <CurrencyInput
                  aria-invalid={field.state.meta.errors.length > 0}
                  id={`${id}-amount`}
                  onBlur={field.handleBlur}
                  onValueChange={field.handleChange}
                  placeholder="R$ 0,00"
                  value={field.state.value}
                />
                {field.state.meta.errors[0] ? (
                  <p className="text-destructive text-xs" role="alert">
                    {field.state.meta.errors[0]}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field
              name="installmentCount"
              validators={{
                onBlur: ({ value }) =>
                  CreateForecastSimulationInputSchema.shape.installmentCount.safeParse(
                    Number(value),
                  ).success
                    ? undefined
                    : `Use de 1 a ${maxForecastSimulationInstallments} parcelas.`,
              }}
            >
              {(field) => (
                <div className="grid gap-1.5">
                  <Label className="font-mono" htmlFor={`${id}-installments`}>
                    Parcelas
                  </Label>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
                    id={`${id}-installments`}
                    inputMode="numeric"
                    max={maxForecastSimulationInstallments}
                    min={1}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    type="number"
                    value={field.state.value}
                  />
                  {field.state.meta.errors[0] ? (
                    <p className="text-destructive text-xs" role="alert">
                      {field.state.meta.errors[0]}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">1 para compra à vista.</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="firstPeriod">
              {(field) => (
                <div className="grid gap-1.5">
                  <Label className="font-mono" htmlFor={`${id}-period`}>
                    Primeiro mês
                  </Label>
                  <PeriodPicker
                    id={`${id}-period`}
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                  <p className="text-muted-foreground text-xs">
                    No cartão, o mês da primeira fatura.
                  </p>
                </div>
              )}
            </form.Field>
          </div>

          {submitError ? (
            <p className="text-destructive text-sm" role="alert">
              {submitError}
            </p>
          ) : null}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(submitting) => (
              <div data-mobile-form-actions className="grid w-full grid-cols-2 gap-2 [&>*]:w-full">
                <Button
                  data-mobile-cancel
                  disabled={submitting}
                  onClick={() => onOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button disabled={submitting} type="submit">
                  {submitting ? "Salvando..." : editing ? "Atualizar" : "Simular"}
                </Button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
