import LeadForm from "@/components/LeadForm";

type Props = {
  id?: string;
  title: string;
  subtitle: string;
  withEmail?: boolean;
  withConsent?: boolean;
  submitLabel?: string;
};

export default function CtaSection({ id, title, subtitle, withEmail, withConsent, submitLabel }: Props) {
  return (
    <section id={id} className="scroll-mt-16 bg-navy lg:scroll-mt-20">
      <div className="container-x flex flex-col items-center gap-12 py-16 lg:py-20">
        <div className="flex flex-col items-center gap-4 text-center text-white">
          <h2 className="h2">{title}</h2>
          <p className="subheading opacity-80">{subtitle}</p>
        </div>
        <LeadForm
          withEmail={withEmail}
          withConsent={withConsent}
          submitLabel={submitLabel}
          className="w-full max-w-[600px]"
        />
      </div>
    </section>
  );
}
