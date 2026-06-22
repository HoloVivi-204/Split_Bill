import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  Users,
  Wallet,
  PiggyBank,
  MessageCircle,
  Bell,
  User,
  ChevronDown,
  Settings,
  LogOut,
  X,
  Send,
  Pin,
  Trash2,
} from 'lucide-react';

import { logout } from '../../api/auth';
import * as groupsApi from '../../api/groups';
import { useAuthSession } from '../../hooks/useAuthSession';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { SplitBillLogo } from '../common/SplitBillLogo';
import { UserAvatar } from '../common/UserAvatar';
import { resolveNotificationSocketUrl } from './socket-config';

const navTabs = [
  { to: '/groups', label: 'Nhóm', icon: Users },
  { to: '/expenses', label: 'Chi tiêu', icon: Wallet },
  { to: '/fund', label: 'Quỹ nhóm', icon: PiggyBank },
];

const mobileNavItems = [
  { to: '/groups', label: 'Nhóm', icon: Users },
  { to: '/expenses', label: 'Chi tiêu', icon: Wallet },
  { to: '/fund', label: 'Quỹ nhóm', icon: PiggyBank },
  { to: '/profile', label: 'Tôi', icon: User },
];

function formatBadge(count) {
  if (count <= 0) return null;
  return count > 5 ? '5+' : String(count);
}

function formatCompactTime(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function formatMessageTime(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildConversationPreview(conversation) {
  if (!conversation.latest_message) {
    return conversation.description || 'Chưa có tin nhắn nào.';
  }

  if (conversation.latest_message.type === 'system') {
    return conversation.latest_message.content;
  }

  const sender = conversation.latest_message.sender?.display_name || 'Thành viên';
  return `${sender}: ${conversation.latest_message.content}`;
}

function toLatestMessage(message) {
  if (!message) return null;

  return {
    id: message.id,
    content: message.is_deleted ? 'Tin nhắn đã bị xoá' : message.content,
    type: message.type,
    is_deleted: Boolean(message.is_deleted),
    created_at: message.created_at,
    sender: message.sender
      ? {
          user_id: message.sender.user_id || message.sender.id,
          display_name: message.sender.display_name,
          avatar_url: message.sender.avatar_url,
        }
      : null,
  };
}

function sortMessagesAscending(messages) {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    return leftTime - rightTime;
  });
}

function resolvePrimaryNavTo(pathname) {
  if (pathname === '/expenses' || pathname.startsWith('/expenses/')) {
    return '/expenses';
  }

  if (/^\/groups\/[^/]+\/expenses(?:\/|$)/.test(pathname)) {
    return '/expenses';
  }

  if (pathname === '/fund' || pathname.startsWith('/fund/')) {
    return '/fund';
  }

  if (/^\/groups\/[^/]+\/fund(?:\/|$)/.test(pathname)) {
    return '/fund';
  }

  if (pathname === '/profile' || pathname === '/account-settings') {
    return '/profile';
  }

  if (pathname === '/groups' || pathname.startsWith('/groups/')) {
    return '/groups';
  }

  return '';
}

function NavTab({ to, label, icon, isActive }) {
  const Icon = icon;

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'relative flex items-center gap-2 px-4 py-2 text-[14px] font-medium',
        'transition-colors duration-150',
        isActive ? 'text-[#0b7443]' : 'text-slate-500 hover:text-slate-900',
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={1.7} />
      <span className="hidden xl:inline">{label}</span>
      {isActive && (
        <span className="absolute inset-x-2 -bottom-[1px] h-[3px] rounded-full bg-[#0b7443]" />
      )}
    </Link>
  );
}

