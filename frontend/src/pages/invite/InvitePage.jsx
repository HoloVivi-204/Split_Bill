import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { getInvitationPreview, joinInvitation } from '../../api/invitations';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';

function InvitePreviewSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="min-h-[26rem] animate-pulse rounded-xl border border-[#d1fadf] bg-white/90 p-8 shadow-[0_25px_16px_rgba(0,0,0,0.05),0_10px_10px_rgba(0,0,0,0.08)]" />
      <div className="min-h-[26rem] animate-pulse rounded-xl border border-white/90 bg-[#eceff4] p-8" />
    </div>
  );
}

export function InvitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token = '' } = useParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      try {
        setIsLoading(true);
        setLoadError('');
        const data = await getInvitationPreview(token);

        if (!isMounted) {
          return;
        }

        setPreview(data);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = getApiErrorMessage(error, 'Không tải được lời mời. Vui lòng thử lại.');
        setLoadError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function handlePrimaryAction() {
    if (!isAuthenticated) {
      navigate('/login', {
        replace: true,
        state: {
          from: location,
        },
      });
      return;
    }

    try {
      setIsJoining(true);
      const data = await joinInvitation({ token });
      toast.success(data.message ?? 'Tham gia nhóm thành công!');
      navigate('/groups', { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tham gia nhóm lúc này.');
      toast.error(message);
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(225,253,234,0.85),_rgba(199,224,248,0.68)_42%,_#ffffff_76%)] px-4 py-8 sm:px-6 lg:px-10">
        <InvitePreviewSkeleton />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(225,253,234,0.85),_rgba(199,224,248,0.68)_42%,_#ffffff_76%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-xl border border-[#d1fadf] bg-white/95 shadow-[0_25px_16px_rgba(0,0,0,0.05),0_10px_10px_rgba(0,0,0,0.08)]">
          <div className="border-b border-[#d1fadf] bg-[linear-gradient(135deg,_rgba(225,253,234,0.92),_rgba(255,255,255,0.98)_64%)] px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="app-badge app-badge--fern">
                Lời mời nhóm
              </span>
              <span className="inline-flex rounded-full bg-[#c7e0f8] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700">
                Liên kết tham gia
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              {preview?.group?.name ?? 'Lời mời vào nhóm'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {preview?.group?.description || 'Nhóm này đã sẵn sàng cho thành viên mới tham gia và bắt đầu theo dõi quỹ, chi tiêu và hoạt động chung.'}
            </p>
          </div>

          <div className="grid gap-5 px-6 py-6 sm:px-8 sm:py-8">
            {loadError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                {loadError}
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <article className="rounded-xl bg-[#eceff4] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Đã dùng</p>
                    <p className="mt-3 text-3xl font-semibold">{preview?.use_count ?? 0}</p>
                  </article>
                  <article className="rounded-xl bg-[#fee9d1] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#715039]">Giới hạn</p>
                    <p className="mt-3 text-3xl font-semibold">{preview?.max_uses ?? 'Không giới hạn'}</p>
                  </article>
                  <article className="rounded-xl bg-[#e1fdea] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0b7443]">Trạng thái</p>
                    <p className="mt-3 text-lg font-semibold">{preview?.is_joinable ? 'Sẵn sàng tham gia' : 'Tạm thời khóa'}</p>
                  </article>
                </div>

                <div className="rounded-xl border border-[#d1fadf] bg-white p-5">
                  <p className="text-sm text-slate-600">
                    Link này dành cho thành viên mới vào nhóm. Nếu đang chưa đăng nhập, bạn sẽ được đưa qua màn hình đăng nhập rồi quay lại đây ngay sau khi xác thực.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="grid gap-6 rounded-xl border border-white/90 bg-[#eceff4] p-6 shadow-[0_25px_16px_rgba(0,0,0,0.04),0_10px_10px_rgba(0,0,0,0.06)] sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">SplitBill</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Tham gia vào nhóm đúng một bước rõ ràng</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Quản lý chi tiêu nhóm minh bạch, dễ theo dõi. Hãy tham gia để bắt đầu.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5">
            <p className="text-sm text-slate-500">Tài khoản hiện tại</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {isAuthenticated ? user?.display_name || user?.email || 'Thành viên đã đăng nhập' : 'Chưa đăng nhập'}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {isAuthenticated
                ? 'Bạn có thể vào nhóm ngay và tiếp tục sử dụng.'
                : 'Đăng nhập trước khi tham gia để hệ thống gắn thành viên vào nhóm đúng tài khoản.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={Boolean(loadError) || isJoining}
            className="rounded-xl bg-[#0b7443] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#095936] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isAuthenticated
              ? isJoining
                ? 'Đang tham gia nhóm...'
                : 'Tham gia nhóm ngay'
              : 'Đăng nhập để tham gia'}
          </button>

          <Link
            to="/groups"
            className="inline-flex items-center justify-center rounded-xl border border-white bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Về trang nhóm
          </Link>
        </aside>
      </div>
    </main>
  );
}
