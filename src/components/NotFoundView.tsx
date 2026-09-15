import Button from "@/components/Button";

/** 404 content (without header/footer), shared by the root not-found page and the missing-blog-post page. */
export default function NotFoundView() {
  return (
    <section className="bg-offwhite">
      <div className="container-x flex flex-col items-center gap-6 py-24 text-center lg:py-32">
        <p className="font-heading text-6xl font-semibold text-brand" aria-hidden="true">
          404
        </p>
        <h1 className="h1 text-navy">העמוד לא נמצא</h1>
        <p className="subheading max-w-[576px] text-muted">ייתכן שהקישור שגוי או שהעמוד הוסר.</p>
        <Button href="/">חזרה לדף הבית</Button>
      </div>
    </section>
  );
}
