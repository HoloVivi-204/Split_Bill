export function formatBadge(count) {
  if (count <= 0) {
    return null;
  }

  return count > 5 ? '5+' : String(count);
}

export function formatCompactTime(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export function formatMessageTime(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function buildConversationPreview(conversation) {
  if (!conversation.latest_message) {
    return conversation.description || 'Chưa có tin nhắn nào.';
  }

  if (conversation.latest_message.type === 'system') {
    return conversation.latest_message.content;
  }

  const sender = conversation.latest_message.sender?.display_name || 'Thành viên';

  return `${sender}: ${conversation.latest_message.content}`;
}

export function toLatestMessage(message) {
  if (!message) {
    return null;
  }

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

export function sortMessagesAscending(messages) {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();

    return leftTime - rightTime;
  });
}

export function resolvePrimaryNavTo(pathname) {
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
