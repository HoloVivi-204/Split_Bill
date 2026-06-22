const toneClassNames = {
  default: 'surface-card',
  soft: 'surface-card surface-card--soft',
  melon: 'surface-card surface-card--melon',
  social: 'surface-card surface-card--social',
  mint: 'surface-card surface-card--mint',
};

export function SurfaceCard({
  title,
  description,
  icon,
  children,
  tone = 'default',
  className = '',
  ...props
}) {
  return (
    <article
      className={`${toneClassNames[tone] ?? toneClassNames.default} p-5 md:p-6 lg:p-8 ${className}`}
      {...props}
    >
      {(title || description) && (
        <header className="mb-5 space-y-1.5">
          {title ? (
            <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-900">
              {icon ? <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[#0b7443]">{icon}</span> : null}
              {title}
            </h2>
          ) : null}
          {description ? <p className="text-sm leading-relaxed text-slate-500">{description}</p> : null}
        </header>
      )}
      {children}
    </article>
  );
}
