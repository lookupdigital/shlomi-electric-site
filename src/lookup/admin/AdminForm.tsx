"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode, type RefObject } from "react";
import type { FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { dangerButton, primaryButton } from "@/lookup/admin/styles";
import { useUnsavedChanges } from "@/lookup/admin/unsaved-changes";

type Props = {
  action: (formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
  /** "page" = sticky save bar for long forms; "inline" = compact button for small forms. */
  variant?: "page" | "inline";
  danger?: boolean;
  /** Warn before leaving the page while the form has unsaved edits (edit forms, not one-click actions). */
  guardUnsaved?: boolean;
  /** For editors that manage their own state around the form (the post editor). */
  formRef?: RefObject<HTMLFormElement | null>;
  /** Called after the action: its result, or "redirect" when it navigated away (e.g. a created post). */
  onResult?: (result: FormState | "redirect", submitted: FormData) => void;
  /** Extra status shown next to the submit button (e.g. autosave state). */
  status?: ReactNode;
};

/** Submits to a Server Action without resetting the fields, and shows the returned message. */
export default function AdminForm({
  action,
  children,
  submitLabel,
  className = "",
  variant = "page",
  danger = false,
  guardUnsaved = false,
  formRef,
  onResult,
  status,
}: Props) {
  const [state, setState] = useState<FormState>(null);
  const [pending, startTransition] = useTransition();
  const ownRef = useRef<HTMLFormElement>(null);
  const ref = formRef ?? ownRef;
  const guard = useUnsavedChanges(ref, guardUnsaved);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState(null);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (guardUnsaved && result?.ok) guard.markSaved();
        onResult?.(result, formData);
        setState(result);
      } catch (error) {
        if (String((error as Error)?.message).includes("NEXT_REDIRECT")) {
          if (guardUnsaved) guard.markSaved();
          onResult?.("redirect", formData);
          throw error;
        }
        onResult?.({ ok: false, message: t.common.actionFailed }, formData);
        setState({ ok: false, message: t.common.actionFailed });
      }
    });
  }

  const footer =
    variant === "page"
      ? "sticky bottom-0 z-10 flex flex-wrap items-center gap-4 border-t border-line bg-page/95 py-4 backdrop-blur"
      : "flex flex-wrap items-center gap-3";

  return (
    <form ref={ref} onSubmit={onSubmit} className={`flex flex-col ${variant === "page" ? "gap-6" : "gap-3"} ${className}`}>
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
        {status}
      </div>
    </form>
  );
}
