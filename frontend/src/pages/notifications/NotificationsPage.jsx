import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/groups';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { useNotificationStore } from '../../stores/notificationStore';

function buildNotificationHref(notification) {
  if (!notification.group_id) {
    return '/groups';
  }

  if (['expense_added', 'settlement_suggested'].includes(notification.type)) {
    return `/groups/${notification.group_id}/expenses`;
  }

  if (['campaign_created', 'fund_reminder', 'fund_paid', 'fund_late', 'fund_complete'].includes(notification.type)) {
    return `/groups/${notification.group_id}/fund`;
  }

  if (['member_joined', 'member_left', 'leave_request', 'leave_approved', 'leave_rejected'].includes(notification.type)) {
    return `/groups/${notification.group_id}/members`;
  }

  return `/groups/${notification.group_id}`;
}

function formatNotificationDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function NotificationChip({ unreadCount }) {
  return (
    <span
      className={[
        'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
        unreadCount > 0
          ? 'border border-[#d1fadf] bg-[#d1fadf] text-[#0b7443]'
          : 'border border-[#d1fadf] bg-white text-slate-500',
      ].join(' ')}
    >
      {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc hết'}
    </span>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { items, unreadCount } = useNotificationStore((state) => ({
    items: state.items,
    unreadCount: state.unreadCount,
  }));
  const setNotificationSnapshot = useNotificationStore((state) => state.setNotificationSnapshot);
  const markOneReadInStore = useNotificationStore((state) => state.markOneRead);
  const markAllReadInStore = useNotificationStore((state) => state.markAllRead);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        setIsLoading(true);
        setLoadError('');
        const result = await listNotifications({
          page: 1,
          limit: 20,
        });

        if (cancelled) {
          return;
        }

        setNotificationSnapshot({
          items: result.data,
          unreadCount: result.meta?.unread_count ?? 0,
          page: result.meta?.page ?? 1,
          total: result.meta?.total ?? result.data.length,
          hasMore: result.meta?.has_more ?? false,
        });
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.response?.data?.error?.message ?? 'Không thể tải danh sách thông báo.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [reloadToken, setNotificationSnapshot]);

  async function handleOpen(notification) {
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);
        markOneReadInStore(notification.id);
      }
    } catch {
      toast.error('Không thể cập nhật trạng thái đã đọc.');
    } finally {
      navigate(buildNotificationHref(notification));
    }
  }

  async function handleMarkAllRead() {
    try {
      setIsUpdating(true);
      await markAllNotificationsRead();
      markAllReadInStore();
      toast.success('Đã đánh dấu tất cả là đã đọc.');
    } catch {
      toast.error('Không thể cập nhật thông báo.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <PageContainer
      eyebrow="Thông báo"
      title="Trung tâm thông báo"
      description="Theo dõi các cập nhật mới từ nhóm, quỹ, khoản chi và thành viên trong một luồng rõ ràng."
      variant="finance"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <NotificationChip unreadCount={unreadCount} />
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isUpdating || unreadCount === 0}
            className="app-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Đánh dấu đã đọc
          </button>
        </div>
      }
    >
      <SurfaceCard
        title="Hoạt động gần đây"
        description="Thông báo mới sẽ xuất hiện tại đây và vẫn được lưu lại khi bạn tải lại trang."
        tone="mint"
      >
        {isLoading ? (
          <div className="grid gap-3" aria-label="Đang tải thông báo">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-shimmer rounded-xl" />
            ))}
          </div>
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => setReloadToken((value) => value + 1)}
            actionLabel="Tải lại"
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Bạn chưa có thông báo mới"
            description="Khi nhóm có campaign mới, khoản chi mới hoặc lời nhắc, mục này sẽ hiển thị ngay."
          />
        ) : (
          <div className="grid gap-3">
            {items.map((notification) => (
              <article
                key={notification.id}
                className={[
                  'rounded-xl border p-4 transition',
                  notification.is_read
                    ? 'border-slate-200 bg-white'
                    : 'border-[#d1fadf] bg-[radial-gradient(circle_at_top_left,_rgba(225,253,234,0.92),_rgba(255,255,255,0.98)_64%)]',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="app-badge app-badge--fern">
                        {notification.type}
                      </span>
                      {notification.group_name ? (
                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          {notification.group_name}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{notification.title}</h2>
                    <p className="max-w-3xl text-sm leading-7 text-slate-600">{notification.body}</p>
                  </div>
                  {!notification.is_read ? (
                    <span className="rounded-full bg-[#0b7443] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                      Mới
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">{formatNotificationDate(notification.created_at)}</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpen(notification)}
                      className="rounded-xl app-button-primary"
                    >
                      Mở màn liên quan
                    </button>
                    <Link
                      to={buildNotificationHref(notification)}
                      className="app-button-secondary"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SurfaceCard>
    </PageContainer>
  );
}
