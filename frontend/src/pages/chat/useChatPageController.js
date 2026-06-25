import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

import {
  addGroupChatParticipant,
  createGroupMessage,
  deleteGroupMessage,
  leaveGroupChat,
  listAvailableChatParticipants,
  listGroupMessages,
  listPinnedGroupMessages,
  pinGroupMessage,
  updateGroupChatSettings,
} from '../../api/chat';
import { listGroupConversations } from '../../api/group-core';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';
import { sortConversations, sortMessages, upsertMessage } from './chatPageUtils';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';
const DELETED_MESSAGE_TEXT = 'Tin nhắn đã bị xoá';

export function useChatPageController() {
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

        setLoadError(getApiErrorMessage(error, 'Không thể tải danh sách trò chuyện.'));
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

        toast.error(getApiErrorMessage(error, 'Không thể tải lịch sử trò chuyện.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể tải thêm tin nhắn cũ.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể gửi tin nhắn.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể xoá tin nhắn.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái ghim.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật thông báo chat.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể tải danh sách thành viên có thể thêm.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể thêm thành viên vào chat.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể rời nhóm chat.'));
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

  return {
    availableChatMembers,
    busyMessageId,
    canDeleteAsLeader,
    canPin,
    chatActionBusy,
    conversations,
    currentUserId: currentUser?.id,
    handleAddChatMember,
    handleDeleteMessage,
    handleLeaveChat,
    handleLeaveSelectedChat,
    handleLoadOlder,
    handleMarkConversationRead,
    handleMarkSelectedRead,
    handleMessageInputKeyDown,
    handleOpenAddMember,
    handleOpenSelectedAddMember,
    handlePinMessage,
    handleSelectConversation,
    handleSendMessage,
    handleToggleMute,
    handleToggleSelectedMute,
    historyMeta,
    isAddMemberOpen,
    isConnected,
    isConversationMenuOpen,
    isLoadingAvailableMembers,
    isLoadingConversations,
    isLoadingMessages,
    isLoadingOlder,
    isMobileThreadOpen,
    isSending,
    loadError,
    messageInput,
    onScheduleStopTyping: scheduleStopTyping,
    openConversationMenuId,
    pinnedMessages,
    renderedMessages,
    scrollRef,
    selectedConversation,
    selectedGroupId,
    setIsAddMemberOpen,
    setIsConversationMenuOpen,
    setIsMobileThreadOpen,
    setMessageInput,
    setOpenConversationMenuId,
    setReloadToken,
    typingLabel,
  };
}
