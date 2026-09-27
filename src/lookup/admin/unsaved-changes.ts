"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { leavesPage, sameSnapshot, snapshotEntries, type FieldSnapshot } from "@/lookup/admin/content-safety";
import { t } from "@/lookup/admin/i18n";

// One shared guard for every registered Admin form: a single beforeunload listener (refresh / tab close / typed URL)
// and a single capture-phase click listener for links inside the Admin (client-side navigation).

const dirtyCheckers = new Set<() => boolean>();
const anyDirty = () => [...dirtyCheckers].some((isDirty) => isDirty());

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!anyDirty()) return;
  event.preventDefault();
  event.returnValue = "";
}

function onClickCapture(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!link || !leavesPage({ href: link.href, target: link.target, download: link.hasAttribute("download") }, event, location.href)) return;
  if (!anyDirty() || window.confirm(t.common.unsavedConfirm)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function register(isDirty: () => boolean) {
  if (dirtyCheckers.size === 0) {
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
  }
  dirtyCheckers.add(isDirty);
  return () => {
    dirtyCheckers.delete(isDirty);
    if (dirtyCheckers.size === 0) {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    }
  };
}

export function formSnapshot(form: HTMLFormElement | null): FieldSnapshot {
  return form ? snapshotEntries(new FormData(form).entries()) : {};
}

/**
 * Protects a form against accidental navigation while it differs from its last saved state. The baseline is taken
 * after mount and moved forward with `markSaved` after a successful save (or autosave).
 */
export function useUnsavedChanges(formRef: RefObject<HTMLFormElement | null>, enabled = true) {
  const baseline = useRef<FieldSnapshot | null>(null);

  const isDirty = useCallback(() => {
    if (!baseline.current || !formRef.current) return false;
    return !sameSnapshot(formSnapshot(formRef.current), baseline.current);
  }, [formRef]);

  const markSaved = useCallback(
    (snapshot?: FieldSnapshot) => {
      baseline.current = snapshot ?? formSnapshot(formRef.current);
    },
    [formRef],
  );

  useEffect(() => {
    if (!enabled) return;
    baseline.current = formSnapshot(formRef.current);
    return register(isDirty);
  }, [enabled, formRef, isDirty]);

  return { isDirty, markSaved, baseline: () => baseline.current };
}
