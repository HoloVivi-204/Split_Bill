import { Link } from 'react-router-dom';

import { formatBadge } from './appShellUtils';

export function NavTab({ to, label, icon, isActive }) {
  const Icon = icon;

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'relative flex items-center gap-2 px-4 py-2 text-[14px] font-medium',
        'transition-colors duration-150',
        isActive ? 'text-[#0b7443]' : 'text-slate-500 hover:text-slate-900',
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={1.7} />
      <span className="hidden xl:inline">{label}</span>
      {isActive && (
        <span className="absolute inset-x-2 -bottom-[1px] h-[3px] rounded-full bg-[#0b7443]" />
      )}
    </Link>
  );
}

export function NavIconButton({ icon, badge, isActive, onClick, ariaLabel }) {
  const Icon = icon;
  const badgeText = formatBadge(badge);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(event) => event.stopPropagation()}
      aria-label={ariaLabel}
      className={[
        'relative flex h-10 w-10 items-center justify-center rounded-full',
        'transition-colors duration-150',
        isActive
          ? 'bg-[#d1fadf]/60 text-[#0b7443]'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
      ].join(' ')}
    >
      <Icon size={20} strokeWidth={1.7} />
      {badgeText && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badgeText}
        </span>
      )}
    </button>
  );
}

export function MobileNavItem({ to, label, icon, isActive }) {
  const Icon = icon;

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium',
        'transition-all duration-200',
        isActive ? 'text-[#0b7443]' : 'text-slate-400 hover:text-slate-600',
      ].join(' ')}
    >
      <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
      <span>{label}</span>
    </Link>
  );
}
