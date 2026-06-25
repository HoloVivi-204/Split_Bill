import {
  Bell,
  BellOff,
  Check,
  LogOut,
  MoreHorizontal,
  Pin,
  Trash2,
  UserPlus,
} from 'lucide-react';

import { UserAvatar } from '../../components/common/UserAvatar';
import { buildPreview, formatChatTime, formatConversationTime } from './chatPageUtils';

export function ConversationButton({
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

export function MessageBubble({
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
