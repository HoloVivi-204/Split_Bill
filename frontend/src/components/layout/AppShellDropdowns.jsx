import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, LogOut, MessageCircle, Settings, User } from 'lucide-react';

import { logout } from '../../api/auth';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notifications';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { UserAvatar } from '../common/UserAvatar';
import {
  buildConversationPreview,
  formatBadge,
  formatCompactTime,
} from './appShellUtils';

function Dropdown({ isOpen, onClose, children, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      onMouseDown={(event) => event.stopPropagation()}
      className={`absolute right-0 top-full z-[120] mt-2 animate-fade-in rounded-2xl border border-slate-100 bg-white shadow-panel ${className}`}
    >
      {children}
    </div>
  );
}

export function ChatDropdown({
  isOpen,
  onClose,
  conversations,
  isLoading,
  error,
  onRetry,
  onOpenConversation,
}) {
  return (
    <Dropdown
      isOpen={isOpen}
      onClose={onClose}
      className="w-[380px] max-w-[calc(100vw-24px)] overflow-hidden"
    >
      {isLoading ? (
        <div className="space-y-3 px-4 py-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-full bg-slate-100" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-4 py-6 text-center">
          <MessageCircle size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-full bg-[#0b7443] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#095936]"
          >
            Tải lại danh sách
          </button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <MessageCircle size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">Bạn chưa có nhóm chat nào.</p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto px-2 py-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onOpenConversation(conversation)}
              aria-label={`Mở chat ${conversation.name}`}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#e1fdea]/70"
            >
              <div className="relative shrink-0">
                <UserAvatar
                  userId={conversation.id}
                  groupId={conversation.id}
                  displayName={conversation.name}
                  size="md"
                />
                {conversation.unread_count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {formatBadge(conversation.unread_count)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[14px] font-semibold text-slate-950">
                    {conversation.name}
                  </p>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">
                    {formatCompactTime(
                      conversation.latest_message?.created_at || conversation.created_at,
                    )}
                  </span>
                </div>
                <p
                  className={[
                    'mt-0.5 truncate text-[12px]',
                    conversation.unread_count > 0
                      ? 'font-semibold text-slate-800'
                      : 'text-slate-500',
                  ].join(' ')}
                >
                  {buildConversationPreview(conversation)}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{conversation.member_count ?? 0} thành viên</span>
                  {conversation.pinned_count > 0 && <span>{conversation.pinned_count} tin ghim</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 px-4 py-2.5">
        <Link
          to="/chat"
          onClick={onClose}
          className="block w-full rounded-lg py-1.5 text-center text-[13px] font-semibold text-[#0b7443] transition hover:bg-[#e1fdea]"
        >
          Xem tất cả cuộc trò chuyện
        </Link>
      </div>
    </Dropdown>
  );
}

export function NotificationDropdown({ isOpen, onClose }) {
  const { items, unreadCount, markOneRead, markAllRead } = useNotificationStore((state) => ({
    items: state.items,
    unreadCount: state.unreadCount,
    markOneRead: state.markOneRead,
    markAllRead: state.markAllRead,
  }));
  const [mutatingId, setMutatingId] = useState('');
  const previewItems = items.slice(0, 5);

  async function handleMarkOneRead(notification) {
    if (notification.is_read || mutatingId) return;

    setMutatingId(notification.id);
    try {
      await markNotificationRead(notification.id);
      markOneRead(notification.id);
    } catch {
      toast.error('Không đánh dấu đọc được thông báo.');
    } finally {
      setMutatingId('');
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount <= 0 || mutatingId) return;

    setMutatingId('all');
    try {
      await markAllNotificationsRead();
      markAllRead();
    } catch {
      toast.error('Không đánh dấu đọc được tất cả thông báo.');
    } finally {
      setMutatingId('');
    }
  }

  return (
    <Dropdown
      isOpen={isOpen}
      onClose={onClose}
      className="w-[380px] max-w-[calc(100vw-24px)] overflow-hidden"
    >
      {unreadCount > 0 && (
        <div className="flex justify-end border-b border-slate-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={mutatingId === 'all'}
            className="rounded-full bg-[#d1fadf] px-3 py-1.5 text-[12px] font-semibold text-[#0b7443] transition hover:bg-[#b9f1cc] disabled:opacity-60"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      )}

      {previewItems.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <Bell size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">Chưa có thông báo nào.</p>
        </div>
      ) : (
        <div className="max-h-[340px] overflow-y-auto px-2 py-2">
          {previewItems.map((item) => (
            <div
              key={item.id}
              className={[
                'flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition',
                item.is_read ? 'hover:bg-slate-50' : 'bg-[#f7fdf9] hover:bg-[#e1fdea]/60',
              ].join(' ')}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e1fdea] text-[#0b7443]">
                <Bell size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-slate-500">
                  {item.body}
                </p>
                {!item.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkOneRead(item)}
                    disabled={mutatingId === item.id}
                    aria-label={`Đánh dấu đã đọc: ${item.title}`}
                    className="mt-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#0b7443] shadow-sm transition hover:bg-[#d1fadf] disabled:opacity-60"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
              {!item.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#0b7443]" />}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 px-4 py-2.5">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block w-full rounded-lg py-1.5 text-center text-[13px] font-semibold text-[#0b7443] transition hover:bg-[#e1fdea]"
        >
          Xem tất cả thông báo
        </Link>
      </div>
    </Dropdown>
  );
}

export function ProfileDropdown({ isOpen, onClose, user }) {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      clearSession();
      onClose();
      toast.success('Đăng xuất thành công.');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Không thể đăng xuất lúc này. Vui lòng thử lại.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <Dropdown isOpen={isOpen} onClose={onClose} className="w-[260px] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-[#f7fdf9] px-4 py-3">
        <UserAvatar
          avatarUrl={user?.avatar_url}
          userId={user?.id}
          displayName={user?.display_name || 'Người dùng'}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-slate-900">
            {user?.display_name ?? 'Người dùng'}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{user?.email ?? ''}</p>
        </div>
      </div>
      <div className="py-1.5">
        <DropdownMenuItem
          icon={User}
          label="Hồ sơ cá nhân"
          onClick={() => {
            onClose();
            navigate('/profile');
          }}
        />
        <DropdownMenuItem
          icon={Settings}
          label="Cài đặt tài khoản"
          to="/account-settings"
          onClick={onClose}
        />
        <DropdownMenuItem
          icon={LogOut}
          label={isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          onClick={handleLogout}
          disabled={isLoggingOut}
        />
      </div>
    </Dropdown>
  );
}

function DropdownMenuItem({ icon, label, onClick, to = '', disabled = false }) {
  const Icon = icon;
  const className = [
    'flex w-full items-center gap-3 px-4 py-2 text-[13px] font-medium text-slate-700',
    'transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60',
  ].join(' ');

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        <Icon size={16} strokeWidth={1.7} />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <Icon size={16} strokeWidth={1.7} />
      {label}
    </button>
  );
}
