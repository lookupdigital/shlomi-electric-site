import { NextResponse, type NextRequest } from "next/server";
import { t } from "@/lookup/admin/i18n";
import { getAdminContext } from "@/lookup/auth";
import { toCsv } from "@/lookup/leads/csv";
import { applyLeadFilters, parseLeadFilters } from "@/lookup/leads/filters";

const EXPORT_SELECT =
  "id,created_at,status,name,phone,email,project_type,message,consent,form_name,landing_page,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,gclid,gbraid,wbraid,fbclid,ttclid,notification_status" as const;

const EXPORT_COLUMNS = EXPORT_SELECT.split(",").map((key) => ({ key, label: key }));

/** CSV export of the leads matching the list filters. Admin session required; never cached. */
export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context.status !== "admin") {
    return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const filters = parseLeadFilters(request.nextUrl.searchParams);
  const { data, error } = await applyLeadFilters(context.supabase.from("leads").select(EXPORT_SELECT), filters)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) return new NextResponse(t.leads.exportFailed, { status: 500, headers: { "Cache-Control": "no-store" } });

  // A UTF-8 BOM makes spreadsheet apps read non-Latin text correctly.
  const csv = `﻿${toCsv(EXPORT_COLUMNS, (data ?? []) as Record<string, unknown>[])}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
