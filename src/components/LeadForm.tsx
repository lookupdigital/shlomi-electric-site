"use client";

import Image from "next/image";
import { useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { projectTypes } from "@/lib/site";
import { track } from "@/lookup/analytics/events";
import { ATTRIBUTION_KEYS, getStoredAttribution } from "@/lookup/attribution";
import { submitLead } from "@/lookup/leads/actions";

type Props = {
  /** Identifies the form in the leads table and in analytics, e.g. "home_hero". */
  formName: string;
  withEmail?: boolean;
  withConsent?: boolean;
  submitLabel?: string;
  className?: string;
};

const SERVER_ERROR = "לא הצלחנו לשלוח את הפרטים. נסו שוב בעוד רגע או התקשרו אלינו.";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-heading text-sm font-bold text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function LeadForm({
  formName,
  withEmail = false,
  withConsent = false,
  submitLabel = "קבלו הצעת מחיר",
  className = "",
}: Props) {
  const id = useId();
  const [projectType, setProjectType] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const started = useRef(false);
  const submitting = useRef(false);
  const submissionId = useRef<string | null>(null);

  function handleStart() {
    if (started.current) return;
    started.current = true;
    track({ event: "form_start", form_name: formName, page_path: window.location.pathname });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;

    const page_path = window.location.pathname;
    const formData = new FormData(e.currentTarget);
    // One id per form view: a retried request cannot create a second lead.
    submissionId.current ??= crypto.randomUUID();
    formData.set("form_name", formName);
    formData.set("submission_id", submissionId.current);
    if (withConsent) formData.set("consent_required", "1");

    const attribution = getStoredAttribution();
    for (const key of ATTRIBUTION_KEYS) {
      const value = attribution?.[key];
      if (value) formData.set(key, value);
    }
    formData.set("landing_page", attribution?.landing_page ?? page_path);
    if (attribution?.referrer) formData.set("referrer", attribution.referrer);

    setError(null);
    startTransition(async () => {
      try {
        const result = await submitLead(formData);
        if (result.ok) {
          // The conversion fires only after the server confirmed the lead was stored.
          track({ event: "generate_lead", form_name: formName, page_path, lead_type: result.leadType });
          setSent(true);
          return;
        }
        setError(result.error === "validation" ? result.message : SERVER_ERROR);
        track({ event: "form_submit_error", form_name: formName, page_path, error_type: result.error });
      } catch {
        setError(SERVER_ERROR);
        track({ event: "form_submit_error", form_name: formName, page_path, error_type: "network" });
      }
      submitting.current = false;
    });
  }

  if (sent) {
    return (
      <div role="status" className={`flex flex-col items-center gap-3 rounded-xl bg-white p-10 text-center ${className}`}>
        <span className="grid size-12 place-items-center rounded-full bg-cream">
          <Image src="/icons/check.svg" alt="" width={24} height={24} />
        </span>
        <p className="font-heading text-xl font-semibold text-ink">תודה! הפרטים התקבלו</p>
        <p className="text-[15px] text-muted">נחזור אליכם בהקדם.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={handleStart}
      className={`flex flex-col gap-6 rounded-xl bg-white p-6 sm:p-10 ${className}`}
    >
      <Field id={`${id}-name`} label="שם מלא">
        <input id={`${id}-name`} name="name" required autoComplete="name" placeholder="ישראל ישראלי" className="field" />
      </Field>

      <Field id={`${id}-phone`} label="טלפון">
        <input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="050-1234567"
          className="field text-right"
        />
      </Field>

      {withEmail && (
        <Field id={`${id}-email`} label="אימייל (לא חובה)">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="israel@company.co.il"
            className="field text-right"
          />
        </Field>
      )}

      <Field id={`${id}-type`} label="סוג הפרויקט">
        <div className="relative">
          <select
            id={`${id}-type`}
            name="projectType"
            required
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className={`field appearance-none pe-10 ${projectType ? "text-ink" : "text-muted"}`}
          >
            <option value="" disabled>
              בחרו את סוג הפרויקט
            </option>
            {projectTypes.map((type) => (
              <option key={type} value={type} className="text-ink">
                {type}
              </option>
            ))}
          </select>
          <Image
            src="/icons/chevron-select.svg"
            alt=""
            width={16}
            height={16}
            className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2"
          />
        </div>
      </Field>

      <Field id={`${id}-message`} label="הודעה">
        <textarea
          id={`${id}-message`}
          name="message"
          placeholder="ספרו לנו קצת על הפרויקט שלכם..."
          className="field h-[100px] resize-none"
        />
      </Field>

      {withConsent && (
        <label className="flex items-center gap-3 text-[13px] text-graphite">
          <input type="checkbox" name="consent" required className="consent" />
          אני מאשר/ת יצירת קשר בהתאם למדיניות הפרטיות.
        </label>
      )}

      {/* Honeypot for bots — hidden from people and assistive technology. */}
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {error && (
        <p role="alert" className="font-heading text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-[46px] w-full rounded-lg bg-brand px-6 font-heading text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "שולחים…" : submitLabel}
      </button>
    </form>
  );
}
