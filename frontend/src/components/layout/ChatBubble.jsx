import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Pin, Send, X } from 'lucide-react';

import {
  createGroupMessage,
  deleteGroupMessage,
  listGroupMessages,
  pinGroupMessage,
} from '../../api/chat';
import { UserAvatar } from '../common/UserAvatar';
import { formatMessageTime, sortMessagesAscending } from './appShellUtils';

export function ChatBubble({ conversation, currentUser, onClose, onMessageSent }) {
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
        const result = await listGroupMessages(conversation.id, { limit: 12 });
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
      const savedMessage = await createGroupMessage(conversation.id, { content });
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
      await deleteGroupMessage(conversation.id, messageId);
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
      await pinGroupMessage(conversation.id, messageId, {
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
