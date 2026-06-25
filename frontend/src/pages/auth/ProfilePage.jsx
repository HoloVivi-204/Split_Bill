import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import {
  deleteAccount,
  deleteAvatar,
  getCurrentUser,
  updateProfile,
  uploadAvatar,
} from '../../api/auth';
import { ErrorState } from '../../components/common/ErrorState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency } from '../../utils/formatCurrency';

function formatJoinedDate(value) {
  if (!value) {
    return 'Chưa rõ';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function ProfilePage() {
  const navigate = useNavigate();
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const currentUser = useAuthStore((state) => state.user);

  const [profile, setProfile] = useState(currentUser);
  const [displayName, setDisplayName] = useState(currentUser?.display_name ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError('');

      try {
        const nextProfile = await getCurrentUser();

        if (cancelled) {
          return;
        }

        setProfile(nextProfile);
        setDisplayName(nextProfile.display_name ?? '');
        updateUser(nextProfile);
      } catch (error) {
        const message =
          getApiErrorMessage(error, 'Không thể tải thông tin hồ sơ.');
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [reloadToken, updateUser]);

  async function handleProfileSubmit(event) {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      toast.error('Vui lòng nhập tên hiển thị.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const nextUser = await updateProfile({
        display_name: trimmedDisplayName,
      });

      const mergedProfile = {
        ...profile,
        ...nextUser,
      };

      setProfile(mergedProfile);
      updateUser(mergedProfile);
      toast.success('Đã cập nhật hồ sơ.');
    } catch (error) {
      const message =
        getApiErrorMessage(error, 'Không thể cập nhật hồ sơ.');
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const data = await uploadAvatar(file);
      const mergedProfile = {
        ...profile,
        avatar_url: data.avatar_url,
      };

      setProfile(mergedProfile);
      updateUser(mergedProfile);
      toast.success('Đã cập nhật ảnh đại diện.');
    } catch (error) {
      const message =
        getApiErrorMessage(error, 'Không thể tải ảnh đại diện.');
      toast.error(message);
    } finally {
      event.target.value = '';
      setIsUploadingAvatar(false);
    }
  }

  async function handleDeleteAvatar() {
    setIsDeletingAvatar(true);

    try {
      await deleteAvatar();
      const mergedProfile = {
        ...profile,
        avatar_url: null,
      };

      setProfile(mergedProfile);
      updateUser(mergedProfile);
      toast.success('Đã xoá ảnh đại diện.');
    } catch (error) {
      const message =
        getApiErrorMessage(error, 'Không thể xoá ảnh đại diện.');
      toast.error(message);
    } finally {
      setIsDeletingAvatar(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Xoá tài khoản này? Tài khoản chỉ được xoá khi bạn không còn nợ hoặc khoản quỹ chưa đóng.'
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteAccount();
      clearSession();
      toast.success('Đã xoá tài khoản.');
      navigate('/login', { replace: true });
    } catch (error) {
      const message =
        getApiErrorMessage(error, 'Không thể xoá tài khoản lúc này.');
      toast.error(message);
    } finally {
      setIsDeletingAccount(false);
    }
  }

  const stats = profile?.stats ?? {};

  return (
    <PageContainer
      eyebrow="Hồ sơ"
      title="Hồ sơ cá nhân"
      description="Quản lý tên hiển thị, ảnh đại diện và thống kê cá nhân."
    >
      {isLoading ? (
        <SurfaceCard title="Đang tải hồ sơ">
          <p className="text-sm text-slate-600">Hệ thống đang đồng bộ thông tin hồ sơ...</p>
        </SurfaceCard>
      ) : loadError ? (
        <SurfaceCard title="Không tải được hồ sơ">
          <ErrorState message={loadError} onRetry={() => setReloadToken((value) => value + 1)} />
        </SurfaceCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KpiTile
              label="Nhóm đang tham gia"
              value={String(stats.groups_count ?? 0)}
              hint="Số lượng nhóm bạn đang tham gia"
            />
            <KpiTile
              label="Tổng chi tiêu cá nhân"
              value={formatCurrency(stats.total_personal_spending)}
              hint="Tổng các khoản bạn đã chi"
            />
            <KpiTile
              label="Bạn đang được nợ"
              value={formatCurrency(stats.total_owed)}
              hint="Số tiền người khác còn phải trả"
            />
            <KpiTile
              label="Bạn đang nợ"
              value={formatCurrency(stats.total_owe)}
              hint="Số tiền bạn còn phải thanh toán"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SurfaceCard
              title="Thông tin công khai"
              description="Tên hiển thị và ảnh đại diện sẽ xuất hiện trong nhóm, chi tiêu và chat."
              tone="social"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <UserAvatar
                  avatarUrl={profile?.avatar_url}
                  userId={profile?.id}
                  displayName={profile?.display_name || 'Người dùng'}
                  size="xl"
                />

                <div className="flex-1 space-y-2">
                  <p className="text-xl font-semibold text-slate-900">
                    {profile?.display_name || 'Chưa đặt tên'}
                  </p>
                  <p className="text-sm text-slate-600">{profile?.email}</p>
                  <p className="text-sm text-slate-500">
                    Tham gia từ {formatJoinedDate(profile?.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <label
                  htmlFor="profile-avatar-upload"
                  className="cursor-pointer rounded-xl app-button-secondary"
                >
                  <input
                    id="profile-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  {isUploadingAvatar ? 'Đang tải ảnh...' : 'Tải ảnh mới'}
                </label>
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={!profile?.avatar_url || isDeletingAvatar}
                  className="rounded-xl app-button-danger disabled:opacity-50"
                >
                  {isDeletingAvatar ? 'Đang xoá...' : 'Xoá ảnh đại diện'}
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleProfileSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Tên hiển thị
                  </span>
                  <input
                    className="app-input"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Ví dụ: Thành An"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-xl app-button-primary"
                >
                  {isSavingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </button>
              </form>
            </SurfaceCard>

            <div className="grid gap-6">
              <SurfaceCard
                title="Xoá tài khoản"
                description="Chỉ thực hiện khi tài khoản không còn nợ hoặc khoản quỹ chưa đóng."
                tone="melon"
              >
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="rounded-xl app-button-danger disabled:opacity-50"
                >
                  {isDeletingAccount ? 'Đang xoá...' : 'Xoá tài khoản'}
                </button>
              </SurfaceCard>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
