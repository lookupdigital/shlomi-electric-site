"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lookup/admin/form-utils";
import { primaryButton } from "@/lookup/admin/styles";

type Props = {
  action: (formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
};

/** Submits to a Server Action without resetting the fields, and shows the returned message. */
export default function AdminForm({ action, children, submitLabel = "שמירה", className = "" }: Props) {
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
        setState({ ok: false, message: "הפעולה נכשלה. ייתכן שפג תוקף ההתחברות — רעננו את הדף." });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className={`flex flex-col gap-6 ${className}`}>
      {children}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-4 border-t border-line bg-page/95 py-4 backdrop-blur">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "שומר…" : submitLabel}
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
