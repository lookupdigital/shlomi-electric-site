"use client";

import type { ReactNode } from "react";

/** Submit button that asks for confirmation before the form's Server Action runs. */
export default function ConfirmSubmit({ message, className, children }: { message: string; className: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
