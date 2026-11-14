import { UpdateUserPreferencesInputSchema } from "@openmonetis/validators/preferences";
import { useForm } from "@tanstack/react-form";
import { useId, useState } from "react";
import { toast } from "sonner";
import { MobileFormContent as DialogContent } from "@/components/forms/mobile-form-content";
import { MobileFormDialog as Dialog } from "@/components/forms/mobile-form-dialog";
import { MobileFormState } from "@/components/forms/mobile-form-state";
import { MoneyValue } from "@/components/money-value";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateUserPreferencesMutation } from "@/features/preferences/preferences.mutations";
import { showInvalidFormToast } from "@/lib/form-feedback";

type MinimumBalanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Minimum in use now and whether the user chose it or it comes from the budgets. */
  minimumBalance: number;
  automatic: boolean;
};

/** Balance below which a day turns yellow (and orange below half of it) in the daily forecast. */
export function MinimumBalanceDialog({
  open,
  onOpenChange,
  minimumBalance,
  automatic,
}: MinimumBalanceDialogProps) {
  const id = useId();
  const updatePreferences = useUpdateUserPreferencesMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      automatic,
      amount: automatic ? "" : String(minimumBalance),
    },
    onSubmitInvalid: showInvalidFormToast,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const result = UpdateUserPreferencesInputSchema.safeParse({
        forecastMinimumBalance: value.automatic ? null : Number(value.amount),
      });
      if (!result.success) {
        showInvalidFormToast();
        return;
      }
      try {
        await updatePreferences.mutateAsync(result.data);
        toast.success("Saldo mínimo atualizado");
        onOpenChange(false);
      } catch {
        setSubmitError("Não foi possível salvar o saldo mínimo. Tente novamente.");
      }
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent guarded>
        <DialogHeader>
          <DialogTitle>Saldo mínimo</DialogTitle>
          <DialogDescription>
            Dias abaixo desse valor ficam amarelos; abaixo da metade, laranja; negativos, vermelhos.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          data-mobile-page-form
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

          <form.Field name="automatic">
            {(field) => (
              <div className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div className="grid gap-0.5">
                  <Label htmlFor={`${id}-automatic`}>Usar valor automático</Label>
                  <p className="text-muted-foreground text-xs">
                    Soma dos limites de orçamento do mês
                    {automatic ? (
                      <>
                        {" "}
                        (hoje <MoneyValue amount={minimumBalance} className="text-xs" />)
                      </>
                    ) : null}
                    .
                  </p>
                </div>
                <Switch
                  checked={field.state.value}
                  id={`${id}-automatic`}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.automatic}>
            {(isAutomatic) =>
              isAutomatic ? null : (
                <form.Field
                  name="amount"
                  validators={{
                    onBlur: ({ value }) =>
                      value !== "" && Number(value) >= 0 ? undefined : "Informe um valor.",
                  }}
                >
                  {(field) => (
                    <div className="grid gap-1.5">
                      <Label className="font-mono" htmlFor={`${id}-amount`}>
                        Valor que quer manter na conta
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
              )
            }
          </form.Subscribe>

          {submitError ? (
            <p className="text-destructive text-sm" role="alert">
              {submitError}
            </p>
          ) : null}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(submitting) => (
              <div className="grid w-full grid-cols-2 gap-2 [&>*]:w-full" data-mobile-form-actions>
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
                  {submitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
