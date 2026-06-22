const variantClasses = {
  fern: 'app-badge--fern',
  melon: 'app-badge--melon',
  sky: 'app-badge--sky',
  neutral: 'app-badge--neutral',
  danger: 'app-badge--danger',
  warning: 'app-badge--warning',
};

export function Badge({ children, variant = 'fern', className = '' }) {
  return (
    <span className={`app-badge ${variantClasses[variant] ?? variantClasses.fern} ${className}`}>
      {children}
    </span>
  );
}
