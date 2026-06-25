import {
  Bell,
  BellOff,
  Check,
  ChevronLeft,
  LogOut,
  MoreHorizontal,
  Pin,
  Send,
  UserPlus,
  WifiOff,
} from 'lucide-react';

import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { UserAvatar } from '../../components/common/UserAvatar';
import { getRoleLabel } from '../../constants/groupRoles';
import { ConversationButton, MessageBubble } from './ChatPageComponents';

export function ChatWorkspace({
  availableChatMembers,
  canDeleteAsLeader,
  canPin,
  chatActionBusy,
  conversations,
  currentUserId,
  getAvailableMemberBusyKey,
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
  onScheduleStopTyping,
  busyMessageId,
}) {
  return (
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
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#0b7443]">
                Tin nhắn
              </p>
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
                  <h2 className="truncate text-[17px] font-bold text-slate-950">
                    {selectedConversation.name}
                  </h2>
                  <p className="truncate text-[12px] font-medium text-slate-500">
                    {selectedConversation.member_count} thành viên ·{' '}
                    {getRoleLabel(selectedConversation.my_role)}
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
                                {getRoleLabel(member.role)}
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddChatMember(member)}
                            disabled={chatActionBusy === getAvailableMemberBusyKey(member.user_id)}
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
                        <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">
                          {message.content}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Ghim bởi {message.pinned_by?.display_name ?? 'hệ thống'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
                data-testid="chat-scroll-container"
              >
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
                        currentUserId={currentUserId}
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
                      onScheduleStopTyping(selectedGroupId);
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
              <EmptyState title="Chưa chọn cuộc trò chuyện" />
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
                  {selectedConversation.member_count} thành viên · {getRoleLabel(selectedConversation.my_role)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white p-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Tóm tắt
                </p>
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
  );
}
