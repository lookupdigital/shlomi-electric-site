"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { checkbox, firstIssue, formEntries, httpUrl, imageUrl, optional, type FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { requireAdmin } from "@/lookup/auth";
import { PAGE_SEO_TAG } from "@/lookup/seo";
import { siteConfig } from "@/site.config";

const EDITABLE_PATHS = new Set<string>([...siteConfig.routes.corePages, siteConfig.routes.blog].map((route) => route.path));

const pageSeoSchema = z.object({
  path: z.string().refine((path) => EDITABLE_PATHS.has(path), t.pages.unknownPage),
  meta_title: optional(z.string().max(200)),
  meta_description: optional(z.string().max(500)),
  canonical_url: optional(httpUrl),
  og_title: optional(z.string().max(200)),
  og_description: optional(z.string().max(500)),
  og_image_url: optional(imageUrl),
  robots_index: checkbox,
  robots_follow: checkbox,
});

const LABELS = { canonical_url: "Canonical", og_image_url: "OG image", meta_title: "Meta title" };

export async function savePageSeo(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = pageSeoSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, LABELS) };

  const { data, error } = await supabase.from("page_seo").upsert(parsed.data, { onConflict: "path" }).select("path");
  if (error) return { ok: false, message: t.common.saveFailed(error.message) };
  if (!data?.length) return { ok: false, message: t.common.noPermission };

  updateTag(PAGE_SEO_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: t.pages.saved };
}
