const chatService = require("./chat.service");

function registerChatHandlers(io, socket) {
  socket.join(`user:${socket.user.id}`);

  socket.on("join_group", async ({ group_id: groupId }) => {
    try {
      await chatService.assertActiveChatParticipant(groupId, socket.user.id);
      socket.join(`group:${groupId}`);
      socket.emit("joined", {
        group_id: groupId
      });
    } catch {
      socket.emit("error", {
        code: "NOT_CHAT_PARTICIPANT",
        message: "Bạn không tham gia nhóm chat này"
      });
    }
  });

  socket.on("join_groups", async ({ group_ids: groupIds = [] }) => {
    const joinedGroupIds = [];
    const uniqueGroupIds = [...new Set(groupIds.filter(Boolean))];

    await Promise.all(
      uniqueGroupIds.map(async (groupId) => {
        try {
          await chatService.assertActiveChatParticipant(groupId, socket.user.id);
          socket.join(`group:${groupId}`);
          joinedGroupIds.push(groupId);
        } catch {
          // Ignore groups that are no longer available to this socket.
        }
      })
    );

    socket.emit("joined_groups", {
      group_ids: joinedGroupIds
    });
  });

  socket.on("leave_group", ({ group_id: groupId }) => {
    socket.leave(`group:${groupId}`);
  });

  socket.on("send_message", async ({ group_id: groupId, content }) => {
    try {
      const message = await chatService.createMessage({
        groupId,
        senderId: socket.user.id,
        content
      });

      io.to(`group:${groupId}`).emit("new_message", {
        message
      });
    } catch (error) {
      socket.emit("error", {
        code: error.code || "INTERNAL_SERVER_ERROR",
        message: error.message || "Không gửi được tin nhắn"
      });
    }
  });

  socket.on("typing", ({ group_id: groupId }) => {
    socket.to(`group:${groupId}`).emit("user_typing", {
      user_id: socket.user.id,
      display_name: socket.user.display_name || "Thành viên"
    });
  });

  socket.on("stop_typing", ({ group_id: groupId }) => {
    socket.to(`group:${groupId}`).emit("user_stop_typing", {
      user_id: socket.user.id
    });
  });

  socket.on("mark_read", async ({ group_id: groupId, last_message_id: lastMessageId }) => {
    try {
      const result = await chatService.markRead({
        userId: socket.user.id,
        groupId,
        messageId: lastMessageId
      });
      socket.emit("messages_read", result);
    } catch (error) {
      socket.emit("error", {
        code: error.code || "INTERNAL_SERVER_ERROR",
        message: error.message || "Không cập nhật được trạng thái đã đọc"
      });
    }
  });
}

module.exports = {
  registerChatHandlers
};
