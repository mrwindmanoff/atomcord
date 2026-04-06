// Хранилище сообщений в памяти
// Максимум 500 сообщений на канал

export const messages = []; // { id, text, nickname, channelId, timestamp }

export function addMessage(channelId, text, nickname) {
  const msg = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    channelId,
    text,
    nickname,
    timestamp: Date.now()
  };
  
  messages.push(msg);
  
  // Ограничиваем количество сообщений в канале до 500
  const channelMessages = messages.filter(m => m.channelId === channelId);
  if (channelMessages.length > 500) {
    const toRemove = channelMessages.length - 500;
    let removed = 0;
    for (let i = 0; i < messages.length && removed < toRemove; i++) {
      if (messages[i].channelId === channelId) {
        messages.splice(i, 1);
        removed++;
        i--; // Корректируем индекс после удаления
      }
    }
  }
  
  return msg;
}

export function getChannelHistory(channelId, limit = 50) {
  return messages
    .filter(m => m.channelId === channelId)
    .slice(-limit);
}

export function getMessageById(messageId) {
  return messages.find(m => m.id === messageId);
}

export function deleteMessage(messageId) {
  const index = messages.findIndex(m => m.id === messageId);
  if (index !== -1) {
    return messages.splice(index, 1)[0];
  }
  return null;
}

export function getTotalMessagesCount() {
  return messages.length;
}