import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Copy, CopyCheck, ShieldAlert } from 'lucide-react';

import { register } from '../../api/auth';
import { PasswordInput } from '../../components/common/PasswordInput';
import { Spinner } from '../../components/common/Spinner';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const pendingRecoveryCodes = useAuthStore((state) => state.pendingRecoveryCodes);
  const clearPendingRecoveryCodes = useAuthStore((state) => state.clearPendingRecoveryCodes);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasSavedCodes, setHasSavedCodes] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(-1);

  const isRecoveryStep = pendingRecoveryCodes.length > 0;
  const groupedCodes = useMemo(() => {
    if (!isRecoveryStep) {
      return [];
    }

    return pendingRecoveryCodes.map((code, index) => ({
      code,
      order: index + 1,
    }));
  }, [isRecoveryStep, pendingRecoveryCodes]);

  async function handleRegister(event) {
    event.preventDefault();

    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const data = await register({
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
      });

      setSession({
        user: data.user,
        accessToken: data.access_token,
        displayNameRequired: Boolean(data.display_name_required || !data.user?.display_name),
        pendingRecoveryCodes: data.recovery_codes ?? [],
      });
      toast.success('Tài khoản đã được tạo.');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tạo tài khoản.');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyAll() {
    await navigator.clipboard.writeText(pendingRecoveryCodes.join('\n'));
    toast.success('Đã sao chép toàn bộ mã khôi phục.');
  }

  async function handleCopySingle(code, index) {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    toast.success('Đã sao chép mã khôi phục.');
    setTimeout(() => setCopiedIndex(-1), 2000);
  }

  function handleContinue() {
    if (!hasSavedCodes) {
      setErrorMessage('Bạn cần xác nhận đã lưu đủ 8 mã.');
      return;
    }

    clearPendingRecoveryCodes();
    navigate('/onboarding/display-name', { replace: true });
  }

  // ── Step progress indicator ──
  const currentStep = isRecoveryStep ? 2 : 1;
  const steps = ['Tài khoản', 'Mã khôi phục', 'Tên hiển thị'];

  function StepIndicator() {
    return (
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;

          return (
            <div key={step} className="flex items-center gap-2">
              {index > 0 ? <div className={`h-px w-6 ${isDone ? 'bg-[#0b7443]' : 'bg-slate-200'}`} /> : null}
              <div className="flex items-center gap-1.5">
                <span
                  className={[
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isDone
                      ? 'bg-[#0b7443] text-white'
                      : isActive
                        ? 'bg-[#d1fadf] text-[#0b7443] ring-2 ring-[#0b7443]/20'
                        : 'bg-slate-100 text-slate-400',
                  ].join(' ')}
                >
                  {stepNum}
                </span>
                <span className={`hidden text-xs font-medium sm:inline ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {step}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (isRecoveryStep) {
    return (
      <section className="space-y-5">
        <StepIndicator />
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Lưu lại 8 mã khôi phục</h2>
          <p className="text-sm leading-relaxed text-slate-500">
            Đây là lần duy nhất bạn thấy đầy đủ 8 mã. Hãy lưu ở nơi an toàn trước khi tiếp tục.
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-card border border-rose-200 bg-rose-50 p-3.5 text-sm leading-relaxed text-rose-700">
          <ShieldAlert size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-rose-500" />
          <span>Hệ thống sẽ không hiển thị lại đầy đủ 8 mã này sau khi bạn rời khỏi bước hiện tại.</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {groupedCodes.map((item, index) => (
            <div
              key={item.code}
              className="flex items-center justify-between rounded-card bg-slate-900 px-4 py-3"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Mã {item.order}</p>
                <p className="mt-1 font-mono text-[15px] tracking-[0.1em] text-white">{item.code}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopySingle(item.code, index)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label={`Copy mã ${item.order}`}
              >
                {copiedIndex === index ? <CopyCheck size={16} /> : <Copy size={16} />}
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          className="app-button-secondary w-full"
        >
          <Copy size={15} /> Sao chép tất cả
        </button>

        <label className="flex items-start gap-3 rounded-card border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={hasSavedCodes}
            onChange={(event) => setHasSavedCodes(event.target.checked)}
            aria-label="Tôi đã lưu đủ 8 mã ở nơi an toàn"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b7443] focus:ring-[#0b7443]"
          />
          <span>Tôi đã lưu đủ 8 mã ở nơi an toàn</span>
        </label>

        {errorMessage ? (
          <p className="rounded-card bg-rose-50 px-3 py-2 text-sm text-rose-600">{errorMessage}</p>
        ) : null}

        <button
          type="button"
          onClick={handleContinue}
          className="app-button-primary w-full"
        >
          Tiếp tục đặt tên hiển thị
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <StepIndicator />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Tạo tài khoản mới</h2>
        <p className="text-sm leading-relaxed text-slate-500">
          Hoàn tất 3 bước để bắt đầu quản lý chi tiêu và quỹ nhóm.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleRegister}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
          <input
            className="app-input"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <PasswordInput
          label="Mật khẩu"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Tối thiểu 8 ký tự"
        />

        <PasswordInput
          label="Xác nhận mật khẩu"
          name="confirm_password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Nhập lại mật khẩu"
        />

        {errorMessage ? (
          <p className="rounded-card bg-rose-50 px-3 py-2 text-sm text-rose-600">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="app-button-primary w-full"
        >
          {isSubmitting ? <><Spinner size={16} /> Đang tạo tài khoản...</> : 'Tạo tài khoản'}
        </button>
      </form>

      <div className="flex items-center justify-between border-t border-slate-100 pt-5 text-sm">
        <span className="text-slate-400">Đã có tài khoản ?</span>
        <Link className="font-medium text-[#0b7443] hover:underline" to="/login">
          Đăng nhập
        </Link>
      </div>
    </section>
  );
}
