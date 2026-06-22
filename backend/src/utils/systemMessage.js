async function createSystemMessage(tx, groupId, content) {
  if (!tx.message?.create) {
    return null;
  }

  return tx.message.create({
    data: {
      group_id: groupId,
      sender_id: null,
      content,
      type: "system"
    }
  });
}

module.exports = {
  createSystemMessage
};
