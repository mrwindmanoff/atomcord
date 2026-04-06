import { getChannelHistory, addMessage } from '../store/messages.js';

export class TextRoom {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.createdAt = Date.now();
  }
  
  getHistory(limit = 50) {
    return getChannelHistory(this.id, limit);
  }
  
  addMessage(text, nickname, userId) {
    return addMessage(this.id, text, nickname);
  }
  
  isValid() {
    return this.id && this.name;
  }
}

export const textRooms = new Map([
  ['general', new TextRoom('general', 'Общий')],
  ['random', new TextRoom('random', 'Случайный')],
  ['announcements', new TextRoom('announcements', 'Объявления')]
]);

export function getTextRoom(roomId) {
  return textRooms.get(roomId);
}

export function getAllTextRooms() {
  return Array.from(textRooms.values());
}