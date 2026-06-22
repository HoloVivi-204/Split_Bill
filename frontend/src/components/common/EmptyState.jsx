import { PackagePlus } from 'lucide-react';

export function EmptyState({ title, description, icon, ctaLabel, onAction }) {
  return (
    <div className="rounded-card border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
        {icon ?? <PackagePlus size={22} strokeWidth={1.5} />}
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
      {ctaLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="app-button-primary mt-5"
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
