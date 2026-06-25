export function sortMessages(messages) {
  return [...messages].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
}

export function upsertMessage(messages, nextMessage) {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex >= 0) {
    const nextMessages = [...messages];
    nextMessages[existingIndex] = nextMessage;

    return sortMessages(nextMessages);
  }

  return sortMessages([nextMessage, ...messages]);
}

export function formatChatTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatConversationTime(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export function buildPreview(conversation) {
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

export function sortConversations(conversations) {
  return [...conversations].sort((left, right) => {
    const leftTime = new Date(left.latest_message?.created_at || left.created_at).getTime();
    const rightTime = new Date(right.latest_message?.created_at || right.created_at).getTime();

    return rightTime - leftTime;
  });
}
