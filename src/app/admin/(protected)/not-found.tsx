import Link from "next/link";
import { t } from "@/lookup/admin/i18n";
import { secondaryButton } from "@/lookup/admin/styles";
import { Card, PageHeader } from "@/lookup/admin/ui";

// notFound() inside an admin page (deleted lead, unknown post id) stays in the admin shell
// instead of falling through to the public site's 404 page.
export default function AdminNotFound() {
  return (
    <>
      <PageHeader title={t.common.notFoundTitle} />
      <Card>
        <p className="mb-4 text-sm text-muted">{t.common.notFoundDescription}</p>
        <Link href="/admin" className={secondaryButton}>
          {t.common.backToDashboard}
        </Link>
      </Card>
    </>
  );
}
