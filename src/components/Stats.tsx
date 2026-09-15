export type Stat = { value: string; label: string };

type Props = {
  items: Stat[];
  title?: string;
  className?: string;
};

export default function Stats({ items, title, className = "py-12" }: Props) {
  return (
    <section className={`bg-mint ${className}`}>
      <div className="container-x flex flex-col items-center gap-12">
        {title && <h2 className="h2 text-center text-navy">{title}</h2>}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:flex md:items-center md:justify-center">
          {items.map((item, i) => (
            <div key={item.value} className="flex items-center justify-center">
              {i > 0 && <span aria-hidden="true" className="me-9 hidden h-12 w-0.5 bg-navy md:block" />}
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="font-heading text-lg font-semibold text-navy">{item.value}</p>
                <p className="font-heading text-[13px] text-muted">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
