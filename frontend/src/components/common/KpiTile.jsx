export function KpiTile({ label, value, hint, icon, tone = 'default' }) {
  const toneClasses = {
    default: 'surface-card',
    social: 'surface-card surface-card--social',
    mint: 'surface-card surface-card--mint',
    soft: 'surface-card surface-card--soft',
  };

  return (
    <div className={`${toneClasses[tone] ?? toneClasses.default} p-5`}>
      <div className="flex items-center gap-2">
        {icon ? <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">{icon}</span> : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{hint}</p> : null}
    </div>
  );
}
