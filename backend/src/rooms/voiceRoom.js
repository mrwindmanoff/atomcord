export class VoiceRoom {
  constructor(id, name, maxUsers = 20) {
    this.id = id;
    this.name = name;
    this.maxUsers = maxUsers;
    this.users = new Set();
    this.createdAt = Date.now();
  }
  
  addUser(userId) {
    if (this.users.size >= this.maxUsers) {
      return false;
    }
    this.users.add(userId);
    return true;
  }
  
  removeUser(userId) {
    return this.users.delete(userId);
  }
  
  getUserCount() {
    return this.users.size;
  }
  
  getUsers() {
    return Array.from(this.users);
  }
  
  isFull() {
    return this.users.size >= this.maxUsers;
  }
  
  isEmpty() {
    return this.users.size === 0;
  }
}

export const voiceRooms = new Map([
  ['voice-lobby', new VoiceRoom('voice-lobby', 'Главный штаб', 50)],
  ['voice-gaming', new VoiceRoom('voice-gaming', 'Игровая комната', 20)],
  ['voice-meeting', new VoiceRoom('voice-meeting', 'Совещания', 10)]
]);

export function getVoiceRoom(roomId) {
  return voiceRooms.get(roomId);
}

export function getAllVoiceRooms() {
  return Array.from(voiceRooms.values());
}