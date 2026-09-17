"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { dangerButton, primaryButton } from "@/lookup/admin/styles";

type Props = {
  action: (formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
  /** "page" = sticky save bar for long forms; "inline" = compact button for small forms. */
  variant?: "page" | "inline";
  danger?: boolean;
};

/** Submits to a Server Action without resetting the fields, and shows the returned message. */
export default function AdminForm({ action, children, submitLabel, className = "", variant = "page", danger = false }: Props) {
  const [state, setState] = useState<FormState>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState(null);
    startTransition(async () => {
      try {
        setState(await action(formData));
      } catch (error) {
        if (String((error as Error)?.message).includes("NEXT_REDIRECT")) throw error;
        setState({ ok: false, message: t.common.actionFailed });
      }
    });
  }

  const footer =
    variant === "page"
      ? "sticky bottom-0 z-10 flex flex-wrap items-center gap-4 border-t border-line bg-page/95 py-4 backdrop-blur"
      : "flex flex-wrap items-center gap-3";

  return (
    <form onSubmit={onSubmit} className={`flex flex-col ${variant === "page" ? "gap-6" : "gap-3"} ${className}`}>
      {children}
      <div className={footer}>
        <button type="submit" disabled={pending} className={danger ? dangerButton : primaryButton}>
          {pending ? t.common.saving : submitLabel}
        </button>
        {state && (
          <p role={state.ok ? "status" : "alert"} className={`text-sm font-semibold ${state.ok ? "text-green-700" : "text-red-700"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
