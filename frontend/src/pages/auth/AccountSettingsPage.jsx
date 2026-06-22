import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import {
  changePassword,
  getCurrentUser,
  getRecoveryCodes,
  regenerateRecoveryCodes,
} from '../../api/auth';
import { ErrorState } from '../../components/common/ErrorState';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { useAuthStore } from '../../stores/authStore';
import {
  applyAppearanceMode,
  getStoredAppearanceMode,
  persistAppearanceMode,
} from '../../utils/appearance';

const appearanceOptions = [
  {
    value: 'system',
    label: 'Theo hệ thống',
    description: 'SplitBill tự đi theo giao diện của thiết bị.',
  },
  {
    value: 'light',
    label: 'Sáng',
    description: 'Giữ nền sáng, phù hợp khi nhập chi tiêu ban ngày.',
  },
  {
    value: 'dark',
    label: 'Tối',
    description: 'Giảm độ chói khi chat hoặc kiểm tra quỹ buổi tối.',
  },
];

export function AccountSettingsPage() {
  const updateUser = useAuthStore((state) => state.updateUser);

  const [recoveryState, setRecoveryState] = useState({ codes: [], active_count: 0 });
  const [regeneratedCodes, setRegeneratedCodes] = useState([]);
  const [appearanceMode, setAppearanceMode] = useState(() => getStoredAppearanceMode());
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [regenPassword, setRegenPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setIsLoading(true);
      setLoadError('');

      try {
        const [nextProfile, nextRecoveryCodes] = await Promise.all([
          getCurrentUser(),
          getRecoveryCodes(),
        ]);

        if (cancelled) {
          return;
        }

        setRecoveryState(nextRecoveryCodes);
        updateUser(nextProfile);
      } catch (error) {
        const message =
          error.response?.data?.error?.message ?? 'Không thể tải cài đặt tài khoản.';
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [reloadToken, updateUser]);

  useEffect(() => {
    applyAppearanceMode(appearanceMode);
  }, [appearanceMode]);

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    setIsChangingPassword(true);

    try {
      await changePassword(passwordForm);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_new_password: '',
      });
      toast.success('Đã đổi mật khẩu.');
    } catch (error) {
      const message =
        error.response?.data?.error?.message ?? 'Không thể đổi mật khẩu.';
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRegenerateCodes(event) {
    event.preventDefault();

    if (!regenPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    setIsRegeneratingCodes(true);

    try {
      const data = await regenerateRecoveryCodes({
        password: regenPassword,
      });

      setRegeneratedCodes(data.recovery_codes ?? []);
      setRegenPassword('');
      const nextRecoveryCodes = await getRecoveryCodes();
      setRecoveryState(nextRecoveryCodes);
      toast.success('Đã tạo mã khôi phục mới.');
    } catch (error) {
      const message =
        error.response?.data?.error?.message ?? 'Không thể tạo lại mã khôi phục.';
      toast.error(message);
    } finally {
      setIsRegeneratingCodes(false);
    }
  }

  return (
    <PageContainer
      title="Cài đặt tài khoản"
    >
      {isLoading ? (
        <SurfaceCard title="Đang tải cài đặt">
          <p className="text-sm text-slate-600">Hệ thống đang đồng bộ cài đặt tài khoản...</p>
        </SurfaceCard>
      ) : loadError ? (
        <SurfaceCard title="Không tải được cài đặt">
          <ErrorState message={loadError} onRetry={() => setReloadToken((value) => value + 1)} />
        </SurfaceCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-6">
            <SurfaceCard
              title="Giao diện"
              description="Tuỳ chọn hiển thị cục bộ cho phiên làm việc hiện tại."
            >
              <div className="grid gap-3">
                {appearanceOptions.map((option) => (
                  <label
                    key={option.value}
                    className={[
                      'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3',
                      appearanceMode === option.value
                        ? 'border-[#0b7443] bg-[#e1fdea]'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="appearance"
                      value={option.value}
                      checked={appearanceMode === option.value}
                      onChange={(event) => {
                        persistAppearanceMode(event.target.value);
                        setAppearanceMode(event.target.value);
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-sm leading-6 text-slate-600">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </SurfaceCard>
          </div>

          <div className="grid gap-6">
            <SurfaceCard
              title="Bảo mật"
              description="Đổi mật khẩu định kỳ để bảo vệ tài khoản và lịch sử nhóm."
              id="account-security"
            >
              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Mật khẩu hiện tại
                  </span>
                  <input
                    type="password"
                    className="app-input"
                    value={passwordForm.current_password}
                    autoComplete="current-password"
                    onChange={(event) =>
                      setPasswordForm((state) => ({
                        ...state,
                        current_password: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Mật khẩu mới
                  </span>
                  <input
                    type="password"
                    className="app-input"
                    value={passwordForm.new_password}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setPasswordForm((state) => ({
                        ...state,
                        new_password: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Xác nhận mật khẩu mới
                  </span>
                  <input
                    type="password"
                    className="app-input"
                    value={passwordForm.confirm_new_password}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setPasswordForm((state) => ({
                        ...state,
                        confirm_new_password: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="rounded-xl app-button-primary"
                >
                  {isChangingPassword ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                </button>
              </form>
            </SurfaceCard>

            <SurfaceCard
              title="Mã khôi phục"
              description="Chỉ 4 mã đầu được hiển thị dạng xem trước; các mã còn lại phải được che theo quy tắc bảo mật."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {recoveryState.codes.map((code) => (
                  <div key={code.index} className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Mã {code.index}
                    </p>
                    <p className="mt-2 font-mono text-sm tracking-[0.18em] text-slate-900">
                      {code.preview}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {code.used ? 'Đã dùng' : 'Còn hiệu lực'}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Còn {recoveryState.active_count ?? 0} mã khôi phục chưa dùng.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleRegenerateCodes}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Mật khẩu hiện tại để tạo lại mã
                  </span>
                  <input
                    type="password"
                    className="app-input"
                    value={regenPassword}
                    autoComplete="current-password"
                    onChange={(event) => setRegenPassword(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={isRegeneratingCodes}
                  className="rounded-xl app-button-secondary disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {isRegeneratingCodes ? 'Đang tạo lại mã...' : 'Tạo lại mã khôi phục'}
                </button>
              </form>

              {regeneratedCodes.length > 0 ? (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Mã khôi phục mới
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Đây là lần duy nhất bạn thấy đầy đủ các mã khôi phục mới này.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {regeneratedCodes.map((code) => (
                      <div
                        key={code}
                        className="rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm tracking-[0.18em] text-white"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </SurfaceCard>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
