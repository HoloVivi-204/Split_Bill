import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Users,
  Wallet,
  PiggyBank,
  MessageCircle,
  Bell,
  User,
  ChevronDown,
} from 'lucide-react';

import { listGroupConversations } from '../../api/group-core';
import {
  listNotifications,
} from '../../api/notifications';
import { useAuthSession } from '../../hooks/useAuthSession';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { SplitBillLogo } from '../common/SplitBillLogo';
import { UserAvatar } from '../common/UserAvatar';
import {
  resolvePrimaryNavTo,
  toLatestMessage,
} from './appShellUtils';
import { ChatBubble } from './ChatBubble';
import { ChatDropdown, NotificationDropdown, ProfileDropdown } from './AppShellDropdowns';
import { MobileNavItem, NavIconButton, NavTab } from './AppShellNavigation';
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
        const conversations = await listGroupConversations();
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
      try {
        const result = await listNotifications({ page: 1, limit: 10 });
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
