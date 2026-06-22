import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput({
  label,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
  ariaLabel,
  inputClassName = 'app-input',
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span> : null}
      <div className="relative">
        <input
          className={`${inputClassName} pr-12`}
          type={isVisible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-label={ariaLabel ?? label}
        />
        <button
          type="button"
          onClick={() => setIsVisible((currentValue) => !currentValue)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700"
          aria-label={isVisible ? `Ẩn ${ariaLabel ?? label ?? 'mật khẩu'}` : `Hiện ${ariaLabel ?? label ?? 'mật khẩu'}`}
        >
          {isVisible ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
        </button>
      </div>
    </label>
  );
}
