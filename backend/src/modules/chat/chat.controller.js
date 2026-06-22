const { buildSuccessResponse } = require("../../utils/apiResponse");
const chatService = require("./chat.service");

async function listMessages(request, response, next) {
  try {
    const result = await chatService.listMessages(request.params.id, request.query, request.user.id);
    response.status(200).json(buildSuccessResponse(result.data, result.meta));
  } catch (error) {
    next(error);
  }
}

async function createMessage(request, response, next) {
  try {
    const data = await chatService.createMessage({
      groupId: request.params.id,
      senderId: request.user.id,
      content: request.body.content
    });

    const io = request.app.get("io");
    if (io) {
      io.to(`group:${request.params.id}`).emit("new_message", {
        message: data
      });
    }

    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function deleteMessage(request, response, next) {
  try {
    const data = await chatService.deleteMessage(
      request.params.id,
      request.params.msgId,
      request.user.id,
      request.groupMembership.role
    );

    const io = request.app.get("io");
    if (io) {
      io.to(`group:${request.params.id}`).emit("message_deleted", {
        group_id: request.params.id,
        message_id: request.params.msgId
      });
    }

    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function pinMessage(request, response, next) {
  try {
    const data = await chatService.pinMessage(
      request.params.id,
      request.params.msgId,
      request.user.id,
      request.body.pinned
    );

    const io = request.app.get("io");
    if (io) {
      io.to(`group:${request.params.id}`).emit("message_pinned", {
        ...data,
        group_id: request.params.id
      });
    }

    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listPinnedMessages(request, response, next) {
  try {
    const data = await chatService.listPinnedMessages(request.params.id, request.user.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function updateMyChatSettings(request, response, next) {
  try {
    const data = await chatService.updateMyChatSettings({
      groupId: request.params.id,
      userId: request.user.id,
      isMuted: request.body.is_muted
    });

    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function leaveChat(request, response, next) {
  try {
    const data = await chatService.leaveChat({
      groupId: request.params.id,
      userId: request.user.id
    });

    const io = request.app.get("io");
    if (io) {
      io.in(`user:${request.user.id}`).socketsLeave(`group:${request.params.id}`);
      io.to(`user:${request.user.id}`).emit("chat_participant_left", {
        group_id: request.params.id
      });
    }

    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function addChatParticipant(request, response, next) {
  try {
    const data = await chatService.addChatParticipant({
      groupId: request.params.id,
      actorUserId: request.user.id,
      targetUserId: request.body.user_id
    });

    const io = request.app.get("io");
    if (io) {
      io.to(`user:${request.body.user_id}`).emit("chat_participant_added", {
        group_id: request.params.id
      });
      io.to(`group:${request.params.id}`).emit("chat_participant_added", data);
    }

    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listAvailableChatParticipants(request, response, next) {
  try {
    const data = await chatService.listAvailableChatParticipants({
      groupId: request.params.id,
      actorUserId: request.user.id
    });

    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addChatParticipant,
  createMessage,
  deleteMessage,
  leaveChat,
  listAvailableChatParticipants,
  listMessages,
  listPinnedMessages,
  pinMessage,
  updateMyChatSettings
};
