import { PageContainer } from '../../components/common/PageContainer';
import { ChatWorkspace } from './ChatWorkspace';
import { useChatPageController } from './useChatPageController';

export function ChatPage() {
  const chatPage = useChatPageController();

  return (
    <PageContainer
      eyebrow="Trò chuyện"
      title="Messenger của nhóm"
      variant="social"
    >
      <ChatWorkspace
        availableChatMembers={chatPage.availableChatMembers}
        busyMessageId={chatPage.busyMessageId}
        canDeleteAsLeader={chatPage.canDeleteAsLeader}
        canPin={chatPage.canPin}
        chatActionBusy={chatPage.chatActionBusy}
        conversations={chatPage.conversations}
        currentUserId={chatPage.currentUserId}
        getAvailableMemberBusyKey={(userId) => `add-${userId}`}
        handleAddChatMember={chatPage.handleAddChatMember}
        handleDeleteMessage={chatPage.handleDeleteMessage}
        handleLeaveChat={chatPage.handleLeaveChat}
        handleLeaveSelectedChat={chatPage.handleLeaveSelectedChat}
        handleLoadOlder={chatPage.handleLoadOlder}
        handleMarkConversationRead={chatPage.handleMarkConversationRead}
        handleMarkSelectedRead={chatPage.handleMarkSelectedRead}
        handleMessageInputKeyDown={chatPage.handleMessageInputKeyDown}
        handleOpenAddMember={chatPage.handleOpenAddMember}
        handleOpenSelectedAddMember={chatPage.handleOpenSelectedAddMember}
        handlePinMessage={chatPage.handlePinMessage}
        handleSelectConversation={chatPage.handleSelectConversation}
        handleSendMessage={chatPage.handleSendMessage}
        handleToggleMute={chatPage.handleToggleMute}
        handleToggleSelectedMute={chatPage.handleToggleSelectedMute}
        historyMeta={chatPage.historyMeta}
        isAddMemberOpen={chatPage.isAddMemberOpen}
        isConnected={chatPage.isConnected}
        isConversationMenuOpen={chatPage.isConversationMenuOpen}
        isLoadingAvailableMembers={chatPage.isLoadingAvailableMembers}
        isLoadingConversations={chatPage.isLoadingConversations}
        isLoadingMessages={chatPage.isLoadingMessages}
        isLoadingOlder={chatPage.isLoadingOlder}
        isMobileThreadOpen={chatPage.isMobileThreadOpen}
        isSending={chatPage.isSending}
        loadError={chatPage.loadError}
        messageInput={chatPage.messageInput}
        onScheduleStopTyping={chatPage.onScheduleStopTyping}
        openConversationMenuId={chatPage.openConversationMenuId}
        pinnedMessages={chatPage.pinnedMessages}
        renderedMessages={chatPage.renderedMessages}
        scrollRef={chatPage.scrollRef}
        selectedConversation={chatPage.selectedConversation}
        selectedGroupId={chatPage.selectedGroupId}
        setIsAddMemberOpen={chatPage.setIsAddMemberOpen}
        setIsConversationMenuOpen={chatPage.setIsConversationMenuOpen}
        setIsMobileThreadOpen={chatPage.setIsMobileThreadOpen}
        setMessageInput={chatPage.setMessageInput}
        setOpenConversationMenuId={chatPage.setOpenConversationMenuId}
        setReloadToken={chatPage.setReloadToken}
        typingLabel={chatPage.typingLabel}
      />
    </PageContainer>
  );
}