function NavIconButton({ icon, badge, isActive, onClick, ariaLabel }) {
  const Icon = icon;
  const badgeText = formatBadge(badge);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(event) => event.stopPropagation()}
      aria-label={ariaLabel}
      className={[
        'relative flex h-10 w-10 items-center justify-center rounded-full',
        'transition-colors duration-150',
        isActive
          ? 'bg-[#d1fadf]/60 text-[#0b7443]'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
      ].join(' ')}
    >
      <Icon size={20} strokeWidth={1.7} />
      {badgeText && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badgeText}
        </span>
      )}
    </button>
  );
}

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

function ChatDropdown({
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

function NotificationDropdown({ isOpen, onClose }) {
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
      await groupsApi.markNotificationRead(notification.id);
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
      await groupsApi.markAllNotificationsRead();
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

function ProfileDropdown({ isOpen, onClose, user }) {
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

function MobileNavItem({ to, label, icon, isActive }) {
  const Icon = icon;

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium',
        'transition-all duration-200',
        isActive ? 'text-[#0b7443]' : 'text-slate-400 hover:text-slate-600',
      ].join(' ')}
    >
      <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell() {
  const location = useLocation();
  const { isAuthenticated, displayNameRequired, accessToken, user } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    displayNameRequired: state.displayNameRequired,
    accessToken: state.accessToken,
    user: state.user,
  }));
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setNotificationSnapshot = useNotificationStore((state) => state.setNotificationSnapshot);
  const prependNotification = useNotificationStore((state) => state.prependNotification);

  const [openDropdown, setOpenDropdown] = useState('');
  const [chatConversations, setChatConversations] = useState([]);
  const [isLoadingChatConversations, setIsLoadingChatConversations] = useState(false);
  const [chatConversationError, setChatConversationError] = useState('');
  const [chatReloadToken, setChatReloadToken] = useState(0);
  const [bubbleConversation, setBubbleConversation] = useState(null);

  const isFullChatPage = location.pathname === '/chat';
  const activeNavTo = resolvePrimaryNavTo(location.pathname);
  const chatUnreadCount = chatConversations.reduce(
    (total, conversation) => total + (conversation.unread_count || 0),
    0,
  );

  useAuthSession();

  const closeDropdown = useCallback(() => {
    setOpenDropdown('');
  }, []);

  const toggleDropdown = useCallback((name) => {
    setOpenDropdown((current) => (current === name ? '' : name));
  }, []);

  const reloadChatConversations = useCallback(() => {
    setChatReloadToken((current) => current + 1);
  }, []);

  const handleOpenBubbleConversation = useCallback(
    (conversation) => {
      closeDropdown();

      if (isFullChatPage) {
        return;
      }

      setBubbleConversation(conversation);
      setChatConversations((current) =>
        current.map((item) =>
          item.id === conversation.id
            ? {
                ...item,
                unread_count: 0,
              }
            : item,
        ),
      );
    },
    [closeDropdown, isFullChatPage],
  );

  const handleBubbleMessageSent = useCallback((groupId, message) => {
    setChatConversations((current) =>
      current.map((conversation) =>
        conversation.id === groupId
          ? {
              ...conversation,
              latest_message: toLatestMessage(message),
              unread_count: 0,
            }
          : conversation,
      ),
    );
  }, []);

  useEffect(() => {
    setOpenDropdown('');

    if (location.pathname === '/chat') {
      setBubbleConversation(null);
    }
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return undefined;

    let cancelled = false;

    async function loadChatConversations() {
      setIsLoadingChatConversations(true);
      setChatConversationError('');

      try {
        const conversations = await groupsApi.listGroupConversations();
        if (cancelled) return;
        setChatConversations(conversations);
      } catch {
        if (!cancelled) {
          setChatConversationError('Không tải được danh sách chat nhóm.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingChatConversations(false);
        }
      }
    }

    loadChatConversations();

    return () => {
      cancelled = true;
    };
  }, [accessToken, chatReloadToken, isAuthenticated]);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return undefined;

    let cancelled = false;

    async function bootstrapNotifications() {
      if (typeof groupsApi.listNotifications !== 'function') return;

      try {
        const result = await groupsApi.listNotifications({ page: 1, limit: 10 });
        if (cancelled) return;

        setNotificationSnapshot({
          items: result.data,
          unreadCount: result.meta?.unread_count ?? 0,
          page: result.meta?.page ?? 1,
          total: result.meta?.total ?? result.data.length,
          hasMore: result.meta?.has_more ?? false,
        });
      } catch {
        // The dedicated notifications page handles detailed failure UI.
      }
    }

    if (isAuthenticated && accessToken) {
      bootstrapNotifications();
    }

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated, setNotificationSnapshot]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || import.meta.env.MODE === 'test') return undefined;

    const socket = io(resolveNotificationSocketUrl(), {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('new_notification', ({ notification }) => {
      if (notification) prependNotification(notification);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, isAuthenticated, prependNotification]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (displayNameRequired) {
    return <Navigate to="/onboarding/display-name" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <header className="fixed inset-x-0 top-0 z-[100] hidden h-14 border-b border-slate-200 bg-white shadow-sm lg:block">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-4">
          <div className="flex h-full items-center gap-1">
            <Link to="/groups" className="mr-4">
              <SplitBillLogo size="sm" />
            </Link>

            <nav className="flex h-full items-center">
              {navTabs.map((tab) => (
                <NavTab key={tab.to} {...tab} isActive={activeNavTo === tab.to} />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <NavIconButton
                icon={MessageCircle}
                badge={chatUnreadCount}
                isActive={openDropdown === 'chat'}
                onClick={() => toggleDropdown('chat')}
                ariaLabel="Tin nhắn"
              />
              <ChatDropdown
                isOpen={openDropdown === 'chat'}
                onClose={closeDropdown}
                conversations={chatConversations}
                isLoading={isLoadingChatConversations}
                error={chatConversationError}
                onRetry={reloadChatConversations}
                onOpenConversation={handleOpenBubbleConversation}
              />
            </div>

            <div className="relative">
              <NavIconButton
                icon={Bell}
                badge={unreadCount}
                isActive={openDropdown === 'notifications'}
                onClick={() => toggleDropdown('notifications')}
                ariaLabel="Thông báo"
              />
              <NotificationDropdown
                isOpen={openDropdown === 'notifications'}
                onClose={closeDropdown}
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('profile')}
                onMouseDown={(event) => event.stopPropagation()}
                aria-label="Menu tài khoản"
                className={[
                  'flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5',
                  'transition-colors duration-150',
                  openDropdown === 'profile' ? 'bg-[#d1fadf]/60' : 'hover:bg-slate-100',
                ].join(' ')}
              >
                <UserAvatar
                  avatarUrl={user?.avatar_url}
                  userId={user?.id}
                  displayName={user?.display_name || 'Người dùng'}
                  size="sm"
                />
                <ChevronDown size={14} className="text-slate-500" />
              </button>
              <ProfileDropdown
                isOpen={openDropdown === 'profile'}
                onClose={closeDropdown}
                user={user}
              />
            </div>
          </div>
        </div>
      </header>

      <header className="fixed inset-x-0 top-0 z-[100] flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3 lg:hidden">
        <SplitBillLogo size="sm" />
        <div className="flex items-center gap-0.5">
          <div className="relative">
            <NavIconButton
              icon={MessageCircle}
              badge={chatUnreadCount}
              isActive={openDropdown === 'chat'}
              onClick={() => toggleDropdown('chat')}
              ariaLabel="Tin nhắn"
            />
            <ChatDropdown
              isOpen={openDropdown === 'chat'}
              onClose={closeDropdown}
              conversations={chatConversations}
              isLoading={isLoadingChatConversations}
              error={chatConversationError}
              onRetry={reloadChatConversations}
              onOpenConversation={handleOpenBubbleConversation}
            />
          </div>
          <div className="relative">
            <NavIconButton
              icon={Bell}
              badge={unreadCount}
              isActive={openDropdown === 'notifications'}
              onClick={() => toggleDropdown('notifications')}
              ariaLabel="Thông báo"
            />
            <NotificationDropdown
              isOpen={openDropdown === 'notifications'}
              onClose={closeDropdown}
            />
          </div>
        </div>
      </header>

      <main className="min-h-screen pt-12 pb-20 lg:pt-14 lg:pb-0">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <div className="grid grid-cols-4">
          {mobileNavItems.map((item) => (
            <MobileNavItem key={item.to} {...item} isActive={activeNavTo === item.to} />
          ))}
        </div>
      </nav>

      {!isFullChatPage && (
        <ChatBubble
          conversation={bubbleConversation}
          currentUser={user}
          onClose={() => setBubbleConversation(null)}
          onMessageSent={handleBubbleMessageSent}
        />
      )}
    </div>
  );
}

function ChatBubble({ conversation, currentUser, onClose, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [busyMessageId, setBusyMessageId] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!conversation) return undefined;

    let cancelled = false;

    async function loadMessages() {
      setMessages([]);
      setIsLoading(true);
      setError('');

      try {
        const result = await groupsApi.listGroupMessages(conversation.id, { limit: 12 });
        if (cancelled) return;
        setMessages(sortMessagesAscending(result.data ?? []));
      } catch {
        if (!cancelled) {
          setError('Không tải được tin nhắn trong nhóm này.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversation]);

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [messages, conversation]);

  if (!conversation) return null;

  async function handleSend(event) {
    event.preventDefault();

    const content = draft.trim();
    if (!content || isSending) return;

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      group_id: conversation.id,
      content,
      type: 'text',
      is_deleted: false,
      is_pinned: false,
      created_at: new Date().toISOString(),
      pending: true,
      sender: {
        user_id: currentUser?.id,
        display_name: currentUser?.display_name || 'Bạn',
        avatar_url: currentUser?.avatar_url || null,
      },
    };

    setDraft('');
    setIsSending(true);
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const savedMessage = await groupsApi.createGroupMessage(conversation.id, { content });
      setMessages((current) =>
        current.map((message) => (message.id === optimisticMessage.id ? savedMessage : message)),
      );
      onMessageSent(conversation.id, savedMessage);
    } catch {
      toast.error('Không gửi được tin nhắn.');
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? {
                ...message,
                failed: true,
                pending: false,
              }
            : message,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteMessage(messageId) {
    if (!messageId || busyMessageId) return;

    setBusyMessageId(messageId);
    try {
      await groupsApi.deleteGroupMessage(conversation.id, messageId);
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content: 'Tin nhắn đã bị xoá',
                is_deleted: true,
              }
            : message,
        ),
      );
    } catch {
      toast.error('Không xoá được tin nhắn.');
    } finally {
      setBusyMessageId('');
    }
  }

  async function handlePinMessage(messageId, nextPinned) {
    if (!messageId || busyMessageId) return;

    setBusyMessageId(messageId);
    try {
      await groupsApi.pinGroupMessage(conversation.id, messageId, {
        pinned: nextPinned,
      });
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                is_pinned: nextPinned,
              }
            : message,
        ),
      );
    } catch {
      toast.error('Không cập nhật được ghim tin nhắn.');
    } finally {
      setBusyMessageId('');
    }
  }

  return (
    <section
      role="dialog"
      aria-label={`Chat ${conversation.name}`}
      className={[
        'fixed right-3 z-50 flex h-[500px] w-[calc(100vw-24px)] max-w-[380px] flex-col',
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel-hover',
        'bottom-[72px] animate-fade-in lg:right-5 lg:bottom-5',
      ].join(' ')}
    >
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#e8f4ff] via-white to-[#e1fdea] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            userId={conversation.id}
            groupId={conversation.id}
            displayName={conversation.name}
            size="sm"
          />
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-slate-950">{conversation.name}</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-white/80 hover:text-slate-900"
          aria-label="Đóng chat"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5f7fb] px-3 py-3">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex gap-2">
                <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                <div className="h-10 w-44 animate-pulse rounded-2xl bg-slate-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <MessageCircle size={32} className="mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <MessageCircle size={32} className="mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">Chưa có tin nhắn nào.</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Gửi lời chào để bắt đầu cuộc trò chuyện.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <BubbleMessage
                key={message.id}
                message={message}
                currentUserId={currentUser?.id}
                conversationId={conversation.id}
                canPin={conversation.my_role === 'leader' || conversation.my_role === 'secretary'}
                canDeleteAsLeader={conversation.my_role === 'leader'}
                busyMessageId={busyMessageId}
                onDelete={handleDeleteMessage}
                onPin={handlePinMessage}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-100 bg-white px-3 py-3">
        <div className="flex items-end gap-2 rounded-2xl bg-slate-100 px-3 py-2">
          <label className="sr-only" htmlFor={`mini-chat-${conversation.id}`}>
            Nội dung tin nhắn
          </label>
          <textarea
            id={`mini-chat-${conversation.id}`}
            value={draft}
            rows={1}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend(event);
              }
            }}
            placeholder="Nhắn tin trong nhóm..."
            className="min-h-9 flex-1 resize-none bg-transparent py-2 text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending}
            aria-label="Gửi tin nhắn"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b7443] text-white transition hover:bg-[#095936] disabled:bg-slate-300"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}

function BubbleMessage({
  message,
  currentUserId,
  conversationId,
  canPin,
  canDeleteAsLeader,
  busyMessageId,
  onDelete,
  onPin,
}) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 shadow-sm">
          {message.content}
        </span>
      </div>
    );
  }

  const senderId = message.sender?.user_id || message.sender?.id;
  const isMine = senderId === currentUserId;
  const canDelete = !message.is_deleted && (isMine || canDeleteAsLeader);
  const canTogglePin = !message.is_deleted && canPin;
  const isBusy = busyMessageId === message.id;
  const displayContent = message.is_deleted ? 'Tin nhắn đã bị xoá' : message.content;

  return (
    <div className={['flex gap-2', isMine ? 'justify-end' : 'justify-start'].join(' ')}>
      {!isMine && (
        <UserAvatar
          avatarUrl={message.sender?.avatar_url}
          userId={senderId}
          groupId={conversationId}
          displayName={message.sender?.display_name || 'Thành viên'}
          size="xs"
          className="mt-4"
        />
      )}
      <div className={['flex max-w-[78%] flex-col', isMine ? 'items-end' : 'items-start'].join(' ')}>
        {!isMine && (
          <p className="mb-1 ml-1 text-[11px] font-medium text-slate-500">
            {message.sender?.display_name || 'Thành viên'}
          </p>
        )}
        <div
          className={[
            'whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13px] leading-5 shadow-sm',
            isMine
              ? 'rounded-br-md bg-[#0b7443] text-white'
              : 'rounded-bl-md bg-white text-slate-900',
            message.is_deleted ? 'italic opacity-75' : '',
          ].join(' ')}
        >
          {displayContent}
        </div>
        <div className={['mt-1 flex items-center gap-1', isMine ? 'justify-end' : 'justify-start'].join(' ')}>
          {message.is_pinned ? <Pin size={11} className="text-[#0b7443]" /> : null}
          {canTogglePin ? (
            <button
              type="button"
              onClick={() => onPin(message.id, !message.is_pinned)}
              disabled={isBusy}
              className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-[#0b7443] disabled:opacity-50"
            >
              {message.is_pinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              disabled={isBusy}
              className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-red-600 disabled:opacity-50"
            >
              Xoá tin nhắn
            </button>
          ) : null}
        </div>
        <p
          className={[
            'mt-1 text-[10px] text-slate-400',
            isMine ? 'text-right' : 'text-left',
          ].join(' ')}
        >
          {message.failed ? 'Gửi lỗi' : message.pending ? 'Đang gửi' : formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
