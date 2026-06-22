import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  Bell,
  BellOff,
  Check,
  ChevronLeft,
  LogOut,
  MoreHorizontal,
  Pin,
  Send,
  Trash2,
  UserPlus,
  WifiOff,
} from 'lucide-react';

import {
  addGroupChatParticipant,
  createGroupMessage,
  deleteGroupMessage,
  leaveGroupChat,
  listAvailableChatParticipants,
  listGroupConversations,
  listGroupMessages,
  listPinnedGroupMessages,
  pinGroupMessage,
  updateGroupChatSettings,
} from '../../api/groups';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { PageContainer } from '../../components/common/PageContainer';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useAuthStore } from '../../stores/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';
const DELETED_MESSAGE_TEXT = 'Tin nhắn đã bị xoá';

const roleLabels = {
  leader: 'Trưởng nhóm',
  secretary: 'Thư ký',
  member: 'Thành viên',
};

function sortMessages(messages) {
  return [...messages].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
}

function upsertMessage(messages, nextMessage) {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex >= 0) {
    const nextMessages = [...messages];
    nextMessages[existingIndex] = nextMessage;
    return sortMessages(nextMessages);
  }

  return sortMessages([nextMessage, ...messages]);
}

function formatChatTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatConversationTime(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function buildPreview(conversation) {
  if (!conversation.latest_message) {
    return conversation.description || 'Chưa có tin nhắn nào trong nhóm này.';
  }

  const message = conversation.latest_message;
  if (message.type === 'system') {
    return message.content;
  }

  const sender = message.sender?.display_name || 'Thành viên';
  return `${sender}: ${message.content}`;
}

function sortConversations(conversations) {
  return [...conversations].sort((left, right) => {
    const leftTime = new Date(left.latest_message?.created_at || left.created_at).getTime();
    const rightTime = new Date(right.latest_message?.created_at || right.created_at).getTime();

    return rightTime - leftTime;
  });
}

function ConversationButton({
  conversation,
  isActive,
  isMenuOpen,
  isBusy,
  onClick,
  onToggleMenu,
  onMarkRead,
  onToggleMute,
  onOpenAddMember,
  onLeave,
}) {
  const latestTime = conversation.latest_message?.created_at || conversation.created_at;

  return (
    <div
      className={[
        'group relative flex w-full items-center gap-2 rounded-2xl px-3 py-3 transition',
        isActive ? 'bg-[#e1fdea] shadow-sm' : 'hover:bg-white/80',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <UserAvatar
          userId={conversation.id}
          groupId="conversation"
          displayName={conversation.name}
          size="md"
          className={isActive ? 'ring-[#0b7443]/25' : ''}
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[15px] font-semibold text-slate-950">{conversation.name}</span>
            <span className="shrink-0 text-[11px] font-medium text-slate-400">
              {formatConversationTime(latestTime)}
            </span>
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] leading-5 text-slate-500">
              {buildPreview(conversation)}
            </span>
            {conversation.unread_count > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0b7443] px-1.5 text-[11px] font-bold text-white">
                {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
              </span>
            ) : null}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleMenu}
        className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-[#0b7443]"
        aria-label={`Tùy chọn ${conversation.name}`}
        aria-expanded={isMenuOpen}
      >
        <MoreHorizontal size={17} />
      </button>
      {isMenuOpen ? (
        <div className="absolute right-2 top-12 z-40 w-64 overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 text-sm shadow-xl">
          <button
            type="button"
            onClick={onMarkRead}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-[#e1fdea] hover:text-[#0b7443]"
          >
            <Check size={16} />
            Đánh dấu đã đọc
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            disabled={isBusy}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-[#e1fdea] hover:text-[#0b7443] disabled:opacity-50"
          >
            {conversation.is_muted ? <Bell size={16} /> : <BellOff size={16} />}
            {conversation.is_muted ? 'Bật thông báo' : 'Tắt thông báo'}
          </button>
          <button
            type="button"
            onClick={onOpenAddMember}
            disabled={isBusy}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-[#e1fdea] hover:text-[#0b7443] disabled:opacity-50"
          >
            <UserPlus size={16} />
            Thêm thành viên
          </button>
          <button
            type="button"
            onClick={onLeave}
            disabled={isBusy}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut size={16} />
            Rời nhóm chat
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MessageActions({ canDelete, canPin, isPinned, isBusy, onDelete, onPin }) {
  if (!canDelete && !canPin) {
    return null;
  }

  return (
    <div className="mt-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
      {canPin ? (
        <button
          type="button"
          onClick={onPin}
          disabled={isBusy}
          className="rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-[#0b7443] disabled:opacity-50"
          aria-label={isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
        >
          <Pin size={14} />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={isBusy}
          className="rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-red-600 disabled:opacity-50"
          aria-label="Xoá tin nhắn"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  currentUserId,
  canPin,
  canDeleteAsLeader,
  busyMessageId,
  onDelete,
  onPin,
}) {
  const isMine = message.sender?.user_id === currentUserId;
  const isSystem = message.type === 'system';
  const canDelete = !message.is_deleted && (isMine || canDeleteAsLeader);
  const canTogglePin = !message.is_deleted && canPin;

  if (isSystem) {
    return (
      <div className="mx-auto max-w-[72%] rounded-full bg-white/75 px-4 py-2 text-center text-[12px] font-medium text-slate-500 shadow-sm">
        {message.content}
      </div>
    );
  }

  return (
    <article className={['group flex gap-2', isMine ? 'justify-end' : 'justify-start'].join(' ')}>
      {!isMine ? (
        <UserAvatar
          avatarUrl={message.sender?.avatar_url}
          userId={message.sender?.user_id}
          groupId={message.group_id}
          displayName={message.sender?.display_name || 'Thành viên'}
          size="xs"
          className="mt-auto"
        />
      ) : null}
      <div className={['flex max-w-[78%] flex-col', isMine ? 'items-end' : 'items-start'].join(' ')}>
        {!isMine ? (
          <span className="mb-1 px-2 text-[11px] font-semibold text-slate-500">
            {message.sender?.display_name || 'Thành viên'}
          </span>
        ) : null}
        <div
          className={[
            'whitespace-pre-wrap break-words rounded-[22px] px-4 py-2.5 text-[14px] leading-6 shadow-sm',
            isMine
              ? 'rounded-br-md bg-[#0b7443] text-white'
              : 'rounded-bl-md bg-white text-slate-950 ring-1 ring-slate-100',
            message.is_deleted ? 'italic opacity-70' : '',
          ].join(' ')}
        >
          {message.content}
        </div>
        <div className={['flex items-center gap-2 px-2 pt-1', isMine ? 'flex-row-reverse' : ''].join(' ')}>
          <span className="text-[11px] text-slate-400">{formatChatTime(message.created_at)}</span>
          {message.is_pinned ? <Pin size={11} className="text-[#0b7443]" /> : null}
          {isMine ? <Check size={12} className="text-slate-400" /> : null}
        </div>
        <MessageActions
          canDelete={canDelete}
          canPin={canTogglePin}
          isPinned={message.is_pinned}
          isBusy={busyMessageId === message.id}
          onDelete={() => onDelete(message.id)}
          onPin={() => onPin(message.id, !message.is_pinned)}
        />
      </div>
    </article>
  );
}

export function ChatPage() {
  const { accessToken, currentUser } = useAuthStore((state) => ({
    accessToken: state.accessToken,
    currentUser: state.user,
  }));
  const socketRef = useRef(null);
  const selectedGroupIdRef = useRef('');
  const conversationIdsRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const pendingKeysRef = useRef(new Set());
  const scrollRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingLabel, setTypingLabel] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [busyMessageId, setBusyMessageId] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [openConversationMenuId, setOpenConversationMenuId] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [availableChatMembers, setAvailableChatMembers] = useState([]);
  const [isLoadingAvailableMembers, setIsLoadingAvailableMembers] = useState(false);
  const [chatActionBusy, setChatActionBusy] = useState('');

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedGroupId) ?? null;
  const selectedHeaderMenuId = selectedGroupId ? `header-${selectedGroupId}` : '';
  const isConversationMenuOpen = openConversationMenuId === selectedHeaderMenuId;
  const canPin = selectedConversation?.my_role === 'leader' || selectedConversation?.my_role === 'secretary';
  const canDeleteAsLeader = selectedConversation?.my_role === 'leader';
  const renderedMessages = [...messages].reverse();

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  useEffect(() => {
    conversationIdsRef.current = conversations.map((conversation) => conversation.id);
  }, [conversations]);

  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      try {
        setIsLoadingConversations(true);
        setLoadError('');
        const data = await listGroupConversations();

        if (!isMounted) {
          return;
        }

        setConversations(sortConversations(data));
        setSelectedGroupId((currentSelectedGroupId) => {
          if (currentSelectedGroupId && data.some((conversation) => conversation.id === currentSelectedGroupId)) {
            return currentSelectedGroupId;
          }

          return data[0]?.id ?? '';
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(error.response?.data?.error?.message ?? 'Không thể tải danh sách trò chuyện.');
      } finally {
        if (isMounted) {
          setIsLoadingConversations(false);
        }
      }
    }

    loadConversations();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      setPinnedMessages([]);
      setHistoryMeta(null);
      return;
    }

    let isMounted = true;

    async function loadThread() {
      try {
        setIsLoadingMessages(true);
        const [history, pinned] = await Promise.all([
          listGroupMessages(selectedGroupId, { limit: 24 }),
          listPinnedGroupMessages(selectedGroupId),
        ]);

        if (!isMounted) {
          return;
        }

        setMessages(sortMessages(history.data));
        setPinnedMessages(pinned);
        setHistoryMeta(history.meta);

        const latestMessageId = history.data[0]?.id;
        if (latestMessageId && socketRef.current) {
          socketRef.current.emit('mark_read', {
            group_id: selectedGroupId,
            last_message_id: latestMessageId,
          });
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        toast.error(error.response?.data?.error?.message ?? 'Không thể tải lịch sử trò chuyện.');
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadThread();

    return () => {
      isMounted = false;
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      autoConnect: true,
      reconnection: true,
    });

    socketRef.current = socket;

    function handleConnect() {
      setIsConnected(true);
      if (conversationIdsRef.current.length > 0) {
        socket.emit('join_groups', {
          group_ids: conversationIdsRef.current,
        });
      }
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    function handleNewMessage(event) {
      const nextMessage = event.message ?? event;
      const pendingKey = `${nextMessage.group_id}:${nextMessage.sender?.user_id ?? 'system'}:${nextMessage.content}`;
      const activeGroupId = selectedGroupIdRef.current;

      setMessages((currentMessages) => {
        if (nextMessage.group_id !== activeGroupId) {
          return currentMessages;
        }

        const tempMessage = currentMessages.find(
          (message) =>
            message.id.startsWith('temp-') &&
            message.group_id === nextMessage.group_id &&
            message.content === nextMessage.content &&
            message.sender?.user_id === nextMessage.sender?.user_id,
        );

        if (tempMessage || pendingKeysRef.current.has(pendingKey)) {
          pendingKeysRef.current.delete(pendingKey);
          return upsertMessage(
            currentMessages.filter((message) => message.id !== tempMessage?.id),
            nextMessage,
          );
        }

        return upsertMessage(currentMessages, nextMessage);
      });

      setConversations((currentConversations) =>
        sortConversations(
          currentConversations.map((conversation) =>
            conversation.id === nextMessage.group_id
              ? {
                  ...conversation,
                  latest_message: nextMessage,
                  unread_count:
                    nextMessage.sender?.user_id === currentUser?.id ||
                    nextMessage.group_id === activeGroupId ||
                    conversation.is_muted
                      ? 0
                      : conversation.unread_count + 1,
                }
              : conversation,
          ),
        ),
      );

      if (nextMessage.group_id === activeGroupId) {
        socket.emit('mark_read', {
          group_id: activeGroupId,
          last_message_id: nextMessage.id,
        });
      }
    }

    function handleMessageDeleted(event) {
      const activeGroupId = selectedGroupIdRef.current;

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === event.message_id && (!event.group_id || event.group_id === activeGroupId)
            ? {
                ...message,
                content: DELETED_MESSAGE_TEXT,
                is_deleted: true,
              }
            : message,
        ),
      );

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.latest_message?.id === event.message_id
            ? {
                ...conversation,
                latest_message: {
                  ...conversation.latest_message,
                  content: DELETED_MESSAGE_TEXT,
                  is_deleted: true,
                },
              }
            : conversation,
        ),
      );
    }

    function handleMessagePinned(event) {
      const activeGroupId = selectedGroupIdRef.current;
      const eventGroupId = event.group_id || activeGroupId;
      const scrollAnchor = eventGroupId === activeGroupId ? captureScrollAnchor() : null;

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === event.message_id && message.group_id === activeGroupId
            ? {
                ...message,
                is_pinned: event.is_pinned,
                pinned_by: event.pinned_by,
              }
            : message,
        ),
      );

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === eventGroupId
            ? {
                ...conversation,
                pinned_count: Math.max(0, (conversation.pinned_count || 0) + (event.is_pinned ? 1 : -1)),
              }
            : conversation,
        ),
      );

      if (eventGroupId === activeGroupId) {
        listPinnedGroupMessages(activeGroupId)
          .then((data) => {
            setPinnedMessages(data);
            restoreScrollAnchor(scrollAnchor);
          })
          .catch(() => {});
      }
    }

    function handleChatParticipantLeft(event) {
      setConversations((currentConversations) =>
        currentConversations.filter((conversation) => conversation.id !== event.group_id),
      );

      if (selectedGroupIdRef.current === event.group_id) {
        setSelectedGroupId('');
        setMessages([]);
        setPinnedMessages([]);
      }
    }

    function handleChatParticipantAdded() {
      setReloadToken((value) => value + 1);
    }

    function handleTyping(event) {
      if (event.user_id === currentUser?.id) {
        return;
      }

      setTypingLabel(`${event.display_name || 'Thành viên'} đang gõ...`);
    }

    function handleStopTyping(event) {
      if (event.user_id === currentUser?.id) {
        return;
      }

      setTypingLabel('');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('chat_participant_left', handleChatParticipantLeft);
    socket.on('chat_participant_added', handleChatParticipantAdded);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('chat_participant_left', handleChatParticipantLeft);
      socket.off('chat_participant_added', handleChatParticipantAdded);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, currentUser?.id]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || conversations.length === 0) {
      return;
    }

    socket.emit('join_groups', {
      group_ids: conversations.map((conversation) => conversation.id),
    });
  }, [conversations]);

  useEffect(() => {
    setOpenConversationMenuId('');
    setIsAddMemberOpen(false);

    if (!selectedGroupId) {
      return;
    }

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === selectedGroupId ? { ...conversation, unread_count: 0 } : conversation,
      ),
    );
  }, [selectedGroupId]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current && !isLoadingMessages && !isLoadingOlder) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isLoadingMessages, isLoadingOlder]);

  function captureScrollAnchor() {
    const scrollElement = scrollRef.current;

    if (!scrollElement) {
      return null;
    }

    const distanceFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;

    return {
      distanceFromBottom,
      isNearBottom: distanceFromBottom < 80,
      scrollHeight: scrollElement.scrollHeight,
      scrollTop: scrollElement.scrollTop,
    };
  }

  function restoreScrollAnchor(anchor) {
    if (!anchor) {
      return;
    }

    window.requestAnimationFrame(() => {
      const scrollElement = scrollRef.current;

      if (!scrollElement) {
        return;
      }

      if (anchor.isNearBottom) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
        return;
      }

      scrollElement.scrollTop = anchor.scrollTop + (scrollElement.scrollHeight - anchor.scrollHeight);
    });
  }

  function scheduleStopTyping(nextGroupId) {
    const socket = socketRef.current;

    if (!socket || !nextGroupId) {
      return;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('typing', {
      group_id: nextGroupId,
    });

    typingTimeoutRef.current = window.setTimeout(() => {
      socket.emit('stop_typing', {
        group_id: nextGroupId,
      });
    }, 900);
  }

  async function handleLoadOlder() {
    if (!selectedGroupId || !historyMeta?.has_more || !historyMeta?.next_cursor) {
      return;
    }

    const scrollElement = scrollRef.current;
    const previousHeight = scrollElement?.scrollHeight ?? 0;

    try {
      setIsLoadingOlder(true);
      const history = await listGroupMessages(selectedGroupId, {
        cursor: historyMeta.next_cursor,
        limit: 24,
      });

      setMessages((currentMessages) => sortMessages([...currentMessages, ...history.data]));
      setHistoryMeta(history.meta);

      window.requestAnimationFrame(() => {
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight - previousHeight;
        }
      });
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không thể tải thêm tin nhắn cũ.');
    } finally {
      setIsLoadingOlder(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!selectedGroupId || !messageInput.trim()) {
      return;
    }

    const normalizedContent = messageInput.trim();
    const tempId = `temp-${Date.now()}`;
    const pendingKey = `${selectedGroupId}:${currentUser?.id}:${normalizedContent}`;
    const optimisticMessage = {
      id: tempId,
      group_id: selectedGroupId,
      sender: {
        user_id: currentUser?.id,
        display_name: currentUser?.display_name ?? 'Bạn',
        avatar_url: currentUser?.avatar_url ?? null,
      },
      content: normalizedContent,
      type: 'text',
      is_pinned: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      edited_at: null,
    };

    try {
      setIsSending(true);
      pendingKeysRef.current.add(pendingKey);
      setMessages((currentMessages) => upsertMessage(currentMessages, optimisticMessage));
      setMessageInput('');

      const socket = socketRef.current;
      if (socket) {
        socket.emit('stop_typing', {
          group_id: selectedGroupId,
        });
      }

      const createdMessage = await createGroupMessage(selectedGroupId, {
        content: normalizedContent,
      });

      pendingKeysRef.current.delete(pendingKey);
      setMessages((currentMessages) =>
        upsertMessage(
          currentMessages.filter((message) => message.id !== tempId),
          createdMessage,
        ),
      );
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === selectedGroupId
            ? {
                ...conversation,
                latest_message: createdMessage,
                unread_count: 0,
              }
            : conversation,
        ),
      );
    } catch (error) {
      pendingKeysRef.current.delete(pendingKey);
      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== tempId));
      setMessageInput(normalizedContent);
      toast.error(error.response?.data?.error?.message ?? 'Không thể gửi tin nhắn.');
    } finally {
      setIsSending(false);
    }
  }

  function handleMessageInputKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage(event);
    }
  }

  async function handleDeleteMessage(messageId) {
    if (!selectedGroupId) {
      return;
    }

    try {
      setBusyMessageId(messageId);
      await deleteGroupMessage(selectedGroupId, messageId);
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content: DELETED_MESSAGE_TEXT,
                is_deleted: true,
              }
            : message,
        ),
      );
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không thể xoá tin nhắn.');
    } finally {
      setBusyMessageId('');
    }
  }

  async function handlePinMessage(messageId, nextPinned) {
    if (!selectedGroupId) {
      return;
    }

    const scrollAnchor = captureScrollAnchor();

    try {
      setBusyMessageId(messageId);
      await pinGroupMessage(selectedGroupId, messageId, {
        pinned: nextPinned,
      });
      const nextPinnedMessages = await listPinnedGroupMessages(selectedGroupId);
      setPinnedMessages(nextPinnedMessages);
      restoreScrollAnchor(scrollAnchor);
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                is_pinned: nextPinnedMessages.some((item) => item.id === messageId),
              }
            : message,
        ),
      );
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === selectedGroupId
            ? {
                ...conversation,
                pinned_count: nextPinnedMessages.length,
              }
            : conversation,
        ),
      );
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không thể cập nhật trạng thái ghim.');
    } finally {
      setBusyMessageId('');
    }
  }

  function handleMarkConversationRead(targetConversation) {
    if (!targetConversation) {
      return;
    }

    const latestMessageId =
      targetConversation.id === selectedGroupId
        ? messages[0]?.id || targetConversation.latest_message?.id
        : targetConversation.latest_message?.id;

    if (latestMessageId && socketRef.current) {
      socketRef.current.emit('mark_read', {
        group_id: targetConversation.id,
        last_message_id: latestMessageId,
      });
    }

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === targetConversation.id ? { ...conversation, unread_count: 0 } : conversation,
      ),
    );
    setOpenConversationMenuId('');
  }

  async function handleToggleMute(targetConversation) {
    if (!targetConversation || chatActionBusy) {
      return;
    }

    const nextMuted = !targetConversation.is_muted;

    try {
      setChatActionBusy(`mute-${targetConversation.id}`);
      const updated = await updateGroupChatSettings(targetConversation.id, {
        is_muted: nextMuted,
      });
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === targetConversation.id
            ? {
                ...conversation,
                is_muted: updated?.is_muted ?? nextMuted,
                unread_count: updated?.is_muted ?? nextMuted ? 0 : conversation.unread_count,
              }
            : conversation,
        ),
      );
      setOpenConversationMenuId('');
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không thể cập nhật thông báo chat.');
    } finally {
      setChatActionBusy('');
    }
  }

  async function handleOpenAddMember(groupId) {
    if (!groupId || chatActionBusy) {
      return;
    }

    try {
      setSelectedGroupId(groupId);
      setIsMobileThreadOpen(true);
      setChatActionBusy(`members-${groupId}`);
      setIsLoadingAvailableMembers(true);
      setOpenConversationMenuId('');
      setIsAddMemberOpen(true);
      const data = await listAvailableChatParticipants(groupId);
      setAvailableChatMembers(data);
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không thể tải danh sách thành viên có thể thêm.');
      setIsAddMemberOpen(false);
    } finally {
      setIsLoadingAvailableMembers(false);
      setChatActionBusy('');
    }
  }

  async function handleAddChatMember(member) {
    if (!selectedGroupId || chatActionBusy) {
      return;
    }

    try {
      setChatActionBusy(`add-${member.user_id}`);
      await addGroupChatParticipant(selectedGroupId, {
        user_id: member.user_id,
      });
      setAvailableChatMembers((currentMembers) =>
        currentMembers.filter((currentMember) => currentMember.user_id !== member.user_id),
      );
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không thể thêm thành viên vào chat.');
    } finally {
      setChatActionBusy('');
    }
  }

  async function handleLeaveChat(targetConversation) {
    if (!targetConversation || chatActionBusy) {
      return;
    }

    try {
      setChatActionBusy(`leave-${targetConversation.id}`);
      await leaveGroupChat(targetConversation.id);
      socketRef.current?.emit('leave_group', {
        group_id: targetConversation.id,
      });

      const remainingConversations = conversations.filter(
        (conversation) => conversation.id !== targetConversation.id,
      );
      setConversations(remainingConversations);
      if (selectedGroupId === targetConversation.id) {
        setSelectedGroupId(remainingConversations[0]?.id ?? '');
        setMessages([]);
        setPinnedMessages([]);
        setHistoryMeta(null);
      }
      setOpenConversationMenuId('');
      setIsAddMemberOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không thể rời nhóm chat.');
    } finally {
      setChatActionBusy('');
    }
  }

  function handleSelectConversation(groupId) {
    setSelectedGroupId(groupId);
    setIsMobileThreadOpen(true);
    setOpenConversationMenuId('');
  }

  function setIsConversationMenuOpen(updater) {
    const nextIsOpen =
      typeof updater === 'function' ? updater(openConversationMenuId === selectedHeaderMenuId) : updater;

    setOpenConversationMenuId(nextIsOpen ? selectedHeaderMenuId : '');
  }

  function handleMarkSelectedRead() {
    handleMarkConversationRead(selectedConversation);
  }

  function handleToggleSelectedMute() {
    handleToggleMute(selectedConversation);
  }

  function handleOpenSelectedAddMember() {
    handleOpenAddMember(selectedGroupId);
  }

  function handleLeaveSelectedChat() {
    handleLeaveChat(selectedConversation);
  }

  return (
    <PageContainer
      eyebrow="Trò chuyện"
      title="Messenger của nhóm"
      variant="social"
    >
      <section
        className="overflow-hidden rounded-[28px] border border-white/80 bg-[#f7fbff] shadow-panel"
        data-testid="chat-shell"
      >
        <div className="grid h-[calc(100vh-320px)] min-h-[500px] lg:h-[calc(100vh-260px)] lg:min-h-[520px] lg:grid-cols-[340px_minmax(0,1fr)_300px]">
          <aside
            className={[
              'min-h-0 overflow-y-auto border-r border-slate-200/70 bg-white/85 p-4 backdrop-blur',
              isMobileThreadOpen ? 'hidden lg:block' : 'block',
            ].join(' ')}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#0b7443]">Tin nhắn</p>
                <h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-950">Hộp chat</h2>
              </div>
            </div>

            {isLoadingConversations ? (
              <div className="grid gap-3" aria-label="Đang tải danh sách trò chuyện">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : loadError ? (
              <ErrorState
                message={loadError}
                onRetry={() => setReloadToken((value) => value + 1)}
                actionLabel="Tải lại"
                className="rounded-2xl p-5"
              />
            ) : conversations.length === 0 ? (
              <EmptyState
                title="Chưa có cuộc trò chuyện"
                description="Khi bạn tham gia nhóm, phòng chat của nhóm sẽ xuất hiện tại đây."
              />
            ) : (
              <div className="grid gap-1">
                {conversations.map((conversation) => (
                  <ConversationButton
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === selectedGroupId}
                    isMenuOpen={openConversationMenuId === conversation.id}
                    isBusy={chatActionBusy.includes(conversation.id)}
                    onClick={() => handleSelectConversation(conversation.id)}
                    onToggleMenu={(event) => {
                      event.stopPropagation();
                      setOpenConversationMenuId((currentId) =>
                        currentId === conversation.id ? '' : conversation.id,
                      );
                    }}
                    onMarkRead={() => handleMarkConversationRead(conversation)}
                    onToggleMute={() => handleToggleMute(conversation)}
                    onOpenAddMember={() => handleOpenAddMember(conversation.id)}
                    onLeave={() => handleLeaveChat(conversation)}
                  />
                ))}
              </div>
            )}
          </aside>

          <section
            className={[
              'flex min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,#e1fdea_0,#f7fbff_32%,#f7fbff_100%)]',
              isMobileThreadOpen ? 'block' : 'hidden lg:flex',
            ].join(' ')}
          >
            {selectedConversation ? (
              <>
                <header className="flex items-center gap-3 border-b border-white/80 bg-white/75 px-4 py-3 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setIsMobileThreadOpen(false)}
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                    aria-label="Quay lại danh sách trò chuyện"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <UserAvatar
                    userId={selectedConversation.id}
                    groupId="conversation"
                    displayName={selectedConversation.name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[17px] font-bold text-slate-950">{selectedConversation.name}</h2>
                    <p className="truncate text-[12px] font-medium text-slate-500">
                      {selectedConversation.member_count} thành viên · {roleLabels[selectedConversation.my_role] ?? selectedConversation.my_role}
                      {selectedConversation.is_muted ? ' · Đã tắt thông báo' : ''}
                    </p>
                  </div>
                  <div
                    className={[
                      'rounded-full px-3 py-1 text-[12px] font-semibold',
                      isConnected ? 'bg-[#d1fadf] text-[#0b7443]' : 'bg-amber-100 text-amber-800',
                    ].join(' ')}
                  >
                    {isConnected ? 'Đang kết nối' : 'Mất kết nối'}
                  </div>
                  <div hidden className="relative">
                    <button
                      type="button"
                      onClick={() => setIsConversationMenuOpen((isOpen) => !isOpen)}
                      className="rounded-full bg-white p-2 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-[#e1fdea] hover:text-[#0b7443]"
                      aria-label="Tùy chọn cuộc trò chuyện"
                      aria-expanded={isConversationMenuOpen}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {isConversationMenuOpen ? (
                      <div className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 text-sm shadow-xl">
                        <button
                          type="button"
                          onClick={handleMarkSelectedRead}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-[#e1fdea] hover:text-[#0b7443]"
                        >
                          <Check size={16} />
                          Đánh dấu đã đọc
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleSelectedMute}
                          disabled={chatActionBusy === 'mute'}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-[#e1fdea] hover:text-[#0b7443] disabled:opacity-50"
                        >
                          {selectedConversation.is_muted ? <Bell size={16} /> : <BellOff size={16} />}
                          {selectedConversation.is_muted ? 'Bật thông báo' : 'Tắt thông báo'}
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenSelectedAddMember}
                          disabled={chatActionBusy === 'members'}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-[#e1fdea] hover:text-[#0b7443] disabled:opacity-50"
                        >
                          <UserPlus size={16} />
                          Thêm thành viên
                        </button>
                        <button
                          type="button"
                          onClick={handleLeaveSelectedChat}
                          disabled={chatActionBusy === 'leave'}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <LogOut size={16} />
                          Rời nhóm chat
                        </button>
                      </div>
                    ) : null}
                  </div>
                </header>

                {isAddMemberOpen ? (
                  <div className="mx-4 mt-4 rounded-3xl border border-[#61bc76]/30 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#0b7443]">
                          Thêm thành viên
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddMemberOpen(false)}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Đóng
                      </button>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {isLoadingAvailableMembers ? (
                        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                      ) : availableChatMembers.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                          Không có thành viên nào cần thêm lại vào chat.
                        </p>
                      ) : (
                        availableChatMembers.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7fbff] px-3 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar
                                avatarUrl={member.avatar_url}
                                userId={member.user_id}
                                groupId={selectedGroupId}
                                displayName={member.display_name || 'Thành viên'}
                                size="sm"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                  {member.display_name || 'Thành viên'}
                                </span>
                                <span className="text-[12px] text-slate-500">
                                  {roleLabels[member.role] ?? member.role}
                                </span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddChatMember(member)}
                              disabled={chatActionBusy === `add-${member.user_id}`}
                              className="rounded-full bg-[#0b7443] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#095936] disabled:opacity-50"
                              aria-label={`Thêm ${member.display_name || 'thành viên'} vào chat`}
                            >
                              Thêm
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                {!isConnected ? (
                  <div className="mx-4 mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    <WifiOff size={16} />
                    Mất kết nối, đang kết nối lại...
                  </div>
                ) : null}

                {pinnedMessages.length > 0 ? (
                  <div className="mx-4 mt-4 rounded-2xl border border-[#61bc76]/40 bg-white/85 px-4 py-3 shadow-sm">
                    <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#0b7443]">
                      <Pin size={14} />
                      Tin đã ghim
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {pinnedMessages.map((message) => (
                        <div key={message.id} className="min-w-[220px] rounded-2xl bg-[#e1fdea] px-3 py-2">
                          <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">{message.content}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Ghim bởi {message.pinned_by?.display_name ?? 'hệ thống'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5" data-testid="chat-scroll-container">
                  {historyMeta?.has_more ? (
                    <button
                      type="button"
                      onClick={handleLoadOlder}
                      disabled={isLoadingOlder}
                      className="mx-auto mb-5 block rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-[#0b7443] disabled:opacity-50"
                    >
                      {isLoadingOlder ? 'Đang tải tin cũ...' : 'Xem tin nhắn cũ hơn'}
                    </button>
                  ) : null}

                  {isLoadingMessages ? (
                    <div className="grid gap-4" aria-label="Đang tải tin nhắn">
                      {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="h-14 animate-pulse rounded-3xl bg-white/80" />
                      ))}
                    </div>
                  ) : renderedMessages.length === 0 ? (
                    <EmptyState
                      title="Chưa có tin nhắn"
                      description="Hãy gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện của nhóm."
                    />
                  ) : (
                    <div className="grid gap-3">
                      {renderedMessages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          currentUserId={currentUser?.id}
                          canPin={canPin}
                          canDeleteAsLeader={canDeleteAsLeader}
                          busyMessageId={busyMessageId}
                          onDelete={handleDeleteMessage}
                          onPin={handlePinMessage}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/80 bg-white/80 px-4 py-3 backdrop-blur">
                  {typingLabel ? (
                    <p className="mb-2 text-[12px] font-medium text-[#0b7443]">{typingLabel}</p>
                  ) : null}
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2 rounded-[24px] bg-slate-100 p-2">
                    <label className="sr-only" htmlFor="chat-message-input">
                      Tin nhắn mới
                    </label>
                    <textarea
                      id="chat-message-input"
                      value={messageInput}
                      onChange={(event) => {
                        setMessageInput(event.target.value);
                        scheduleStopTyping(selectedGroupId);
                      }}
                      onKeyDown={handleMessageInputKeyDown}
                      rows={1}
                      className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-[14px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Nhập tin nhắn..."
                    />
                    <button
                      type="submit"
                      disabled={isSending || !messageInput.trim()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b7443] text-white transition hover:bg-[#095936] disabled:cursor-not-allowed disabled:bg-slate-300"
                      aria-label="Gửi tin nhắn"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState
                  title="Chưa chọn cuộc trò chuyện"
                />
              </div>
            )}
          </section>

          <aside className="hidden min-h-0 overflow-y-auto border-l border-slate-200/70 bg-white/75 p-5 backdrop-blur lg:block">
            {selectedConversation ? (
              <div className="space-y-5">
                <div className="rounded-3xl bg-[#e1fdea] p-5 text-center">
                  <UserAvatar
                    userId={selectedConversation.id}
                    groupId="conversation"
                    displayName={selectedConversation.name}
                    size="xl"
                    className="mx-auto"
                  />
                  <h2 className="mt-4 text-lg font-bold text-slate-950">{selectedConversation.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedConversation.member_count} thành viên · {roleLabels[selectedConversation.my_role] ?? selectedConversation.my_role}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-100 bg-white p-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-400">Tóm tắt</p>
                  <div className="mt-3 grid gap-3 text-sm text-slate-600">
                    <p>{selectedConversation.description || 'Không có mô tả nhóm.'}</p>
                    <p>{selectedConversation.pinned_count} tin nhắn đang được ghim.</p>
                    <p>{selectedConversation.unread_count} tin nhắn chưa đọc.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </PageContainer>
  );
}
