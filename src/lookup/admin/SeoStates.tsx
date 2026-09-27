import { t } from "@/lookup/admin/i18n";
import { Badge, type Tone } from "@/lookup/admin/ui";
import type { SeoState, SeoStateLevel } from "@/lookup/seo-model";

const LEVEL_TONES: Record<SeoStateLevel, Tone> = { problem: "error", improve: "warning", info: "muted" };

export function seoStateLabel(state: SeoState): string {
  const s = t.seo.states;
  switch (state.id) {
    case "titleTooLong":
      return s.titleTooLong(state.length);
    case "descriptionTooLong":
      return s.descriptionTooLong(state.length);
    default:
      return s[state.id];
  }
}

/** Factual SEO state badges. "Complete" when nothing needs attention; informational choices are shown neutrally. */
export default function SeoStates({ states }: { states: SeoState[] }) {
  const needsWork = states.some((state) => state.level !== "info");
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {!needsWork && <Badge tone="success">{t.seo.complete}</Badge>}
      {states.map((state) => (
        <Badge key={state.id} tone={LEVEL_TONES[state.level]}>
          <span className="sr-only">{t.seo.levels[state.level]}: </span>
          {seoStateLabel(state)}
        </Badge>
      ))}
    </span>
  );
}
