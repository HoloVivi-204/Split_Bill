import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { login } from '../../api/auth';
import { PasswordInput } from '../../components/common/PasswordInput';
import { Spinner } from '../../components/common/Spinner';
import { useAuthStore } from '../../stores/authStore';

function getLoginErrorMessage(error) {
  const code = error.response?.data?.error?.code;

  if (code === 'INVALID_CREDENTIALS') {
    return 'Email hoặc mật khẩu không chính xác.';
  }

  if (code === 'VALIDATION_ERROR') {
    return 'Thông tin đăng nhập chưa hợp lệ. Vui lòng kiểm tra lại.';
  }

  return 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const data = await login({
        email: email.trim(),
        password,
        remember_me: rememberMe,
      });

      setSession({
        user: data.user,
        accessToken: data.access_token,
        displayNameRequired: Boolean(data.display_name_required || !data.user?.display_name),
      });

      const nextPath = data.display_name_required || !data.user?.display_name
        ? '/onboarding/display-name'
        : location.state?.from?.pathname ?? '/groups';

      toast.success('Đăng nhập thành công.');
      navigate(nextPath, { replace: true });
    } catch (error) {
      const message = getLoginErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <span className="app-badge app-badge--fern">Đăng nhập</span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Chào mừng bạn quay lại SplitBill</h2>
        <p className="text-sm leading-relaxed text-slate-500">
          Đăng nhập để tiếp tục theo dõi chi tiêu nhóm, quỹ chung và các cập nhật mới nhất.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />

        <label className="flex items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            aria-label="Ghi nhớ đăng nhập"
            className="h-4 w-4 rounded border-slate-300 text-[#0b7443] focus:ring-[#0b7443]"
          />
          <span>Ghi nhớ đăng nhập</span>
        </label>

        {errorMessage ? (
          <p className="rounded-card bg-rose-50 px-3 py-2 text-sm text-rose-600">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="app-button-primary w-full"
        >
          {isSubmitting ? <><Spinner size={16} /> Đang đăng nhập...</> : 'Đăng nhập'}
        </button>
      </form>

      <div className="flex items-center justify-between border-t border-slate-100 pt-5 text-sm">
        <span className="text-slate-400">Chưa có tài khoản?</span>
        <Link className="font-medium text-[#0b7443] hover:underline" to="/register">
          Tạo tài khoản
        </Link>
      </div>
    </section>
  );
}
