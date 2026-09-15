"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile widget. Renders invisibly unless Cloudflare needs an interaction; writes the token into a
// hidden "cf-turnstile-response" input inside the form, which the server verifies.

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function Turnstile({ siteKey }: { siteKey: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          "refresh-expired": "auto",
          "response-field-name": "cf-turnstile-response",
        });
      })
      .catch(() => {
        // The server rejects the submission without a token; the visitor sees the verification message.
      });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return <div ref={container} />;
}

/** Waits briefly for the widget to produce a token (it is issued asynchronously after render). */
export async function waitForTurnstileToken(form: HTMLFormElement, timeoutMs = 6000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const input = form.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]');
    if (input?.value) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}
