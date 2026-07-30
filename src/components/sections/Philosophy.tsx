interface PhilosophyProps {
  label?: string;
  title: string;
  content: string;
}

export function Philosophy({ label, title, content }: PhilosophyProps) {
  return (
    <section aria-labelledby="philosophy-heading" className="bg-stone-950 py-18 text-stone-100 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16 lg:px-8">
        {label ? (
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">{label}</p>
        ) : (
          <div />
        )}
        <div>
          <h2 className="max-w-3xl font-serif text-3xl font-semibold leading-snug tracking-tight sm:text-4xl" id="philosophy-heading">
            {title}
          </h2>
          <p className="mt-7 max-w-2xl leading-8 text-stone-100/80">
            {content}
          </p>
        </div>
      </div>
    </section>
  );
}
