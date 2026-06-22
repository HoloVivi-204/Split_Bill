/**
 * SplitBill Logo - SVG logo component with size variants.
 *
 * Usage:
 *   <SplitBillLogo size="lg" />      -> auth pages (icon 48px + text 28px)
 *   <SplitBillLogo size="md" />      -> navbar (icon 32px + text 18px)
 *   <SplitBillLogo size="sm" />      -> mobile header (icon 28px + text 16px)
 *   <SplitBillLogo iconOnly />       -> collapsed / mobile
 */

const sizeConfig = {
  sm: { icon: 28, text: 'text-[16px]', gap: 'gap-2' },
  md: { icon: 32, text: 'text-[18px]', gap: 'gap-2.5' },
  lg: { icon: 48, text: 'text-[28px]', gap: 'gap-3' },
};

export function SplitBillLogo({ size = 'md', iconOnly = false, className = '' }) {
  const config = sizeConfig[size] ?? sizeConfig.md;

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      <svg
        width={config.icon}
        height={config.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0b7443" />
            <stop offset="100%" stopColor="#61bc76" />
          </linearGradient>
        </defs>
        {/* Rounded square background */}
        <rect width="48" height="48" rx="12" fill="url(#logo-grad)" />
        {/* Stylized S for SplitBill - two overlapping coins / split symbol */}
        <g fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {/* Left coin */}
          <circle cx="20" cy="22" r="8" fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth="2" />
          {/* Right coin (overlapping) */}
          <circle cx="28" cy="26" r="8" fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth="2" />
          {/* Split line - diagonal */}
          <line x1="17" y1="33" x2="31" y2="15" strokeWidth="2.2" strokeDasharray="2 3" />
        </g>
      </svg>
      {iconOnly ? null : (
        <span className={`${config.text} font-bold tracking-tight text-slate-900`}>
          SplitBill
        </span>
      )}
    </div>
  );
}
