import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { updateDisplayName } from '../../api/auth';
import { Spinner } from '../../components/common/Spinner';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';

export function DisplayNamePage() {
  const navigate = useNavigate();
  const updateUser = useAuthStore((state) => state.updateUser);
  const currentUser = useAuthStore((state) => state.user);
  const [displayName, setDisplayName] = useState(currentUser?.display_name ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setErrorMessage('Vui lòng nhập tên hiển thị.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const nextUser = await updateDisplayName({
        display_name: trimmedDisplayName,
      });

      updateUser({
        ...currentUser,
        ...nextUser,
      });
      toast.success('Đã lưu tên hiển thị.');
      navigate('/groups', { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể cập nhật tên hiển thị.');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step indicator — step 3
  const steps = ['Tài khoản', 'Mã khôi phục', 'Tên hiển thị'];

  return (
    <section className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isDone = stepNum < 3;
          const isActive = stepNum === 3;

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

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Bạn muốn mọi người gọi bạn là gì?</h2>
        <p className="text-sm leading-relaxed text-slate-500">
          Tên này sẽ hiển thị trong nhóm, trong chat và ở các giao dịch bạn tham gia.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Tên hiển thị</span>
          <input
            className="app-input"
            name="display_name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Ví dụ: Thanh An"
            autoComplete="nickname"
          />
        </label>

        {errorMessage ? (
          <p className="rounded-card bg-rose-50 px-3 py-2 text-sm text-rose-600">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="app-button-primary w-full"
        >
          {isSubmitting ? <><Spinner size={16} /> Đang lưu...</> : 'Tiếp tục vào ứng dụng'}
        </button>
      </form>

      <div className="flex items-center justify-between border-t border-slate-100 pt-5 text-sm">
        <span className="text-slate-400">Muốn đổi sang tài khoản khác?</span>
        <Link className="font-medium text-[#0b7443] hover:underline" to="/login">
          Về đăng nhập
        </Link>
      </div>
    </section>
  );
}
