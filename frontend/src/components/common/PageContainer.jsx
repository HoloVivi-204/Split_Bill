const variantClassNames = {
  finance: 'finance-zone',
  social: 'social-zone',
  auth: 'bg-white',
  neutral: 'bg-transparent',
};

export function PageContainer({
  eyebrow,
  title,
  description,
  actions,
  children,
  variant = 'finance',
}) {
  return (
    <section
      className={[
        'animate-fade-in mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:px-8 lg:py-8',
        variantClassNames[variant] ?? variantClassNames.finance,
      ].join(' ')}
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <span className="app-badge app-badge--fern">
              {eyebrow}
            </span>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-[32px]">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
